/**
 * RBAC & Permissions — frontend mirror of packages/authz
 *
 * RBAC for the verb, ABAC for the scope (system_design.md s12.3).
 * The client guard is UX only. The server is the authority (Law 6).
 */
import type { CanonicalRole, LegacyCapability, Permission, Role } from "./types";

export type Capability = Permission | LegacyCapability;

/* ------------------------------------------------------------------ */
/* Permission catalogue: role → permission[]                          */
/* Matches frontend.md s5 exactly.                                     */
/* ------------------------------------------------------------------ */
export const ROLE_PERMISSIONS: Record<CanonicalRole, Permission[]> = {
  platform_admin: [
    "platform:tenants", "platform:impersonate",
  ],
  platform_support: [
    "platform:tenants",
  ],
  owner: [
    "tower:read", "dispatch:read", "dispatch:assign", "dispatch:plan",
    "trips:read", "trips:create", "trips:reconcile",
    "bookings:read", "bookings:create",
    "pod:read", "pod:approve",
    "incidents:read", "incidents:vendor",
    "fleet:read", "fleet:track", "devices:manage",
    "directory:read", "drivers:read", "customers:read", "vendors:read",
    "rate_cards:read", "rate_cards:write", "geofences:manage",
    "documents:read", "documents:manage", "compliance:read", "compliance:manage",
    "workshop:read", "workshop:manage", "inventory:read", "inventory:manage",
    "finance:read", "billing:draft", "billing:finalise",
    "payments:read", "payments:apply",
    "ledger:read", "ledger:close",
    "expenses:read", "expenses:approve",
    "hr:read", "hr:payroll",
    "approvals:read", "approvals:decide",
    "automation:read", "automation:configure",
    "ai:command", "comms:read", "comms:send",
    "analytics:ops", "analytics:finance", "analytics:profitability", "analytics:drivers",
    "admin:users", "admin:branches", "admin:policies", "admin:features",
    "audit:read", "exports:request",
  ],
  admin: [
    "fleet:read", "fleet:track", "devices:manage",
    "directory:read", "drivers:read", "customers:read", "vendors:read",
    "rate_cards:read", "rate_cards:write", "geofences:manage",
    "documents:read", "documents:manage", "compliance:read", "compliance:manage",
    "automation:read", "automation:configure",
    "admin:users", "admin:branches", "admin:policies", "admin:features",
    "audit:read", "exports:request",
  ],
  ops_manager: [
    "tower:read", "dispatch:read", "dispatch:assign", "dispatch:plan",
    "trips:read", "trips:create", "trips:reconcile",
    "bookings:read", "bookings:create",
    "pod:read", "pod:approve",
    "incidents:read", "incidents:vendor",
    "fleet:read", "fleet:track",
    "directory:read", "drivers:read", "customers:read", "vendors:read",
    "rate_cards:read", "geofences:manage",
    "documents:read", "compliance:read",
    "workshop:read",
    "expenses:read", "expenses:approve",
    "approvals:read", "approvals:decide",
    "automation:read",
    "ai:command", "comms:read", "comms:send",
    "analytics:ops",
    "exports:request",
  ],
  branch_manager: [
    "tower:read", "dispatch:read", "dispatch:assign", "dispatch:plan",
    "trips:read", "trips:create", "trips:reconcile",
    "bookings:read", "bookings:create",
    "pod:read", "pod:approve",
    "incidents:read", "incidents:vendor",
    "fleet:read", "fleet:track",
    "directory:read", "drivers:read", "customers:read", "vendors:read",
    "rate_cards:read", "geofences:manage",
    "documents:read", "compliance:read",
    "workshop:read",
    "expenses:read", "expenses:approve",
    "approvals:read", "approvals:decide",
    "ai:command", "comms:read", "comms:send",
    "analytics:ops", "analytics:finance",
    "exports:request",
  ],
  dispatcher: [
    "tower:read", "dispatch:read", "dispatch:assign",
    "trips:read", "trips:create",
    "bookings:read", "bookings:create",
    "pod:read",
    "incidents:read",
    "fleet:read",
    "ai:command", "comms:read", "comms:send",
  ],
  finance_manager: [
    "trips:read",
    "finance:read", "billing:draft", "billing:finalise",
    "payments:read", "payments:apply",
    "ledger:read", "ledger:close",
    "expenses:read", "expenses:approve",
    "documents:read",
    "approvals:read", "approvals:decide",
    "analytics:finance", "analytics:profitability",
    "audit:read", "exports:request",
  ],
  accountant: [
    "expenses:read", "expenses:approve",
    "finance:read", "billing:draft",
    "payments:read", "payments:apply",
    "documents:read",
  ],
  workshop_manager: [
    "workshop:read", "workshop:manage",
    "inventory:read", "inventory:manage",
    "fleet:read",
    "approvals:read", "approvals:decide",
  ],
  storekeeper: [
    "inventory:read", "inventory:manage",
  ],
  compliance_officer: [
    "compliance:read", "compliance:manage",
    "documents:read", "documents:manage",
    "fleet:read",
    "audit:read",
  ],
  hr_payroll: [
    "hr:read", "hr:payroll",
    "directory:read", "drivers:read",
    "analytics:drivers",
  ],
  driver: [],      // Self-scoped — driver app only, no console permissions
  customer_user: [], // Portal only
  vendor_user: [],   // Portal only
  auditor: [
    "audit:read",
    "ledger:read",
    "finance:read",
    "trips:read",
    "documents:read",
    "automation:read",
    "exports:request",
  ],
};

