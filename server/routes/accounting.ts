import { Router, Request, Response } from 'express';
import { getDb, saveDb } from '../db.js';
import { redis } from '../redis.js';
import { sendApiResponse, sendApiError } from '../utils.js';
import { redisCacheInterceptor, redisCacheService } from '../interceptors/redis-cache.interceptor.js';

export const accountingRouter = Router();

// GET /accounting/account-groups
accountingRouter.get('/account-groups', async (_req: Request, res: Response) => {
  try {
    const cacheKey = 'cache:accounting:account-groups';
    const cached = await redis.get(cacheKey);
    if (cached) return sendApiResponse(res, cached, 'Account groups loaded (cached)');

    const db = await getDb();
    const result = db.exec(`SELECT * FROM account_groups ORDER BY code ASC`);
    const groups = !result[0] ? [] : result[0].values.map(row => {
      const g = Object.fromEntries(result[0].columns.map((c, i) => [c, row[i]]));
      return {
        ...g,
        isActive: Boolean(g.isActive),
      };
    });

    await redis.set(cacheKey, groups, 300);
    return sendApiResponse(res, groups, 'Account groups loaded');
  } catch (err: any) {
    return sendApiError(res, err.message);
  }
});

// GET /accounting/account-groups/:id
accountingRouter.get('/account-groups/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = await getDb();
    const groupRes = db.exec(`SELECT * FROM account_groups WHERE id = '${id.replace(/'/g, "''")}'`);
    if (!groupRes[0] || groupRes[0].values.length === 0) {
      return sendApiError(res, 'Account group not found', 404);
    }
    const group = Object.fromEntries(groupRes[0].columns.map((c, i) => [c, groupRes[0].values[0][i]]));

    // Fetch accounts in this group
    const accRes = db.exec(`SELECT * FROM chart_of_accounts WHERE accountGroupId = '${id.replace(/'/g, "''")}'`);
    const accounts = !accRes[0] ? [] : accRes[0].values.map(r => Object.fromEntries(accRes[0].columns.map((c, i) => [c, r[i]])));

    return sendApiResponse(res, { ...group, accounts }, 'Account group details');
  } catch (err: any) {
    return sendApiError(res, err.message);
  }
});

// POST /accounting/account-groups
accountingRouter.post('/account-groups', async (req: Request, res: Response) => {
  try {
    const { name, parentGroupId, normalBalanceNature = 'DEBIT' } = req.body;
    if (!name) return sendApiError(res, 'Group name is required', 400);

    const db = await getDb();
    const id = `grp_${Date.now()}`;
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    const parent = parentGroupId ? `'${parentGroupId.replace(/'/g, "''")}'` : 'NULL';

    db.run(`
      INSERT INTO account_groups (id, tenantId, code, name, parentGroupId, normalBalanceNature, isActive)
      VALUES ('${id}', 'tenant-rapidlinks-001', '${code}', '${name.replace(/'/g, "''")}', ${parent}, '${normalBalanceNature}', 1)
    `);
    saveDb();
    await redis.del('cache:accounting:account-groups');

    return sendApiResponse(res, {
      id,
      tenantId: 'tenant-rapidlinks-001',
      code,
      name,
      parentGroupId: parentGroupId || null,
      normalBalanceNature,
      isActive: true,
      createdAt: new Date().toISOString(),
    }, 'Accounting group created', 201);
  } catch (err: any) {
    return sendApiError(res, err.message);
  }
});

// GET /accounting/chart-of-accounts (Redis Cache Interceptor: 300s TTL)
accountingRouter.get(
  '/chart-of-accounts',
  redisCacheInterceptor({
    ttlSeconds: 300,
    keyPrefix: 'cache:accounting:chart-of-accounts',
    tags: ['chart-of-accounts'],
  }),
  async (_req: Request, res: Response) => {
    try {
      const db = await getDb();
      const result = db.exec(`
        SELECT c.*, g.name as groupName, g.normalBalanceNature 
        FROM chart_of_accounts c
        JOIN account_groups g ON g.id = c.accountGroupId
        ORDER BY c.code ASC
      `);

      const accounts = !result[0] ? [] : result[0].values.map(row => {
        const a = Object.fromEntries(result[0].columns.map((c, i) => [c, row[i]]));
        return {
          ...a,
          allowManualEntries: Boolean(a.allowManualEntries),
          allowReconciliation: Boolean(a.allowReconciliation),
        };
      });

      return sendApiResponse(res, accounts, 'Chart of accounts loaded');
    } catch (err: any) {
      return sendApiError(res, err.message);
    }
  }
);

