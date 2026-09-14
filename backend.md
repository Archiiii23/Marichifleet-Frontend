# MarichiFleet OS - Backend Implementation Companion

This document turns [system_design.md](./system_design.md) into an implementation plan for the current repository.

## 1. Current repository state

The current application is a TanStack Start frontend using Supabase directly through `src/services/`. The important existing seams are:

- `src/services/api.ts`: generic Supabase CRUD helpers.
- `src/services/workflows.ts`: booking, dispatch, trip, POD and invoice workflows.
- `src/services/gps.ts`: mock GPS provider and direct `gps_pings` writes.
- `src/services/notifications.ts`: notification and audit helpers.
- `src/services/queries.ts`: React Query wrappers and Supabase realtime subscriptions.

These services are prototype adapters, not the production backend described by the system design. In particular, the browser currently supplies `tenantId`, mutations are not consistently idempotent, and multi-document workflow changes are not one transaction. Keep the current services working while replacing their implementation behind the same frontend-facing contracts.

## 2. Target backend shape

Use one TypeScript codebase with separate entrypoints:

```text
backend/
  src/
    app.ts                         Express application
    server.ts                      HTTP process
    worker.ts                      BullMQ worker process
    webhook.ts                     thin webhook ingress
    stream-processor.ts            motion/geofence processor
    config/
    infra/
      mongo/                       ops and telemetry connections
      redis/
      object-store/
      http/
      observability/
    platform/
      auth/
      tenancy/
      authz/
      audit/
      events/
      idempotency/
      outbox/
      errors/
    modules/
      identity/
      tenancy/
      directory/
      booking/
      dispatch/
      trip/
      pod/
      incident/
      fuel/
      expense/
      billing/
      ledger/
      compliance/
      conversation/
      notifications/
      automation/
    routes/
      health.ts
      v1.ts
    contracts/
      api.ts
      events.ts
      commands.ts
    tests/
      isolation/
      idempotency/
      trip/
      webhook/
```

The existing Vite/TanStack app remains the frontend. Do not put Mongo credentials, service credentials or privileged database access in `src/`.

### MVP deployables

Start with three deployables:

1. `core-api`: Express API plus the same codebase's worker entrypoint.
2. `device-gateway`: initially Traccar headless or a narrowly scoped protocol adapter.
3. `routing-service`: OSRM only at first; add Valhalla for map matching later.

Run the webhook handler as a thin route on `core-api` initially. Split it only when API saturation or webhook latency demonstrates the need.

## 3. Runtime and dependencies

Target Node 22 and TypeScript. Recommended backend dependencies:

```text
express                  HTTP routing
zod                      request and event validation
mongodb                  MongoDB driver
ioredis                  Redis, streams and locks
bullmq                   durable jobs and timers
pino                     structured logs
@opentelemetry/api       trace propagation
uuid                     UUIDv7-compatible IDs, or a UUIDv7 package
```

Use the native MongoDB driver rather than introducing an ORM. Repositories own collection access and receive a tenant-bound `AuthContext`.

Environment variables are validated at startup with Zod:

```text
NODE_ENV
PORT
MONGO_OPS_URI
MONGO_TELEMETRY_URI
MONGO_OPS_DATABASE
REDIS_URL
OBJECT_STORE_ENDPOINT
OBJECT_STORE_BUCKET
OBJECT_STORE_ACCESS_KEY
OBJECT_STORE_SECRET_KEY
WHATSAPP_APP_SECRET
WHATSAPP_VERIFY_TOKEN
JWT_PRIVATE_KEY
JWT_PUBLIC_KEY
```

The API must refuse to start when required secrets or database URLs are missing. Never silently fall back to mock data in a production process.

## 4. Request lifecycle

Every non-health request follows this order:

```text
request
  -> request id and trace context
  -> body size limit
  -> authentication
  -> AuthContext construction
  -> tenant and branch scope resolution
  -> Zod validation
  -> idempotency lookup for non-GET requests
  -> use case
       -> authorization
       -> tenant-scoped repository queries
       -> Mongo transaction for atomic changes
            aggregate mutation
            domain event
            audit record
            outbox records
            idempotency response
  -> response envelope
```

The browser never chooses the effective tenant. The server derives tenant and branch scope from the authenticated session. A requested tenant header may be accepted only for platform support flows and must be consent-gated and audited.

### Response envelope

```ts
export type ApiSuccess<T> = {
  data: T;
  meta: { requestId: string; asOf?: string; nextCursor?: string; hasMore?: boolean };
};

export type ApiFailure = {
  error: {
    code: string;
    message: string;
    field?: string | null;
    retryable: boolean;
  };
  meta: { requestId: string };
};
```

