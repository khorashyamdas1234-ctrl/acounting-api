import { Router, Request, Response } from 'express';
import { getDb, saveDb } from '../db.js';
import { sendApiResponse, sendApiError } from '../utils.js';

export const payoutsRouter = Router();

// GET /payout-documents/series
payoutsRouter.get('/payout-documents/series', async (req: Request, res: Response) => {
  try {
    const documentType = (req.query.documentType as string) || 'PAYOUT_RECEIPT';
    const db = await getDb();
    const result = db.exec(`SELECT * FROM voucher_books WHERE documentSeriesType = '${documentType.replace(/'/g, "''")}' LIMIT 1`);
    if (result[0] && result[0].values.length > 0) {
      const series = Object.fromEntries(result[0].columns.map((c, i) => [c, result[0].values[0][i]]));
      return sendApiResponse(res, series, 'Series configuration loaded');
    }
    return sendApiResponse(res, {
      id: 'vb-pout',
      documentSeriesType: documentType,
      prefix: 'PAY-2025-',
      nextNumber: 331,
      paddingLength: 5,
    }, 'Default series configuration loaded');
  } catch (err: any) {
    return sendApiError(res, err.message);
  }
});

// GET /payout-documents/next-number
payoutsRouter.get('/payout-documents/next-number', async (req: Request, res: Response) => {
  try {
    const documentType = (req.query.documentType as string) || 'PAYOUT_RECEIPT';
    const db = await getDb();
    const result = db.exec(`SELECT * FROM voucher_books WHERE documentSeriesType = '${documentType.replace(/'/g, "''")}' LIMIT 1`);
    let prefix = 'PAY-2025-';
    let nextNum = 331;
    let pad = 5;

    if (result[0] && result[0].values.length > 0) {
      const s = Object.fromEntries(result[0].columns.map((c, i) => [c, result[0].values[0][i]]));
      prefix = String(s.prefix || 'PAY-2025-');
      nextNum = Number(s.nextNumber) || 1;
      pad = Number(s.paddingLength) || 5;
    }

    const nextNumberFormatted = `${prefix}${String(nextNum).padStart(pad, '0')}`;
    return sendApiResponse(res, {
      nextNumber: nextNumberFormatted,
      seriesId: result[0]?.values[0]?.[0] || 'vb-pout',
      numericValue: nextNum,
    }, 'Next payout number generated');
  } catch (err: any) {
    return sendApiError(res, err.message);
  }
});

// GET /vendors
payoutsRouter.get('/vendors', async (_req: Request, res: Response) => {
  try {
    const db = await getDb();
    const result = db.exec(`SELECT * FROM vendors ORDER BY name ASC`);
    const vendors = !result[0] ? [] : result[0].values.map(r => Object.fromEntries(result[0].columns.map((c, i) => [c, r[i]])));
    return sendApiResponse(res, vendors, 'Vendors list retrieved');
  } catch (err: any) {
    return sendApiError(res, err.message);
  }
});

// GET /vendors/:vendorId/unpaid-purchases
payoutsRouter.get('/vendors/:vendorId/unpaid-purchases', async (req: Request, res: Response) => {
  try {
    const { vendorId } = req.params;
    const db = await getDb();
    const vendorRes = db.exec(`SELECT name, balanceDue FROM vendors WHERE id = '${vendorId.replace(/'/g, "''")}'`);
    const vendor = vendorRes[0] ? Object.fromEntries(vendorRes[0].columns.map((c, i) => [c, vendorRes[0].values[0][i]])) : { name: 'Vendor', balanceDue: 45000 };

    // Return sample unpaid purchase invoices
    const unpaid = [
      {
        id: `pinv-${vendorId}-01`,
        invoiceNumber: 'PINV-2025-00401',
        date: '2025-08-25',
        dueDate: '2025-09-25',
        totalAmount: 85000,
        paidAmount: 35000,
        balanceDue: 50000,
        currency: 'INR',
        vendorName: vendor.name,
      },
      {
        id: `pinv-${vendorId}-02`,
        invoiceNumber: 'PINV-2025-00405',
        date: '2025-09-02',
        dueDate: '2025-10-02',
        totalAmount: 42000,
        paidAmount: 0,
        balanceDue: 42000,
        currency: 'INR',
        vendorName: vendor.name,
      }
    ];

    return sendApiResponse(res, unpaid, 'Unpaid purchases loaded');
  } catch (err: any) {
    return sendApiError(res, err.message);
  }
});

