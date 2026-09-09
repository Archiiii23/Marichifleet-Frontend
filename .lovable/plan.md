# MarichiFleet — Pass 2: remaining PRD modules + light theme

Two things in this pass: finish the modules the PRD asks for that aren't built yet, and add a proper light appearance with a switch (dark stays available).

## Light theme

- A full light palette next to the existing dark one: paper-white canvas, soft grey surfaces, the same brand red accent and the same green / amber / red / blue status colours, retuned so they stay readable on light backgrounds.
- A sun/moon switch in the top bar of the control tower, the driver app and the client portal. The choice is remembered between visits and follows the device setting the first time.
- Applied everywhere: tables, cards, charts, the fleet map, badges, drawers, the driver screens and the marketing site's in-app screenshots. No screen keeps hardcoded dark colours.
- The cinematic public homepage stays dark on purpose (it is a night-drive scene), with its own consistent handling.

## Modules still missing from the PRD

Each is a real working screen wired to the same seeded demo data and the same rules, not a placeholder.

1. **Reports & Analytics** (`/app/reports`) — revenue and profit trend, vehicle utilisation, driver performance, route profitability, fuel efficiency, on-time delivery, receivables ageing. Date-range and branch filters, CSV export.
2. **Inventory / Spare parts** (`/app/inventory`) — parts catalogue, stock on hand, reorder level warnings, issue-to-job-card and receive-stock actions that move workshop job cards forward.
3. **Vendors** (`/app/vendors`) — garages, fuel stations, tyre and parts suppliers, transporters; contact details, linked spend, ratings, and payables per vendor.
4. **HR & Payroll** (`/app/hr`) — staff and driver records, attendance, leave requests with approve/reject, trip-allowance and salary run producing a monthly payslip summary.
5. **Fleet documents & renewals** — deepen compliance with renewal actions, reminder scheduling and expiry timeline.
6. **Settings** (`/app/settings`) — company profile, branches, users & roles matrix, rate cards, invoice/tax setup, notification templates, appearance (theme).
7. **Onboarding wizard** (`/onboarding`) — first-run guided setup: company, branch, first vehicle, first driver, first client, then land in the control tower.
8. **Platform admin** (`/admin`) — tenants, plans and usage, feature flags, support view. Reachable only by the platform-admin persona.
9. **Login screen** (`/login`) — role picker styled as a real sign-in, feeding the existing demo personas.

## Rules and behaviour carried through

- Everything respects the existing role permissions; new pages appear in the sidebar only for roles allowed to see them.
- New actions (issue part, approve leave, renew document, run payroll) go through the same guarded transitions, write audit entries and fire notifications like the existing workflow.
- Every new screen ships loading, empty and error states and works down to mobile width.

## Technical notes

- Light palette added as a `.light` token block in `src/styles.css` alongside the existing `:root` dark tokens; a small theme provider writes the class on `<html>` and persists to local storage.
- New entity types (Part, StockMovement, Vendor, Employee, Attendance, LeaveRequest, PayrollRun, Tenant plan) extend `src/domain/types.ts`, get deterministic seed data in `src/domain/seed.ts`, and mutations in `src/domain/store.ts`.
- Analytics are derived selectors over the store — no new data source.
- ERP business logic, existing routes and the cinematic homepage stay as they are apart from theme-token cleanup.

## Order of work

1. Light theme tokens, provider and toggle; sweep existing screens.
2. Domain types + seed + store actions for parts, vendors, HR, tenants.
3. Reports, Inventory, Vendors, HR screens.
4. Settings, onboarding, login, platform admin.
5. Compliance renewals depth, then a full click-through of every route in both themes.
