import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';

import { createServer as createViteServer } from 'vite';

import { getDb } from './server/db.js';
import { openApiSpec } from './server/openapi.js';

import {
  authRouter,
  tenantRouter,
} from './server/routes/auth.js';

import { usersRouter } from './server/routes/users.js';
import { dashboardRouter } from './server/routes/dashboard.js';
import { accountingRouter } from './server/routes/accounting.js';
import { documentsRouter } from './server/routes/documents.js';
import { payoutsRouter } from './server/routes/payouts.js';
import { storageRouter } from './server/routes/storage.js';
import { aiRouter } from './server/routes/ai.js';
import { systemRouter } from './server/routes/redis-monitor.js';

const PORT = 3000;
const HOST = '0.0.0.0';

async function startServer() {
  const app = express();

  // ============================================
  // INITIALIZE DATABASE
  // ============================================

  await getDb();

  // ============================================
  // UNIVERSAL CORS & PRIVATE NETWORK ACCESS
  // ============================================

  app.use((req, res, next) => {
    // Private Network Access (RFC1918) - Crucial for local LAN / Wi-Fi IPs (10.x.x.x, 192.168.x.x)
    res.setHeader('Access-Control-Allow-Private-Network', 'true');

    // Dynamically mirror requested headers if present
    const reqHeaders = req.headers['access-control-request-headers'];
    if (reqHeaders) {
      res.setHeader('Access-Control-Allow-Headers', reqHeaders);
    }
    next();
  });

  app.use(
    cors({
      origin: true,
      credentials: true,
      methods: [
        'GET',
        'HEAD',
        'POST',
        'PUT',
        'PATCH',
        'DELETE',
        'OPTIONS',
      ],
      allowedHeaders: ['*'],
      exposedHeaders: [
        'X-Cache',
        'X-Cache-Key',
        'X-Cache-TTL',
        'X-Response-Time',
        'Content-Disposition',
        'Content-Type',
        'Content-Length',
        'Authorization',
        '*',
      ],
      optionsSuccessStatus: 204,
    })
  );

  app.options('*', (req, res) => {
    res.setHeader('Access-Control-Allow-Private-Network', 'true');
    res.status(204).end();
  });

  // ============================================
  // MIDDLEWARE
  // ============================================

  app.use(cookieParser());

  app.use(
    express.json({
      limit: '20mb',
    })
  );

  app.use(
    express.urlencoded({
      extended: true,
      limit: '20mb',
    })
  );

  // ============================================
  // STATIC UPLOADS
  // ============================================

  app.use(
    '/uploads',
    express.static(
      path.join(process.cwd(), 'uploads')
    )
  );

  // ============================================
  // OPENAPI SPECIFICATION
  // ============================================

  app.get(
    ['/swagger.json', '/api/openapi.json'],
    (_req, res) => {
      res.json(openApiSpec);
    }
  );

  // ============================================
  // SWAGGER UI
  // ============================================

  const swaggerHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />

  <title>RapidLinks Accounting API</title>

  <link
    rel="stylesheet"
    href="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui.css"
  />

  <style>
    html {
      box-sizing: border-box;
      overflow-y: scroll;
    }

    *,
    *::before,
    *::after {
      box-sizing: inherit;
    }

    body {
      margin: 0;
      background: #fafafa;
      font-family: sans-serif;
    }

    .topbar {
      background: #0f172a;
      padding: 12px 24px;
    }

    .topbar-wrapper {
      display: flex;
      align-items: center;
      justify-content: space-between;
      max-width: 1460px;
      margin: 0 auto;
      gap: 20px;
    }

    .topbar a {
      color: white;
      text-decoration: none;
      font-weight: 700;
      font-size: 18px;
    }

    .nav-badge {
      background: #2563eb;
      color: white;
      font-size: 11px;
      padding: 4px 8px;
      border-radius: 9999px;
      margin-left: 10px;
    }

    .back-btn {
      background: #334155;
      color: #f8fafc;
      padding: 8px 14px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
    }

    .back-btn:hover {
      background: #475569;
    }

    @media (max-width: 768px) {
      .topbar-wrapper {
        flex-direction: column;
        align-items: flex-start;
      }

      .topbar a {
        font-size: 15px;
      }
    }
  </style>
</head>

<body>
  <div class="topbar">
    <div class="topbar-wrapper">
      <a href="/docs">
        ⚡ RapidLinks Accounting API
        <span class="nav-badge">OpenAPI 3.0</span>
      </a>

      <a href="/" class="back-btn">
        Open API Explorer App →
      </a>
    </div>
  </div>

  <div id="swagger-ui"></div>

  <script src="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui-bundle.js"></script>

  <script src="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui-standalone-preset.js"></script>

  <script>
    window.onload = function () {
      window.ui = SwaggerUIBundle({
        url: "/swagger.json",

        dom_id: "#swagger-ui",

        deepLinking: true,

        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],

        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],

        layout: "BaseLayout",

        defaultModelsExpandDepth: 1,

        defaultModelExpandDepth: 1,

        docExpansion: "list",

        filter: true,

        persistAuthorization: true
      });
    };
  </script>
</body>
</html>
  `;

  app.get(
    ['/docs', '/swagger', '/api-docs'],
    (_req, res) => {
      res.type('html').send(swaggerHtml);
    }
  );

  // ============================================
  // API ROUTES
  // ============================================

  app.use(
    ['/auth', '/api/auth', '/api/api/auth'],
    authRouter
  );

  app.use(
    ['/tenant', '/api/tenant', '/api/api/tenant'],
    tenantRouter
  );

  app.use(
    ['/', '/api', '/api/api'],
    usersRouter
  );

  app.use(
    ['/dashboard', '/api/dashboard', '/api/api/dashboard'],
    dashboardRouter
  );

  app.use(
    ['/accounting', '/api/accounting', '/api/api/accounting'],
    accountingRouter
  );

  app.use(
    ['/accounting', '/api/accounting', '/api/api/accounting'],
    documentsRouter
  );

  app.use(
    ['/api', '/', '/api/api'],
    payoutsRouter
  );

  app.use(
    ['/storage', '/api/storage', '/api/api/storage'],
    storageRouter
  );

  app.use(
    '/api/ai',
    aiRouter
  );

  app.use(
    '/api',
    systemRouter
  );

  // ============================================
  // VITE DEVELOPMENT / PRODUCTION
  // ============================================

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
      },

      appType: 'spa',
    });

    app.use(vite.middlewares);
  } else {
    const distPath = path.join(
      process.cwd(),
      'dist'
    );

    app.use(
      express.static(distPath)
    );

    // SPA fallback
    app.get(/.*/, (_req, res) => {
      res.sendFile(
        path.join(distPath, 'index.html')
      );
    });
  }

  // ============================================
  // START SERVER
  // ============================================

  app.listen(PORT, HOST, () => {
    console.log(
      `🚀 RapidLinks Accounting API Server running at http://${HOST}:${PORT}`
    );

    console.log(
      `📖 Swagger OpenAPI Documentation available at http://${HOST}:${PORT}/docs`
    );

    console.log(
      `📦 Relational SQL Database & Redis Cache Engine initialized`
    );
  });
}

// ============================================
// ERROR HANDLING
// ============================================

startServer().catch((err) => {
  console.error(
    'Fatal error starting server:',
    err
  );

  process.exit(1);
});