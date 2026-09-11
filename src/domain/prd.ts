/**
 * Pass-3 modules driven by the revised PRD: subscription packaging, alert
 * preferences & escalation, geofences, purchase orders, expense ledger,
 * credit notes, custom roles with branch scoping, payslips and country
 * compliance templates. Deterministic in-memory store, same pattern as
 * `extras.ts` — screens subscribe through `useDb()` and re-render on `bump()`.
 */
import { audit, notify, getDb } from "./store";
import { getExtras } from "./extras";
import type { GuardResult } from "./machines";
import type { NotificationEvent, Role } from "./types";

/* ---------------------------------------------------------------- packaging */

export type PlanTier = "Starter" | "Growth" | "Enterprise";

export interface PlanDef {
  tier: PlanTier;
  fleetFrom: number;
  fleetTo: number;
  pricePerVehicle: number;
  includes: string[];
}

export const PLANS: PlanDef[] = [
  {
    tier: "Starter",
    fleetFrom: 1,
    fleetTo: 10,
    pricePerVehicle: 900,
    includes: ["Onboarding", "Booking", "Dispatch", "GPS tracking", "POD", "Basic invoicing"],
  },
  {
    tier: "Growth",
    fleetFrom: 11,
    fleetTo: 50,
    pricePerVehicle: 750,
    includes: ["Everything in Starter", "Multi-branch", "Advanced analytics", "Vendor management"],
  },
  {
    tier: "Enterprise",
    fleetFrom: 51,
    fleetTo: 5000,
    pricePerVehicle: 620,
    includes: [
      "Everything in Growth",
      "Multi-country tenants",
      "Custom roles",
      "SLA support",
      "Data warehouse export",
    ],
  },
];

export interface AddOn {
  key: string;
  label: string;
  basis: "per vehicle" | "per employee" | "flat";
  unitPrice: number;
  enabled: boolean;
  description: string;
}

export interface Subscription {
  tier: PlanTier;
  renewsISO: string;
  addOns: AddOn[];
}

/* ------------------------------------------------------------ notifications */

export type Channel = "in_app" | "whatsapp" | "sms" | "email";

export interface AlertPreference {
  event: NotificationEvent;
  role: Role;
  channels: Channel[];
  critical: boolean;
  escalateAfterMins: number;
  escalateTo: Role;
}

/* ----------------------------------------------------------------- tracking */

export interface Geofence {
  id: string;
  name: string;
  kind: "depot" | "client site" | "checkpoint" | "restricted";
  city: string;
  lat: number;
  lng: number;
  radiusKm: number;
  autoStatus: boolean;
  dwellAlertMins: number;
}

/* ------------------------------------------------------ vendors & purchasing */

export interface PoLine {
  partId: string;
  qty: number;
  unitCost: number;
}

export interface PurchaseOrder {
  id: string;
  ref: string;
  vendorId: string;
  lines: PoLine[];
  status: "draft" | "sent" | "received" | "cancelled";
  raisedISO: string;
  receivedISO?: string;
  note: string;
  total: number;
}

/* -------------------------------------------------------------- finance depth */

export interface Expense {
  id: string;
  category: "Fuel" | "Toll" | "Repairs" | "Parts" | "Salaries" | "Insurance" | "Office" | "Other";
  vendorId?: string;
  vehicleId?: string;
  amount: number;
  note: string;
  atISO: string;
  status: "recorded" | "approved" | "paid";
}

export interface CreditNote {
  id: string;
  ref: string;
  invoiceId: string;
  clientId: string;
  amount: number;
  reason: string;
  atISO: string;
}

export interface InvoiceDispute {
  id: string;
  invoiceId: string;
  clientId: string;
  reason: string;
  detail: string;
  status: "open" | "under_review" | "resolved";
  raisedISO: string;
}

/* ------------------------------------------------------------- roles & people */

