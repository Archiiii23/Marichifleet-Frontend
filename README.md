# MarichiFleet OS

You are the lead product engineer, UI/UX architect, frontend engineer and solution architect responsible for building MarichiFleet.

IMPORTANT:

The attached MarichiFleet PRD is the PRIMARY SOURCE OF TRUTH.

Read and understand the COMPLETE PRD before implementing anything.

Do not ignore requirements from the PRD.

Do not invent business rules when the PRD already defines them.

Do not simplify important workflows into generic CRUD pages.

Do not replace the specified product experience with a generic admin dashboard.

The goal is to build a premium, production-oriented Transport ERP + immersive logistics marketing website called:

MARICHIFLEET

The product should feel like a modern logistics operating system / control tower, not a basic college CRUD project.

==================================================

1. PRODUCT OBJECTIVE

==================================================

MarichiFleet is a multi-tenant Transport ERP for fleet owners and transport businesses.

The complete operational lifecycle should be connected:

Company

→ Vehicle

→ Driver

→ Client

→ Booking

→ Dispatch

→ Trip

→ Live Tracking

→ Exceptions

→ Delivery

→ POD

→ Invoice

→ Payment

→ Profitability

→ Maintenance

→ Fuel

→ Compliance

→ Analytics

Every major module should connect to the overall operational lifecycle.

The system must provide:

- Fleet management

- Driver management

- Client management

- Booking/load management

- Dispatch

- Trip management

- Live fleet tracking

- POD management

- Billing and invoicing

- Payments/collections

- Fuel management

- Workshop/maintenance

- Spare parts/inventory

- Compliance

- Vendors

- HR/payroll where applicable

- Notifications

- WhatsApp communication

- Analytics

- Role-based access

- Driver mobile/PWA experience

- Client portal

- Multi-tenant architecture

==================================================

2. IMPLEMENTATION PRINCIPLE

==================================================

Build the application in a way that feels like a real SaaS product.

DO NOT build:

- generic CRUD-only screens

- disconnected pages

- empty dashboards

- meaningless charts

- fake buttons without actions

- placeholder lorem ipsum

- repetitive cards everywhere

- overly colorful beginner-style UI

- template-looking admin panels

Instead build:

- operational control tower

- intelligent dashboards

- synchronized map and tables

- contextual drawers

- timeline-based workflows

- command palette

- smart filters

- bulk actions

- activity streams

- realistic operational states

- polished transitions

- meaningful data visualizations

- premium empty/loading/error states

- responsive layouts

- realistic demo data

==================================================

3. ADDITION #1 — SCREEN-BY-SCREEN SPECIFICATION

==================================================

Every important screen must be designed according to this structure:

SCREEN NAME

1. Purpose

2. Primary user/role

3. Route

4. Layout

5. Main components

6. Data displayed

7. Primary actions

8. Secondary actions

9. Filters

10. Search

11. Sorting

12. Bulk actions

13. Drawer/modal behavior

14. Loading state

15. Empty state

16. Error state

17. Permission behavior

18. Mobile behavior

19. Success feedback

20. Related screens/workflows

Do not create a screen without understanding its purpose in the complete workflow.

==================================================

4. REQUIRED APPLICATION SCREEN SYSTEM

==================================================

Create a clear route architecture based on the PRD.

At minimum, implement the relevant product areas defined in the PRD:

AUTH

- Login

- OTP / authentication where applicable

- Forgot password

- Company onboarding

- Branch/depot setup

MAIN ERP

- Executive Dashboard

- Fleet Dashboard

- Vehicles

- Vehicle Detail

- Drivers

- Driver Detail

- Clients

- Client Detail

- Bookings / Load Board

- Booking Detail

- Dispatch Board

- Live Fleet Map

- Trip List

- Trip Detail

- POD

- Invoices

- Receivables

- Payments

- Fuel

- Workshop

- Job Cards

- Spare Parts

- Vendors

- Compliance

- Documents

- HR / Payroll where applicable

- Reports / Analytics

- Notifications

- Users

- Roles & Permissions

- Audit Log

- Settings

- Subscription / Billing where applicable