/* Normalise legacy roles to modern equivalents */
export function normalizeRole(role: Role): keyof typeof ROLE_PERMISSIONS {
  if (role === "manager") return "ops_manager";
  if (role === "workshop") return "workshop_manager";
  if (role === "client") return "customer_user";
  if (role === "viewer") return "auditor";
  return role as keyof typeof ROLE_PERMISSIONS;
}

export const CAPABILITIES: Record<string, Capability[]> = ROLE_PERMISSIONS;

const LEGACY_CAPABILITY_MAP: Record<LegacyCapability, Permission[]> = {
  view_operations: ["tower:read", "trips:read", "bookings:read"],
  dispatch: ["dispatch:read", "dispatch:assign"],
  edit_booking: ["bookings:create"],
  view_finance: ["finance:read"],
  edit_finance: ["billing:draft", "billing:finalise", "payments:apply"],
  view_workshop: ["workshop:read"],
  edit_workshop: ["workshop:manage"],
  edit_fleet: ["devices:manage", "compliance:manage"],
  view_admin: ["admin:users", "admin:branches", "audit:read"],
};

/* ------------------------------------------------------------------ */
/* can() — the ONE authorisation function                              */
/* UX-only; the server is the real authority (Law 6).                   */
/* ------------------------------------------------------------------ */
export function can(role: Role, perm: Permission | LegacyCapability): boolean {
  const normalized = normalizeRole(role);
  const perms = ROLE_PERMISSIONS[normalized] ?? [];

  if (perm in LEGACY_CAPABILITY_MAP) {
    const mapped = LEGACY_CAPABILITY_MAP[perm as LegacyCapability];
    return mapped.some((p) => perms.includes(p));
  }

  return perms.includes(perm as Permission);
}

/** Check if role has ANY of the given permissions */
export function canAny(role: Role, perms: (Permission | LegacyCapability)[]): boolean {
  return perms.some((p) => can(role, p));
}

/* ------------------------------------------------------------------ */
/* Role labels — human-readable display names                          */
/* ------------------------------------------------------------------ */
const ROLE_LABELS: Record<Role, string> = {
  platform_admin: "Platform Admin",
  platform_support: "Platform Support",
  owner: "Owner / Director",
  admin: "Admin",
  ops_manager: "Operations Manager",
  branch_manager: "Branch Manager",
  dispatcher: "Dispatcher",
  finance_manager: "Finance Manager",
  accountant: "Accountant",
  workshop_manager: "Workshop Manager",
  storekeeper: "Storekeeper",
  compliance_officer: "Compliance Officer",
  hr_payroll: "HR & Payroll",
  driver: "Driver",
  customer_user: "Customer",
  vendor_user: "Vendor",
  auditor: "Auditor",
  // Legacy
  manager: "Operations Manager",
  workshop: "Workshop Manager",
  viewer: "Auditor",
  client: "Customer",
};

export function roleLabel(role: Role): string {
  return ROLE_LABELS[role] ?? role;
}

