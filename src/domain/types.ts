/* ------------------------------------------------------------------ */
/* Roles — the full 17-role model from system_design.md s12.3          */
/* ------------------------------------------------------------------ */
export type CanonicalRole =
  | "platform_admin"
  | "platform_support"
  | "owner"
  | "admin"
  | "ops_manager"
  | "branch_manager"
  | "dispatcher"
  | "finance_manager"
  | "accountant"
  | "workshop_manager"
  | "storekeeper"
  | "compliance_officer"
  | "hr_payroll"
  | "driver"
  | "customer_user"
  | "vendor_user"
  | "auditor";

/* Legacy aliases for compatibility with existing store, seed & routes */
export type LegacyRole = "manager" | "workshop" | "viewer" | "client";

export type Role = CanonicalRole | LegacyRole;

/* Legacy capabilities mapped to new granular permissions */
export type LegacyCapability =
  | "view_operations"
  | "dispatch"
  | "edit_booking"
  | "view_finance"
  | "edit_finance"
  | "view_workshop"
  | "edit_workshop"
  | "edit_fleet"
  | "view_admin";

/* ------------------------------------------------------------------ */
/* Money — integer minor units + ISO 4217, never a float (Law 2)       */
/* ------------------------------------------------------------------ */
export type Currency = "INR" | "ZMW" | "AED" | "SAR" | "USD";

export interface Money {
  minor: number;
  currency: Currency;
}

/* ------------------------------------------------------------------ */
/* Permission strings — granular, verb-based                           */
/* ------------------------------------------------------------------ */
export type Permission =
  /* Tower & Dispatch */
  | "tower:read"
  | "dispatch:read" | "dispatch:assign" | "dispatch:plan"
  /* Trips */
  | "trips:read" | "trips:create" | "trips:reconcile"
  /* Bookings */
  | "bookings:read" | "bookings:create"
  /* POD */
  | "pod:read" | "pod:approve"
  /* Incidents */
  | "incidents:read" | "incidents:vendor"
  /* Fleet */
  | "fleet:read" | "fleet:track" | "devices:manage"
  /* Directory */
  | "directory:read" | "drivers:read" | "customers:read" | "vendors:read"
  | "rate_cards:read" | "rate_cards:write" | "geofences:manage"
  /* Documents & Compliance */
  | "documents:read" | "documents:manage" | "compliance:read" | "compliance:manage"
  /* Workshop & Inventory */
  | "workshop:read" | "workshop:manage" | "inventory:read" | "inventory:manage"
  /* Finance */
  | "finance:read" | "billing:draft" | "billing:finalise"
  | "payments:read" | "payments:apply"
  | "ledger:read" | "ledger:close"
  | "expenses:read" | "expenses:approve"
  /* HR */
  | "hr:read" | "hr:payroll"
  /* Approvals */
  | "approvals:read" | "approvals:decide"
  /* Automation */
  | "automation:read" | "automation:configure"
  /* AI & Comms */
  | "ai:command" | "comms:read" | "comms:send"
  /* Analytics */
  | "analytics:ops" | "analytics:finance" | "analytics:profitability" | "analytics:drivers"
  /* Admin */
  | "admin:users" | "admin:branches" | "admin:policies" | "admin:features"
  /* Audit */
  | "audit:read"
  /* Platform */
  | "platform:tenants" | "platform:impersonate"
  /* Export */
  | "exports:request";

export type BookingStatus =
  | "draft"
  | "submitted"
  | "confirmed"
  | "assigned"
  | "dispatched"
  | "in_transit"
  | "delivered"
  | "pod_pending"
  | "pod_received"
  | "invoiced"
  | "partially_paid"
  | "paid"
  | "closed"
  | "cancelled";

export type TripStatus =
  | "planned"
  | "driver_assigned"
  | "driver_accepted"
  | "started"
  | "in_transit"
  | "exception"
  | "arrived"
  | "delivered"
  | "pod_uploaded"
  | "completed";

export type InvoiceStatus =
  | "draft"
  | "issued"
  | "sent"
  | "partially_paid"
  | "paid"
  | "overdue"
  | "cancelled";

export type JobCardStatus =
  | "reported"
  | "inspected"
  | "job_created"
  | "parts_required"
  | "in_progress"
  | "completed"
  | "released";

export type DocumentStatus = "valid" | "expiring" | "expired" | "renewal_pending" | "renewed";

export type VehicleStatus = "available" | "on_trip" | "maintenance" | "inactive";
export type DriverStatus = "available" | "on_trip" | "rest" | "leave" | "inactive";

export interface Tenant {
  id: string;
  name: string;
  country: string;
  currency: string;
}

export interface Branch {
  id: string;
  tenantId: string;
  name: string;
  city: string;
  lat: number;
  lng: number;
}

export interface Vehicle {
  id: string;
  tenantId: string;
  branchId: string;
  regNo: string;
  make: string;
  type: "Truck" | "Trailer" | "Container" | "Tanker" | "LCV";
  capacityTons: number;
  status: VehicleStatus;
  odometerKm: number;
  fuelPct: number;
  lat: number;
  lng: number;
  speedKph: number;
  lastPingISO: string;
  currentTripId?: string;
  serviceDueKm: number;
}

export interface Driver {
  id: string;
  tenantId: string;
  branchId: string;
  name: string;
  phone: string;
  licenceNo: string;
  licenceExpiryISO: string;
  status: DriverStatus;
  rating: number;
  tripsCompleted: number;
  assignedVehicleId?: string;
}

