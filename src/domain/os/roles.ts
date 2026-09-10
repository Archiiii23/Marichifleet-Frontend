/**
 * MarichiFleet OS role model (system_design Part 5).
 * Seventeen scoped role strings. The console renders navigation, permissions,
 * approval eligibility and money limits from this single table.
 */

export type OsRole =
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

export type OsPermission =
  | "tower.view"
  | "dispatch.manage"
  | "trips.view"
  | "bookings.manage"
  | "pod.review"
  | "incidents.manage"
  | "fleet.view"
  | "fleet.manage"
  | "directory.view"
  | "directory.manage"
  | "documents.manage"
  | "compliance.manage"
  | "workshop.manage"
  | "parts.manage"
  | "money.verify"
  | "billing.manage"
  | "payments.manage"
  | "ledger.view"
  | "hr.manage"
  | "approvals.act"
  | "automation.manage"
  | "ai.view"
  | "conversations.view"
  | "analytics.view"
  | "analytics.finance"
  | "admin.manage"
  | "audit.view"
  | "platform.manage";

export interface OsRoleDef {
  role: OsRole;
  label: string;
  scope: string;
  landing: string;
  /** Approval ceiling in minor units of the tenant currency. 0 = cannot approve money. */
  moneyLimitMinor: number;
  permissions: OsPermission[];
  /** Internal console roles appear in the console role switcher. */
  surface: "console" | "driver" | "portal";
}

const OPS: OsPermission[] = [
  "tower.view", "dispatch.manage", "trips.view", "bookings.manage", "pod.review",
  "incidents.manage", "fleet.view", "directory.view", "analytics.view",
];

const ALL: OsPermission[] = [
  "tower.view", "dispatch.manage", "trips.view", "bookings.manage", "pod.review",
  "incidents.manage", "fleet.view", "fleet.manage", "directory.view", "directory.manage",
  "documents.manage", "compliance.manage", "workshop.manage", "parts.manage", "money.verify",
  "billing.manage", "payments.manage", "ledger.view", "hr.manage", "approvals.act",
  "automation.manage", "ai.view", "conversations.view", "analytics.view", "analytics.finance",
  "admin.manage", "audit.view",
];