/* ------------------------------------------------------------------ */
/* Role → App mapping                                                  */
/* frontend.md s0.3: three surfaces: console, portal, driver-app       */
/* ------------------------------------------------------------------ */
export type AppSurface = "console" | "portal" | "driver-app";

export function appFor(role: Role): AppSurface {
  const r = normalizeRole(role);
  if (r === "driver") return "driver-app";
  if (r === "customer_user" || r === "vendor_user") return "portal";
  return "console";
}

/* ------------------------------------------------------------------ */
/* Landing routes per role — frontend.md s5.1                          */
/* ------------------------------------------------------------------ */
export function roleLandingRoute(role: Role): string {
  const LANDING: Record<string, string> = {
    platform_admin: "/app/admin",
    platform_support: "/app/admin",
    owner: "/app/dashboard",          // Daily briefing
    admin: "/app/roles",              // User management
    ops_manager: "/app/tower",
    branch_manager: "/app/tower",
    dispatcher: "/app/tower",
    finance_manager: "/app/reports",
    accountant: "/app/expenses",
    workshop_manager: "/app/workshop",
    storekeeper: "/app/inventory",
    compliance_officer: "/app/compliance",
    hr_payroll: "/app/hr",
    driver: "/driver/home",
    customer_user: "/portal/dashboard",
    vendor_user: "/portal/dashboard",
    auditor: "/app/audit",
    // Legacy
    manager: "/app/tower",
    workshop: "/app/workshop",
    viewer: "/app/dashboard",
    client: "/portal/dashboard",
  };
  return LANDING[role] ?? "/app/dashboard";
}

/** Convenience alias for roleLandingRoute taking single role or array of roles */
export function homeRouteFor(roleOrRoles: Role | Role[]): string {
  if (Array.isArray(roleOrRoles)) {
    const primary = roleOrRoles[0] ?? "owner";
    return roleLandingRoute(primary);
  }
  return roleLandingRoute(roleOrRoles);
}

/* ------------------------------------------------------------------ */
/* Field-level redaction policies — frontend.md s5.19                  */
/* A redacted field is undefined in the response, not masked.          */
/* ------------------------------------------------------------------ */
export type EntityType = "trip" | "invoice" | "driver" | "customer" | "stock";

export const FIELD_POLICIES: Record<string, Record<string, Role[]>> = {
  "trip.freightAmountMinor": {
    allowed: ["owner", "finance_manager", "accountant", "branch_manager", "auditor"],
  },
  "trip.costs": {
    allowed: [
      "owner", "finance_manager", "accountant", "branch_manager",
      "ops_manager", "auditor",
    ],
  },
  "trip.marginMinor": {
    allowed: ["owner", "finance_manager", "branch_manager", "auditor"],
  },
  "driver.phone": {
    allowed: [
      "owner", "admin", "ops_manager", "branch_manager", "dispatcher",
      "hr_payroll", "auditor",
    ],
  },
  "driver.salary": {
    allowed: ["owner", "hr_payroll", "auditor"],
  },
  "stock.avgCostMinor": {
    allowed: [
      "owner", "finance_manager", "accountant", "workshop_manager", "auditor",
    ],
  },
};

/** Check whether a role can see a specific entity field */
export function canSeeField(role: Role, entityField: string): boolean {
  const policy = FIELD_POLICIES[entityField];
  if (!policy) return true; // no policy → visible to all
  return policy["allowed"]?.includes(role) ?? false;
}

/* ------------------------------------------------------------------ */
/* Approval limits per role — system_design.md s12.5 (minor units)     */
/* ------------------------------------------------------------------ */
export interface ApprovalLimits {
  expense: number;
  advance: number;
  repair: number;
}

export const APPROVAL_LIMITS: Partial<Record<Role, ApprovalLimits>> = {
  dispatcher:       { expense: 0,       advance: 0,       repair: 0       },
  ops_manager:      { expense: 500_000, advance: 300_000, repair: 1_000_000 },
  branch_manager:   { expense: 500_000, advance: 300_000, repair: 1_000_000 },
  accountant:       { expense: 200_000, advance: 0,       repair: 0       },
  finance_manager:  { expense: 2_000_000, advance: 1_000_000, repair: 2_000_000 },
  owner:            { expense: Infinity, advance: Infinity, repair: Infinity },
};
