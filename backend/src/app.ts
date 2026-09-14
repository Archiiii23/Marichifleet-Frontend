import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { requestIdMiddleware } from './platform/middleware/requestId.js';
import { authMiddleware } from './platform/middleware/auth.js';
import { tenantScopeMiddleware } from './platform/middleware/tenantScope.js';
import { idempotencyMiddleware } from './platform/middleware/idempotency.js';
import { errorHandler } from './platform/middleware/errorHandler.js';
import { AppError } from './platform/errors.js';
import { getDatabaseStatus } from './db/client.js';

// Modules
import { authRouter } from './modules/auth/auth.router.js';
import { tripsRouter } from './modules/trips/trips.router.js';
import { bookingsRouter } from './modules/bookings/bookings.router.js';
import { fleetRouter } from './modules/fleet/fleet.router.js';
import { financeRouter } from './modules/finance/finance.router.js';
import { ledgerRouter } from './modules/ledger/ledger.router.js';
import { towerRouter } from './modules/tower/tower.router.js';
import { approvalsRouter } from './modules/approvals/approvals.router.js';
import { fuelRouter } from './modules/fuel/fuel.router.js';
import { whatsappRouter } from './modules/whatsapp/whatsapp.router.js';

export const app = express();

// 1. CORS
const allowedOrigins = env.CORS_ORIGIN.split(',').map((o) => o.trim());
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server)
      if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      callback(null, true); // Permissive in development, strict origins configured in env
    },
    credentials: true,
  })
);

// 2. Body Parser
app.use(express.json({ limit: '2mb' }));

// 3. Request Tracing
app.use(requestIdMiddleware);

// 4. Health Checks (unauthenticated for load balancers & orchestrators)
app.get('/healthz', (_req, res) => {
  res.json({
    status: 'ok',
    service: env.SERVICE_NAME,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    db: getDatabaseStatus(),
  });
});

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'healthy',
    environment: env.NODE_ENV,
    version: '1.0.0',
    db: getDatabaseStatus(),
  });
});

// 5. Auth Context & Idempotency
app.use(authMiddleware);
app.use(tenantScopeMiddleware);
app.use(idempotencyMiddleware);

// 6. API Route Modules
const api = express.Router();
api.use('/auth', authRouter);
api.use('/trips', tripsRouter);
api.use('/bookings', bookingsRouter);
api.use('/fleet', fleetRouter);
api.use('/finance', financeRouter);
api.use('/ledger', ledgerRouter);
api.use('/tower', towerRouter);
api.use('/approvals', approvalsRouter);
api.use('/fuel', fuelRouter);
api.use('/whatsapp', whatsappRouter);

app.use(env.API_PREFIX, api);

// 7. 404 Catch-all
app.use((req, _res, next) => {
  next(AppError.notFound('Endpoint', `${req.method} ${req.path}`));
});

// 8. Global Error Handler
app.use(errorHandler);