Use cursor pagination. All mutating routes require `Idempotency-Key`; a replay returns the original status and body with `Idempotency-Replayed: true`.

## 5. AuthContext and tenant isolation

```ts
export type AuthContext = {
  userId: string;
  tenantId: string;
  roles: string[];
  branchScope: string[] | null;
  region: string;
  channel: "web" | "mobile" | "whatsapp" | "internal";
  sessionId: string;
};
```

The only repository entrypoint is tenant-bound:

```ts
export interface TenantRepository<T> {
  findById(ctx: AuthContext, id: string): Promise<T | null>;
  list(ctx: AuthContext, query: ListQuery): Promise<Page<T>>;
  insert(ctx: AuthContext, value: T): Promise<T>;
  update(ctx: AuthContext, id: string, patch: Partial<T>): Promise<T>;
}
```

Implementation rules:

- Every filter begins with `tenantId: ctx.tenantId`.
- Branch-scoped actions add `branchId: { $in: ctx.branchScope }` in the database query.
- Outside-tenant object access returns `404`, not `403`.
- No module may call `db.collection`, `find`, `aggregate`, `updateOne` or `deleteOne` directly.
- CI rejects direct collection access outside repository infrastructure.
- Cross-tenant isolation tests are merge blockers.

The current `src/services/api.ts` is not a security boundary. Its `tenant_id` argument is client-controlled and should become a compatibility adapter to the authenticated API.

## 6. Core collections and indexes

### Tenancy and identity

```text
tenants       _id, name, region, currency, status, features
branches      tenantId, name, geo, gstin, status
users         tenantId, roles, branchScope, phone, status, sessionsValidAfter
sessions      userId, tenantId, deviceId, refreshHash, family, expiresAt
policies      tenantId, key, value, effectiveFrom, effectiveTo, version
```

Required indexes include:

```text
users:     { tenantId: 1, phone: 1 } unique
branches:  { tenantId: 1, _id: 1 }
policies:  { tenantId: 1, key: 1, effectiveFrom: -1 }
sessions:  { userId: 1, deviceId: 1, family: 1 }
```

### Directory

```text
vehicles   tenantId, branchId, regNo, class, deviceId, status, odometer, health
 devices   tenantId, imei, vehicleId, protocol, expectedCadence, health
 drivers    tenantId, branchId, phone, licence, status, languages
 customers  tenantId, name, contacts, creditTerms, detentionTerms, visibilityPolicy
 vendors    tenantId, capabilities, geo, rates, rating
 geofences  tenantId, type, geometry, h3Cells, dwellPolicy
```

Every compound index starts with `tenantId`, for example:

```text
vehicles:  { tenantId: 1, branchId: 1, status: 1 }
vehicles:  { tenantId: 1, regNo: 1 } unique
geofences: { tenantId: 1, type: 1, geometry: "2dsphere" }
```

### Operations

```text
bookings       tenantId, customerId, origin, destination, status, plan
trips          tenantId, bookingIds, vehicleId, driverId, stateProjection, distances, sla
trip_events    tenantId, tripId, seq, type, payload, actor, occurredAt, recordedAt
assignments    tenantId, tripId, vehicleId, driverId, from, to, status
pods           tenantId, tripId, evidence, deviceTs, serverTs, hashChain, status
incidents      tenantId, tripId, vehicleId, type, confidence, timeline, status
```

`trip_events` is append-only. `trips.stateProjection` is derived from events and may be rebuilt. Use a unique index on `{ tenantId: 1, tripId: 1, seq: 1 }`.

### Money and evidence

```text
invoices       tenantId, branchId, series, number, lines, pricingSnapshot, status
ledger_entries tenantId, txnId, accountId, debitMinor, creditMinor, currency
payments       tenantId, customerId, amountMinor, applications, status
expenses       tenantId, tripId, amountMinor, extraction, validations, status
fuel_entries   tenantId, vehicleId, tripId, litres, amountMinor, validations, status
documents      tenantId, ownerType, ownerId, docType, fileRef, retentionClass
audit_log      tenantId, actor, action, resource, before, after, requestId, at
```

Amounts are integer minor units plus ISO-4217 currency. Finalised invoices are immutable; corrections are credit notes or reversing ledger entries. Ledger and audit application credentials have insert/find permissions only.

## 7. Event envelope

```ts
export type DomainEvent<T = unknown> = {
  eventId: string;
  type: string;
  version: number;
  occurredAt: string;
  recordedAt: string;
  tenantId: string;
  branchId?: string;
  subject: { type: string; id: string };
  correlation: {
    tripId?: string;
    causationId?: string;
    traceId: string;
  };
  actor: { type: string; id: string; onBehalfOf?: string };
  source: { channel: string; provider?: string; rawRef?: string };
  payload: T;
  provenance?: { derivedFrom?: string[]; method?: string; policyVersion?: string };
  idempotencyKey: string;
};
```