// GET /accounting/chart-of-accounts/:id (Redis Cache Interceptor: 300s TTL)
accountingRouter.get(
  '/chart-of-accounts/:id',
  redisCacheInterceptor({
    ttlSeconds: 300,
    keyPrefix: 'cache:accounting:chart-of-accounts:item',
    tags: ['chart-of-accounts'],
  }),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const db = await getDb();
      const result = db.exec(`
        SELECT c.*, g.name as groupName 
        FROM chart_of_accounts c 
        JOIN account_groups g ON g.id = c.accountGroupId 
        WHERE c.id = '${id.replace(/'/g, "''")}'
      `);
      if (!result[0] || result[0].values.length === 0) {
        return sendApiError(res, 'Account not found', 404);
      }
      const acc = Object.fromEntries(result[0].columns.map((c, i) => [c, result[0].values[0][i]]));
      return sendApiResponse(res, {
        ...acc,
        allowManualEntries: Boolean(acc.allowManualEntries),
        allowReconciliation: Boolean(acc.allowReconciliation),
      }, 'Account details');
    } catch (err: any) {
      return sendApiError(res, err.message);
    }
  }
);

// POST /accounting/account
accountingRouter.post('/account', async (req: Request, res: Response) => {
  try {
    const { accountGroupId, name, allowManualEntries = true, allowReconciliation = true } = req.body;
    if (!accountGroupId || !name) {
      return sendApiError(res, 'accountGroupId and name are required', 400);
    }

    const db = await getDb();
    const id = `acc_${Date.now()}`;
    const code = Math.floor(1000 + Math.random() * 8999).toString();

    db.run(`
      INSERT INTO chart_of_accounts (id, tenantId, accountGroupId, code, name, allowManualEntries, allowReconciliation, balance)
      VALUES ('${id}', 'tenant-rapidlinks-001', '${accountGroupId.replace(/'/g, "''")}', '${code}', '${name.replace(/'/g, "''")}', ${allowManualEntries ? 1 : 0}, ${allowReconciliation ? 1 : 0}, 0.0)
    `);
    saveDb();
    
    // Invalidate Redis cache tags for chart of accounts
    await redisCacheService.invalidateTag('chart-of-accounts');
    await redis.del('cache:accounting:chart-of-accounts');

    return sendApiResponse(res, {
      id,
      tenantId: 'tenant-rapidlinks-001',
      accountGroupId,
      code,
      name,
      allowManualEntries,
      allowReconciliation,
      balance: 0.0,
      createdAt: new Date().toISOString(),
    }, 'Chart of account created', 201);
  } catch (err: any) {
    return sendApiError(res, err.message);
  }
});

// GET /accounting/voucher-books (Redis Cache Interceptor: 300s TTL)
accountingRouter.get(
  '/voucher-books',
  redisCacheInterceptor({
    ttlSeconds: 300,
    keyPrefix: 'cache:accounting:voucher-books',
    tags: ['document-series', 'voucher-books'],
  }),
  async (_req: Request, res: Response) => {
    try {
      const db = await getDb();
      const result = db.exec(`SELECT * FROM voucher_books ORDER BY documentSeriesType ASC`);
      const books = !result[0] ? [] : result[0].values.map(row => {
        const b = Object.fromEntries(result[0].columns.map((c, i) => [c, row[i]]));
        return {
          ...b,
          isActive: Boolean(b.isActive),
          yearlyReset: Boolean(b.yearlyReset),
        };
      });
      return sendApiResponse(res, books, 'Voucher books loaded');
    } catch (err: any) {
      return sendApiError(res, err.message);
    }
  }
);