export const OS_ROLES: OsRoleDef[] = [
  {
    role: "platform_admin", label: "Platform Admin", scope: "Cross-tenant",
    landing: "/app/platform/tenants", moneyLimitMinor: 0, surface: "console",
    permissions: ["platform.manage", "audit.view", "admin.manage"],
  },
  {
    role: "platform_support", label: "Platform Support", scope: "Cross-tenant, consent-gated",
    landing: "/app/platform/tenants", moneyLimitMinor: 0, surface: "console",
    permissions: ["platform.manage", "audit.view"],
  },
  {
    role: "owner", label: "Owner / Director", scope: "Whole tenant",
    landing: "/app/analytics/briefing", moneyLimitMinor: Number.MAX_SAFE_INTEGER, surface: "console",
    permissions: ALL,
  },
  {
    role: "admin", label: "Administrator", scope: "Whole tenant, no payroll",
    landing: "/app/tower", moneyLimitMinor: 5_000_00, surface: "console",
    permissions: [...OPS, "fleet.manage", "directory.manage", "documents.manage", "compliance.manage",
      "approvals.act", "automation.manage", "ai.view", "conversations.view", "admin.manage", "audit.view"],
  },
  {
    role: "ops_manager", label: "Operations Manager", scope: "One or more branches",
    landing: "/app/tower", moneyLimitMinor: 25_000_00, surface: "console",
    permissions: [...OPS, "approvals.act", "conversations.view", "automation.manage", "ai.view", "documents.manage"],
  },
  {
    role: "branch_manager", label: "Branch Manager", scope: "Own branch",
    landing: "/app/tower", moneyLimitMinor: 10_000_00, surface: "console",
    permissions: [...OPS, "approvals.act", "conversations.view"],
  },
  {
    role: "dispatcher", label: "Dispatcher", scope: "Own branch, no rates or margins",
    landing: "/app/tower", moneyLimitMinor: 0, surface: "console",
    permissions: ["tower.view", "dispatch.manage", "trips.view", "bookings.manage", "incidents.manage",
      "fleet.view", "directory.view", "conversations.view", "pod.review"],
  },
  {
    role: "finance_manager", label: "Finance Manager", scope: "Whole tenant money",
    landing: "/app/billing/invoices", moneyLimitMinor: 100_000_00, surface: "console",
    permissions: ["billing.manage", "payments.manage", "ledger.view", "money.verify", "approvals.act",
      "analytics.view", "analytics.finance", "directory.view", "trips.view", "audit.view"],
  },
  {
    role: "accountant", label: "Accountant", scope: "Prepare, never finalise above limit",
    landing: "/app/money/expenses", moneyLimitMinor: 5_000_00, surface: "console",
    permissions: ["billing.manage", "payments.manage", "ledger.view", "money.verify",
      "analytics.finance", "analytics.view", "directory.view", "trips.view"],
  },
  {
    role: "workshop_manager", label: "Workshop Manager", scope: "Depot, no customer data",
    landing: "/app/workshop/jobcards", moneyLimitMinor: 15_000_00, surface: "console",
    permissions: ["workshop.manage", "parts.manage", "fleet.view", "fleet.manage", "incidents.manage", "analytics.view"],
  },
  {
    role: "storekeeper", label: "Storekeeper", scope: "Parts stock only",
    landing: "/app/workshop/stock", moneyLimitMinor: 0, surface: "console",
    permissions: ["parts.manage", "workshop.manage"],
  },
  {
    role: "compliance_officer", label: "Compliance Officer", scope: "Documents and statutory",
    landing: "/app/compliance/dashboard", moneyLimitMinor: 0, surface: "console",
    permissions: ["compliance.manage", "documents.manage", "fleet.view", "directory.view", "audit.view", "analytics.view"],
  },
  {
    role: "hr_payroll", label: "HR & Payroll", scope: "People and pay",
    landing: "/app/hr/duty", moneyLimitMinor: 20_000_00, surface: "console",
    permissions: ["hr.manage", "directory.view", "analytics.view"],
  },
  {
    role: "auditor", label: "Auditor / Viewer", scope: "Read-only, everything",
    landing: "/app/audit/log", moneyLimitMinor: 0, surface: "console",
    permissions: ["tower.view", "trips.view", "fleet.view", "directory.view", "ledger.view",
      "analytics.view", "analytics.finance", "audit.view", "compliance.manage"],
  },
  {
    role: "driver", label: "Driver", scope: "Own trips only",
    landing: "/driver/home", moneyLimitMinor: 0, surface: "driver", permissions: [],
  },
  {
    role: "customer_user", label: "Customer", scope: "Own consignments only",
    landing: "/portal/dashboard", moneyLimitMinor: 0, surface: "portal", permissions: [],
  },
  {
    role: "vendor_user", label: "Vendor", scope: "Own assigned jobs only",
    landing: "/portal/dashboard", moneyLimitMinor: 0, surface: "portal", permissions: [],
  },
];

const BY_ROLE = new Map(OS_ROLES.map((r) => [r.role, r]));

export function osRole(role: OsRole): OsRoleDef {
  return BY_ROLE.get(role) ?? OS_ROLES[6];
}

export function osRoleLabel(role: OsRole) {
  return osRole(role).label;
}

export function hasPermission(role: OsRole, perm: OsPermission) {
  return osRole(role).permissions.includes(perm);
}

export function roleLandingRoute(role: OsRole) {
  return osRole(role).landing;
}

/** Automation consequence grade (system_design Part 5.3). */
export type AutomationLevel = "L1" | "L2" | "L3";

export const AUTOMATION_LEVEL: Record<AutomationLevel, { label: string; blurb: string }> = {
  L1: { label: "L1 Autonomous", blurb: "System acted, then told you. Reversible and bounded." },
  L2: { label: "L2 Proposed", blurb: "Decision is prepared. One human tap commits it." },
  L3: { label: "L3 Human only", blurb: "Evidence assembled. The system proposes nothing." },
};

/** Money-limit check for an approval. Self-approval is always blocked. */
export function canApprove(role: OsRole, amountMinor: number, requesterIsSelf: boolean) {
  if (requesterIsSelf) return { ok: false, reason: "Self-approval is structurally blocked." };
  const def = osRole(role);
  if (!def.permissions.includes("approvals.act")) return { ok: false, reason: "Role cannot act on approvals." };
  if (amountMinor > def.moneyLimitMinor) {
    return { ok: false, reason: `Above your limit — needs a second approver.` };
  }
  return { ok: true, reason: "" };
}
