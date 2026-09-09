import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Role } from "./types";

export interface Persona {
  id: string;
  name: string;
  role: Role;
  title: string;
  /** driver personas map to a seeded driver, client personas to a seeded client */
  driverId?: string;
  clientId?: string;
}

export const PERSONAS: Persona[] = [
  { id: "u_owner", name: "Aditi Marichi", role: "owner", title: "Director" },
  { id: "u_manager", name: "Sanjay Deshpande", role: "manager", title: "Operations Manager" },
  { id: "u_dispatcher", name: "Prisha Kale", role: "dispatcher", title: "Dispatcher" },
  { id: "u_accountant", name: "Nikhil Bansal", role: "accountant", title: "Accounts Lead" },
  { id: "u_workshop", name: "Faisal Ahmed", role: "workshop", title: "Workshop Manager" },
  { id: "u_viewer", name: "Meera Rao", role: "viewer", title: "Read-only Reviewer" },
  { id: "u_driver", name: "Ramesh Yadav", role: "driver", title: "Driver", driverId: "drv_1" },
  { id: "u_client", name: "Rohit Kulkarni", role: "client", title: "Adarsh Steel Works", clientId: "cli_1" },
];

export type Capability =
  | "view_operations"
  | "view_finance"
  | "edit_finance"
  | "dispatch"
  | "edit_fleet"
  | "edit_booking"
  | "view_workshop"
  | "edit_workshop"
  | "view_admin"
  | "driver_app"
  | "client_portal";

const MATRIX: Record<Role, Capability[]> = {
  owner: [
    "view_operations", "view_finance", "edit_finance", "dispatch", "edit_fleet",
    "edit_booking", "view_workshop", "edit_workshop", "view_admin",
  ],
  manager: ["view_operations", "view_finance", "dispatch", "edit_fleet", "edit_booking", "view_workshop", "view_admin"],
  dispatcher: ["view_operations", "dispatch", "edit_booking"],
  accountant: ["view_operations", "view_finance", "edit_finance"],
  workshop: ["view_operations", "view_workshop", "edit_workshop", "edit_fleet"],
  viewer: ["view_operations"],
  driver: ["driver_app"],
  client: ["client_portal"],
};

interface SessionValue {
  persona: Persona;
  setPersona: (id: string) => void;
  can: (c: Capability) => boolean;
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

  const persona = PERSONAS.find((p) => p.id === personaId) ?? PERSONAS[2];

  const value = useMemo<SessionValue>(
    () => ({
      persona,
      setPersona,
      ready,
      online,
      setOnline,
      can: (c: Capability) => MATRIX[persona.role].includes(c),
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

export function roleLabel(role: Role) {
  return {
    owner: "Owner / Director",
    manager: "Operations Manager",
    dispatcher: "Dispatcher",
    driver: "Driver",
    accountant: "Accountant",
    workshop: "Workshop Manager",
    viewer: "Viewer",
    client: "Client",
  }[role];
}
