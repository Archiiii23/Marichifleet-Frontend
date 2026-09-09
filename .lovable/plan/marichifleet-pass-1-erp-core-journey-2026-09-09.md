# MarichiFleet — Pass 1: ERP Core Journey

Build the transport operating system core: the connected journey from a client booking through dispatch, live trip, POD, invoice and payment — with realistic seeded Indian-market data, so nothing looks empty.

Confirmed choices: seeded demo data in the app (no login backend yet), a custom animated fleet map, ERP core first, India / ₹ INR.

## What you'll be able to do after this pass

1. Sign in as any role (Owner, Dispatcher, Driver, Accountant, Client) from a demo role picker.
2. Land on a control-tower dashboard showing live fleet counts, delayed trips, PODs pending, overdue invoices, expiring documents and revenue — every number clickable through to its records.
3. Create a booking (client, pickup, drop, load, vehicle type, rate) and watch it enter the load board.
4. Open the dispatch board, see ranked eligible vehicles and drivers, and assign one — blocked assets are rejected with a clear reason, and overriding a compliance warning demands a written reason.
5. Watch the trip appear on the live fleet map with a moving vehicle, route line, ETA and a synchronized trip list.
6. Switch to the driver view: accept the trip, start it, tick checkpoints, log fuel, report a breakdown, capture POD (signature + photo).
7. See POD land in the office, make the trip invoice-eligible, generate the invoice, send it, record a payment and see receivables, profitability and the dashboard update.
8. Follow every step in the notification centre as WhatsApp/SMS/email events with templates, delivery status and deep links back into records.

## Screens in this pass

- Public: `/` (holding hero with sign-in CTA — full cinematic site comes in Pass 5), `/login`
- ERP: `/app/dashboard`, `/app/bookings`, `/app/bookings/:id`, `/app/dispatch`, `/app/tracking`, `/app/trips`, `/app/trips/:id`, `/app/vehicles`, `/app/vehicles/:id`, `/app/drivers`, `/app/drivers/:id`, `/app/clients`, `/app/clients/:id`, `/app/finance/invoices`, `/app/finance/invoices/:id`, `/app/finance/receivables`, `/app/communications`, `/app/compliance`
- Driver: `/driver/home`, `/driver/trips`, `/driver/trips/:id`, `/driver/pod`, `/driver/fuel`, `/driver/exception`, `/driver/sync`
- Client portal: `/portal/dashboard`, `/portal/bookings`, `/portal/bookings/new`, `/portal/bookings/:id`, `/portal/tracking/:id`, `/portal/invoices`, `/portal/invoices/:id`
- Public tracking: `/track/:token`

Later passes (not in this build): fuel/workshop/inventory/vendors depth, HR & payroll, reports & analytics suite, audit log, settings & subscription, super admin, onboarding wizard, and the immersive marketing website.

## Rules enforced, not just displayed

- Booking, trip, invoice, maintenance and document lifecycles are coded as state machines; illegal transitions are refused with an explanatory message rather than hidden.
- A trip cannot complete without delivery confirmation and POD.
- A vehicle under maintenance, inactive or already on a trip cannot be assigned.
- A driver who is unavailable or holds an expired licence/compliance document cannot be assigned without a recorded override reason.
- An invoice can only be raised against a POD-received trip.
- Roles govern navigation, page access, financial visibility and every action.
- Every state change writes an audit entry and fires the matching notification event.

## Design direction

Premium industrial control-tower look: near-black canvas with light operational surfaces, one brand red accent plus green/amber/red/blue semantic states, editorial display type for headings with a dense legible UI face for tables, 4/8/12/16/24/32 spacing, restrained motion (skeletons, drawer slide-in, marker pulse only for live events). Status always uses icon + text, never colour alone. Every screen ships loading, empty, error and (driver) offline states.

## Technical notes

- TanStack Start with file-based routes under the surfaces above; shared app shell with sidebar, sticky page headers, command palette (⌘K), global search, notification bell and activity rail.
- A typed domain layer (`src/domain`) holds entities — Tenant, Branch, Vehicle, Driver, Client, RateCard, Booking, Trip, GPS ping, POD, Invoice, Payment, FuelLog, JobCard, Part, Vendor, Document, User, Role, Notification, AuditEntry — plus state machines and transition guards, kept independent of UI.
- A seeded in-memory store (deterministic generator, no module-scope randomness) hydrates one India tenant with two depots, ~18 vehicles, ~22 drivers, ~14 clients, ~60 bookings across all statuses, active/delayed/completed trips, GPS tracks, PODs, invoices in all states, fuel logs, job cards, documents at valid/expiring/expired, and a notification history. Reads/writes go through TanStack Query so mutations propagate everywhere.
- GPS, WhatsApp and payments sit behind adapter interfaces with mock implementations, so real providers can be swapped in without touching feature code. No credentials in code.
- The map is a custom SVG/canvas surface with projected coordinates, animated route drawing, marker pulse and map↔list selection sync — replaceable later by a real map behind the same component contract.
- Driver surfaces are mobile-first with large tap targets, an offline banner, a local pending-action queue and visible sync status.
- Design tokens defined once in `src/styles.css`; no hardcoded colours in components.

## Suggested order within this pass

1. Design system, app shell, routing, role/permission layer
2. Domain model, state machines, seed data, query layer
3. Clients, vehicles, drivers, compliance
4. Bookings, dispatch, trips, live map
5. Driver PWA flow and POD
6. Invoices, payments, receivables, profitability
7. Notification/WhatsApp event system and client portal
8. Dashboard wired to real seeded metrics, plus loading/empty/error/offline polish
