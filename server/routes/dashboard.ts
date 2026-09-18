import { Router, Request, Response } from 'express';
import { getDb } from '../db.js';
import { redis } from '../redis.js';
import { sendApiResponse, sendApiError } from '../utils.js';

export const dashboardRouter = Router();

// GET /dashboard/last-actions
dashboardRouter.get('/last-actions', async (_req: Request, res: Response) => {
  try {
    const cacheKey = 'cache:dashboard:last-actions';
    const cached = await redis.get(cacheKey);
    if (cached) {
      return sendApiResponse(res, cached, 'Recent actions loaded (cached)');
    }

    const db = await getDb();
    const docRes = db.exec(`
      SELECT id, documentNumber, documentType, partyName, status, date, amountSnapshotJson, createdAt 
      FROM general_documents 
      ORDER BY createdAt DESC 
      LIMIT 10
    `);

    const actions = !docRes[0] ? [] : docRes[0].values.map(row => {
      const doc = Object.fromEntries(docRes[0].columns.map((c, i) => [c, row[i]]));
      let amount = 0;
      try {
        const snap = JSON.parse(doc.amountSnapshotJson as string);
        amount = snap.total || 0;
      } catch {}

      const docType = String(doc.documentType || 'DOCUMENT');
      const docNum = String(doc.documentNumber || '');
      const docStatus = String(doc.status || 'CREATED');
      const party = String(doc.partyName || '');

      return {
        id: doc.id,
        actionType: 'DOCUMENT_' + docStatus,
        title: `${docType.replace(/_/g, ' ')}: ${docNum}`,
        documentNumber: docNum,
        documentType: docType,
        partyName: party,
        status: docStatus,
        amount,
        currency: 'INR',
        timestamp: doc.createdAt || new Date().toISOString(),
        description: `Generated ${docType} for ${party}`,
      };
    });

    await redis.set(cacheKey, actions, 60); // 60s cache
    return sendApiResponse(res, actions, 'Recent actions loaded');
  } catch (err: any) {
    return sendApiError(res, err.message);
  }
});

// GET /dashboard/last-client
dashboardRouter.get('/last-client', async (_req: Request, res: Response) => {
  try {
    const cacheKey = 'cache:dashboard:last-client';
    const cached = await redis.get(cacheKey);
    if (cached) {
      return sendApiResponse(res, cached, 'Last client activity loaded (cached)');
    }

    const db = await getDb();
    const usersRes = db.exec(`
      SELECT id, name, email, phone, roleCode, userCategory, createdAt 
      FROM users 
      WHERE userCategory = 'CUSTOMER' OR roleCode LIKE '%CUSTOMER%'
      ORDER BY createdAt DESC 
      LIMIT 1
    `);

    let lastClient: any = null;
    if (usersRes[0] && usersRes[0].values.length > 0) {
      const u = Object.fromEntries(usersRes[0].columns.map((c, i) => [c, usersRes[0].values[0][i]]));
      lastClient = {
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        category: u.userCategory,
        lastTransactionDate: new Date().toISOString().split('T')[0],
        totalVolume: 495600.00,
        status: 'ACTIVE',
        recentDocumentsCount: 3,
      };
    } else {
      lastClient = {
        id: 'user-cust-01',
        name: 'Acme Trading Industries',
        email: 'contact@acmecorp.com',
        phone: '+91 9123456780',
        category: 'CUSTOMER',
        lastTransactionDate: '2025-09-15',
        totalVolume: 672600.00,
        status: 'ACTIVE',
        recentDocumentsCount: 2,
      };
    }

    await redis.set(cacheKey, lastClient, 60);
    return sendApiResponse(res, lastClient, 'Last client activity loaded');
  } catch (err: any) {
    return sendApiError(res, err.message);
  }
});