DRIVER EXPERIENCE

- Driver Login

- Driver Home

- Assigned Trips

- Trip Detail

- Checkpoints

- Navigation

- Exception / Breakdown

- Fuel Entry

- Expense Entry

- POD Capture

- Offline Sync

- Profile

- Payslip / Incentives where applicable

CLIENT EXPERIENCE

- Client Dashboard

- Create Booking

- Booking Status

- Live Tracking

- POD

- Invoice

- Payment

- Documents

MARKETING WEBSITE

- Home

- Solutions

- Features

- Fleet Management

- Tracking

- Dispatch

- Billing

- Analytics

- WhatsApp Automation

- About

- Contact

- Login / Get Started

Use the exact route naming convention consistently.

==================================================

5. ADDITION #2 — BUSINESS RULES & STATE MACHINES

==================================================

Every important operational entity must have a clearly defined lifecycle.

BOOKING:

Draft

→ Submitted

→ Confirmed

→ Assigned

→ Dispatched

→ In Transit

→ Delivered

→ POD Pending

→ POD Received

→ Invoiced

→ Partially Paid / Paid

→ Closed

TRIP:

Planned

→ Driver Assigned

→ Driver Accepted

→ Started

→ In Transit

→ Delayed / Exception

→ Arrived

→ Delivered

→ POD Uploaded

→ Completed

INVOICE:

Draft

→ Issued

→ Sent

→ Partially Paid

→ Paid

→ Overdue

→ Cancelled

MAINTENANCE:

Reported

→ Inspected

→ Job Created

→ Parts Required

→ In Progress

→ Completed

→ Vehicle Released

DOCUMENT:

Valid

→ Expiring Soon

→ Expired

→ Renewal Pending

→ Renewed

Do not allow invalid state transitions.

Example:

A trip should not become "Completed" if mandatory delivery/POD requirements defined by the PRD have not been satisfied.

A vehicle should not be assigned when it is unavailable, under maintenance, inactive, or otherwise blocked by applicable business rules.

A driver should not be assigned when unavailable or lacking required valid compliance documents.

Use validation and clear user feedback whenever an action is blocked.

==================================================

6. BUSINESS LOGIC

==================================================

Implement business rules across modules instead of keeping modules isolated.

Examples:

Booking creation should connect to:

Client

→ Load

→ Rate

→ Vehicle requirement

→ Driver requirement

→ Dispatch

→ Trip

Trip completion should connect to:

Trip

→ Delivery

→ POD

→ Invoice eligibility

→ Client notification

Invoice should connect to:

Client

→ Booking/Trip

→ Charges

→ POD

→ Invoice

→ Payment

→ Receivables

Maintenance should connect to:

Vehicle

→ Issue

→ Job Card

→ Parts

→ Cost

→ Vehicle Availability

→ Maintenance History

Fuel should connect to:

Vehicle

→ Trip

→ Fuel Entry

→ Cost

→ Fuel Efficiency

→ Analytics

Compliance should connect to:

Vehicle/Driver

→ Document

→ Expiry

→ Alert

→ Renewal

==================================================

7. ADDITION #3 — REALISTIC DEMO / SEED DATA

==================================================

The application must NOT look empty after first launch.

Create realistic seeded/demo data.

Include examples such as:

COMPANIES:

- Multiple tenants for testing multi-tenancy

BRANCHES:

- Multiple depots/branches

VEHICLES:

- Trucks

- Trailers

- Different capacities

- Registration numbers

- Vehicle status

- Current location

- Fuel information

- Maintenance status

DRIVERS:

- Names

- Phone numbers

- License information

- Availability

- Assigned vehicles

- Trip history

- Compliance status

CLIENTS:

- Logistics companies

- Manufacturers

- Distributors

- Warehouses

BOOKINGS:

- Different statuses

- Different origins/destinations

- Different loads

- Different clients

- Different priorities

TRIPS:

- Active trips

- Completed trips

- Delayed trips

- Exception trips

- Upcoming trips

GPS:

- Realistic vehicle locations

- Route points

- ETA

- Speed

- Last updated time

POD:

