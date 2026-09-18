import { Router, Request, Response } from 'express';
import { getDb, saveDb } from '../db.js';
import { redis } from '../redis.js';
import { sendApiResponse, sendApiError } from '../utils.js';

export const usersRouter = Router();

// GET /users/:domain (Domain specific lookup)
usersRouter.get('/users/by-domain/:domain', async (req: Request, res: Response) => {
  try {
    const { domain } = req.params;
    const db = await getDb();
    const result = db.exec(`
      SELECT u.* FROM users u
      JOIN tenants t ON t.id = u.tenantId
      WHERE t.domain = '${domain.replace(/'/g, "''")}'
    `);
    if (!result[0]) return sendApiResponse(res, [], 'Users retrieved');
    const cols = result[0].columns;
    const users = result[0].values.map(row => {
      const u = Object.fromEntries(cols.map((c, i) => [c, row[i]]));
      delete u.passwordHash;
      return u;
    });
    return sendApiResponse(res, users, 'Users retrieved');
  } catch (err: any) {
    return sendApiError(res, err.message);
  }
});

// GET /users - Paginated customer/user list
usersRouter.get('/users', async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, parseInt(req.query.limit as string) || 10);
    const sortBy = (req.query.sortBy as string) || 'createdAt';
    const order = ((req.query.order as string) || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const search = req.query.search as string;
    const isActive = req.query.isActive !== undefined ? req.query.isActive : null;
    const roleCode = req.query.roleCode as string;
    const userCategory = req.query.userCategory as string;
    const accountType = req.query.accountType as string;
    const department = req.query.department as string;

    const db = await getDb();
    const conditions: string[] = ['1=1'];

    if (search) {
      const s = search.replace(/'/g, "''");
      conditions.push(`(name LIKE '%${s}%' OR identifier LIKE '%${s}%' OR email LIKE '%${s}%' OR phone LIKE '%${s}%')`);
    }
    if (isActive !== null) {
      conditions.push(`isActive = ${isActive === 'true' || isActive === '1' ? 1 : 0}`);
    }
    if (roleCode) {
      conditions.push(`roleCode = '${roleCode.replace(/'/g, "''")}'`);
    }
    if (userCategory) {
      conditions.push(`userCategory = '${userCategory.replace(/'/g, "''")}'`);
    }
    if (accountType) {
      conditions.push(`accountType = '${accountType.replace(/'/g, "''")}'`);
    }
    if (department) {
      conditions.push(`department = '${department.replace(/'/g, "''")}'`);
    }

    const whereClause = conditions.join(' AND ');
    const countRes = db.exec(`SELECT count(*) as total FROM users WHERE ${whereClause}`);
    const total = (countRes[0]?.values[0]?.[0] as number) || 0;

    const offset = (page - 1) * limit;
    const query = `
      SELECT * FROM users 
      WHERE ${whereClause} 
      ORDER BY ${sortBy === 'name' ? 'name' : 'createdAt'} ${order} 
      LIMIT ${limit} OFFSET ${offset}
    `;

    const dataRes = db.exec(query);
    const items = (!dataRes[0] ? [] : dataRes[0].values.map(row => {
      const u = Object.fromEntries(dataRes[0].columns.map((c, i) => [c, row[i]]));
      delete u.passwordHash;
      return {
        ...u,
        isActive: Boolean(u.isActive),
        tenant: {
          id: u.tenantId,
          domain: 'localhost.com',
          name: 'RapidLinks Enterprise Solutions'
        },
        role: {
          code: String(u.roleCode || 'USER'),
          name: String(u.roleCode || 'USER').replace(/_/g, ' ')
        },
        account: {
          id: `acc-${u.id}`,
          code: '1201',
          name: u.name,
          balance: 0.00
        },
        accountHierarchy: {
          belongsUnder: u.accountBelongsUnder || null,
          level: 1
        },
        permissions: ['READ_DOCUMENTS', 'WRITE_DOCUMENTS', 'VIEW_REPORTS'],
        scope: ['DEFAULT_TENANT_SCOPE']
      };
    }));

    const totalPages = Math.ceil(total / limit) || 1;

    return sendApiResponse(res, {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages
      }
    }, 'User list retrieved');
  } catch (err: any) {
    return sendApiError(res, err.message);
  }
});

