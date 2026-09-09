/**
 * Pass-2 modules: spare-part inventory, vendors, HR & payroll and the
 * platform (multi-tenant) view. Kept in its own deterministic store so the
 * core booking → dispatch → POD → invoice engine stays untouched. Screens
 * subscribe through `useDb()` and re-render on the shared `bump()`.
 */
import { audit, notify } from "./store";
import type { GuardResult } from "./machines";

export interface Part {
  id: string;
  sku: string;
  name: string;
  category: "Engine" | "Brakes" | "Tyres" | "Electrical" | "Body" | "Consumable";
  stock: number;
  reorderLevel: number;
  unitCost: number;
  location: string;
}

export interface StockMovement {
  id: string;
  partId: string;
  kind: "receive" | "issue";
  qty: number;
  ref: string;
  atISO: string;
  actor: string;
}

export interface Vendor {
  id: string;
  name: string;
  kind: "Garage" | "Fuel station" | "Tyres" | "Parts" | "Transporter" | "Insurance";
  contact: string;
  phone: string;
  city: string;
  rating: number;
  spendYtd: number;
  payable: number;
}

export interface Employee {
  id: string;
  name: string;
  designation: string;
  department: "Operations" | "Workshop" | "Finance" | "Drivers" | "Admin";
  branch: string;
  phone: string;
  monthlySalary: number;
  joinedISO: string;
  present: boolean;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  fromISO: string;
  toISO: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
}

export interface PayrollRun {
  id: string;
  month: string;
  headcount: number;
  gross: number;
  allowances: number;
  deductions: number;
  net: number;
  runISO: string;
}

export interface TenantAccount {
  id: string;
  name: string;
  country: string;
  plan: "Starter" | "Growth" | "Enterprise";
  vehicles: number;
  users: number;
  mrr: number;
  status: "active" | "trial" | "suspended";
  sinceISO: string;
}

export interface FeatureFlag {
  key: string;
  label: string;
  enabled: boolean;
  description: string;
}

export interface ExtrasShape {
  parts: Part[];
  movements: StockMovement[];
  vendors: Vendor[];
  employees: Employee[];
  leave: LeaveRequest[];
  payroll: PayrollRun[];
  tenants: TenantAccount[];
  flags: FeatureFlag[];
}

let extras: ExtrasShape | null = null;
let seq = 500;
const nid = (p: string) => `${p}_${++seq}`;
const now = () => new Date().toISOString();
const daysAgo = (d: number) => new Date(Date.now() - d * 86400000).toISOString();

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const PART_DEFS: Array<[string, Part["category"], number, number]> = [
  ["Air filter — Tata 3118", "Engine", 1450, 12],
  ["Oil filter — BharatBenz", "Engine", 890, 14],
  ["Brake pad set — front", "Brakes", 3200, 8],
  ["Brake drum liner", "Brakes", 2450, 6],
  ["Tyre 10.00 R20 radial", "Tyres", 18500, 10],
  ["Tyre tube & flap set", "Tyres", 2100, 12],
  ["Battery 150Ah", "Electrical", 12400, 4],
  ["Headlamp assembly", "Electrical", 3600, 6],
  ["Alternator 24V", "Electrical", 9800, 3],
  ["Leaf spring — rear", "Body", 7400, 4],
  ["Cabin mirror set", "Body", 1650, 8],
  ["Engine oil 15W-40 (20L)", "Consumable", 6800, 10],
  ["Coolant (5L)", "Consumable", 1250, 12],
  ["Grease cartridge", "Consumable", 380, 20],
  ["Clutch plate assembly", "Engine", 15600, 3],
  ["Wiper blade pair", "Consumable", 540, 15],
];

const VENDOR_DEFS: Array<[string, Vendor["kind"], string, string]> = [
  ["Shree Ganesh Auto Garage", "Garage", "Pune", "Mahesh Pawar"],
  ["Highway Fuel Point — NH48", "Fuel station", "Vadodara", "Iqbal Shaikh"],
  ["Maruti Tyre House", "Tyres", "Mumbai", "Dinesh Shah"],
  ["Apex Truck Spares", "Parts", "Nashik", "Rohan Kulkarni"],
  ["Deccan Carriers (partner)", "Transporter", "Hyderabad", "Vinay Reddy"],
  ["SafeRoad General Insurance", "Insurance", "Mumbai", "Ritu Menon"],
  ["Star Diesel Services", "Garage", "Nagpur", "Faisal Khan"],
  ["Bharat Petro Bulk Depot", "Fuel station", "Indore", "Sunil Gupta"],
];

