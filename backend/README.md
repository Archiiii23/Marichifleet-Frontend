# MarichiFleet OS - Standalone Core API Backend

A production-grade, modular monolith backend for the MarichiFleet Transport ERP, built with Node 20+, Express, and TypeScript (ESM). Adheres strictly to the architectural principles specified in `backend.md` and `system_design.md`.

---

## 🌟 Key Architecture & Principles

- **Modular Monolith**: Separated bounded contexts with strict boundaries (`trips`, `bookings`, `fleet`, `finance`, `ledger`, `tower`, `approvals`, `auth`).
- **Law 3 (No un-scoped queries)**: Every query and mutation is partitioned by `tenantId` via `TenantScopedStore`.
- **Law 4 (Authoritative RBAC)**: Canonical `can(ctx, action, resource)` permission function covering the 17-role matrix.
- **Law 5 (Append-Only Ledger)**: Double-entry journal entries for freight revenue, GST liability (SAC 996511), and payments.
- **Law 6 (Framework-level Idempotency)**: Automatic `Idempotency-Key` tracking and replay cache.
- **Decision #7 (Realtime SSE)**: Server-Sent Events stream for live vehicle tracking and telemetry (`/api/tower/stream`).
- **Zero-Friction Fallback**: Connects to MongoDB when configured; automatically falls back to an in-memory tenant store with preloaded Indian logistics seed data so it runs out-of-the-box.

---

## 📁 Directory Structure

```
backend/
├── src/
│   ├── app.ts                         # Express app assembly & middleware stack
│   ├── server.ts                      # Server bootstrap & lifecycle listeners
│   ├── config/
│   │   └── env.ts                     # Zod-validated environment config
│   ├── platform/
│   │   ├── types.ts                   # AuthContext, UserRole, RequestContext
│   │   ├── errors.ts                  # AppError & stable error codes
│   │   ├── logger.ts                  # Pino logger
│   │   └── middleware/
│   │       ├── auth.ts                # JWT authentication & persona context
│   │       ├── authz.ts               # can() RBAC permission enforcement
│   │       ├── tenantScope.ts         # Multi-tenant boundary check (Law 3)
│   │       ├── idempotency.ts         # Idempotency-Key header cache (Law 6)
│   │       ├── requestId.ts           # X-Request-Id tracing
│   │       └── errorHandler.ts        # Centralized RFC 7807 error responses
│   ├── db/
│   │   ├── client.ts                  # MongoDB connection & fallback detection
│   │   ├── store.ts                   # TenantScopedStore repository
│   │   └── seeds/
│   │       └── seedData.ts            # Realistic seed data (Delhi, Mumbai, Bengaluru)
│   └── modules/
│       ├── auth/                      # Login, /me, and persona switching
│       ├── trips/                     # Trip lifecycle, dispatch, checkpoints, ePOD
│       ├── bookings/                  # Booking intake and quoting
│       ├── fleet/                     # Vehicles and drivers registry
│       ├── finance/                   # Invoicing, GST e-Invoicing (IRN/QR), DSO
│       ├── ledger/                    # Double-entry general ledger & trial balance
│       ├── tower/                     # Live Control Tower & SSE stream
│       └── approvals/                 # Approvals inbox (detention waivers, overrides)
├── Dockerfile                         # Production multi-stage Docker build
├── .dockerignore
├── .env.example
├── package.json
└── tsconfig.json
```

---

## 🚀 Quick Start (Local Development)

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

### 3. Run Development Server
```bash
npm run dev
```
The API server will boot on `http://localhost:4000`.

- Healthcheck: `http://localhost:4000/healthz`
- API Root: `http://localhost:4000/api`

---

## 🛠️ Production Build & Run

```bash
# Compile TypeScript to dist/
npm run build

# Start production server
npm start
```

---

## 🐳 Running with Docker

```bash
# Build Docker image
docker build -t marichifleet-backend .

# Run container
docker run -p 4000:4000 \
  -e PORT=4000 \
  -e NODE_ENV=production \
  -e CORS_ORIGIN="*" \
  marichifleet-backend
```

---

## 🌐 Deploying Frontend & Backend Separately

### Backend Deployment Options
- **Railway / Render**: Connect this repository, set Root Directory to `backend`, build command `npm run build`, start command `npm start`.
- **AWS ECS / Google Cloud Run / Fly.io**: Use the included multi-stage `Dockerfile`.
- **Environment variables to set on backend host**:
  - `PORT=4000` (or host provided port)
  - `NODE_ENV=production`
  - `CORS_ORIGIN=https://your-frontend-domain.com`
  - `JWT_SECRET=your-production-secret-key`
  - `MONGODB_URI=mongodb+srv://...` (optional)

### Frontend Deployment (`marichifleet-os`)
- In `marichifleet-os/.env.production` (or hosting dashboard), set:
  ```env
  VITE_API_URL=https://your-backend-api.com/api
  ```
- Deploy to Vercel, Netlify, or Cloudflare Pages with build command `npm run build` and output directory `dist`.

---

## 📡 Core API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/healthz` | Unauthenticated orchestrator healthcheck |
| `POST` | `/api/auth/login` | Login and obtain JWT |
| `GET` | `/api/auth/me` | Current authenticated user context |
| `POST` | `/api/auth/persona-switch` | Dynamic role switching for testing |
| `GET` | `/api/trips` | List trips with filters |
| `GET` | `/api/trips/:tripId` | Trip detail with checkpoints |
| `POST` | `/api/trips` | Create new trip |
| `PATCH` | `/api/trips/:tripId/status` | Advance trip status |
| `POST` | `/api/trips/:tripId/pod` | Submit electronic Proof of Delivery (ePOD) |
| `GET` | `/api/trips/:tripId/events` | Audit event stream for trip |
| `GET` | `/api/fleet/vehicles` | Vehicles list with RC/fitness/fuel |
| `GET` | `/api/fleet/drivers` | Drivers list with license status |
| `GET` | `/api/finance/invoices` | List invoices with GST breakdown |
| `POST` | `/api/finance/invoices/:id/finalise` | Generate 64-char IRN & signed QR code |
| `POST` | `/api/finance/invoices/:id/pay` | Record invoice payment & update ledger |
| `GET` | `/api/finance/receivables` | DSO ageing buckets |
| `GET` | `/api/ledger/entries` | Double-entry journal entries (Law 5) |
| `GET` | `/api/ledger/trial-balance` | Self-balancing trial balance |
| `GET` | `/api/tower/vehicles` | Live vehicle positions & sensors |
| `GET` | `/api/tower/stream` | **Server-Sent Events (SSE)** telemetry stream |
| `GET` | `/api/tower/exceptions` | Active exceptions queue |
| `POST` | `/api/tower/exceptions/:id/resolve` | Resolve operational alert |
| `GET` | `/api/approvals` | Approvals inbox |
| `POST` | `/api/approvals/:id/decide` | Approve/reject request with audit note |