export interface Client {
  id: string;
  tenantId: string;
  name: string;
  segment: "Manufacturer" | "Distributor" | "3PL" | "Warehouse" | "Retail";
  contactName: string;
  phone: string;
  email: string;
  city: string;
  gstin: string;
  creditDays: number;
  ratePerKm: number;
}

export interface RateCard {
  id: string;
  clientId: string;
  vehicleType: Vehicle["type"];
  perKm: number;
  minCharge: number;
}

export interface Place {
  city: string;
  address: string;
  lat: number;
  lng: number;
}

export interface Booking {
  id: string;
  ref: string;
  tenantId: string;
  clientId: string;
  status: BookingStatus;
  pickup: Place;
  drop: Place;
  distanceKm: number;
  cargo: string;
  weightTons: number;
  vehicleType: Vehicle["type"];
  priority: "standard" | "express" | "critical";
  rate: number;
  pickupISO: string;
  createdISO: string;
  tripId?: string;
  invoiceId?: string;
  routeId?: string;
  createdBy: string;
}

export interface Checkpoint {
  id: string;
  label: string;
  city: string;
  lat: number;
  lng: number;
  doneISO?: string;
}

export interface Trip {
  id: string;
  ref: string;
  tenantId: string;
  bookingId: string;
  vehicleId: string;
  driverId: string;
  status: TripStatus;
  checkpoints: Checkpoint[];
  progress: number;
  etaISO: string;
  delayMins: number;
  startedISO?: string;
  deliveredISO?: string;
  route: Array<{ lat: number; lng: number }>;
  podId?: string;
  revenue: number;
  fuelCost: number;
  tollCost: number;
  driverCost: number;
  exception?: { type: string; note: string; atISO: string };
}

export interface Pod {
  id: string;
  tripId: string;
  bookingId: string;
  receiverName: string;
  signatureSeed: string;
  photoNote: string;
  otp: string;
  capturedISO: string;
  verified: boolean;
  imageUrl?: string;
  reviewedBy?: string;
  reviewedISO?: string;
  status?: "pending" | "approved" | "rejected";
}

export interface InvoiceLine {
  label: string;
  amount: number;
}

export interface Invoice {
  id: string;
  ref: string;
  tenantId: string;
  clientId: string;
  bookingId: string;
  tripId: string;
  status: InvoiceStatus;
  lines: InvoiceLine[];
  subtotal: number;
  taxPct: number;
  total: number;
  paid: number;
  issuedISO?: string;
  dueISO: string;
  createdISO: string;
  irn?: string;
  ackNo?: string;
  ackDateISO?: string;
  qrCodeData?: string;
  rcm?: boolean;
  sacCode?: string;
}

export interface Payment {
  id: string;
  invoiceId: string;
  clientId: string;
  amount: number;
  mode: "NEFT" | "UPI" | "Cheque" | "Cash";
  reference: string;
  receivedISO: string;
}

export interface FuelLog {
  id: string;
  vehicleId: string;
  tripId?: string;
  litres: number;
  cost: number;
  odometerKm: number;
  station: string;
  atISO: string;
}

export interface JobCard {
  id: string;
  ref: string;
  vehicleId: string;
  issue: string;
  status: JobCardStatus;
  partsCost: number;
  labourCost: number;
  openedISO: string;
  closedISO?: string;
}

export interface ComplianceDoc {
  id: string;
  entityType: "vehicle" | "driver";
  entityId: string;
  kind: string;
  number: string;
  expiryISO: string;
  status: DocumentStatus;
}

export type NotificationEvent =
  | "BOOKING_CREATED"
  | "BOOKING_CONFIRMED"
  | "DRIVER_ASSIGNED"
  | "DRIVER_ACCEPTED"
  | "TRIP_STARTED"
  | "ETA_UPDATED"
  | "TRIP_DELAYED"
  | "BREAKDOWN_REPORTED"
  | "TRIP_DELIVERED"
  | "POD_AVAILABLE"
  | "INVOICE_CREATED"
  | "PAYMENT_REMINDER"
  | "PAYMENT_RECEIVED"
  | "DOCUMENT_EXPIRING"
  | "MAINTENANCE_DUE";

export interface Notification {
  id: string;
  event: NotificationEvent;
  channel: "whatsapp" | "sms" | "email" | "in_app";
  recipient: string;
  recipientRole: Role;
  body: string;
  status: "queued" | "sent" | "delivered" | "read" | "failed";
  attempts: number;
  atISO: string;
  link?: string;
  entityRef?: string;
}

export interface AuditEntry {
  id: string;
  actor: string;
  action: string;
  entity: string;
  entityId: string;
  from?: string;
  to?: string;
  atISO: string;
}

export interface TransportRoute {
  id: string;
  name: string;
  code: string;
  originCity: string;
  destinationCity: string;
  distanceKm: number;
  estTransitHours: number;
  defaultRate: number;
  tollEstimate: number;
  stops?: string[];
  status: "active" | "inactive";
  createdAtISO: string;
}

export interface DbShape {
  tenant: Tenant;
  branches: Branch[];
  vehicles: Vehicle[];
  drivers: Driver[];
  clients: Client[];
  rateCards: RateCard[];
  routes: TransportRoute[];
  bookings: Booking[];
  trips: Trip[];
  pods: Pod[];
  invoices: Invoice[];
  payments: Payment[];
  fuelLogs: FuelLog[];
  jobCards: JobCard[];
  docs: ComplianceDoc[];
  notifications: Notification[];
  audit: AuditEntry[];
}