const STAFF_DEFS: Array<[string, string, Employee["department"], number]> = [
  ["Sanjay Deshpande", "Operations Manager", "Operations", 92000],
  ["Prisha Kale", "Dispatcher", "Operations", 48000],
  ["Nikhil Bansal", "Accounts Lead", "Finance", 76000],
  ["Faisal Ahmed", "Workshop Manager", "Workshop", 68000],
  ["Meera Rao", "Compliance Officer", "Admin", 52000],
  ["Kavita Joshi", "Billing Executive", "Finance", 38000],
  ["Arun Shetty", "Fleet Supervisor", "Operations", 55000],
  ["Zoya Khan", "HR Executive", "Admin", 41000],
  ["Ramesh Yadav", "Senior Driver", "Drivers", 32000],
  ["Suresh Pawar", "Driver", "Drivers", 28000],
  ["Imran Sheikh", "Driver", "Drivers", 28000],
  ["Balwinder Singh", "Driver", "Drivers", 30000],
  ["Ganesh More", "Workshop Technician", "Workshop", 26000],
  ["Vikram Rathod", "Driver", "Drivers", 28000],
];

function build(): ExtrasShape {
  const r = rng(20260909);

  const parts: Part[] = PART_DEFS.map(([name, category, unitCost, reorderLevel], i) => {
    const low = i % 5 === 0;
    return {
      id: `prt_${i + 1}`,
      sku: `MF-${category.slice(0, 3).toUpperCase()}-${(1200 + i * 7).toString()}`,
      name,
      category,
      unitCost,
      reorderLevel,
      stock: low ? Math.max(0, reorderLevel - 1 - Math.floor(r() * 2)) : reorderLevel + 3 + Math.floor(r() * 22),
      location: i % 2 === 0 ? "Bhiwandi store — Rack A" : "Pune depot — Rack C",
    };
  });

  const movements: StockMovement[] = parts.slice(0, 10).map((p, i) => ({
    id: `mv_${i + 1}`,
    partId: p.id,
    kind: i % 3 === 0 ? "receive" : "issue",
    qty: 1 + Math.floor(r() * 6),
    ref: i % 3 === 0 ? `GRN-20${26}-${100 + i}` : `JC-${420 + i}`,
    atISO: daysAgo(i + 1),
    actor: "Faisal Ahmed",
  }));

  const vendors: Vendor[] = VENDOR_DEFS.map(([name, kind, city, contact], i) => ({
    id: `ven_${i + 1}`,
    name,
    kind,
    city,
    contact,
    phone: `+91 9${(820000000 + i * 137911).toString().slice(0, 9)}`,
    rating: Math.round((3.4 + r() * 1.6) * 10) / 10,
    spendYtd: Math.round((180000 + r() * 2200000) / 1000) * 1000,
    payable: i % 3 === 0 ? Math.round((20000 + r() * 240000) / 1000) * 1000 : 0,
  }));

  const employees: Employee[] = STAFF_DEFS.map(([name, designation, department, monthlySalary], i) => ({
    id: `emp_${i + 1}`,
    name,
    designation,
    department,
    branch: i % 2 === 0 ? "Bhiwandi Depot" : "Pune Depot",
    phone: `+91 98${(19000000 + i * 774311).toString().slice(0, 8)}`,
    monthlySalary,
    joinedISO: daysAgo(320 + i * 47),
    present: i % 7 !== 3,
  }));

  const leave: LeaveRequest[] = [
    { id: "lv_1", employeeId: "emp_10", fromISO: daysAgo(-2), toISO: daysAgo(-5), reason: "Family function in Solapur", status: "pending" },
    { id: "lv_2", employeeId: "emp_13", fromISO: daysAgo(-1), toISO: daysAgo(-3), reason: "Medical check-up", status: "pending" },
    { id: "lv_3", employeeId: "emp_6", fromISO: daysAgo(9), toISO: daysAgo(6), reason: "Annual leave", status: "approved" },
    { id: "lv_4", employeeId: "emp_11", fromISO: daysAgo(20), toISO: daysAgo(18), reason: "Personal", status: "rejected" },
  ];

  const gross = employees.reduce((s, e) => s + e.monthlySalary, 0);
  const payroll: PayrollRun[] = [1, 2, 3].map((m) => {
    const allowances = Math.round(gross * 0.12);
    const deductions = Math.round(gross * 0.09);
    return {
      id: `pay_${m}`,
      month: new Date(Date.now() - m * 30 * 86400000).toLocaleDateString("en-IN", { month: "long", year: "numeric" }),
      headcount: employees.length,
      gross,
      allowances,
      deductions,
      net: gross + allowances - deductions,
      runISO: daysAgo(m * 30 - 2),
    };
  });

  const tenants: TenantAccount[] = [
    { id: "tn_1", name: "Marichi Logistics Pvt Ltd", country: "India", plan: "Enterprise", vehicles: 18, users: 24, mrr: 74000, status: "active", sinceISO: daysAgo(640) },
    { id: "tn_2", name: "Konkan Freight Lines", country: "India", plan: "Growth", vehicles: 11, users: 9, mrr: 32000, status: "active", sinceISO: daysAgo(410) },
    { id: "tn_3", name: "Copperbelt Haulage", country: "Zambia", plan: "Growth", vehicles: 14, users: 12, mrr: 29500, status: "trial", sinceISO: daysAgo(21) },
    { id: "tn_4", name: "Sahyadri Movers", country: "India", plan: "Starter", vehicles: 5, users: 4, mrr: 9500, status: "suspended", sinceISO: daysAgo(240) },
  ];

  const flags: FeatureFlag[] = [
    { key: "whatsapp", label: "WhatsApp notifications", enabled: true, description: "Template messaging for booking, trip and payment events." },
    { key: "live_gps", label: "Live GPS telematics", enabled: true, description: "Streaming vehicle positions into the control tower." },
    { key: "driver_offline", label: "Driver offline queue", enabled: true, description: "Queue POD and fuel entries while the driver has no signal." },
    { key: "eway", label: "E-way bill sync", enabled: false, description: "Pull e-way bill numbers into bookings automatically." },
    { key: "payments", label: "Online payment collection", enabled: false, description: "Client portal card and UPI payment links." },
  ];

  return { parts, movements, vendors, employees, leave, payroll, tenants, flags };
}