export const PERMISSIONS = [
  "view_operations",
  "manage_bookings",
  "dispatch_loads",
  "view_finance",
  "manage_invoices",
  "view_workshop",
  "manage_workshop",
  "view_admin",
  "manage_users",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

export interface CustomRole {
  id: string;
  name: string;
  basedOn: Role;
  permissions: Permission[];
  branchScope: string[];
  system: boolean;
}

export interface Payslip {
  id: string;
  employeeId: string;
  month: string;
  gross: number;
  incentive: number;
  deductions: number;
  net: number;
}

/* ------------------------------------------------------- compliance templates */

export const COMPLIANCE_TEMPLATES: Record<string, string[]> = {
  India: ["RC", "Fitness certificate", "National permit", "Insurance", "PUC", "E-way bill enrolment", "Driving licence"],
  Zambia: ["RTSA road licence", "Certificate of fitness", "Cross-border permit", "Insurance", "Driving licence"],
  "United Arab Emirates": ["Istimara (registration)", "Salik tag", "Vehicle insurance", "Mulkiya inspection", "Driving licence"],
  "Saudi Arabia": ["Istimara (registration)", "Wasl permit", "Vehicle insurance", "Periodic inspection", "Driving licence"],
};

/* ------------------------------------------------------------------- store */

export interface PrdShape {
  subscription: Subscription;
  alertPrefs: AlertPreference[];
  geofences: Geofence[];
  purchaseOrders: PurchaseOrder[];
  expenses: Expense[];
  creditNotes: CreditNote[];
  invoiceDisputes: InvoiceDispute[];
  roles: CustomRole[];
  payslips: Payslip[];
}

let prd: PrdShape | null = null;
let seq = 900;
const nid = (p: string) => `${p}_${++seq}`;
const now = () => new Date().toISOString();
const daysAgo = (d: number) => new Date(Date.now() - d * 86400000).toISOString();

const ALERT_EVENTS: Array<{ event: NotificationEvent; role: Role; critical: boolean }> = [
  { event: "BOOKING_CREATED", role: "dispatcher", critical: false },
  { event: "BOOKING_CONFIRMED", role: "client", critical: false },
  { event: "DRIVER_ASSIGNED", role: "driver", critical: true },
  { event: "DRIVER_ACCEPTED", role: "dispatcher", critical: false },
  { event: "TRIP_STARTED", role: "client", critical: false },
  { event: "TRIP_DELAYED", role: "manager", critical: true },
  { event: "BREAKDOWN_REPORTED", role: "workshop", critical: true },
  { event: "TRIP_DELIVERED", role: "client", critical: false },
  { event: "POD_AVAILABLE", role: "accountant", critical: false },
  { event: "INVOICE_CREATED", role: "client", critical: false },
  { event: "PAYMENT_REMINDER", role: "accountant", critical: false },
  { event: "PAYMENT_RECEIVED", role: "owner", critical: false },
  { event: "DOCUMENT_EXPIRING", role: "owner", critical: true },
  { event: "MAINTENANCE_DUE", role: "workshop", critical: true },
];

function build(): PrdShape {
  const db = getDb();
  const ex = getExtras();

  const subscription: Subscription = {
    tier: db.vehicles.length > 50 ? "Enterprise" : db.vehicles.length > 10 ? "Growth" : "Starter",
    renewsISO: daysAgo(-24),
    addOns: [
      { key: "workshop", label: "Workshop & Maintenance", basis: "per vehicle", unitPrice: 180, enabled: true, description: "Job cards, preventive schedules and downtime tracking." },
      { key: "payroll", label: "Payroll & HR", basis: "per employee", unitPrice: 120, enabled: true, description: "Attendance, payroll runs, payslips and incentives." },
      { key: "portal", label: "White-label client portal", basis: "flat", unitPrice: 6500, enabled: false, description: "Branded booking and tracking portal for your shippers." },
      { key: "telematics", label: "Telematics hardware bundle", basis: "per vehicle", unitPrice: 260, enabled: false, description: "Device plus SIM supplied and managed through Marichi." },
      { key: "premium_analytics", label: "Premium analytics", basis: "flat", unitPrice: 9500, enabled: false, description: "Predictive maintenance and route optimisation models." },
    ],
  };

  const alertPrefs: AlertPreference[] = ALERT_EVENTS.map((a) => ({
    event: a.event,
    role: a.role,
    channels: a.critical ? ["in_app", "whatsapp", "sms"] : ["in_app", "whatsapp"],
    critical: a.critical,
    escalateAfterMins: a.critical ? 30 : 0,
    escalateTo: a.critical ? "manager" : a.role,
  }));

  const geofences: Geofence[] = [
    { id: "gf_1", name: "Bhiwandi Depot", kind: "depot", city: "Bhiwandi", lat: 19.2967, lng: 73.0631, radiusKm: 1.2, autoStatus: true, dwellAlertMins: 45 },
    { id: "gf_2", name: "Pune Depot", kind: "depot", city: "Pune", lat: 18.5204, lng: 73.8567, radiusKm: 1, autoStatus: true, dwellAlertMins: 45 },
    { id: "gf_3", name: "JNPT Gate 3", kind: "client site", city: "Navi Mumbai", lat: 18.9490, lng: 72.9525, radiusKm: 2, autoStatus: true, dwellAlertMins: 120 },
    { id: "gf_4", name: "Vadodara Halt", kind: "checkpoint", city: "Vadodara", lat: 22.3072, lng: 73.1812, radiusKm: 1.5, autoStatus: false, dwellAlertMins: 60 },
    { id: "gf_5", name: "Ghat restricted stretch", kind: "restricted", city: "Khandala", lat: 18.7550, lng: 73.3860, radiusKm: 3, autoStatus: false, dwellAlertMins: 20 },
  ];

  const purchaseOrders: PurchaseOrder[] = [
    {
      id: "po_1",
      ref: "PO-2026-041",
      vendorId: "ven_4",
      lines: [
        { partId: "prt_5", qty: 4, unitCost: 18200 },
        { partId: "prt_6", qty: 6, unitCost: 2050 },
      ],
      status: "received",
      raisedISO: daysAgo(18),
      receivedISO: daysAgo(12),
      note: "Monsoon tyre replacement batch",
      total: 4 * 18200 + 6 * 2050,
    },
    {
      id: "po_2",
      ref: "PO-2026-042",
      vendorId: "ven_4",
      lines: [{ partId: "prt_1", qty: 20, unitCost: 1400 }],
      status: "sent",
      raisedISO: daysAgo(4),
      note: "Air filter top-up for the Tata fleet",
      total: 20 * 1400,
    },
    {
      id: "po_3",
      ref: "PO-2026-043",
      vendorId: "ven_3",
      lines: [{ partId: "prt_7", qty: 3, unitCost: 12100 }],
      status: "draft",
      raisedISO: daysAgo(1),
      note: "Batteries for the Nashik line-haul units",
      total: 3 * 12100,
    },
  ];

  const expenses: Expense[] = [
    { id: "exp_1", category: "Insurance", vendorId: "ven_6", amount: 248000, note: "Fleet policy — quarterly instalment", atISO: daysAgo(26), status: "paid" },
    { id: "exp_2", category: "Repairs", vendorId: "ven_1", vehicleId: db.vehicles[0]?.id, amount: 42500, note: "Gearbox overhaul", atISO: daysAgo(14), status: "approved" },
    { id: "exp_3", category: "Toll", amount: 68400, note: "FASTag recharge — corporate wallet", atISO: daysAgo(9), status: "paid" },
    { id: "exp_4", category: "Office", amount: 31500, note: "Bhiwandi office rent", atISO: daysAgo(6), status: "recorded" },
    { id: "exp_5", category: "Parts", vendorId: "ven_4", amount: 89000, note: "Tyre purchase against PO-2026-041", atISO: daysAgo(12), status: "paid" },
  ];

  const gross = ex.employees.reduce((s, e) => s + e.monthlySalary, 0);
  const payslips: Payslip[] = ex.employees.flatMap((e, idx) =>
    [1, 2].map((m) => {
      const incentive = e.department === "Drivers" ? 2400 + ((idx * 317) % 2600) : Math.round(e.monthlySalary * 0.05);
      const deductions = Math.round(e.monthlySalary * 0.09);
      return {
        id: `ps_${e.id}_${m}`,
        employeeId: e.id,
        month: new Date(Date.now() - m * 30 * 86400000).toLocaleDateString("en-IN", { month: "long", year: "numeric" }),
        gross: e.monthlySalary,
        incentive,
        deductions,
        net: e.monthlySalary + incentive - deductions,
      };
    }),
  );
  void gross;

  const branches = db.branches.map((b) => b.name);
  const roles: CustomRole[] = [
    { id: "rl_1", name: "Owner / Director", basedOn: "owner", permissions: [...PERMISSIONS], branchScope: branches, system: true },
    { id: "rl_2", name: "Operations Manager", basedOn: "manager", permissions: ["view_operations", "manage_bookings", "dispatch_loads", "view_workshop", "view_finance"], branchScope: branches, system: true },
    { id: "rl_3", name: "Dispatcher", basedOn: "dispatcher", permissions: ["view_operations", "manage_bookings", "dispatch_loads"], branchScope: branches.slice(0, 1), system: true },
    { id: "rl_4", name: "Accountant", basedOn: "accountant", permissions: ["view_finance", "manage_invoices", "view_operations"], branchScope: branches, system: true },
    { id: "rl_5", name: "Workshop Manager", basedOn: "workshop", permissions: ["view_workshop", "manage_workshop", "view_operations"], branchScope: branches.slice(0, 1), system: true },
    { id: "rl_6", name: "Night Desk (custom)", basedOn: "dispatcher", permissions: ["view_operations", "dispatch_loads"], branchScope: branches.slice(0, 1), system: false },
  ];

  const creditNotes: CreditNote[] = db.invoices.slice(0, 1).map((inv, i) => ({
    id: `cn_${i + 1}`,
    ref: `CN-2026-00${i + 1}`,
    invoiceId: inv.id,
    clientId: inv.clientId,
    amount: Math.round(inv.total * 0.05),
    reason: "Detention charge waived after client dispute",
    atISO: daysAgo(7),
  }));

  const invoiceDisputes: InvoiceDispute[] = db.invoices.slice(1, 2).map((inv, i) => ({
    id: `dsp_${i + 1}`,
    invoiceId: inv.id,
    clientId: inv.clientId,
    reason: "Detention charge",
    detail: "Waiting time was caused by a gate closure outside our control.",
    status: "under_review",
    raisedISO: daysAgo(3),
  }));

  return { subscription, alertPrefs, geofences, purchaseOrders, expenses, creditNotes, invoiceDisputes, roles, payslips };
}

export function getPrd(): PrdShape {
  if (!prd) prd = build();
  return prd;
}

const ok = { ok: true } as const;
const no = (reason: string): GuardResult => ({ ok: false, reason });

/* ------------------------------------------------------------------ actions */

export function planFor(tier: PlanTier) {
  return PLANS.find((p) => p.tier === tier)!;
}

export function subscriptionCost() {
  const s = getPrd().subscription;
  const db = getDb();
  const ex = getExtras();
  const base = planFor(s.tier).pricePerVehicle * db.vehicles.length;
  const addOns = s.addOns
    .filter((a) => a.enabled)
    .reduce((sum, a) => {
      if (a.basis === "per vehicle") return sum + a.unitPrice * db.vehicles.length;
      if (a.basis === "per employee") return sum + a.unitPrice * ex.employees.length;
      return sum + a.unitPrice;
    }, 0);
  return { base, addOns, total: base + addOns };
}

export function changePlan(tier: PlanTier, actor: string): GuardResult {
  const s = getPrd().subscription;
  if (s.tier === tier) return no(`You are already on the ${tier} plan.`);
  const def = planFor(tier);
  const fleet = getDb().vehicles.length;
  if (fleet > def.fleetTo) return no(`${tier} covers up to ${def.fleetTo} vehicles — your fleet has ${fleet}.`);
  const from = s.tier;
  s.tier = tier;
  audit(actor, `Subscription plan changed`, "subscription", tier, from, tier);
  return ok;
}

export function toggleAddOn(key: string, actor: string): GuardResult {
  const a = getPrd().subscription.addOns.find((x) => x.key === key);
  if (!a) return no("Unknown add-on.");
  a.enabled = !a.enabled;
  audit(actor, `Add-on “${a.label}” ${a.enabled ? "enabled" : "disabled"}`, "subscription", key);
  return ok;
}

export function toggleAlertChannel(event: NotificationEvent, channel: Channel, actor: string): GuardResult {
  const p = getPrd().alertPrefs.find((x) => x.event === event);
  if (!p) return no("Unknown alert.");
  if (p.channels.includes(channel)) {
    if (p.channels.length === 1) return no("Keep at least one delivery channel for this alert.");
    p.channels = p.channels.filter((c) => c !== channel);
  } else {
    p.channels = [...p.channels, channel];
  }
  audit(actor, `Alert channels updated for ${event}`, "alert_preference", event);
  return ok;
}

export function setEscalation(event: NotificationEvent, mins: number, escalateTo: Role, actor: string): GuardResult {
  const p = getPrd().alertPrefs.find((x) => x.event === event);
  if (!p) return no("Unknown alert.");
  if (mins < 0 || mins > 720) return no("Escalation delay must be between 0 and 720 minutes.");
  p.escalateAfterMins = mins;
  p.escalateTo = escalateTo;
  audit(actor, `Escalation set to ${mins}m for ${event}`, "alert_preference", event);
  return ok;
}

export function saveGeofence(input: Omit<Geofence, "id">, actor: string): GuardResult {
  if (!input.name.trim()) return no("Give the geofence a name.");
  if (input.radiusKm <= 0 || input.radiusKm > 50) return no("Radius must be between 0 and 50 km.");
  getPrd().geofences.unshift({ ...input, id: nid("gf") });
  audit(actor, `Geofence “${input.name}” created`, "geofence", input.name);
  return ok;
}

export function removeGeofence(id: string, actor: string): GuardResult {
  const g = getPrd();
  const idx = g.geofences.findIndex((x) => x.id === id);
  if (idx < 0) return no("That geofence no longer exists.");
  const [removed] = g.geofences.splice(idx, 1);
  audit(actor, `Geofence “${removed.name}” removed`, "geofence", id);
  return ok;
}

export function raisePurchaseOrder(vendorId: string, partId: string, qty: number, note: string, actor: string): GuardResult {
  const vendor = getExtras().vendors.find((v) => v.id === vendorId);
  const part = getExtras().parts.find((p) => p.id === partId);
  if (!vendor) return no("Choose a vendor for this purchase order.");
  if (!part) return no("Choose a part to order.");
  if (qty <= 0) return no("Order quantity must be greater than zero.");
  const p = getPrd();
  const ref = `PO-2026-${(44 + p.purchaseOrders.length).toString().padStart(3, "0")}`;
  p.purchaseOrders.unshift({
    id: nid("po"),
    ref,
    vendorId,
    lines: [{ partId, qty, unitCost: part.unitCost }],
    status: "draft",
    raisedISO: now(),
    note,
    total: qty * part.unitCost,
  });
  audit(actor, `Purchase order ${ref} raised on ${vendor.name}`, "purchase_order", ref);
  return ok;
}

export function sendPurchaseOrder(id: string, actor: string): GuardResult {
  const po = getPrd().purchaseOrders.find((x) => x.id === id);
  if (!po) return no("That purchase order no longer exists.");
  if (po.status !== "draft") return no(`${po.ref} has already been ${po.status}.`);
  po.status = "sent";
  const vendor = getExtras().vendors.find((v) => v.id === po.vendorId);
  audit(actor, `Purchase order ${po.ref} sent`, "purchase_order", po.ref, "draft", "sent");
  notify({
    event: "MAINTENANCE_DUE",
    channel: "email",
    recipient: vendor?.name ?? "Vendor",
    recipientRole: "workshop",
    body: `${po.ref} has been sent for supply — total ${Math.round(po.total).toLocaleString("en-IN")}.`,
    link: "/app/purchase-orders",
    entityRef: po.ref,
  });
  return ok;
}

export function receivePurchaseOrder(id: string, actor: string): GuardResult {
  const po = getPrd().purchaseOrders.find((x) => x.id === id);
  if (!po) return no("That purchase order no longer exists.");
  if (po.status === "received") return no(`${po.ref} was already received.`);
  if (po.status === "cancelled") return no(`${po.ref} was cancelled.`);
  if (po.status === "draft") return no(`Send ${po.ref} to the vendor before receiving stock against it.`);
  po.status = "received";
  po.receivedISO = now();
  for (const line of po.lines) {
    const part = getExtras().parts.find((p) => p.id === line.partId);
    if (!part) continue;
    // Weighted average cost so inventory valuation follows real purchase prices.
    const value = part.stock * part.unitCost + line.qty * line.unitCost;
    part.stock += line.qty;
    part.unitCost = part.stock > 0 ? Math.round(value / part.stock) : line.unitCost;
    getExtras().movements.unshift({
      id: nid("mv"),
      partId: part.id,
      kind: "receive",
      qty: line.qty,
      ref: po.ref,
      atISO: now(),
      actor,
    });
  }
  getPrd().expenses.unshift({
    id: nid("exp"),
    category: "Parts",
    vendorId: po.vendorId,
    amount: po.total,
    note: `Goods received against ${po.ref}`,
    atISO: now(),
    status: "recorded",
  });
  audit(actor, `Purchase order ${po.ref} received into stock`, "purchase_order", po.ref, "sent", "received");
  return ok;
}

export function cancelPurchaseOrder(id: string, actor: string): GuardResult {
  const po = getPrd().purchaseOrders.find((x) => x.id === id);
  if (!po) return no("That purchase order no longer exists.");
  if (po.status === "received") return no(`${po.ref} has already been received — raise a return instead.`);
  po.status = "cancelled";
  audit(actor, `Purchase order ${po.ref} cancelled`, "purchase_order", po.ref);
  return ok;
}

export function recordExpense(input: Omit<Expense, "id" | "atISO" | "status">, actor: string): GuardResult {
  if (input.amount <= 0) return no("Expense amount must be greater than zero.");
  if (!input.note.trim()) return no("Add a short description for the expense.");
  getPrd().expenses.unshift({ ...input, id: nid("exp"), atISO: now(), status: "recorded" });
  audit(actor, `Expense recorded — ${input.category}`, "expense", input.note);
  return ok;
}

export function advanceExpense(id: string, actor: string): GuardResult {
  const e = getPrd().expenses.find((x) => x.id === id);
  if (!e) return no("That expense no longer exists.");
  if (e.status === "paid") return no("This expense has already been paid.");
  const next = e.status === "recorded" ? "approved" : "paid";
  const from = e.status;
  e.status = next;
  audit(actor, `Expense ${next}`, "expense", id, from, next);
  return ok;
}

export function issueCreditNote(invoiceId: string, amount: number, reason: string, actor: string): GuardResult {
  const inv = getDb().invoices.find((i) => i.id === invoiceId);
  if (!inv) return no("Choose an invoice to credit.");
  if (amount <= 0) return no("Credit amount must be greater than zero.");
  const outstanding = inv.total - inv.paid;
  if (amount > outstanding) return no(`Only ${Math.round(outstanding).toLocaleString("en-IN")} is outstanding on ${inv.ref}.`);
  if (!reason.trim()) return no("Record why the credit note is being issued.");
  const p = getPrd();
  const ref = `CN-2026-0${p.creditNotes.length + 1}`;
  p.creditNotes.unshift({ id: nid("cn"), ref, invoiceId, clientId: inv.clientId, amount, reason, atISO: now() });
  inv.paid = Math.min(inv.total, inv.paid + amount);
  if (inv.paid >= inv.total) inv.status = "paid";
  else if (inv.paid > 0) inv.status = "partially_paid";
  audit(actor, `Credit note ${ref} against ${inv.ref}`, "credit_note", ref);
  return ok;
}

export function raiseInvoiceDispute(invoiceId: string, reason: string, detail: string, actor: string): GuardResult {
  const inv = getDb().invoices.find((i) => i.id === invoiceId);
  if (!inv) return no("That invoice no longer exists.");
  if (!reason.trim() || !detail.trim()) return no("Choose a reason and explain what should be reviewed.");
  const existing = getPrd().invoiceDisputes.find((d) => d.invoiceId === invoiceId && d.status !== "resolved");
  if (existing) return no("This invoice already has an open review.");
  getPrd().invoiceDisputes.unshift({ id: nid("dsp"), invoiceId, clientId: inv.clientId, reason, detail, status: "open", raisedISO: now() });
  audit(actor, `Invoice dispute opened — ${reason}`, "invoice", invoiceId);
  notify({ event: "PAYMENT_REMINDER", channel: "in_app", recipient: "Finance desk", recipientRole: "accountant", body: `${inv.ref} has been disputed: ${reason}.`, link: `/app/finance/invoices/${inv.id}`, entityRef: inv.ref });
  return ok;
}

export function saveRole(role: Omit<CustomRole, "id" | "system">, id: string | null, actor: string): GuardResult {
  if (!role.name.trim()) return no("Give the role a name.");
  if (role.permissions.length === 0) return no("A role needs at least one permission.");
  if (role.branchScope.length === 0) return no("Scope the role to at least one branch.");
  const p = getPrd();
  if (id) {
    const existing = p.roles.find((r) => r.id === id);
    if (!existing) return no("That role no longer exists.");
    if (existing.system) return no("Built-in roles cannot be renamed — duplicate it as a custom role instead.");
    Object.assign(existing, role);
    audit(actor, `Role “${role.name}” updated`, "role", id);
  } else {
    p.roles.push({ ...role, id: nid("rl"), system: false });
    audit(actor, `Role “${role.name}” created`, "role", role.name);
  }
  return ok;
}

export function deleteRole(id: string, actor: string): GuardResult {
  const p = getPrd();
  const idx = p.roles.findIndex((r) => r.id === id);
  if (idx < 0) return no("That role no longer exists.");
  if (p.roles[idx].system) return no("Built-in roles cannot be deleted.");
  const [removed] = p.roles.splice(idx, 1);
  audit(actor, `Role “${removed.name}” deleted`, "role", id);
  return ok;
}