- Sample delivery documents

- Signatures

- Delivery timestamps

INVOICES:

- Draft

- Issued

- Paid

- Partially paid

- Overdue

FUEL:

- Fuel entries

- Litres

- Cost

- Odometer

- Fuel efficiency

MAINTENANCE:

- Open job cards

- Completed job cards

- Service history

COMPLIANCE:

- Valid documents

- Expiring documents

- Expired documents

NOTIFICATIONS:

- Operational alerts

- Driver alerts

- Compliance alerts

- Payment alerts

- Maintenance alerts

- WhatsApp events

Analytics must calculate/display meaningful metrics from this data.

IMPORTANT:

Demo data should feel like a real transport company, not random placeholder records.

==================================================

8. ADDITION #4 — ACCEPTANCE CRITERIA

==================================================

Every major feature must have a clear Definition of Done.

A feature is NOT complete merely because the UI exists.

A feature is complete when:

- UI is implemented

- Data is displayed correctly

- User actions work

- Validation works

- Loading state exists

- Empty state exists

- Error state exists

- Permission rules work

- Related workflows update correctly

- Success feedback exists

- Mobile behavior works where applicable

==================================================

9. CRITICAL END-TO-END ACCEPTANCE TEST

==================================================

The following complete workflow must work:

CLIENT CREATES BOOKING

Client/User

→ Create Booking

→ Enter pickup

→ Enter destination

→ Enter load

→ Select client

→ Select required vehicle

→ Set rate

→ Submit booking

Then:

Booking

→ Confirmation

→ Vehicle assignment

→ Driver assignment

→ Dispatch

Driver:

→ Receives trip

→ Accepts trip

→ Starts trip

→ Updates checkpoint

→ GPS/location updates

→ Can report delay/breakdown

→ Reaches destination

→ Uploads POD

System:

→ Marks delivery complete

→ Stores POD

→ Makes invoice eligible

→ Generates/creates invoice workflow

→ Sends client notification

→ Updates dashboard metrics

Then:

Invoice

→ Sent to client

→ Payment recorded

→ Receivables updated

→ Trip profitability updated

→ Analytics updated

This complete flow must be treated as the primary product demonstration.

==================================================

10. DASHBOARD ACCEPTANCE

==================================================

Dashboard must not be a collection of decorative charts.

It should answer:

- How many vehicles are active?

- Which vehicles are currently moving?

- Which trips are delayed?

- Which bookings require attention?

- Which PODs are pending?

- Which invoices are overdue?

- Which compliance documents are expiring?

- Which vehicles require maintenance?

- How much revenue is generated?

- What is outstanding?

- What is trip/fleet profitability?

- What operational exceptions need attention?

Use:

- KPI cards

- charts

- fleet map

- alerts

- activity feed

- operational queues

- trend indicators

- drill-down actions

==================================================

11. LIVE CONTROL TOWER

==================================================

The Live Fleet area should feel like an operations control room.

Include:

- interactive map

- vehicle markers

- status indicators

- active trips

- route visualization

- ETA

- delayed vehicles

- selected vehicle detail

- trip timeline

- activity feed

- filters

- search

- map/list synchronization

Clicking a vehicle should open contextual information.

Clicking a trip should open the relevant trip workflow.

==================================================

12. WHATSAPP COMMUNICATION

==================================================

WhatsApp is a first-class communication channel.

Create a communication system around events.

Supported examples:

BOOKING_CREATED

BOOKING_CONFIRMED

DRIVER_ASSIGNED

DRIVER_ACCEPTED

TRIP_STARTED

ETA_UPDATED

TRIP_DELAYED

BREAKDOWN_REPORTED

TRIP_DELIVERED

POD_AVAILABLE

INVOICE_CREATED

PAYMENT_REMINDER

PAYMENT_RECEIVED

DOCUMENT_EXPIRING

MAINTENANCE_DUE

Build:

- notification templates

- event triggers

- recipient rules

- delivery status

- failure status

- retry mechanism

- communication history

- opt-in/opt-out

- notification preferences

- webhook/event logs

- deep links back into the application

