import { Router, Request, Response } from 'express';
import { getDb, saveDb } from '../db.js';
import { redis } from '../redis.js';
import { sendApiResponse, sendApiError } from '../utils.js';
import { redisCacheService } from '../interceptors/redis-cache.interceptor.js';

export const documentsRouter = Router();

// GET /accounting/general-documents
documentsRouter.get('/general-documents', async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, parseInt(req.query.limit as string) || 10);
    const sortBy = (req.query.sortBy as string) || 'createdAt';
    const order = ((req.query.order as string) || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const documentType = req.query.documentType as string;
    const status = req.query.status as string;
    const search = req.query.search as string;
    const isActive = req.query.isActive !== undefined ? req.query.isActive : null;

    const db = await getDb();
    const conditions: string[] = ['1=1'];

    if (documentType) {
      conditions.push(`documentType = '${documentType.replace(/'/g, "''")}'`);
    }
    if (status) {
      conditions.push(`status = '${status.replace(/'/g, "''")}'`);
    }
    if (search) {
      const s = search.replace(/'/g, "''");
      conditions.push(`(documentNumber LIKE '%${s}%' OR partyName LIKE '%${s}%' OR notes LIKE '%${s}%')`);
    }
    if (isActive !== null) {
      conditions.push(`isActive = ${isActive === 'true' || isActive === '1' ? 1 : 0}`);
    }

    const where = conditions.join(' AND ');
    const countRes = db.exec(`SELECT count(*) as total FROM general_documents WHERE ${where}`);
    const total = (countRes[0]?.values[0]?.[0] as number) || 0;

    const offset = (page - 1) * limit;
    const docsRes = db.exec(`
      SELECT * FROM general_documents 
      WHERE ${where} 
      ORDER BY ${sortBy === 'date' ? 'date' : 'createdAt'} ${order} 
      LIMIT ${limit} OFFSET ${offset}
    `);

    const items = !docsRes[0] ? [] : docsRes[0].values.map(row => {
      const doc = Object.fromEntries(docsRes[0].columns.map((c, i) => [c, row[i]]));
      return {
        ...doc,
        isActive: Boolean(doc.isActive),
        amountSnapshot: doc.amountSnapshotJson ? JSON.parse(doc.amountSnapshotJson as string) : null,
        extraDetails: doc.extraDetailsJson ? JSON.parse(doc.extraDetailsJson as string) : null,
        documentConfiguration: doc.documentConfigurationJson ? JSON.parse(doc.documentConfigurationJson as string) : null,
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
      },
    }, 'General documents retrieved');
  } catch (err: any) {
    return sendApiError(res, err.message);
  }
});

// GET /accounting/general-documents/:id
documentsRouter.get('/general-documents/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = await getDb();
    const docRes = db.exec(`SELECT * FROM general_documents WHERE id = '${id.replace(/'/g, "''")}' OR documentNumber = '${id.replace(/'/g, "''")}'`);
    if (!docRes[0] || docRes[0].values.length === 0) {
      return sendApiError(res, 'Document not found', 404);
    }
    const doc = Object.fromEntries(docRes[0].columns.map((c, i) => [c, docRes[0].values[0][i]]));

    // Fetch lines
    const linesRes = db.exec(`SELECT * FROM general_document_lines WHERE documentId = '${doc.id}' ORDER BY sortOrder ASC`);
    const lines = !linesRes[0] ? [] : linesRes[0].values.map(r => Object.fromEntries(linesRes[0].columns.map((c, i) => [c, r[i]])));

    return sendApiResponse(res, {
      ...doc,
      isActive: Boolean(doc.isActive),
      amountSnapshot: doc.amountSnapshotJson ? JSON.parse(doc.amountSnapshotJson as string) : null,
      extraDetails: doc.extraDetailsJson ? JSON.parse(doc.extraDetailsJson as string) : null,
      documentConfiguration: doc.documentConfigurationJson ? JSON.parse(doc.documentConfigurationJson as string) : null,
      lines,
    }, 'General document details');
  } catch (err: any) {
    return sendApiError(res, err.message);
  }
});