// GET /users/:id
usersRouter.get('/users/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = await getDb();
    const result = db.exec(`SELECT * FROM users WHERE id = '${id.replace(/'/g, "''")}'`);
    if (!result[0] || result[0].values.length === 0) {
      return sendApiError(res, 'User not found', 404);
    }
    const user = Object.fromEntries(result[0].columns.map((c, i) => [c, result[0].values[0][i]]));
    delete user.passwordHash;
    return sendApiResponse(res, user, 'User details retrieved');
  } catch (err: any) {
    return sendApiError(res, err.message);
  }
});

// PUT /users/:id
usersRouter.put('/users/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, email, phone, roleCode, userCategory, accountType, department, isActive } = req.body;
    const db = await getDb();

    const updates: string[] = [];
    if (name !== undefined) updates.push(`name = '${String(name).replace(/'/g, "''")}'`);
    if (email !== undefined) updates.push(`email = '${String(email).replace(/'/g, "''")}'`);
    if (phone !== undefined) updates.push(`phone = '${String(phone).replace(/'/g, "''")}'`);
    if (roleCode !== undefined) updates.push(`roleCode = '${String(roleCode).replace(/'/g, "''")}'`);
    if (userCategory !== undefined) updates.push(`userCategory = '${String(userCategory).replace(/'/g, "''")}'`);
    if (accountType !== undefined) updates.push(`accountType = '${String(accountType).replace(/'/g, "''")}'`);
    if (department !== undefined) updates.push(`department = '${String(department).replace(/'/g, "''")}'`);
    if (isActive !== undefined) updates.push(`isActive = ${isActive ? 1 : 0}`);

    if (updates.length > 0) {
      db.run(`UPDATE users SET ${updates.join(', ')}, updatedAt = CURRENT_TIMESTAMP WHERE id = '${id.replace(/'/g, "''")}'`);
      saveDb();
    }

    await redis.delByPattern('cache:users:*');
    return sendApiResponse(res, { id, updated: true }, 'User updated successfully');
  } catch (err: any) {
    return sendApiError(res, err.message);
  }
});

// POST /users/change-password/:id
usersRouter.post('/users/change-password/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { password } = req.body;
    if (!password) return sendApiError(res, 'New password is required', 400);

    const db = await getDb();
    db.run(`UPDATE users SET passwordHash = '${String(password).replace(/'/g, "''")}', updatedAt = CURRENT_TIMESTAMP WHERE id = '${id.replace(/'/g, "''")}'`);
    saveDb();
    return sendApiResponse(res, { id, success: true }, 'Password changed successfully');
  } catch (err: any) {
    return sendApiError(res, err.message);
  }
});

// GET /warehouses
usersRouter.get('/warehouses', async (_req: Request, res: Response) => {
  try {
    const db = await getDb();
    const result = db.exec(`SELECT * FROM warehouses WHERE isActive = 1`);
    const warehouses = !result[0] ? [] : result[0].values.map(row => 
      Object.fromEntries(result[0].columns.map((c, i) => [c, row[i]]))
    );
    return sendApiResponse(res, warehouses, 'Warehouses list loaded');
  } catch (err: any) {
    return sendApiError(res, err.message);
  }
});

// GET /customer-pickup-warehouses
usersRouter.get('/customer-pickup-warehouses', async (req: Request, res: Response) => {
  try {
    const userAccountId = (req.query.userAccountId as string) || '';
    const db = await getDb();
    let query = `
      SELECT w.*, cpw.isDefault 
      FROM customer_pickup_warehouses cpw
      JOIN warehouses w ON w.id = cpw.warehouseId
    `;
    if (userAccountId) {
      query += ` WHERE cpw.userAccountId = '${userAccountId.replace(/'/g, "''")}'`;
    }
    const result = db.exec(query);
    const pickupWarehouses = !result[0] ? [] : result[0].values.map(row => 
      Object.fromEntries(result[0].columns.map((c, i) => [c, row[i]]))
    );
    return sendApiResponse(res, pickupWarehouses, 'Pickup warehouses loaded');
  } catch (err: any) {
    return sendApiError(res, err.message);
  }
});