For development/demo mode, use a provider abstraction/mock adapter if real WhatsApp credentials are unavailable.

Never hard-code production credentials.

==================================================

13. ADDITION #5 — MASTER IMPLEMENTATION RULES

==================================================

Treat the PRD + this prompt as a single product specification.

Do NOT:

- skip important PRD sections

- create generic placeholder screens

- invent unrelated features

- change the product vision

- remove required workflows

- hard-code secrets

- make every page look identical

- use fake charts without data relationships

- create buttons that do nothing

- ignore responsive behavior

- ignore loading/error/empty states

- ignore role permissions

- ignore mobile experience

When a requirement is unclear:

1. Check the PRD.

2. Check the relevant workflow.

3. Check the business rules.

4. Check acceptance criteria.

5. If still genuinely undefined, choose the simplest production-safe implementation and clearly isolate it so it can be changed later.

Do not randomly invent complex functionality.

==================================================

14. PREMIUM DESIGN SYSTEM

==================================================

Use a premium logistics/technology aesthetic.

Visual direction:

- sophisticated

- cinematic

- minimal

- high contrast

- editorial typography

- strong spacing

- premium cards

- subtle borders

- controlled motion

- realistic data visualization

- modern enterprise SaaS feel

Avoid:

- childish gradients

- excessive rounded cards

- excessive shadows

- rainbow colors

- template-looking dashboards

- unnecessary animations

Use a consistent design token system for:

- typography

- spacing

- radius

- shadows

- colors

- buttons

- inputs

- tables

- badges

- alerts

- drawers

- modals

- charts

- map UI

==================================================

15. IMMERSIVE MARKETING WEBSITE

==================================================

The marketing website must not feel like a normal SaaS landing page.

It should tell a logistics story.

Visual narrative:

LOAD

→ TRUCK

→ ROUTE

→ TRACKING

→ DELIVERY

→ POD

→ INVOICE

→ PAYMENT

→ PROFITABILITY

Use:

- oversized typography

- cinematic transitions

- 3D freight/truck visuals

- scroll-driven storytelling

- split-screen sections

- large visual compositions

- logistics network graphics

- live tracking visualization

- container/port visual transitions

- premium CTA sections

Hero concept:

"WE MOVE FREIGHT.

WE OWN THE OUTCOME."

Use original MarichiFleet branding and content.

The reference website/reel is ONLY inspiration for visual quality, cinematic storytelling and interaction patterns.

DO NOT copy:

- logo

- brand identity

- exact text

- proprietary assets

- source code

- exact page structure

- exact composition

- copyrighted visuals

Create an original MarichiFleet experience.

==================================================

16. PREMIUM INTERACTIONS

==================================================

Implement where technically appropriate:

- scroll reveal

- parallax

- smooth section transitions

- animated counters

- map animation

- route drawing

- vehicle movement

- hover states

- contextual drawers

- command palette

- keyboard shortcuts

- synchronized map/table

- timeline animations

- progress indicators

- skeleton loading

- toast notifications

- micro-interactions

Animations must support usability.

Do not sacrifice performance for visual effects.

==================================================

17. RESPONSIVE EXPERIENCE

==================================================

Desktop:

- full dashboard

- maps

- tables

- control tower

- side navigation

- command palette

Tablet:

- responsive grid

- collapsible navigation

- optimized tables

- map/list adaptation

Mobile:

- mobile-first driver workflow

- bottom navigation where appropriate

- large touch targets

- simplified tables

- swipe-friendly cards

- offline indicators

- camera/POD capture support

The application must remain usable on low-end Android devices.

==================================================

18. OFFLINE-FIRST DRIVER EXPERIENCE

==================================================

Driver workflows should support offline operation where defined in the PRD.

When offline:

- show clear offline indicator

- allow supported actions

- store pending data locally

- show sync queue

- retry automatically

- handle conflicts safely

- show sync status

Do not silently lose driver data.

==================================================

19. ROLE-BASED EXPERIENCE

==================================================

Implement roles and permissions defined in the PRD.

Examples:

Owner

Manager

Dispatcher

Driver

Accountant

Workshop Manager