// GET /accounting/voucher-books/:id (Redis Cache Interceptor: 300s TTL)
accountingRouter.get(
  '/voucher-books/:id',
  redisCacheInterceptor({
    ttlSeconds: 300,
    keyPrefix: 'cache:accounting:voucher-books:item',
    tags: ['document-series', 'voucher-books'],
  }),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const db = await getDb();
      const result = db.exec(`SELECT * FROM voucher_books WHERE id = '${id.replace(/'/g, "''")}'`);
      if (!result[0] || result[0].values.length === 0) {
        return sendApiError(res, 'Voucher book not found', 404);
      }
      const book = Object.fromEntries(result[0].columns.map((c, i) => [c, result[0].values[0][i]]));
      return sendApiResponse(res, {
        ...book,
        isActive: Boolean(book.isActive),
        yearlyReset: Boolean(book.yearlyReset),
      }, 'Voucher book details');
    } catch (err: any) {
      return sendApiError(res, err.message);
    }
  }
);

// GET /accounting/document-series (Redis Cache Interceptor: 300s TTL)
accountingRouter.get(
  '/document-series',
  redisCacheInterceptor({
    ttlSeconds: 300,
    keyPrefix: 'cache:accounting:document-series:all',
    tags: ['document-series'],
  }),
  async (_req: Request, res: Response) => {
    try {
      const db = await getDb();
      const result = db.exec(`SELECT * FROM voucher_books ORDER BY documentSeriesType ASC`);
      const seriesList = !result[0] ? [] : result[0].values.map(row => {
        const b = Object.fromEntries(result[0].columns.map((c, i) => [c, row[i]]));
        const nextNum = Number(b.nextNumber) || 1;
        const paddingLen = Number(b.paddingLength) || 5;
        const padded = String(nextNum).padStart(paddingLen, '0');
        return {
          id: b.id,
          tenantId: b.tenantId,
          documentSeriesType: b.documentSeriesType,
          prefix: b.prefix,
          nextNumber: nextNum,
          nextDocumentNumber: `${b.prefix}${padded}`,
          paddingLength: paddingLen,
          yearlyReset: Boolean(b.yearlyReset),
          isActive: Boolean(b.isActive),
        };
      });
      return sendApiResponse(res, seriesList, 'Document series configurations loaded');
    } catch (err: any) {
      return sendApiError(res, err.message);
    }
  }
);