Persist domain events in `events` with:

```text
{ tenantId: 1, "correlation.tripId": 1, occurredAt: 1 }
{ idempotencyKey: 1 } unique
{ type: 1, occurredAt: -1 }
```

Do not put raw position firehose data in `events`. Positions use Redis Streams and the telemetry time-series collection; derived state changes such as `vehicle.stopped` enter `events`.

An event-producing transaction writes the aggregate change, event, audit record and outbox record together. Consumers are at-least-once and use a unique `{ consumer, eventId }` record in the same transaction as their side effect.

## 8. Telemetry and motion MVP

The ingest path is:

```text
device gateway
  -> validate protocol and IMEI allowlist
  -> durable local WAL
  -> device ACK
  -> Redis Stream stream:pos.{tenant}
  -> stream processor
       -> dedupe on deviceId + device timestamp
       -> filter GPS quality
       -> telemetry positions time-series write
       -> Redis last-known vehicle state
       -> motion FSM
       -> derived events
```

Motion state for each vehicle:

```text
MOVING -> STOP_CANDIDATE -> STOPPED
MOVING <- STOP_CANDIDATE
STOPPED -> MOVING
```

Default policy values are tenant policies, not constants:

- `stopCandidateAfter`: 3 minutes.
- `stopConfirmedAfter`: 10 minutes.
- `gpsExpectedCadenceMultiplier`: 4.
- `maxPlausibleSpeedKph`: 150.

`vehicle.stopped.occurredAt` must be the first qualifying stopped fix, not the time the FSM emitted the event.

## 9. MVP unexplained-stop playbook

Seed `PB-UNEXPLAINED-STOP@v1` as a versioned playbook:

```text
WHEN vehicle.stopped
AND active trip is IN_TRANSIT
AND vehicle is outside a known expected-dwell geofence
AND stop is not a learned rest cluster
THEN wait 10m, cancelling if vehicle moves
THEN re-check the live context
THEN send driver_stop_reason template
THEN wait for a bound driver response for 5m
THEN classify BREAK / TRAFFIC / BREAKDOWN / OTHER
THEN emit the resulting event
ON timeout or delivery failure, create a dispatcher exception with call script
```

The playbook engine persists `automation_runs` with:

```text
runId, tenantId, playbookKey, playbookVersion, contextSnapshotHash,
state, currentStep, steps[], waitCondition, leaseUntil, deadline, mode
```

Timers live in BullMQ, but Mongo is the source of truth. A run lease expires and can be reclaimed. In-flight runs remain pinned to their original playbook version.

### Driver response handling

WhatsApp identity comes from a server-side contact binding. The message body never grants identity or authorization. The sender must be associated with the active trip before the response can mutate trip state.

The initial classifier may return only a constrained object:

```json
{
  "intent": "REPORT_BREAKDOWN",
  "entities": { "component": "clutch" },
  "confidence": 0.94,
  "unresolved": []
}
```

The classifier does not write to MongoDB, produce an ETA, or execute a command. The use case resolves the command, authorizes it and writes the event.

## 10. WhatsApp webhook and sender

`POST /api/v1/channels/whatsapp/webhook` does only this:

1. Verify `X-Hub-Signature-256` using a constant-time comparison.
2. Persist the raw payload and provider message id.
3. Return `200` quickly.
4. Enqueue processing.

Inbound message processing is idempotent on the provider message id. Outbound messages pass through one sender that enforces:

```text
opt-out -> policy -> 24h window/template -> rate limit -> purpose dedupe
-> provider idempotency key -> send -> message record -> delivery webhook
```

The sender owns fallback to app push, SMS, IVR and a human task. Playbooks must not call a WhatsApp SDK directly.

## 11. API surface for the first vertical slice

Base path: `/api/v1`.

```text
GET  /health
GET  /api/v1/fleet/live?bbox=&zoom=
GET  /api/v1/trips/:id
GET  /api/v1/trips/:id/timeline
POST /api/v1/trips
POST /api/v1/trips/:id/assign
POST /api/v1/trips/:id/start
POST /api/v1/trips/:id/complete
POST /api/v1/trips/:id/exception
POST /api/v1/vehicles/:id/location
POST /api/v1/channels/whatsapp/webhook
GET  /api/v1/exceptions
POST /api/v1/exceptions/:id/claim
POST /api/v1/exceptions/:id/resolve
```