Viewer

Permissions should control:

- navigation visibility

- page access

- data visibility

- create/edit/delete actions

- financial information

- administrative actions

Do not merely hide UI elements; enforce permissions at the application/data layer where applicable.

==================================================

20. GLOBAL UX FEATURES

==================================================

Include:

- global search

- Ctrl/Cmd + K command palette

- breadcrumbs

- notifications

- profile menu

- help

- contextual actions

- smart filters

- saved views

- bulk actions

- export actions where defined

- audit history

- keyboard navigation where appropriate

==================================================

21. LOADING / EMPTY / ERROR STATES

==================================================

Every important screen must have:

LOADING:

- skeletons

- meaningful placeholders

EMPTY:

- explain what is empty

- explain what the user can do next

- provide CTA

ERROR:

- explain problem

- retry

- preserve user input where possible

SUCCESS:

- clear confirmation

- update related data

- show toast/activity entry where appropriate

OFFLINE:

- clear connectivity state

- sync status

- pending action count

==================================================

22. DATA & API ARCHITECTURE

==================================================

Use a scalable architecture.

Core entities should include the entities defined in the PRD such as:

Tenant

Branch

Vehicle

Driver

Client

Rate Card

Booking

Trip

GPS Ping / Telematics Event

POD

Invoice

Payment

Fuel Log

Job Card

Spare Part

Vendor

Document

User

Role

Permission

Notification

Maintain clear relationships.

Avoid duplicating business logic across components.

Use reusable services/hooks/components.

Keep integrations behind adapters so providers can be changed later.

==================================================

23. SECURITY

==================================================

Implement according to the PRD:

- tenant isolation

- authentication

- authorization

- RBAC

- secure document access

- audit logs

- secure API access

- no secrets in frontend

- environment variables

- safe error handling

- data validation

Production credentials must never be committed to source code.

==================================================

24. MOCK MODE + PRODUCTION MODE

==================================================

The project should support development/demo mode.

MOCK MODE:

- seeded database

- mock GPS

- mock WhatsApp events

- mock payment events

- mock notifications

- realistic simulated data

PRODUCTION MODE:

- real database

- real authentication

- real GPS provider

- real WhatsApp provider

- real payment provider

- real integrations

Provider-specific implementation should be replaceable.

==================================================

25. BUILD ORDER

==================================================

Do not attempt to create every complex module at once.

Follow this implementation order:

PHASE 1 — FOUNDATION

1. Project structure

2. Design system

3. Routing

4. Authentication

5. Layout

6. Sidebar/topbar

7. Role system

8. Database/data models

9. Seed/demo data

PHASE 2 — CORE BUSINESS FLOW

10. Clients

11. Vehicles

12. Drivers

13. Bookings

14. Dispatch

15. Trips

16. Live tracking

17. POD

18. Invoices

19. Payments

PHASE 3 — OPERATIONS

20. Fuel

21. Maintenance

22. Workshop

23. Spare parts

24. Compliance

25. Vendors

26. Notifications

27. WhatsApp

PHASE 4 — EXPERIENCE

28. Dashboard

29. Analytics

30. Driver PWA

31. Client portal

32. Audit logs

33. Reports

PHASE 5 — PREMIUM WEBSITE

34. Marketing homepage

35. 3D/visual hero

36. Scroll storytelling

37. Product storytelling

38. Tracking visualization

39. WhatsApp visualization

40. Analytics visualization

41. Final CTA

PHASE 6 — QUALITY

42. Responsive optimization

43. Loading states

44. Empty states

45. Error states

46. Offline states

47. Accessibility

48. Performance

49. Security review

50. End-to-end testing

==================================================

26. PRIMARY DEMO JOURNEY

==================================================

The final product should be demonstrable through one continuous story:

A client creates a booking.

The dispatcher sees it.

The dispatcher assigns a vehicle and driver.

The driver receives the trip.

The trip starts.

The vehicle appears on the live map.

The system updates ETA.

An operational exception can be generated.

The driver reaches destination.

The driver uploads POD.

The client receives POD notification.

The invoice is generated.

The invoice is sent.