// POST /accounting/voucher-book (Bulk create & Invalidate Cache)
accountingRouter.post('/voucher-book', async (req: Request, res: Response) => {
  try {
    const items = Array.isArray(req.body) ? req.body : [req.body];
    if (items.length === 0) return sendApiError(res, 'Payload array is empty', 400);

    const db = await getDb();
    const created: any[] = [];

    for (const item of items) {
      const id = `vb_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      const prefix = (item.prefix || 'DOC-').replace(/'/g, "''");
      const type = (item.documentSeriesType || 'SALES_INVOICE').replace(/'/g, "''");
      const nextNum = Number(item.nextNumber) || 1;

      db.run(`
        INSERT INTO voucher_books (id, tenantId, documentSeriesType, prefix, nextNumber, paddingLength, yearlyReset, isActive)
        VALUES ('${id}', 'tenant-rapidlinks-001', '${type}', '${prefix}', ${nextNum}, 5, 1, 1)
      `);
      created.push({ id, documentSeriesType: type, prefix, nextNumber: nextNum, isActive: true });
    }
    saveDb();

    // Invalidate document series Redis cache
    await redisCacheService.invalidateTag('document-series');
    await redisCacheService.invalidateTag('voucher-books');

    return sendApiResponse(res, created, 'Voucher books created', 201);
  } catch (err: any) {
    return sendApiError(res, err.message);
  }
});

// GET /accounting/document-series/generate/:documentType (Redis Cache Interceptor: 60s TTL)
accountingRouter.get(
  '/document-series/generate/:documentType',
  redisCacheInterceptor({
    ttlSeconds: 60,
    keyPrefix: 'cache:accounting:document-series:generate',
    tags: ['document-series'],
  }),
  async (req: Request, res: Response) => {
    try {
      const { documentType } = req.params;
      const db = await getDb();
      const result = db.exec(`
        SELECT * FROM voucher_books 
        WHERE documentSeriesType = '${documentType.replace(/'/g, "''")}' 
        LIMIT 1
      `);

      let series: any = null;
      if (result[0] && result[0].values.length > 0) {
        series = Object.fromEntries(result[0].columns.map((c, i) => [c, result[0].values[0][i]]));
      } else {
        series = {
          id: `vb-${documentType.toLowerCase()}`,
          documentSeriesType: documentType,
          prefix: `${documentType.substring(0, 4).toUpperCase()}-2025-`,
          nextNumber: 101,
          paddingLength: 5,
        };
      }

      const nextNum = Number(series.nextNumber) || 1;
      const padded = String(nextNum).padStart(series.paddingLength || 5, '0');
      const generatedDocumentNumber = `${series.prefix}${padded}`;

      return sendApiResponse(res, {
        seriesId: series.id,
        documentType,
        prefix: series.prefix,
        nextNumber: nextNum,
        formattedDocumentNumber: generatedDocumentNumber,
        paddingLength: series.paddingLength || 5,
      }, 'Next document number generated');
    } catch (err: any) {
      return sendApiError(res, err.message);
    }
  }
);

// GET /accounting/current-financial-year
accountingRouter.get('/current-financial-year', async (_req: Request, res: Response) => {
  try {
    const db = await getDb();
    const fyRes = db.exec(`SELECT * FROM financial_years WHERE isClosed = 0 ORDER BY startDate DESC LIMIT 1`);
    if (!fyRes[0] || fyRes[0].values.length === 0) {
      return sendApiError(res, 'No active financial year found', 404);
    }
    const fy = Object.fromEntries(fyRes[0].columns.map((c, i) => [c, fyRes[0].values[0][i]]));

    const pRes = db.exec(`SELECT * FROM financial_periods WHERE financialYearId = '${fy.id}' ORDER BY periodNumber ASC`);
    const periods = !pRes[0] ? [] : pRes[0].values.map(r => {
      const p = Object.fromEntries(pRes[0].columns.map((c, i) => [c, r[i]]));
      return { ...p, isClosed: Boolean(p.isClosed) };
    });

    const activePeriod = periods.find(p => !p.isClosed) || periods[0];

    return sendApiResponse(res, {
      ...fy,
      isClosed: Boolean(fy.isClosed),
      accountingStartDate: fy.startDate,
      periods,
      currentPeriod: activePeriod,
    }, 'Current financial year loaded');
  } catch (err: any) {
    return sendApiError(res, err.message);
  }
});

// GET /accounting/financial-years
accountingRouter.get('/financial-years', async (_req: Request, res: Response) => {
  try {
    const db = await getDb();
    const fyRes = db.exec(`SELECT * FROM financial_years ORDER BY startDate DESC`);
    const years = !fyRes[0] ? [] : fyRes[0].values.map(row => {
      const y = Object.fromEntries(fyRes[0].columns.map((c, i) => [c, row[i]]));
      return {
        ...y,
        isClosed: Boolean(y.isClosed),
        accountingStartDate: y.startDate,
      };
    });
    return sendApiResponse(res, years, 'Financial years loaded');
  } catch (err: any) {
    return sendApiError(res, err.message);
  }
});

// GET /accounting/financial-years/:id
accountingRouter.get('/financial-years/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = await getDb();
    const fyRes = db.exec(`SELECT * FROM financial_years WHERE id = '${id.replace(/'/g, "''")}'`);
    if (!fyRes[0] || fyRes[0].values.length === 0) return sendApiError(res, 'Financial year not found', 404);
    const fy = Object.fromEntries(fyRes[0].columns.map((c, i) => [c, fyRes[0].values[0][i]]));

    const pRes = db.exec(`SELECT * FROM financial_periods WHERE financialYearId = '${id.replace(/'/g, "''")}' ORDER BY periodNumber ASC`);
    const periods = !pRes[0] ? [] : pRes[0].values.map(r => Object.fromEntries(pRes[0].columns.map((c, i) => [c, r[i]])));

    return sendApiResponse(res, {
      ...fy,
      isClosed: Boolean(fy.isClosed),
      periods,
    }, 'Financial year details');
  } catch (err: any) {
    return sendApiError(res, err.message);
  }
});