export function getExtras(): ExtrasShape {
  if (!extras) extras = build();
  return extras;
}

const ok = { ok: true } as const;
const no = (reason: string): GuardResult => ({ ok: false, reason });

export function receiveStock(partId: string, qty: number, ref: string, actor: string): GuardResult {
  const part = getExtras().parts.find((p) => p.id === partId);
  if (!part) return no("That part is not in the catalogue.");
  if (qty <= 0) return no("Received quantity must be greater than zero.");
  part.stock += qty;
  getExtras().movements.unshift({ id: nid("mv"), partId, kind: "receive", qty, ref: ref || "GRN", atISO: now(), actor });
  audit(actor, `Received ${qty} × ${part.name}`, "part", partId);
  return ok;
}

export function issueStock(partId: string, qty: number, ref: string, actor: string): GuardResult {
  const part = getExtras().parts.find((p) => p.id === partId);
  if (!part) return no("That part is not in the catalogue.");
  if (qty <= 0) return no("Issued quantity must be greater than zero.");
  if (qty > part.stock) return no(`Only ${part.stock} in stock — receive more before issuing.`);
  part.stock -= qty;
  getExtras().movements.unshift({ id: nid("mv"), partId, kind: "issue", qty, ref: ref || "Job card", atISO: now(), actor });
  audit(actor, `Issued ${qty} × ${part.name} to ${ref || "job card"}`, "part", partId);
  if (part.stock <= part.reorderLevel) {
    notify({
      event: "MAINTENANCE_DUE",
      channel: "in_app",
      recipient: "Stores desk",
      recipientRole: "workshop",
      body: `${part.name} has dropped to ${part.stock} units — below the reorder level of ${part.reorderLevel}.`,
      link: "/app/inventory",
      entityRef: part.sku,
    });
  }
  return ok;
}

export function decideLeave(id: string, decision: "approved" | "rejected", actor: string): GuardResult {
  const req = getExtras().leave.find((l) => l.id === id);
  if (!req) return no("That leave request no longer exists.");
  if (req.status !== "pending") return no(`This request was already ${req.status}.`);
  req.status = decision;
  audit(actor, `Leave request ${decision}`, "leave", id, "pending", decision);
  return ok;
}

export function runPayroll(actor: string): GuardResult {
  const e = getExtras();
  const month = new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  if (e.payroll.some((p) => p.month === month)) return no(`Payroll for ${month} has already been run.`);
  const gross = e.employees.reduce((s, x) => s + x.monthlySalary, 0);
  const allowances = Math.round(gross * 0.12);
  const deductions = Math.round(gross * 0.09);
  e.payroll.unshift({
    id: nid("pay"),
    month,
    headcount: e.employees.length,
    gross,
    allowances,
    deductions,
    net: gross + allowances - deductions,
    runISO: now(),
  });
  audit(actor, `Payroll run for ${month}`, "payroll", month);
  return ok;
}

export function toggleFlag(key: string, actor: string): GuardResult {
  const flag = getExtras().flags.find((f) => f.key === key);
  if (!flag) return no("Unknown feature flag.");
  flag.enabled = !flag.enabled;
  audit(actor, `Feature “${flag.label}” ${flag.enabled ? "enabled" : "disabled"}`, "flag", key);
  return ok;
}

export function setTenantStatus(id: string, status: TenantAccount["status"], actor: string): GuardResult {
  const t = getExtras().tenants.find((x) => x.id === id);
  if (!t) return no("Unknown tenant.");
  if (t.status === status) return no(`${t.name} is already ${status}.`);
  const from = t.status;
  t.status = status;
  audit(actor, `Tenant ${status}`, "tenant", id, from, status);
  return ok;
}