// GET /bank-accounts
payoutsRouter.get('/bank-accounts', async (_req: Request, res: Response) => {
  try {
    const db = await getDb();
    const result = db.exec(`SELECT * FROM bank_accounts ORDER BY accountName ASC`);
    const accounts = !result[0] ? [] : result[0].values.map(r => Object.fromEntries(result[0].columns.map((c, i) => [c, r[i]])));
    return sendApiResponse(res, accounts, 'Bank accounts retrieved');
  } catch (err: any) {
    return sendApiError(res, err.message);
  }
});

// GET /payment-methods
payoutsRouter.get('/payment-methods', async (_req: Request, res: Response) => {
  const methods = [
    { code: 'NEFT', name: 'National Electronic Fund Transfer (NEFT)', requiresBank: true, requiresRef: true },
    { code: 'RTGS', name: 'Real Time Gross Settlement (RTGS)', requiresBank: true, requiresRef: true },
    { code: 'IMPS', name: 'Immediate Payment Service (IMPS / UPI)', requiresBank: true, requiresRef: true },
    { code: 'CHEQUE', name: 'Account Payee Cheque', requiresBank: true, requiresRef: true },
    { code: 'CASH', name: 'Cash Counter Payout', requiresBank: false, requiresRef: false },
    { code: 'WIRE', name: 'International SWIFT Wire Transfer', requiresBank: true, requiresRef: true }
  ];
  return sendApiResponse(res, methods, 'Payment methods retrieved');
});

// GET /exchange-rate
payoutsRouter.get('/exchange-rate', async (req: Request, res: Response) => {
  const from = (req.query.from as string) || 'USD';
  const to = (req.query.to as string) || 'INR';

  const rates: Record<string, number> = {
    'USD-INR': 86.45,
    'EUR-INR': 94.20,
    'GBP-INR': 110.15,
    'AED-INR': 23.54,
    'INR-INR': 1.0,
  };

  const pair = `${from.toUpperCase()}-${to.toUpperCase()}`;
  const rate = rates[pair] || (from.toUpperCase() === to.toUpperCase() ? 1.0 : 86.45);

  return sendApiResponse(res, {
    from: from.toUpperCase(),
    to: to.toUpperCase(),
    rate,
    lastUpdated: new Date().toISOString(),
  }, 'Exchange rate loaded');
});

// GET /payout-documents
payoutsRouter.get('/payout-documents', async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, parseInt(req.query.limit as string) || 10);
    const kind = req.query.kind as string;
    const status = req.query.status as string;
    const search = req.query.search as string;

    const db = await getDb();
    const conditions: string[] = ['1=1'];

    if (kind) {
      conditions.push(`kind = '${kind.replace(/'/g, "''")}'`);
    }
    if (status) {
      conditions.push(`status = '${status.replace(/'/g, "''")}'`);
    }
    if (search) {
      const s = search.replace(/'/g, "''");
      conditions.push(`(documentNumber LIKE '%${s}%' OR vendorName LIKE '%${s}%' OR notes LIKE '%${s}%')`);
    }

    const where = conditions.join(' AND ');
    const countRes = db.exec(`SELECT count(*) as total FROM payout_documents WHERE ${where}`);
    const total = (countRes[0]?.values[0]?.[0] as number) || 0;

    const offset = (page - 1) * limit;
    const result = db.exec(`SELECT * FROM payout_documents WHERE ${where} ORDER BY date DESC LIMIT ${limit} OFFSET ${offset}`);

    const items = !result[0] ? [] : result[0].values.map(r => {
      const doc = Object.fromEntries(result[0].columns.map((c, i) => [c, r[i]]));
      return {
        ...doc,
        paymentRecords: doc.paymentRecordsJson ? JSON.parse(doc.paymentRecordsJson as string) : [],
        allocatedPurchases: doc.allocatedPurchasesJson ? JSON.parse(doc.allocatedPurchasesJson as string) : [],
        attachments: doc.attachmentsJson ? JSON.parse(doc.attachmentsJson as string) : [],
      };
    });

    const totalPages = Math.ceil(total / limit) || 1;

    return sendApiResponse(res, {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages,
      }
    }, 'Payout documents retrieved');
  } catch (err: any) {
    return sendApiError(res, err.message);
  }
});

