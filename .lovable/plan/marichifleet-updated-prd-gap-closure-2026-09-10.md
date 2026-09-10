# MarichiFleet — Updated PRD Gap Closure

The revised PRD keeps the same lifecycle (onboarding → booking → dispatch → delivery → POD → billing → workshop → analytics), so most of the existing app stays exactly as it is. This pass closes the real gaps and fixes the one structural conflict.

## What already matches the PRD (keep, do not touch)

- Public landing page and visual system — unchanged.
- Booking, dispatch, trip execution, tracking, POD, invoicing, payments, fuel, compliance, communications, audit.
- Driver app flows and client portal flows.
- Workshop, inventory, vendors, HR/payroll, reports, settings, platform admin screens.
- Theme system (Default / Dark / Light / System).

## The one structural conflict

Every screen still reads the local demo store and the fake persona switcher, while a real database, authentication and service layer exist but are unused. The PRD requires real multi-tenancy, RBAC and persistent data. Migrating all screens at once is high-risk, so this pass does it in a controlled way:

1. Real sign-in becomes the entry point: `/app`, `/driver`, `/portal` require a session and redirect to `/auth`.
2. `/login` becomes a demo-mode entry that still works for exploring seeded data.
3. Screens keep their current data hooks in this pass; a follow-up pass swaps the hooks' internals over to the database module by module, so screens don't need rewriting.

## New requirements to build

**Global / multi-country (PRD now targets Zambia, India, Middle East)**
- Country and currency on tenant + branch; all money formatting driven by tenant currency instead of hardcoded INR.
- Country compliance templates (Zambia RTSA, India RC/permit/e-way, GCC Istimara) driving document types.

**Subscription & packaging (new section)**
- Starter / Growth / Enterprise tiers with fleet-size limits and add-ons.
- Subscription & billing settings screen: current plan, usage vs limit, add-ons, invoices.

**Notifications**
- Alert preference centre: per role, per event, per channel (in-app / WhatsApp / SMS / email).
- Escalation rules: unactioned critical alerts escalate after a configurable delay.

**Dispatch & tracking depth**
- Geofence definitions per site with auto status change on entry/exit.
- Trip playback of the recorded route with a timeline scrubber.
- Route deviation and idle-time alerts.

**Vendors & parts**
- Purchase orders: raise from low stock or job card, receive against PO, update average cost.
- Vendor detail with POs, spend, payables and rating.

**Finance depth**
- Expense ledger and vendor payables.
- Credit notes and invoice disputes.
- P&L by vehicle, route and client.

**Analytics**
- Complete the PRD's 15-KPI catalogue (adds empty-running %, load acceptance rate, turnaround time, POD compliance rate, compliance exposure).
- Custom report builder: pick entity, columns, filters, grouping; save and export.

**Roles & admin**
- Custom roles with editable permission sets, branch-scoped access.
- Driver payslip/incentive view and an explicit offline-sync indicator in the driver app.
- Client payment screen in the portal.

## Technical notes

- New PRD-driven types extend `src/domain/types.ts` and `src/domain/extras.ts` (geofences, purchase orders, expenses, credit notes, alert preferences, subscription, custom roles) following existing deterministic-seed patterns.
- Route guards use the existing `AuthProvider`; `useSession` stays as the in-app actor so screens are untouched.
- Currency formatting moves into one tenant-aware helper used by every screen.
- Six Supabase `SECURITY DEFINER` linter warnings get resolved as part of the auth work.

## Out of scope this pass

- Real telematics hardware, real WhatsApp/payment gateways, accounting-system sync, predictive maintenance, load consolidation, SSO.