// POST /accounting/general-documents/:documentNumber
documentsRouter.post('/general-documents/:documentNumber', async (req: Request, res: Response) => {
  try {
    const { documentNumber } = req.params;
    const {
      documentType,
      documentSeriesId,
      partyId,
      partyName,
      status = 'ISSUED',
      date = new Date().toISOString().split('T')[0],
      dueDate,
      notes,
      documentConfiguration,
      amountSnapshot,
      extraDetails,
      lines = []
    } = req.body;

    if (!documentType || !documentNumber) {
      return sendApiError(res, 'documentType and documentNumber are required', 400);
    }

    const db = await getDb();
    const docId = `doc_${Date.now()}`;
    const safeDocNum = documentNumber.replace(/'/g, "''");
    const safeType = documentType.replace(/'/g, "''");
    const safeSeries = (documentSeriesId || '').replace(/'/g, "''");
    const safePartyId = (partyId || '').replace(/'/g, "''");
    const safePartyName = (partyName || 'Counter Client').replace(/'/g, "''");
    const safeStatus = status.replace(/'/g, "''");
    const safeDate = date.replace(/'/g, "''");
    const safeDue = dueDate ? `'${dueDate.replace(/'/g, "''")}'` : 'NULL';
    const safeNotes = notes ? `'${notes.replace(/'/g, "''")}'` : 'NULL';
    const safeConfig = documentConfiguration ? `'${JSON.stringify(documentConfiguration).replace(/'/g, "''")}'` : 'NULL';
    const safeSnapshot = amountSnapshot ? `'${JSON.stringify(amountSnapshot).replace(/'/g, "''")}'` : 'NULL';
    const safeExtra = extraDetails ? `'${JSON.stringify(extraDetails).replace(/'/g, "''")}'` : 'NULL';

    db.run(`
      INSERT INTO general_documents (
        id, tenantId, documentNumber, documentType, documentSeriesId, partyId, partyName,
        status, date, dueDate, notes, documentConfigurationJson, amountSnapshotJson, extraDetailsJson, isActive
      ) VALUES (
        '${docId}', 'tenant-rapidlinks-001', '${safeDocNum}', '${safeType}', '${safeSeries}',
        '${safePartyId}', '${safePartyName}', '${safeStatus}', '${safeDate}', ${safeDue},
        ${safeNotes}, ${safeConfig}, ${safeSnapshot}, ${safeExtra}, 1
      )
    `);

    // Insert line items
    let sort = 1;
    for (const line of lines) {
      const lineId = `line_${Date.now()}_${sort}`;
      const itemName = (line.itemName || 'Standard Item').replace(/'/g, "''");
      const itemId = (line.itemId || `item-${sort}`).replace(/'/g, "''");
      const qty = Number(line.quantity) || 1;
      const price = Number(line.unitPrice) || 0;
      const tax = Number(line.taxPercentage) || 0;
      const disc = Number(line.discount) || 0;
      const amt = Number(line.amount) || (qty * price * (1 + tax / 100));

      db.run(`
        INSERT INTO general_document_lines (
          id, documentId, itemId, itemName, quantity, unitPrice, taxPercentage, discount, amount, sortOrder
        ) VALUES (
          '${lineId}', '${docId}', '${itemId}', '${itemName}', ${qty}, ${price}, ${tax}, ${disc}, ${amt}, ${sort}
        )
      `);
      sort++;
    }

    // Increment voucher book nextNumber
    if (documentSeriesId) {
      db.run(`UPDATE voucher_books SET nextNumber = nextNumber + 1, updatedAt = CURRENT_TIMESTAMP WHERE id = '${documentSeriesId}'`);
    } else {
      db.run(`UPDATE voucher_books SET nextNumber = nextNumber + 1, updatedAt = CURRENT_TIMESTAMP WHERE documentSeriesType = '${safeType}'`);
    }

    saveDb();
    await redis.del('cache:dashboard:last-actions');
    await redisCacheService.invalidateTag('document-series');

    return sendApiResponse(res, {
      id: docId,
      documentNumber,
      documentType,
      partyName,
      status,
      date,
      linesCount: lines.length,
      amountSnapshot,
    }, 'General document created successfully', 201);
  } catch (err: any) {
    return sendApiError(res, err.message);
  }
});

// PATCH /accounting/general-documents/:id
documentsRouter.patch('/general-documents/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, notes, dueDate, amountSnapshot, extraDetails } = req.body;
    const db = await getDb();

    const updates: string[] = [];
    if (status !== undefined) updates.push(`status = '${status.replace(/'/g, "''")}'`);
    if (notes !== undefined) updates.push(`notes = '${notes.replace(/'/g, "''")}'`);
    if (dueDate !== undefined) updates.push(`dueDate = '${dueDate.replace(/'/g, "''")}'`);
    if (amountSnapshot !== undefined) updates.push(`amountSnapshotJson = '${JSON.stringify(amountSnapshot).replace(/'/g, "''")}'`);
    if (extraDetails !== undefined) updates.push(`extraDetailsJson = '${JSON.stringify(extraDetails).replace(/'/g, "''")}'`);

    if (updates.length > 0) {
      db.run(`UPDATE general_documents SET ${updates.join(', ')}, updatedAt = CURRENT_TIMESTAMP WHERE id = '${id.replace(/'/g, "''")}'`);
      saveDb();
    }
    await redis.del('cache:dashboard:last-actions');

    return sendApiResponse(res, { id, updated: true }, 'Document updated successfully');
  } catch (err: any) {
    return sendApiError(res, err.message);
  }
});

// GET /accounting/get-general-document-lines/:documentType
documentsRouter.get('/get-general-document-lines/:documentType', async (req: Request, res: Response) => {
  const { documentType } = req.params;
  return sendApiResponse(res, {
    documentType,
    columns: [
      { key: 'itemName', label: 'Item / Service Description', type: 'text', required: true },
      { key: 'quantity', label: 'Qty', type: 'number', default: 1, required: true },
      { key: 'unitPrice', label: 'Rate (INR)', type: 'currency', required: true },
      { key: 'taxPercentage', label: 'GST %', type: 'select', options: [0, 5, 12, 18, 28], default: 18 },
      { key: 'discount', label: 'Discount %', type: 'number', default: 0 },
      { key: 'amount', label: 'Total Amount', type: 'calculated', formula: 'quantity * unitPrice * (1 + taxPercentage / 100) * (1 - discount / 100)' },
    ],
    defaultLines: [
      { itemName: '', quantity: 1, unitPrice: 0, taxPercentage: 18, discount: 0, amount: 0 }
    ],
  }, 'Line configuration loaded');
});

// GET /accounting/get-general-document-extra-details/:documentType
documentsRouter.get('/get-general-document-extra-details/:documentType', async (req: Request, res: Response) => {
  const { documentType } = req.params;
  return sendApiResponse(res, {
    documentType,
    paymentTerms: 'Due upon receipt (Net 30)',
    transportMode: 'ROAD',
    dispatchThrough: 'RapidLinks Express Fleet',
    placeOfSupply: 'State of Maharashtra (27)',
    termsAndConditions: '1. Goods once sold will not be taken back without prior authorization.\n2. Interest @ 18% p.a. will be charged if payment is delayed beyond due date.\n3. All disputes subject to local jurisdiction.',
    signatureAuthority: 'Authorized Financial Signatory',
    requireEWayBill: documentType === 'DELIVERY_CHALLAN' || documentType === 'SALES_INVOICE',
  }, 'Initial document extra details loaded');
});
