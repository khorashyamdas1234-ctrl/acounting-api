import { ApiEndpointDef } from '../types.js';

export const API_ENDPOINTS: ApiEndpointDef[] = [
  // Auth
  {
    id: 'auth-login',
    category: 'Authentication',
    method: 'POST',
    path: '/auth/login',
    summary: 'Authenticate user & issue tokens',
    description: 'Validates user credentials against tenant domain and returns JWT tokens and session data.',
    defaultBody: {
      identifier: 'admin@rapidlinks.com',
      password: 'admin123',
      domain: 'localhost.com'
    },
    tags: ['Auth']
  },
  {
    id: 'auth-me',
    category: 'Authentication',
    method: 'GET',
    path: '/auth/me',
    summary: 'Get current authenticated tenant user',
    tags: ['Auth']
  },
  {
    id: 'auth-terms',
    category: 'Authentication',
    method: 'GET',
    path: '/auth/terms-and-conditions?domain=localhost.com&category=GENERAL',
    summary: 'Load tenant terms & conditions',
    tags: ['Auth']
  },
  {
    id: 'tenant-theme',
    category: 'Authentication',
    method: 'GET',
    path: '/tenant/theme?domain=localhost.com',
    summary: 'Load tenant theme configuration (Redis cached)',
    tags: ['Auth', 'Tenant']
  },

  // Users & Customers
  {
    id: 'users-list',
    category: 'Users & Customers',
    method: 'GET',
    path: '/users?page=1&limit=10&sortBy=createdAt&order=DESC',
    summary: 'List users and customers (with Zod-compatible schema)',
    tags: ['Users']
  },
  {
    id: 'users-warehouses',
    category: 'Users & Customers',
    method: 'GET',
    path: '/warehouses',
    summary: 'Get all logistics warehouses',
    tags: ['Users']
  },
  {
    id: 'customer-pickups',
    category: 'Users & Customers',
    method: 'GET',
    path: '/customer-pickup-warehouses?userAccountId=user-cust-01',
    summary: 'Get designated customer pickup warehouses',
    tags: ['Users']
  },

  // Dashboard
  {
    id: 'dashboard-actions',
    category: 'Dashboard',
    method: 'GET',
    path: '/dashboard/last-actions',
    summary: 'Recent invoice, quotation, or payment actions',
    tags: ['Dashboard']
  },
  {
    id: 'dashboard-client',
    category: 'Dashboard',
    method: 'GET',
    path: '/dashboard/last-client',
    summary: 'Recent client activity & volume',
    tags: ['Dashboard']
  },

  // Accounting Setup
  {
    id: 'acc-groups',
    category: 'Accounting Setup',
    method: 'GET',
    path: '/accounting/account-groups',
    summary: 'List all accounting groups (Assets, Liabilities, etc.)',
    tags: ['Accounting']
  },
  {
    id: 'acc-create-group',
    category: 'Accounting Setup',
    method: 'POST',
    path: '/accounting/account-groups',
    summary: 'Create new accounting group',
    defaultBody: {
      name: 'Intangible Digital Assets',
      parentGroupId: 'grp-assets',
      normalBalanceNature: 'DEBIT'
    },
    tags: ['Accounting']
  },
  {
    id: 'chart-accounts',
    category: 'Accounting Setup',
    method: 'GET',
    path: '/accounting/chart-of-accounts',
    summary: 'Chart of Accounts (Redis Cache Interceptor: 300s TTL, auto-invalidation)',
    tags: ['Accounting', 'Redis Cached']
  },
  {
    id: 'document-series-all',
    category: 'Accounting Setup',
    method: 'GET',
    path: '/accounting/document-series',
    summary: 'Document Series list & configs (Redis Cache Interceptor: 300s TTL)',
    tags: ['Accounting', 'Redis Cached']
  },
  {
    id: 'voucher-books',
    category: 'Accounting Setup',
    method: 'GET',
    path: '/accounting/voucher-books',
    summary: 'Voucher books & numbering series (Redis Cache Interceptor: 300s TTL)',
    tags: ['Accounting', 'Redis Cached']
  },
  {
    id: 'generate-series',
    category: 'Accounting Setup',
    method: 'GET',
    path: '/accounting/document-series/generate/SALES_INVOICE',
    summary: 'Generate next sequential document number (Redis Cache Interceptor: 60s TTL)',
    tags: ['Accounting', 'Redis Cached']
  },

  // Financial Years & Periods
  {
    id: 'current-fy',
    category: 'Financial Periods',
    method: 'GET',
    path: '/accounting/current-financial-year',
    summary: 'Get active financial year & open quarterly periods',
    tags: ['Financial']
  },
  {
    id: 'validate-tx',
    category: 'Financial Periods',
    method: 'POST',
    path: '/accounting/transactions/validate',
    summary: 'Validate transaction date against open accounting periods',
    defaultBody: {
      date: '2025-11-15'
    },
    tags: ['Financial']
  },

  // General Documents
  {
    id: 'docs-list',
    category: 'General Documents',
    method: 'GET',
    path: '/accounting/general-documents?page=1&limit=10',
    summary: 'List general documents (Invoices, Quotations, POs)',
    tags: ['Documents']
  },
  {
    id: 'docs-create',
    category: 'General Documents',
    method: 'POST',
    path: '/accounting/general-documents/INV-2025-01046',
    summary: 'Create general sales invoice document',
    defaultBody: {
      documentType: 'SALES_INVOICE',
      documentSeriesId: 'vb-sinv',
      partyId: 'user-cust-01',
      partyName: 'Acme Trading Industries',
      date: '2025-09-18',
      dueDate: '2025-10-18',
      notes: 'Consulting and API Integration Services Invoice',
      lines: [
        {
          itemId: 'item-erp-01',
          itemName: 'RapidLinks Enterprise SaaS Subscription (Q3)',
          quantity: 1,
          unitPrice: 75000,
          taxPercentage: 18,
          discount: 5,
          amount: 84075
        }
      ],
      amountSnapshot: {
        subtotal: 75000,
        taxableAmount: 71250,
        gstAmount: 12825,
        total: 84075,
        totalInWords: 'Eighty Four Thousand Seventy Five Rupees Only'
      }
    },
    tags: ['Documents']
  },
  {
    id: 'docs-lines-schema',
    category: 'General Documents',
    method: 'GET',
    path: '/accounting/get-general-document-lines/SALES_INVOICE',
    summary: 'Load line configuration schema for document type',
    tags: ['Documents']
  },
  {
    id: 'docs-extra-details',
    category: 'General Documents',
    method: 'GET',
    path: '/accounting/get-general-document-extra-details/SALES_INVOICE',
    summary: 'Load default terms and transport details for document type',
    tags: ['Documents']
  },

  // Payout Documents
  {
    id: 'payout-vendors',
    category: 'Payouts & Banking',
    method: 'GET',
    path: '/api/vendors',
    summary: 'List registered vendors and payable balances',
    tags: ['Payouts']
  },
  {
    id: 'payout-unpaid',
    category: 'Payouts & Banking',
    method: 'GET',
    path: '/api/vendors/vend-01/unpaid-purchases',
    summary: 'List unpaid purchase invoices for a vendor',
    tags: ['Payouts']
  },
  {
    id: 'payout-banks',
    category: 'Payouts & Banking',
    method: 'GET',
    path: '/api/bank-accounts',
    summary: 'List corporate bank & cash accounts',
    tags: ['Payouts']
  },
  {
    id: 'payout-methods',
    category: 'Payouts & Banking',
    method: 'GET',
    path: '/api/payment-methods',
    summary: 'List supported payment channels (NEFT, RTGS, UPI)',
    tags: ['Payouts']
  },
  {
    id: 'payout-exchange',
    category: 'Payouts & Banking',
    method: 'GET',
    path: '/api/exchange-rate?from=USD&to=INR',
    summary: 'Get currency conversion rate to INR',
    tags: ['Payouts']
  },
  {
    id: 'payout-list',
    category: 'Payouts & Banking',
    method: 'GET',
    path: '/api/payout-documents',
    summary: 'List payout receipts and vendor advances',
    tags: ['Payouts']
  },
  {
    id: 'payout-create-receipt',
    category: 'Payouts & Banking',
    method: 'POST',
    path: '/api/payout-documents/receipt',
    summary: 'Create vendor payout receipt settlement',
    defaultBody: {
      vendorId: 'vend-01',
      date: '2025-09-18',
      currency: 'INR',
      exchangeRate: 1.0,
      paymentRecords: [
        {
          paymentMethod: 'NEFT',
          bankAccountId: 'bank-01',
          reference: 'HDFC-NEFT-884910',
          amount: 25000
        }
      ],
      allocatedPurchases: [
        {
          invoiceNumber: 'PINV-2025-00401',
          amountAllocated: 25000
        }
      ],
      notes: 'Partial settlement for server infrastructure hosting'
    },
    tags: ['Payouts']
  },

  // AI Assistant
  {
    id: 'ai-assistant',
    category: 'AI Assistant',
    method: 'POST',
    path: '/api/ai/accounting-assistant',
    summary: 'Consult AI Accounting Advisor',
    defaultBody: {
      prompt: 'What are the steps to close Q3 financial period in RapidLinks?'
    },
    tags: ['AI']
  },

  // System & Redis
  {
    id: 'sys-health',
    category: 'System & Redis',
    method: 'GET',
    path: '/api/system/health',
    summary: 'System health, SQL tables row count, and Redis status',
    tags: ['System']
  },
  {
    id: 'redis-stats',
    category: 'System & Redis',
    method: 'GET',
    path: '/api/redis/stats',
    summary: 'Redis cache hit/miss statistics and uptime',
    tags: ['Redis']
  },
  {
    id: 'redis-keys',
    category: 'System & Redis',
    method: 'GET',
    path: '/api/redis/keys',
    summary: 'Dump active cached Redis keys and TTLs',
    tags: ['Redis']
  }
];
