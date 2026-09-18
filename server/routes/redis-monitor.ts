import { Router, Request, Response } from 'express';
import { redis } from '../redis.js';
import { getDb } from '../db.js';
import { sendApiResponse, sendApiError } from '../utils.js';

export const systemRouter = Router();

// GET /api/redis/stats
systemRouter.get('/redis/stats', async (_req: Request, res: Response) => {
  try {
    const stats = redis.getStats();
    return sendApiResponse(res, stats, 'Redis cache metrics');
  } catch (err: any) {
    return sendApiError(res, err.message);
  }
});

// GET /api/redis/keys
systemRouter.get('/redis/keys', async (_req: Request, res: Response) => {
  try {
    const keys = await redis.dumpDetails();
    return sendApiResponse(res, keys, 'Redis keys dump');
  } catch (err: any) {
    return sendApiError(res, err.message);
  }
});

// POST /api/redis/flush
systemRouter.post('/redis/flush', async (_req: Request, res: Response) => {
  try {
    await redis.flushall();
    return sendApiResponse(res, { flushed: true }, 'Redis cache cleared successfully');
  } catch (err: any) {
    return sendApiError(res, err.message);
  }
});

// GET /api/system/health
systemRouter.get('/system/health', async (_req: Request, res: Response) => {
  try {
    const db = await getDb();
    const tables = [
      'tenants', 'users', 'warehouses', 'account_groups',
      'chart_of_accounts', 'voucher_books', 'financial_years',
      'financial_periods', 'general_documents', 'payout_documents', 'vendors', 'bank_accounts'
    ];

    const tableCounts: Record<string, number> = {};
    for (const t of tables) {
      try {
        const countRes = db.exec(`SELECT count(*) as count FROM ${t}`);
        tableCounts[t] = (countRes[0]?.values[0]?.[0] as number) || 0;
      } catch {
        tableCounts[t] = 0;
      }
    }

    return sendApiResponse(res, {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: {
        engine: 'SQLite (Relational SQL)',
        status: 'CONNECTED',
        tables: tableCounts,
      },
      redis: {
        engine: 'In-Memory Redis Protocol Service',
        status: 'CONNECTED',
        stats: redis.getStats(),
      },
      environment: {
        nodeVersion: process.version,
        uptimeSeconds: Math.floor(process.uptime()),
        memoryUsage: process.memoryUsage(),
      }
    }, 'System health status');
  } catch (err: any) {
    return sendApiError(res, err.message);
  }
});

// POST /api/system/sql-query (Read-only SELECT query tester)
systemRouter.post('/system/sql-query', async (req: Request, res: Response) => {
  try {
    const { sql } = req.body;
    if (!sql || typeof sql !== 'string') {
      return sendApiError(res, 'SQL string is required', 400);
    }

    const trimmed = sql.trim();
    if (!trimmed.toUpperCase().startsWith('SELECT') && !trimmed.toUpperCase().startsWith('PRAGMA') && !trimmed.toUpperCase().startsWith('EXPLAIN')) {
      return sendApiError(res, 'Only read-only SELECT or PRAGMA statements are permitted in this test console', 403);
    }

    const db = await getDb();
    const result = db.exec(trimmed);

    if (!result[0]) {
      return sendApiResponse(res, { columns: [], rows: [], rowCount: 0 }, 'Query returned no results');
    }

    const columns = result[0].columns;
    const rows = result[0].values.map(val => Object.fromEntries(columns.map((c, i) => [c, val[i]])));

    return sendApiResponse(res, {
      columns,
      rows,
      rowCount: rows.length,
    }, 'Query executed successfully');
  } catch (err: any) {
    return sendApiError(res, err.message, 400);
  }
});
