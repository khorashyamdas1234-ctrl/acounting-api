export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "RapidLinks Accounting API",
    version: "1.0.0",
    description: "Production-ready enterprise accounting REST API designed for multi-tenant organizations. Features standard double-entry accounting groups, chart of accounts, voucher books, financial periods, sales & purchase documents, payout receipts, media storage, Redis caching, SQL relational database, and an AI accounting assistant.",
    contact: {
      name: "RapidLinks Engineering Support",
      email: "api-support@rapidlinks.com"
    }
  },
  servers: [
    {
      url: "/",
      description: "Current Server Instance"
    }
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Standard JWT Bearer token authentication"
      }
    },
    schemas: {
      ApiResponseEnvelope: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          statusCode: { type: "integer", example: 200 },
          message: { type: "string", example: "Request completed successfully" },
          data: { type: "object" }
        },
        required: ["success", "statusCode", "message", "data"]
      },
      LoginDto: {
        type: "object",
        required: ["identifier", "password"],
        properties: {
          identifier: { type: "string", example: "admin@rapidlinks.com" },
          password: { type: "string", example: "admin123" },
          domain: { type: "string", example: "localhost.com" }
        }
      },
      RegisterUserDto: {
        type: "object",
        required: ["identifier", "name", "password"],
        properties: {
          identifier: { type: "string", example: "acc.manager@domain.com" },
          name: { type: "string", example: "Deepak Sharma" },
          email: { type: "string", example: "deepak@domain.com" },
          phone: { type: "string", example: "+91 9876543210" },
          password: { type: "string", example: "StrongPassword123!" },
          roleCode: { 
            type: "string", 
            enum: ["ADMIN", "AREA_FRANCHISE", "CASH_COUNTER", "CUSTOMER_ONLINE", "CUSTOMER_OFFLINE"],
            example: "CASH_COUNTER" 
          },
          userCategory: { type: "string", example: "INTERNAL" },
          accountType: { type: "string", example: "INDIVIDUAL" },
          department: { type: "string", example: "ACCOUNTS" },
          domain: { type: "string", example: "localhost.com" }
        }
      },
      RefreshTokenDto: {
        type: "object",
        required: ["refresh_token"],
        properties: {
          refresh_token: { type: "string", example: "rt_sample_token_uuid_45910" }
        }
      },
      CreateAccountingGroupPayload: {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string", example: "Fixed Capital Assets" },
          parentGroupId: { type: "string", nullable: true, example: "grp-assets" },
          normalBalanceNature: { type: "string", enum: ["DEBIT", "CREDIT"], example: "DEBIT" }
        }
      },
      CreateChartOfAccountPayload: {
        type: "object",
        required: ["accountGroupId", "name", "allowManualEntries", "allowReconciliation"],
        properties: {
          accountGroupId: { type: "string", example: "grp-bank" },
          name: { type: "string", example: "Axis Bank Corporate Account" },
          allowManualEntries: { type: "boolean", example: true },
          allowReconciliation: { type: "boolean", example: true }
        }
      },
      CreateVoucherBookPayload: {
        type: "object",
        required: ["documentSeriesType", "prefix"],
        properties: {
          documentSeriesType: { type: "string", example: "SALES_INVOICE" },
          prefix: { type: "string", example: "INV-2026-" },
          nextNumber: { type: "integer", example: 1 }
        }
      },
      CreateFinancialYearPayload: {
        type: "object",
        required: ["name", "startDate", "endDate"],
        properties: {
          name: { type: "string", example: "FY 2026-2027" },
          startDate: { type: "string", format: "date", example: "2026-04-01" },
          endDate: { type: "string", format: "date", example: "2027-03-31" }
        }
      },
      ValidateTransactionDatePayload: {
        type: "object",
        required: ["date"],
        properties: {
          date: { type: "string", format: "date", example: "2025-11-15" }
        }
      },
      GeneralDocumentLineDto: {
        type: "object",
        required: ["itemName", "quantity", "unitPrice"],
        properties: {
          id: { type: "string" },
          itemId: { type: "string", example: "item-svc-01" },
          itemName: { type: "string", example: "Cloud ERP Support Plan" },
          quantity: { type: "number", example: 1 },
          unitPrice: { type: "number", example: 45000 },
          taxPercentage: { type: "number", example: 18 },
          discount: { type: "number", example: 0 },
          amount: { type: "number", example: 53100 }
        }
      },
      CreateGeneralDocumentDto: {
        type: "object",
        required: ["documentType", "documentSeriesId", "lines"],
        properties: {
          documentType: {
            type: "string",
            enum: [
              "QUOTATION", "PRO_FORMA_INVOICE", "SALES_ORDER", "PURCHASE_ORDER",
              "SALES_INVOICE", "PURCHASE_INVOICE", "CREDIT_NOTE", "DEBIT_NOTE",
              "DELIVERY_CHALLAN", "GOODS_RECEIPT_NOTE", "PAYMENT_RECEIPT"
            ],
            example: "SALES_INVOICE"
          },
          documentSeriesId: { type: "string", example: "vb-sinv" },
          partyId: { type: "string", example: "user-cust-01" },
          partyName: { type: "string", example: "Acme Trading Industries" },
          date: { type: "string", format: "date", example: "2025-09-18" },
          dueDate: { type: "string", format: "date", example: "2025-10-18" },
          notes: { type: "string", example: "Annual cloud license invoice" },
          documentConfiguration: { type: "object" },
          lines: {
            type: "array",
            items: { $ref: "#/components/schemas/GeneralDocumentLineDto" }
          },
          amountSnapshot: {
            type: "object",
            properties: {
              subtotal: { type: "number", example: 45000 },
              taxableAmount: { type: "number", example: 45000 },
              gstAmount: { type: "number", example: 8100 },
              total: { type: "number", example: 53100 },
              totalInWords: { type: "string", example: "Fifty Three Thousand One Hundred Rupees Only" }
            }
          },
          extraDetails: { type: "object" }
        }
      },
      CreatePayoutReceiptPayload: {
        type: "object",
        required: ["vendorId", "date", "currency", "paymentRecords"],
        properties: {
          vendorId: { type: "string", example: "vend-01" },
          date: { type: "string", format: "date", example: "2025-09-18" },
          currency: { type: "string", example: "INR" },
          exchangeRate: { type: "number", example: 1.0 },
          paymentRecords: {
            type: "array",
            items: {
              type: "object",
              properties: {
                paymentMethod: { type: "string", example: "NEFT" },
                bankAccountId: { type: "string", example: "bank-01" },
                reference: { type: "string", example: "HDFC-REF-1002" },
                amount: { type: "number", example: 25000 }
              }
            }
          },
          allocatedPurchases: {
            type: "array",
            items: {
              type: "object",
              properties: {
                invoiceNumber: { type: "string", example: "PINV-2025-00401" },
                amountAllocated: { type: "number", example: 25000 }
              }
            }
          },
          notes: { type: "string", example: "Vendor payout settlement" },
          signature: { type: "string" }
        }
      },
      CreateVendorAdvancePayload: {
        type: "object",
        required: ["vendorId", "date", "currency", "advanceAmount"],
        properties: {
          vendorId: { type: "string", example: "vend-02" },
          date: { type: "string", format: "date", example: "2025-09-18" },
          currency: { type: "string", example: "INR" },
          exchangeRate: { type: "number", example: 1.0 },
          advanceAmount: { type: "number", example: 15000 },
          notes: { type: "string", example: "Advance deposit for paper raw materials" }
        }
      },
      AiChatPayload: {
        type: "object",
        required: ["prompt"],
        properties: {
          prompt: { type: "string", example: "What is the standard procedure for closing a financial period in RapidLinks?" }
        }
      }
    }
  },
  paths: {
    "/auth/login": {
      post: {
        tags: ["Authentication & Tenant"],
        summary: "Authenticate user and issue tokens",
        description: "Validates credentials against tenant domain and returns user profile, tenant info, and JWT tokens.",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/LoginDto" } } }
        },
        responses: {
          200: { description: "Successful login", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiResponseEnvelope" } } } },
          401: { description: "Invalid credentials" }
        }
      }
    },
    "/auth/register": {
      post: {
        tags: ["Authentication & Tenant"],
        summary: "Register new user account",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/RegisterUserDto" } } }
        },
        responses: { 201: { description: "User registered successfully" } }
      }
    },
    "/auth/me": {
      get: {
        tags: ["Authentication & Tenant"],
        summary: "Get current authenticated tenant user",
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: "User details loaded" } }
      }
    },
    "/auth/logout": {
      post: {
        tags: ["Authentication & Tenant"],
        summary: "End user session",
        responses: { 200: { description: "Logged out" } }
      }
    },
    "/auth/refresh": {
      patch: {
        tags: ["Authentication & Tenant"],
        summary: "Exchange refresh token for new access token",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/RefreshTokenDto" } } }
        },
        responses: { 200: { description: "Tokens refreshed" } }
      }
    },
    "/auth/terms-and-conditions": {
      get: {
        tags: ["Authentication & Tenant"],
        summary: "Load tenant terms and conditions",
        parameters: [
          { name: "domain", in: "query", schema: { type: "string" } },
          { name: "category", in: "query", schema: { type: "string" } }
        ],
        responses: { 200: { description: "Terms retrieved" } }
      }
    },
    "/tenant/{tenantId}": {
      patch: {
        tags: ["Authentication & Tenant"],
        summary: "Update tenant settings",
        parameters: [{ name: "tenantId", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object" } } } },
        responses: { 200: { description: "Tenant settings updated" } }
      }
    },
    "/tenant/theme": {
      get: {
        tags: ["Authentication & Tenant"],
        summary: "Load tenant branding theme",
        parameters: [{ name: "domain", in: "query", schema: { type: "string" } }],
        responses: { 200: { description: "Theme configuration" } }
      }
    },
    "/users": {
      get: {
        tags: ["Users & Customers"],
        summary: "List users and customers with pagination & filters",
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 10 } },
          { name: "sortBy", in: "query", schema: { type: "string", default: "createdAt" } },
          { name: "order", in: "query", schema: { type: "string", enum: ["ASC", "DESC"], default: "DESC" } },
          { name: "search", in: "query", schema: { type: "string" } },
          { name: "roleCode", in: "query", schema: { type: "string" } },
          { name: "userCategory", in: "query", schema: { type: "string" } }
        ],
        responses: { 200: { description: "Paginated customer/user list matching frontend Zod schema" } }
      }
    },
    "/users/{id}": {
      get: {
        tags: ["Users & Customers"],
        summary: "Get user details by ID",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "User found" } }
      },
      put: {
        tags: ["Users & Customers"],
        summary: "Update user profile",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object" } } } },
        responses: { 200: { description: "User updated" } }
      }
    },
    "/users/register": {
      post: {
        tags: ["Users & Customers"],
        summary: "Create new user/customer directly",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/RegisterUserDto" } } } },
        responses: { 201: { description: "Created" } }
      }
    },
    "/users/change-password/{id}": {
      post: {
        tags: ["Users & Customers"],
        summary: "Change user password",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { password: { type: "string" } } } } } },
        responses: { 200: { description: "Password updated" } }
      }
    },
    "/warehouses": {
      get: {
        tags: ["Users & Customers"],
        summary: "Get all storage warehouses",
        responses: { 200: { description: "Warehouse list" } }
      }
    },
    "/customer-pickup-warehouses": {
      get: {
        tags: ["Users & Customers"],
        summary: "Get customer designated pickup warehouses",
        parameters: [{ name: "userAccountId", in: "query", schema: { type: "string" } }],
        responses: { 200: { description: "Pickup warehouses list" } }
      }
    },
    "/dashboard/last-actions": {
      get: {
        tags: ["Dashboard"],
        summary: "Recent invoice, quotation, or financial document actions",
        responses: { 200: { description: "Recent activity actions array" } }
      }
    },
    "/dashboard/last-client": {
      get: {
        tags: ["Dashboard"],
        summary: "Recent client activities and interaction events",
        responses: { 200: { description: "Recent client activity array" } }
      }
    },
    "/accounting/account-groups": {
      get: {
        tags: ["Accounting Setup"],
        summary: "List all account groups",
        responses: { 200: { description: "Account groups list" } }
      },
      post: {
        tags: ["Accounting Setup"],
        summary: "Create an accounting group",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/CreateAccountingGroupPayload" } } } },
        responses: { 201: { description: "Group created" } }
      }
    },
    "/accounting/account-groups/{id}": {
      get: {
        tags: ["Accounting Setup"],
        summary: "Get accounting group with linked chart of accounts",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Group details with accounts" } }
      }
    },
    "/accounting/chart-of-accounts": {
      get: {
        tags: ["Accounting Setup"],
        summary: "List all chart of accounts",
        responses: { 200: { description: "Chart of accounts" } }
      }
    },
    "/accounting/chart-of-accounts/{id}": {
      get: {
        tags: ["Accounting Setup"],
        summary: "Get one chart of account details",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Account details" } }
      }
    },
    "/accounting/account": {
      post: {
        tags: ["Accounting Setup"],
        summary: "Create a chart of account",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/CreateChartOfAccountPayload" } } } },
        responses: { 201: { description: "Account created" } }
      }
    },
    "/accounting/voucher-books": {
      get: {
        tags: ["Accounting Setup"],
        summary: "List all voucher books and document number series",
        responses: { 200: { description: "Voucher books list" } }
      }
    },
    "/accounting/voucher-books/{id}": {
      get: {
        tags: ["Accounting Setup"],
        summary: "Get one voucher book details",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Voucher book details" } }
      }
    },
    "/accounting/voucher-book": {
      post: {
        tags: ["Accounting Setup"],
        summary: "Bulk create voucher books",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "array",
                items: { $ref: "#/components/schemas/CreateVoucherBookPayload" }
              }
            }
          }
        },
        responses: { 201: { description: "Voucher books initialized" } }
      }
    },
    "/accounting/document-series/generate/{documentType}": {
      get: {
        tags: ["Accounting Setup", "General Documents"],
        summary: "Generate next sequential document number and series settings",
        parameters: [{ name: "documentType", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Next document number generated" } }
      }
    },
    "/accounting/current-financial-year": {
      get: {
        tags: ["Financial Years & Periods"],
        summary: "Get current open financial year and active period",
        responses: { 200: { description: "Current financial year and periods" } }
      }
    },
    "/accounting/financial-years": {
      get: {
        tags: ["Financial Years & Periods"],
        summary: "List all financial years and periods",
        responses: { 200: { description: "Financial years array" } }
      }
    },
    "/accounting/financial-years/{id}": {
      get: {
        tags: ["Financial Years & Periods"],
        summary: "Get one financial year and its quarterly/monthly periods",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Financial year details" } }
      }
    },
    "/accounting/financial-year": {
      post: {
        tags: ["Financial Years & Periods"],
        summary: "Create a new financial year",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/CreateFinancialYearPayload" } } } },
        responses: { 201: { description: "Financial year created" } }
      }
    },
    "/accounting/financial-years/{id}/close": {
      delete: {
        tags: ["Financial Years & Periods"],
        summary: "Close a financial year",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Financial year closed" } }
      }
    },
    "/accounting/financial-period/{id}/close": {
      delete: {
        tags: ["Financial Years & Periods"],
        summary: "Close an accounting financial period",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Period closed" } }
      }
    },
    "/accounting/transactions/validate": {
      post: {
        tags: ["Financial Years & Periods"],
        summary: "Validate whether a transaction date falls into an open accounting period",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/ValidateTransactionDatePayload" } } } },
        responses: { 200: { description: "Validation result" } }
      }
    },
    "/accounting/general-documents": {
      get: {
        tags: ["General Documents"],
        summary: "List documents (Invoices, Quotations, Purchase Orders, etc.) with pagination",
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 10 } },
          { name: "sortBy", in: "query", schema: { type: "string", default: "createdAt" } },
          { name: "order", in: "query", schema: { type: "string", enum: ["ASC", "DESC"], default: "DESC" } },
          { name: "documentType", in: "query", schema: { type: "string" } },
          { name: "status", in: "query", schema: { type: "string" } },
          { name: "search", in: "query", schema: { type: "string" } }
        ],
        responses: { 200: { description: "Paginated general documents" } }
      }
    },
    "/accounting/general-documents/{id}": {
      get: {
        tags: ["General Documents"],
        summary: "Get general document details and item lines",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Document details" } }
      },
      patch: {
        tags: ["General Documents"],
        summary: "Update general document and item lines",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object" } } } },
        responses: { 200: { description: "Document updated" } }
      }
    },
    "/accounting/general-documents/{documentNumber}": {
      post: {
        tags: ["General Documents"],
        summary: "Create a general document (Invoice, Quotation, PO)",
        parameters: [{ name: "documentNumber", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/CreateGeneralDocumentDto" } } } },
        responses: { 201: { description: "Document created" } }
      }
    },
    "/accounting/get-general-document-lines/{documentType}": {
      get: {
        tags: ["General Documents"],
        summary: "Load line schema configuration for a document type",
        parameters: [{ name: "documentType", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Line configuration schema" } }
      }
    },
    "/accounting/get-general-document-extra-details/{documentType}": {
      get: {
        tags: ["General Documents"],
        summary: "Load extra detail fields and terms defaults for document type",
        parameters: [{ name: "documentType", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Extra details defaults" } }
      }
    },
    "/api/payout-documents": {
      get: {
        tags: ["Payout Documents"],
        summary: "List payout receipts and vendor advances",
        parameters: [
          { name: "documentType", in: "query", schema: { type: "string" } },
          { name: "kind", in: "query", schema: { type: "string", enum: ["RECEIPT", "ADVANCE"] } },
          { name: "search", in: "query", schema: { type: "string" } },
          { name: "status", in: "query", schema: { type: "string" } },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 10 } }
        ],
        responses: { 200: { description: "Payout documents list" } }
      }
    },
    "/api/payout-documents/receipt": {
      post: {
        tags: ["Payout Documents"],
        summary: "Create a payout receipt for settling vendor invoices",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/CreatePayoutReceiptPayload" } } } },
        responses: { 201: { description: "Payout receipt issued" } }
      }
    },
    "/api/payout-documents/advance": {
      post: {
        tags: ["Payout Documents"],
        summary: "Create a vendor advance payment record",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/CreateVendorAdvancePayload" } } } },
        responses: { 201: { description: "Vendor advance issued" } }
      }
    },
    "/api/payout-documents/series": {
      get: {
        tags: ["Payout Documents"],
        summary: "Get document series for payout documents",
        parameters: [{ name: "documentType", in: "query", schema: { type: "string" } }],
        responses: { 200: { description: "Series configuration" } }
      }
    },
    "/api/payout-documents/next-number": {
      get: {
        tags: ["Payout Documents"],
        summary: "Get next payout receipt number",
        parameters: [
          { name: "documentType", in: "query", schema: { type: "string" } },
          { name: "seriesId", in: "query", schema: { type: "string" } }
        ],
        responses: { 200: { description: "Next sequential number" } }
      }
    },
    "/api/vendors": {
      get: {
        tags: ["Payout Documents"],
        summary: "List registered vendors and payable balances",
        responses: { 200: { description: "Vendors array" } }
      }
    },
    "/api/vendors/{vendorId}/unpaid-purchases": {
      get: {
        tags: ["Payout Documents"],
        summary: "List unpaid purchase invoices for a specific vendor",
        parameters: [{ name: "vendorId", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Unpaid purchases list" } }
      }
    },
    "/api/bank-accounts": {
      get: {
        tags: ["Payout Documents"],
        summary: "List business bank and cash accounts",
        responses: { 200: { description: "Bank accounts" } }
      }
    },
    "/api/payment-methods": {
      get: {
        tags: ["Payout Documents"],
        summary: "List supported payment methods (NEFT, RTGS, UPI, Cheque, Cash)",
        responses: { 200: { description: "Payment methods" } }
      }
    },
    "/api/exchange-rate": {
      get: {
        tags: ["Payout Documents"],
        summary: "Get currency exchange rate (default to INR)",
        parameters: [
          { name: "from", in: "query", schema: { type: "string", default: "USD" } },
          { name: "to", in: "query", schema: { type: "string", default: "INR" } }
        ],
        responses: { 200: { description: "Exchange rate" } }
      }
    },
    "/storage/upload": {
      post: {
        tags: ["Storage & Media"],
        summary: "Upload files and attachments (multipart/form-data)",
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                properties: {
                  files: { type: "array", items: { type: "string", format: "binary" } },
                  prefix: { type: "string" }
                }
              }
            }
          }
        },
        responses: { 200: { description: "Uploaded file keys and urls" } }
      }
    },
    "/storage/signed-url": {
      get: {
        tags: ["Storage & Media"],
        summary: "Generate temporary presigned URL for secure access",
        parameters: [
          { name: "key", in: "query", required: true, schema: { type: "string" } },
          { name: "expiresIn", in: "query", schema: { type: "integer", default: 18000 } }
        ],
        responses: { 200: { description: "Signed access URL" } }
      }
    },
    "/api/ai/accounting-assistant": {
      post: {
        tags: ["AI Accounting Assistant"],
        summary: "Consult the AI Accounting Advisor (Gemini powered)",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/AiChatPayload" } } } },
        responses: { 200: { description: "Expert accounting guidance" } }
      }
    },
    "/api/redis/stats": {
      get: {
        tags: ["Redis & System Monitor"],
        summary: "Get real-time Redis cache metrics, hits, misses, and memory stats",
        responses: { 200: { description: "Redis metrics" } }
      }
    },
    "/api/redis/keys": {
      get: {
        tags: ["Redis & System Monitor"],
        summary: "Dump cached Redis keys, TTL countdown, and sizes",
        responses: { 200: { description: "Active Redis keys" } }
      }
    },
    "/api/redis/flush": {
      post: {
        tags: ["Redis & System Monitor"],
        summary: "Flush all Redis keys and reset cache",
        responses: { 200: { description: "Cache cleared" } }
      }
    },
    "/api/system/sql-query": {
      post: {
        tags: ["Redis & System Monitor"],
        summary: "Execute read-only SQL SELECT query on relational database",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", properties: { sql: { type: "string", example: "SELECT * FROM chart_of_accounts LIMIT 5" } } } } }
        },
        responses: { 200: { description: "Query results" } }
      }
    }
  }
};