Payment is recorded.

Dashboard and profitability update.

The vehicle's fuel and maintenance history remain connected.

This should be the core demonstration of MarichiFleet.

==================================================

27. ACCEPTANCE / DEFINITION OF DONE

==================================================

Before considering the application complete, verify:

[ ] PRD requirements implemented

[ ] All major routes implemented

[ ] Role-based access works

[ ] Core database relationships work

[ ] Booking workflow works

[ ] Dispatch workflow works

[ ] Trip workflow works

[ ] Live tracking works in demo/mock mode

[ ] POD workflow works

[ ] Invoice workflow works

[ ] Payment workflow works

[ ] WhatsApp events are represented

[ ] Notifications work

[ ] Driver mobile workflow works

[ ] Client portal works

[ ] Dashboard uses meaningful data

[ ] Analytics use meaningful data

[ ] Maintenance workflow works

[ ] Fuel workflow works

[ ] Compliance workflow works

[ ] Loading states exist

[ ] Empty states exist

[ ] Error states exist

[ ] Offline states exist where required

[ ] Demo data exists

[ ] No major screen is empty

[ ] No major button is non-functional

[ ] Responsive behavior works

[ ] Security basics implemented

[ ] No secrets exposed

[ ] Marketing website is premium

[ ] Immersive storytelling works

[ ] Performance remains acceptable

[ ] End-to-end booking → payment flow works

==================================================

28. FINAL PRODUCT QUALITY BAR

==================================================

The final product should feel like:

A premium logistics SaaS product

+

A real transport operations control tower

+

A cinematic technology brand website.

It should NOT feel like:

A student CRUD project

or

a generic admin dashboard template.

Prioritize:

1. Correct business workflow

2. Strong UX

3. Realistic data

4. Clear information architecture

5. Premium visual quality

6. Performance

7. Responsive design

8. Maintainability

9. Production-readiness

==================================================

29. IMPORTANT FINAL INSTRUCTION

==================================================

Before implementing any feature, ask yourself:

WHAT IS THE BUSINESS PURPOSE?

WHO USES IT?

WHAT DATA DOES IT NEED?

WHAT IS ITS PREVIOUS STATE?

WHAT IS ITS NEXT STATE?

WHAT OTHER MODULES DOES IT AFFECT?

WHAT HAPPENS AFTER THE USER CLICKS THE BUTTON?

WHAT HAPPENS IF IT FAILS?

WHAT HAPPENS OFFLINE?

WHAT NOTIFICATION SHOULD BE GENERATED?

WHAT SHOULD APPEAR IN THE AUDIT LOG?

HOW WILL THIS LOOK ON MOBILE?

HOW WILL THIS BE DEMONSTRATED?

If these questions are not answered by the PRD, do not invent a complicated solution. Use the simplest reasonable implementation and keep it modular.

==================================================

30. FINAL COMMAND

==================================================

Now:

1. Read the complete PRD.

2. Build the design system.

3. Build the application shell.

4. Build the core data model.

5. Seed realistic demo data.

6. Build the core booking → dispatch → trip → POD → invoice → payment workflow.

7. Connect dashboard and analytics to the workflow.

8. Add WhatsApp/notification architecture.

9. Build driver and client experiences.

10. Build operational modules.

11. Build premium immersive marketing website.

12. Implement all required states.

13. Test the complete end-to-end journey.

14. Fix broken interactions and inconsistencies.

15. Optimize responsive behavior and performance.

16. Only then consider the MVP complete.

The PRD is the primary source of truth.

This prompt provides the implementation discipline and final five additions:

- Screen-by-screen specification

- Business rules/state machines

- Realistic seed/demo data

- Acceptance criteria

- Master implementation rules

Build MarichiFleet as a cohesive product, not as a collection of unrelated pages.

## Architecture: MERN Stack

- **MongoDB**: MongoDB Atlas cloud cluster with Mongoose ORM models
- **Express**: Node.js REST API with Google OAuth2 authentication
- **React**: Modern React 19 SPA with Vite and Tailwind CSS
- **Node.js**: Backend server runtime on port 4000

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