// POST /payout-documents/receipt
payoutsRouter.post('/payout-documents/receipt', async (req: Request, res: Response) => {
  try {
    const {
      vendorId,
      date = new Date().toISOString().split('T')[0],
      currency = 'INR',
      exchangeRate = 1.0,
      paymentRecords = [],
      allocatedPurchases = [],
      notes = '',
      signature = '',
      attachments = []
    } = req.body;

    if (!vendorId || paymentRecords.length === 0) {
      return sendApiError(res, 'vendorId and at least one payment record are required', 400);
    }

    const db = await getDb();
    const vendorRes = db.exec(`SELECT name FROM vendors WHERE id = '${vendorId.replace(/'/g, "''")}'`);
    const vendorName = vendorRes[0]?.values[0]?.[0] || 'Selected Vendor';

    const totalAmount = paymentRecords.reduce((sum: number, rec: any) => sum + (Number(rec.amount) || 0), 0);
    const docId = `pout_${Date.now()}`;
    const docNum = `PAY-2025-${Math.floor(10000 + Math.random() * 90000)}`;

    const safeRecords = JSON.stringify(paymentRecords).replace(/'/g, "''");
    const safeAllocations = JSON.stringify(allocatedPurchases).replace(/'/g, "''");
    const safeAttachments = JSON.stringify(attachments).replace(/'/g, "''");

    db.run(`
      INSERT INTO payout_documents (
        id, tenantId, documentNumber, documentType, kind, vendorId, vendorName, date,
        currency, exchangeRate, totalAmount, status, paymentRecordsJson, allocatedPurchasesJson, notes, signature, attachmentsJson
      ) VALUES (
        '${docId}', 'tenant-rapidlinks-001', '${docNum}', 'PAYOUT_RECEIPT', 'RECEIPT',
        '${vendorId.replace(/'/g, "''")}', '${String(vendorName).replace(/'/g, "''")}', '${date}',
        '${currency}', ${exchangeRate}, ${totalAmount}, 'CONFIRMED',
        '${safeRecords}', '${safeAllocations}', '${notes.replace(/'/g, "''")}', '${signature}', '${safeAttachments}'
      )
    `);

    // Update vendor balance due
    db.run(`UPDATE vendors SET balanceDue = MAX(0, balanceDue - ${totalAmount}) WHERE id = '${vendorId.replace(/'/g, "''")}'`);
    saveDb();

    return sendApiResponse(res, {
      id: docId,
      documentNumber: docNum,
      vendorId,
      vendorName,
      totalAmount,
      currency,
      status: 'CONFIRMED',
      date,
    }, 'Payout receipt issued successfully', 201);
  } catch (err: any) {
    return sendApiError(res, err.message);
  }
});

// POST /payout-documents/advance
payoutsRouter.post('/payout-documents/advance', async (req: Request, res: Response) => {
  try {
    const {
      vendorId,
      date = new Date().toISOString().split('T')[0],
      currency = 'INR',
      exchangeRate = 1.0,
      advanceAmount = 0,
      notes = '',
      signature = '',
      attachments = []
    } = req.body;

    if (!vendorId || advanceAmount <= 0) {
      return sendApiError(res, 'vendorId and a positive advanceAmount are required', 400);
    }

    const db = await getDb();
    const vendorRes = db.exec(`SELECT name FROM vendors WHERE id = '${vendorId.replace(/'/g, "''")}'`);
    const vendorName = vendorRes[0]?.values[0]?.[0] || 'Selected Vendor';

    const docId = `adv_${Date.now()}`;
    const docNum = `ADV-2025-${Math.floor(10000 + Math.random() * 90000)}`;
    const safeAttachments = JSON.stringify(attachments).replace(/'/g, "''");

    db.run(`
      INSERT INTO payout_documents (
        id, tenantId, documentNumber, documentType, kind, vendorId, vendorName, date,
        currency, exchangeRate, totalAmount, status, paymentRecordsJson, allocatedPurchasesJson, notes, signature, attachmentsJson
      ) VALUES (
        '${docId}', 'tenant-rapidlinks-001', '${docNum}', 'VENDOR_ADVANCE', 'ADVANCE',
        '${vendorId.replace(/'/g, "''")}', '${String(vendorName).replace(/'/g, "''")}', '${date}',
        '${currency}', ${exchangeRate}, ${advanceAmount}, 'CONFIRMED',
        '[]', '[]', '${notes.replace(/'/g, "''")}', '${signature}', '${safeAttachments}'
      )
    `);

    saveDb();
    return sendApiResponse(res, {
      id: docId,
      documentNumber: docNum,
      vendorId,
      vendorName,
      advanceAmount,
      currency,
      status: 'CONFIRMED',
      date,
    }, 'Vendor advance created successfully', 201);
  } catch (err: any) {
    return sendApiError(res, err.message);
  }
});
