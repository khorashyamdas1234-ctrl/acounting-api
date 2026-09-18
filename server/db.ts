import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';

let db: Database | null = null;
const DB_FILE_PATH = path.join(process.cwd(), 'accounting.sqlite');

export async function getDb(): Promise<Database> {
  if (db) return db;

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_FILE_PATH)) {
    try {
      const fileBuffer = fs.readFileSync(DB_FILE_PATH);
      db = new SQL.Database(fileBuffer);
    } catch (e) {
      console.warn('Failed to load existing SQLite file, creating fresh DB', e);
      db = new SQL.Database();
    }
  } else {
    db = new SQL.Database();
  }

  initSchema(db);
  seedInitialData(db);
  saveDb();
  return db;
}

export function saveDb() {
  if (!db) return;
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_FILE_PATH, buffer);
  } catch (err) {
    console.error('Error saving SQLite database:', err);
  }
}

function initSchema(database: Database) {
  database.run(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS tenants (
      id TEXT PRIMARY KEY,
      domain TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      legalName TEXT,
      currency TEXT DEFAULT 'INR',
      settingsJson TEXT,
      themeJson TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      tenantId TEXT NOT NULL,
      identifier TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      passwordHash TEXT NOT NULL,
      roleCode TEXT NOT NULL,
      userCategory TEXT DEFAULT 'CUSTOMER',
      accountType TEXT DEFAULT 'INDIVIDUAL',
      accountBelongsUnder TEXT,
      department TEXT,
      isActive INTEGER DEFAULT 1,
      extraJson TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS warehouses (
      id TEXT PRIMARY KEY,
      tenantId TEXT NOT NULL,
      name TEXT NOT NULL,
      code TEXT NOT NULL,
      address TEXT,
      isActive INTEGER DEFAULT 1,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS customer_pickup_warehouses (
      id TEXT PRIMARY KEY,
      userAccountId TEXT NOT NULL,
      warehouseId TEXT NOT NULL,
      isDefault INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS account_groups (
      id TEXT PRIMARY KEY,
      tenantId TEXT NOT NULL,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      parentGroupId TEXT,
      normalBalanceNature TEXT CHECK(normalBalanceNature IN ('DEBIT', 'CREDIT')) DEFAULT 'DEBIT',
      isActive INTEGER DEFAULT 1,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS chart_of_accounts (
      id TEXT PRIMARY KEY,
      tenantId TEXT NOT NULL,
      accountGroupId TEXT NOT NULL,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      allowManualEntries INTEGER DEFAULT 1,
      allowReconciliation INTEGER DEFAULT 1,
      balance REAL DEFAULT 0.0,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (accountGroupId) REFERENCES account_groups(id)
    );

    CREATE TABLE IF NOT EXISTS voucher_books (
      id TEXT PRIMARY KEY,
      tenantId TEXT NOT NULL,
      documentSeriesType TEXT NOT NULL,
      prefix TEXT NOT NULL,
      nextNumber INTEGER DEFAULT 1,
      paddingLength INTEGER DEFAULT 5,
      yearlyReset INTEGER DEFAULT 1,
      isActive INTEGER DEFAULT 1,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS financial_years (
      id TEXT PRIMARY KEY,
      tenantId TEXT NOT NULL,
      name TEXT NOT NULL,
      startDate TEXT NOT NULL,
      endDate TEXT NOT NULL,
      isClosed INTEGER DEFAULT 0,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS financial_periods (
      id TEXT PRIMARY KEY,
      financialYearId TEXT NOT NULL,
      name TEXT NOT NULL,
      periodNumber INTEGER NOT NULL,
      startDate TEXT NOT NULL,
      endDate TEXT NOT NULL,
      isClosed INTEGER DEFAULT 0,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (financialYearId) REFERENCES financial_years(id)
    );

    CREATE TABLE IF NOT EXISTS general_documents (
      id TEXT PRIMARY KEY,
      tenantId TEXT NOT NULL,
      documentNumber TEXT NOT NULL,
      documentType TEXT NOT NULL,
      documentSeriesId TEXT,
      partyId TEXT,
      partyName TEXT,
      status TEXT DEFAULT 'DRAFT',
      date TEXT NOT NULL,
      dueDate TEXT,
      notes TEXT,
      documentConfigurationJson TEXT,
      amountSnapshotJson TEXT,
      extraDetailsJson TEXT,
      isActive INTEGER DEFAULT 1,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS general_document_lines (
      id TEXT PRIMARY KEY,
      documentId TEXT NOT NULL,
      itemId TEXT,
      itemName TEXT NOT NULL,
      quantity REAL DEFAULT 1,
      unitPrice REAL DEFAULT 0,
      taxPercentage REAL DEFAULT 0,
      discount REAL DEFAULT 0,
      amount REAL DEFAULT 0,
      sortOrder INTEGER DEFAULT 0,
      FOREIGN KEY (documentId) REFERENCES general_documents(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS payout_documents (
      id TEXT PRIMARY KEY,
      tenantId TEXT NOT NULL,
      documentNumber TEXT NOT NULL,
      documentType TEXT NOT NULL,
      kind TEXT CHECK(kind IN ('RECEIPT', 'ADVANCE')) NOT NULL,
      vendorId TEXT NOT NULL,
      vendorName TEXT NOT NULL,
      date TEXT NOT NULL,
      currency TEXT DEFAULT 'INR',
      exchangeRate REAL DEFAULT 1.0,
      totalAmount REAL DEFAULT 0.0,
      status TEXT DEFAULT 'CONFIRMED',
      paymentRecordsJson TEXT,
      allocatedPurchasesJson TEXT,
      notes TEXT,
      signature TEXT,
      attachmentsJson TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS vendors (
      id TEXT PRIMARY KEY,
      tenantId TEXT NOT NULL,
      name TEXT NOT NULL,
      code TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      balanceDue REAL DEFAULT 0.0,
      currency TEXT DEFAULT 'INR',
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS bank_accounts (
      id TEXT PRIMARY KEY,
      tenantId TEXT NOT NULL,
      accountName TEXT NOT NULL,
      accountNumber TEXT NOT NULL,
      bankName TEXT NOT NULL,
      ifscCode TEXT,
      balance REAL DEFAULT 0.0,
      currency TEXT DEFAULT 'INR',
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      tenantId TEXT NOT NULL,
      action TEXT NOT NULL,
      entityType TEXT NOT NULL,
      entityId TEXT,
      userId TEXT,
      payloadJson TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

function seedInitialData(database: Database) {
  // Check if tenant exists
  const check = database.exec(`SELECT count(*) as count FROM tenants`);
  if (check[0]?.values[0]?.[0] && (check[0].values[0][0] as number) > 0) {
    return; // already seeded
  }

  const defaultTenantId = 'tenant-rapidlinks-001';
  const defaultDomain = 'localhost.com';

  database.run(`
    INSERT INTO tenants (id, domain, name, legalName, currency, settingsJson, themeJson)
    VALUES (
      '${defaultTenantId}',
      '${defaultDomain}',
      'RapidLinks Enterprise Solutions',
      'RapidLinks Global Accounting Corp Pvt Ltd',
      'INR',
      '{"timezone":"Asia/Kolkata","fiscalYearStartMonth":4,"dateFormat":"YYYY-MM-DD","enableGst":true}',
      '{"primaryColor":"#2563eb","accentColor":"#0d9488","logoUrl":"/public/assets/logo.png","mode":"light"}'
    );

    -- Users
    INSERT INTO users (id, tenantId, identifier, name, email, phone, passwordHash, roleCode, userCategory, accountType, department, isActive)
    VALUES
      ('user-admin-01', '${defaultTenantId}', 'admin@rapidlinks.com', 'System Administrator', 'admin@rapidlinks.com', '+91 9876543210', 'admin123', 'ADMIN', 'INTERNAL', 'CORPORATE', 'FINANCE', 1),
      ('user-accountant-01', '${defaultTenantId}', 'accountant@rapidlinks.com', 'Senior Financial Officer', 'accountant@rapidlinks.com', '+91 9876543211', 'accountant123', 'CASH_COUNTER', 'INTERNAL', 'INDIVIDUAL', 'ACCOUNTS', 1),
      ('user-cust-01', '${defaultTenantId}', 'client@acmecorp.com', 'Acme Trading Industries', 'contact@acmecorp.com', '+91 9123456780', 'client123', 'CUSTOMER_ONLINE', 'CUSTOMER', 'CORPORATE', 'PURCHASING', 1),
      ('user-franchise-01', '${defaultTenantId}', 'metro-hub', 'Metro Area Franchise', 'hub@metrofranchise.com', '+91 9988776655', 'metro123', 'AREA_FRANCHISE', 'FRANCHISE', 'CORPORATE', 'OPERATIONS', 1);

    -- Warehouses
    INSERT INTO warehouses (id, tenantId, name, code, address, isActive)
    VALUES
      ('wh-01', '${defaultTenantId}', 'Central Logistics Hub', 'WH-MUM-01', 'Bhiwandi Logistics Park, Mumbai, MH', 1),
      ('wh-02', '${defaultTenantId}', 'Northern Distribution Center', 'WH-DEL-02', 'Okhla Industrial Area Ph-III, New Delhi', 1),
      ('wh-03', '${defaultTenantId}', 'Southern Transit Point', 'WH-BLR-03', 'Peenya Industrial Estate, Bengaluru, KA', 1);

    INSERT INTO customer_pickup_warehouses (id, userAccountId, warehouseId, isDefault)
    VALUES
      ('cpw-01', 'user-cust-01', 'wh-01', 1),
      ('cpw-02', 'user-cust-01', 'wh-02', 0);

    -- Accounting Groups
    INSERT INTO account_groups (id, tenantId, code, name, parentGroupId, normalBalanceNature)
    VALUES
      ('grp-assets', '${defaultTenantId}', '1000', 'Current Assets', NULL, 'DEBIT'),
      ('grp-bank', '${defaultTenantId}', '1100', 'Bank & Cash Accounts', 'grp-assets', 'DEBIT'),
      ('grp-receivables', '${defaultTenantId}', '1200', 'Accounts Receivable (Debtors)', 'grp-assets', 'DEBIT'),
      ('grp-liabilities', '${defaultTenantId}', '2000', 'Current Liabilities', NULL, 'CREDIT'),
      ('grp-payables', '${defaultTenantId}', '2100', 'Accounts Payable (Creditors)', 'grp-liabilities', 'CREDIT'),
      ('grp-equity', '${defaultTenantId}', '3000', 'Owners Equity & Reserves', NULL, 'CREDIT'),
      ('grp-revenue', '${defaultTenantId}', '4000', 'Operating Revenue (Sales)', NULL, 'CREDIT'),
      ('grp-expense', '${defaultTenantId}', '5000', 'Direct & Indirect Expenses', NULL, 'DEBIT');

    -- Chart of Accounts
    INSERT INTO chart_of_accounts (id, tenantId, accountGroupId, code, name, allowManualEntries, allowReconciliation, balance)
    VALUES
      ('acc-cash', '${defaultTenantId}', 'grp-bank', '1101', 'Main Petty Cash Vault', 1, 1, 145000.00),
      ('acc-hdfc', '${defaultTenantId}', 'grp-bank', '1102', 'HDFC Primary Corporate Operating Account', 1, 1, 4820500.50),
      ('acc-sbi', '${defaultTenantId}', 'grp-bank', '1103', 'State Bank of India Current Account', 1, 1, 1250000.00),
      ('acc-ar-general', '${defaultTenantId}', 'grp-receivables', '1201', 'Trade Debtors Master Account', 0, 1, 3500000.00),
      ('acc-ap-vendors', '${defaultTenantId}', 'grp-payables', '2101', 'Trade Creditors Master Account', 0, 1, 1850000.00),
      ('acc-sales-products', '${defaultTenantId}', 'grp-revenue', '4001', 'Domestic Merchandise Sales', 1, 0, 14500000.00),
      ('acc-sales-services', '${defaultTenantId}', 'grp-revenue', '4002', 'Consulting & Implementation Services', 1, 0, 3200000.00),
      ('acc-office-rent', '${defaultTenantId}', 'grp-expense', '5001', 'Commercial Office Facility Rent', 1, 1, 600000.00);

    -- Voucher Books
    INSERT INTO voucher_books (id, tenantId, documentSeriesType, prefix, nextNumber, paddingLength, yearlyReset)
    VALUES
      ('vb-sinv', '${defaultTenantId}', 'SALES_INVOICE', 'INV-2025-', 1045, 5, 1),
      ('vb-pinv', '${defaultTenantId}', 'PURCHASE_INVOICE', 'PINV-2025-', 402, 5, 1),
      ('vb-quot', '${defaultTenantId}', 'QUOTATION', 'QUOT-2025-', 88, 4, 1),
      ('vb-sord', '${defaultTenantId}', 'SALES_ORDER', 'SO-2025-', 210, 4, 1),
      ('vb-pord', '${defaultTenantId}', 'PURCHASE_ORDER', 'PO-2025-', 150, 4, 1),
      ('vb-preceipt', '${defaultTenantId}', 'PAYMENT_RECEIPT', 'RCPT-2025-', 512, 5, 1),
      ('vb-pout', '${defaultTenantId}', 'PAYOUT_RECEIPT', 'PAY-2025-', 330, 5, 1),
      ('vb-vadv', '${defaultTenantId}', 'VENDOR_ADVANCE', 'ADV-2025-', 84, 4, 1);

    -- Financial Years & Periods
    INSERT INTO financial_years (id, tenantId, name, startDate, endDate, isClosed)
    VALUES
      ('fy-2025-2026', '${defaultTenantId}', 'FY 2025-2026', '2025-04-01', '2026-03-31', 0),
      ('fy-2024-2025', '${defaultTenantId}', 'FY 2024-2025', '2024-04-01', '2025-03-31', 1);

    INSERT INTO financial_periods (id, financialYearId, name, periodNumber, startDate, endDate, isClosed)
    VALUES
      ('fp-2025-q1', 'fy-2025-2026', 'Period Q1 (Apr-Jun)', 1, '2025-04-01', '2025-06-30', 1),
      ('fp-2025-q2', 'fy-2025-2026', 'Period Q2 (Jul-Sep)', 2, '2025-07-01', '2025-09-30', 1),
      ('fp-2025-q3', 'fy-2025-2026', 'Period Q3 (Oct-Dec)', 3, '2025-10-01', '2025-12-31', 0),
      ('fp-2025-q4', 'fy-2025-2026', 'Period Q4 (Jan-Mar)', 4, '2026-01-01', '2026-03-31', 0);

    -- Vendors
    INSERT INTO vendors (id, tenantId, name, code, email, phone, balanceDue, currency)
    VALUES
      ('vend-01', '${defaultTenantId}', 'Apex Cloud Infrastructure Ltd', 'VEND-APX-01', 'billing@apexcloud.io', '+91 8012345678', 125000.00, 'INR'),
      ('vend-02', '${defaultTenantId}', 'Kavita Heavy Paper & Packaging', 'VEND-KVT-02', 'orders@kavitapackaging.com', '+91 9922334455', 45200.00, 'INR'),
      ('vend-03', '${defaultTenantId}', 'Global Microchip Supplies Co.', 'VEND-GMS-03', 'support@gms-components.com', '+1 415 555 9812', 3200.00, 'USD');

    -- Bank Accounts
    INSERT INTO bank_accounts (id, tenantId, accountName, accountNumber, bankName, ifscCode, balance, currency)
    VALUES
      ('bank-01', '${defaultTenantId}', 'Corporate Primary Current A/C', '50200041289123', 'HDFC Bank', 'HDFC0000123', 4820500.50, 'INR'),
      ('bank-02', '${defaultTenantId}', 'Treasury & Reserve Account', '000000389211234', 'State Bank of India', 'SBIN0004011', 1250000.00, 'INR'),
      ('bank-03', '${defaultTenantId}', 'Overseas Trade Wire Account', '891022938102', 'HSBC Mumbai', 'HSBC0400002', 45000.00, 'USD');

    -- Sample General Documents
    INSERT INTO general_documents (id, tenantId, documentNumber, documentType, documentSeriesId, partyId, partyName, status, date, dueDate, notes, amountSnapshotJson, extraDetailsJson)
    VALUES
      ('doc-inv-1044', '${defaultTenantId}', 'INV-2025-01044', 'SALES_INVOICE', 'vb-sinv', 'user-cust-01', 'Acme Trading Industries', 'ISSUED', '2025-09-15', '2025-10-15', 'Monthly Enterprise Software Licensing & Maintenance', '{"subtotal":150000,"taxableAmount":150000,"gstAmount":27000,"total":177000,"totalInWords":"One Lakh Seventy Seven Thousand Rupees Only"}', '{"poNumber":"PO-ACM-9981","warehouseId":"wh-01"}'),
      ('doc-quot-0087', '${defaultTenantId}', 'QUOT-2025-0087', 'QUOTATION', 'vb-quot', 'user-cust-01', 'Acme Trading Industries', 'ACCEPTED', '2025-09-12', '2025-09-26', 'Annual Accounting SaaS & Custom API Integration Proposal', '{"subtotal":420000,"taxableAmount":420000,"gstAmount":75600,"total":495600,"totalInWords":"Four Lakh Ninety Five Thousand Six Hundred Rupees Only"}', '{"validityDays":30}'),
      ('doc-po-0149', '${defaultTenantId}', 'PO-2025-00149', 'PURCHASE_ORDER', 'vb-pord', 'vend-01', 'Apex Cloud Infrastructure Ltd', 'SENT', '2025-09-10', '2025-09-25', 'Dedicated GPU Cluster & Redis High Availability Instances', '{"subtotal":85000,"taxableAmount":85000,"gstAmount":15300,"total":100300,"totalInWords":"One Lakh Three Hundred Rupees Only"}', '{"deliveryTerms":"Immediate Electronic Delivery"}');

    -- Document Lines
    INSERT INTO general_document_lines (id, documentId, itemId, itemName, quantity, unitPrice, taxPercentage, discount, amount, sortOrder)
    VALUES
      ('line-01', 'doc-inv-1044', 'item-saas', 'RapidLinks Enterprise Suite Annual License (Tier 3)', 1, 120000, 18, 0, 141600, 1),
      ('line-02', 'doc-inv-1044', 'item-supp', 'Priority 24/7 SLA Engineering Support Addon', 1, 30000, 18, 0, 35400, 2);

    -- Sample Payout Document
    INSERT INTO payout_documents (id, tenantId, documentNumber, documentType, kind, vendorId, vendorName, date, currency, exchangeRate, totalAmount, status, paymentRecordsJson, allocatedPurchasesJson, notes)
    VALUES
      ('pout-01', '${defaultTenantId}', 'PAY-2025-00329', 'PAYOUT_RECEIPT', 'RECEIPT', 'vend-01', 'Apex Cloud Infrastructure Ltd', '2025-09-14', 'INR', 1.0, 50000.00, 'CONFIRMED', '[{"paymentMethod":"NEFT","bankAccountId":"bank-01","reference":"HDFC-NEFT-991203","amount":50000}]', '[{"invoiceNumber":"PINV-2025-00401","amountAllocated":50000}]', 'Server hosting fee settlement');
  `);
}
