import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { LegacyCapability, Permission, Role } from "./types";
import { can as rbacCan, canAny as rbacCanAny, roleLabel as rbacRoleLabel, roleLandingRoute, APPROVAL_LIMITS, type ApprovalLimits } from "./rbac";

/* ------------------------------------------------------------------ */
/* Persona — a demo user for each of the 17 roles                     */
/* ------------------------------------------------------------------ */
export interface Persona {
  id: string;
  name: string;
  role: Role;
  title: string;
  branchScope?: string[];
  /** driver personas map to a seeded driver */
  driverId?: string;
  /** customer personas map to a seeded client */
  clientId?: string;
}

export const PERSONAS: Persona[] = [
  // ── Platform ──
  { id: "u_platform_admin", name: "Raj Kapoor", role: "platform_admin", title: "Platform Admin" },
  { id: "u_platform_support", name: "Sneha Mishra", role: "platform_support", title: "Platform Support" },

  // ── Tenant leadership ──
  { id: "u_owner", name: "Aditi Marichi", role: "owner", title: "Director" },
  { id: "u_admin", name: "Vikram Shinde", role: "admin", title: "System Admin" },

  // ── Operations ──
  { id: "u_ops_manager", name: "Sanjay Deshpande", role: "ops_manager", title: "Operations Manager" },
  { id: "u_branch_manager", name: "Manoj Patil", role: "branch_manager", title: "Branch Manager — Indore", branchScope: ["b_indore"] },
  { id: "u_dispatcher", name: "Prisha Kale", role: "dispatcher", title: "Dispatcher — Indore", branchScope: ["b_indore"] },

  // ── Finance ──
  { id: "u_finance_manager", name: "Nikhil Bansal", role: "finance_manager", title: "Finance Manager" },
  { id: "u_accountant", name: "Deepa Joshi", role: "accountant", title: "Accounts Lead" },

  // ── Workshop ──
  { id: "u_workshop_manager", name: "Faisal Ahmed", role: "workshop_manager", title: "Workshop Manager", branchScope: ["b_indore"] },
  { id: "u_storekeeper", name: "Bharat Rane", role: "storekeeper", title: "Storekeeper", branchScope: ["b_indore"] },

  // ── Compliance & HR ──
  { id: "u_compliance_officer", name: "Kavita Sharma", role: "compliance_officer", title: "Compliance Officer" },
  { id: "u_hr_payroll", name: "Sunita Verma", role: "hr_payroll", title: "HR & Payroll" },

  // ── Field ──
  { id: "u_driver", name: "Ramesh Yadav", role: "driver", title: "Driver", driverId: "drv_1" },

  // ── External ──
  { id: "u_customer", name: "Rohit Kulkarni", role: "customer_user", title: "Adarsh Steel Works", clientId: "cli_1" },
  { id: "u_vendor", name: "Ajay Tyre Services", role: "vendor_user", title: "Roadside Vendor" },

  // ── Audit ──
  { id: "u_auditor", name: "Meera Rao", role: "auditor", title: "Statutory Auditor" },
];

/* ------------------------------------------------------------------ */
/* Session context                                                     */
/* ------------------------------------------------------------------ */
interface SessionValue {
  persona: Persona;
  setPersona: (id: string) => void;
  /** Check a single permission */
  can: (perm: Permission | LegacyCapability) => boolean;
  /** Check if the role has ANY of the given permissions */
  canAny: (perms: (Permission | LegacyCapability)[]) => boolean;
  /** Human-readable role label */
  roleLabel: string;
  /** Landing route for the current role */
  landingRoute: string;
  /** Approval limits for the current role */
  approvalLimits: ApprovalLimits | undefined;
  ready: boolean;
  online: boolean;
  setOnline: (v: boolean) => void;
}

const Ctx = createContext<SessionValue | null>(null);
const KEY = "marichifleet.persona";

export function SessionProvider({ children }: { children: ReactNode }) {
  const [personaId, setPersonaId] = useState("u_dispatcher");
  const [ready, setReady] = useState(false);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const saved = window.localStorage.getItem(KEY);
    if (saved && PERSONAS.some((p) => p.id === saved)) setPersonaId(saved);
    setReady(true);
  }, []);

  const setPersona = useCallback((id: string) => {
    setPersonaId(id);
    window.localStorage.setItem(KEY, id);
  }, []);

  const persona = PERSONAS.find((p) => p.id === personaId) ?? PERSONAS[6]; // default: dispatcher

  const value = useMemo<SessionValue>(
    () => ({
      persona,
      setPersona,
      ready,
      online,
      setOnline,
      can: (perm: Permission | LegacyCapability) => rbacCan(persona.role, perm),
      canAny: (perms: (Permission | LegacyCapability)[]) => rbacCanAny(persona.role, perms),
      roleLabel: rbacRoleLabel(persona.role),
      landingRoute: roleLandingRoute(persona.role),
      approvalLimits: APPROVAL_LIMITS[persona.role],
    }),
    [persona, setPersona, ready, online],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useSession must be used inside SessionProvider");
  return v;
}

/* Re-export roleLabel for use outside hooks */
export { rbacRoleLabel as roleLabel };