// POST /accounting/financial-year
accountingRouter.post('/financial-year', async (req: Request, res: Response) => {
  try {
    const { name, startDate, endDate } = req.body;
    if (!name || !startDate || !endDate) return sendApiError(res, 'Name, startDate, and endDate required', 400);

    const db = await getDb();
    const id = `fy_${Date.now()}`;
    db.run(`
      INSERT INTO financial_years (id, tenantId, name, startDate, endDate, isClosed)
      VALUES ('${id}', 'tenant-rapidlinks-001', '${name.replace(/'/g, "''")}', '${startDate}', '${endDate}', 0)
    `);

    // Create standard 4 quarterly periods
    const p1 = `fp_${id}_q1`;
    db.run(`INSERT INTO financial_periods (id, financialYearId, name, periodNumber, startDate, endDate, isClosed) VALUES ('${p1}', '${id}', 'Period Q1', 1, '${startDate}', '${endDate}', 0)`);

    saveDb();
    return sendApiResponse(res, { id, name, startDate, endDate, isClosed: false }, 'Financial year created', 201);
  } catch (err: any) {
    return sendApiError(res, err.message);
  }
});

// DELETE /accounting/financial-years/:id/close
accountingRouter.delete(['/financial-years/:id/close', '/FinancialYears/:id/close'], async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = await getDb();
    db.run(`UPDATE financial_years SET isClosed = 1, updatedAt = CURRENT_TIMESTAMP WHERE id = '${id.replace(/'/g, "''")}'`);
    db.run(`UPDATE financial_periods SET isClosed = 1 WHERE financialYearId = '${id.replace(/'/g, "''")}'`);
    saveDb();
    return sendApiResponse(res, { id, isClosed: true }, 'Financial year closed successfully');
  } catch (err: any) {
    return sendApiError(res, err.message);
  }
});

// DELETE /accounting/financial-period/:id/close
accountingRouter.delete(['/financial-period/:id/close', '/FinancialPeriod/:id/close'], async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = await getDb();
    db.run(`UPDATE financial_periods SET isClosed = 1 WHERE id = '${id.replace(/'/g, "''")}'`);
    saveDb();
    return sendApiResponse(res, { id, isClosed: true }, 'Financial period closed');
  } catch (err: any) {
    return sendApiError(res, err.message);
  }
});

// POST /accounting/transactions/validate
accountingRouter.post('/transactions/validate', async (req: Request, res: Response) => {
  try {
    const { date } = req.body;
    if (!date) return sendApiError(res, 'Transaction date is required', 400);

    const db = await getDb();
    const result = db.exec(`
      SELECT fp.*, fy.name as yearName 
      FROM financial_periods fp
      JOIN financial_years fy ON fy.id = fp.financialYearId
      WHERE date('${date}') BETWEEN date(fp.startDate) AND date(fp.endDate)
        AND fp.isClosed = 0
        AND fy.isClosed = 0
      LIMIT 1
    `);

    if (result[0] && result[0].values.length > 0) {
      const period = Object.fromEntries(result[0].columns.map((c, i) => [c, result[0].values[0][i]]));
      return sendApiResponse(res, {
        valid: true,
        periodId: period.id,
        periodName: period.name,
        financialYear: period.yearName,
        message: 'Transaction date is within an open financial period.',
      }, 'Transaction date validated');
    } else {
      return sendApiResponse(res, {
        valid: false,
        message: 'Transaction date does not belong to any currently open financial period or year.',
      }, 'Transaction date is in a closed or undefined period', 200);
    }
  } catch (err: any) {
    return sendApiError(res, err.message);
  }
});