`GET /fleet/live` is viewport scoped and includes `fixAgeSec` on every vehicle. A stale fix is visible and never presented as live.

Trip commands are synchronous and return the resulting projection. Notifications, derived events, ETA recalculation and playbooks run asynchronously through the outbox.

## 12. Mapping current frontend services to the target API

Keep UI call sites stable while changing the adapter implementation:

| Current service | Target replacement |
|---|---|
| `selectAll` / `selectOne` | authenticated API query with server-side scope |
| `insertRow` / `updateRow` | named command endpoint, not generic table mutation |
| `dispatchBooking` | `POST /trips/:id/assign` |
| `advanceTrip` | trip command endpoints and event projection |
| `uploadPod` | resumable document upload plus `POST /trips/:id/complete` |
| `pushFix` | driver batch endpoint or device gateway, never browser table updates |
| `emitNotification` | outbox-backed notification service |
| `writeAudit` | transaction-local audit library |
| `useLiveTable` | viewport polling first, SSE after the API contract is stable |

Do not expose a generic `table` parameter in production API routes. A named command gives each mutation a permission check, idempotency policy, audit record and stable error code.

## 13. Transaction patterns

### Trip assignment

One Mongo transaction must:

1. Verify tenant and branch scope.
2. Check vehicle, driver and compliance blocks.
3. Lock or conditionally update vehicle and driver availability.
4. Create assignment and trip event.
5. Update booking projection.
6. Append audit record.
7. Append notification outbox records.
8. Store the idempotency response.

### Trip completion

One transaction must append the completion/POD eligibility event, update the projection, write audit and enqueue invoice drafting. Invoice PDF generation and external delivery happen after commit.

### Approval

Approval completion uses a conditional update where `state == PENDING`. A second tap returns the first decision and cannot execute the command twice. Self-approval is rejected before execution.

## 14. Testing requirements

The backend is not ready until these tests exist:

### Isolation

Seed tenants A and B with similar records. Authenticate as A and assert:

- B object ids return `404`.
- list results contain no B records.
- writes cannot attach a B object to an A command.
- branch-scoped users cannot read another branch.
- customer users cannot read another customer's consignment.

### Idempotency

- Repeat every mutating request with the same `Idempotency-Key`.
- Redeliver the same WhatsApp webhook.
- Replay the same device position.
- Crash a consumer after its side effect and before its cursor update.
- Double-tap an approval.

Each case must produce one business effect and the original response.

### Motion and playbook

- A traffic light does not open an incident.
- A ten-minute unexplained stop sends one prompt.
- A moving fix cancels the timer.
- A late webhook does not mutate an expired prompt.
- A driver response from another tenant is rejected.
- A process restart resumes a waiting run.
- A playbook version change does not alter an in-flight run.

### Webhook

- Invalid HMAC is rejected.
- Valid payload is persisted before acknowledgement.
- Duplicate provider ids are no-ops.
- Slow downstream processing does not delay the `200` response.

## 15. Delivery sequence

### Slice 1: backend foundation

- Add backend workspace/package and startup configuration.
- Add Mongo/Redis health checks.
- Add request context, error envelope and idempotency middleware.
- Add tenant-scoped repositories and isolation tests.

### Slice 2: unexplained-stop loop

- Implement device position contract and a development simulator.
- Implement motion FSM and derived `vehicle.stopped` events.
- Implement trip projection and exception queue.
- Implement WhatsApp webhook/sender interfaces with a fake provider.
- Implement the versioned playbook and durable timers.
- Add the dispatcher API and wire the existing frontend adapter.

### Slice 3: production hardening

- Add real provider signature verification and object storage.
- Add outbox retries and dead-letter handling.
- Add structured traces and domain metrics.
- Run shadow mode for the playbook.
- Pilot with ten vehicles before adding billing, OCR or autonomous reassignment.

### Slice 4: money and evidence

- Add POD evidence and resumable uploads.
- Add fuel/expense extraction only after a labelled review corpus exists.
- Add immutable invoice snapshots, ledger postings and approvals.
- Add compliance blocks and distance reconciliation.

## 16. Non-goals for the first backend release

Do not build these before the unexplained-stop loop is used by a real operator:

- generic CRUD endpoints for every collection;
- an LLM command line;
- predictive maintenance;
- microservices per domain entity;
- Kafka;
- a realtime gateway before viewport polling is insufficient;
- autonomous money movement;
- remote vehicle immobilization;
- a custom telematics protocol fleet;
- browser-side writes to Supabase tables.

The backend is successful when it closes one operational loop reliably, preserves its evidence, isolates tenants, survives retries, and gives a dispatcher a useful answer before the customer has to call.
