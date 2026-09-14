import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Role } from "./types";
import { CAPABILITIES, type Capability } from "./rbac";
import { apiClient } from "@/services/apiClient";

export interface UserProfile {
  id: string;
  tenant_id: string;
  email: string;
  name: string;
  avatar_url?: string;
  role: string;
  branches?: string[];
}

export interface AuthSession {
  user: {
    id: string;
    email: string;
    name: string;
    avatarUrl?: string;
  };
  token: string;
}

interface AuthValue {
  loading: boolean;
  session: AuthSession | null;
  user: AuthSession['user'] | null;
  profile: UserProfile | null;
  tenantId: string | null;
  roles: Role[];
  can: (c: Capability) => boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [roles, setRoles] = useState<Role[]>(['FLEET_OWNER']);

  const hydrate = useCallback(async () => {
    if (typeof window === 'undefined') {
      setLoading(false);
      return;
    }

    const token = window.localStorage.getItem('marichifleet.jwt_token');
    const storedUserStr = window.localStorage.getItem('marichifleet.auth_user');

    if (!token && !storedUserStr && !window.localStorage.getItem('marichifleet.demo')) {
      setSession(null);
      setProfile(null);
      setRoles([]);
      setLoading(false);
      return;
    }

    try {
      let u: any = null;
      if (storedUserStr) {
        u = JSON.parse(storedUserStr);
      }

      // Try fetching fresh profile from backend
      if (token) {
        try {
          const fresh = await apiClient.get('/auth/me');
          if (fresh) u = fresh;
        } catch {
          // Keep stored user if offline
        }
      }

      const activeUser = u || {
        userId: 'usr_demo_owner',
        email: 'dewarsh.jain@google.com',
        name: 'Dewarsh Jain',
        role: 'FLEET_OWNER',
        tenantId: 'tenant_delhi_01',
      };

      const userRole = (activeUser.role || 'FLEET_OWNER') as Role;
      const sess: AuthSession = {
        token: token || 'demo_token',
        user: {
          id: activeUser.userId || activeUser.id || 'usr_demo_owner',
          email: activeUser.email || 'dewarsh.jain@google.com',
          name: activeUser.name || 'Dewarsh Jain',
          avatarUrl: activeUser.avatarUrl,
        },
      };

      const prof: UserProfile = {
        id: activeUser.userId || activeUser.id || 'usr_demo_owner',
        tenant_id: activeUser.tenantId || 'tenant_delhi_01',
        email: activeUser.email || 'dewarsh.jain@google.com',
        name: activeUser.name || 'Dewarsh Jain',
        avatar_url: activeUser.avatarUrl,
        role: userRole,
        branches: activeUser.branches || ['DL-Okhla', 'MH-Bhiwandi'],
      };

      setSession(sess);
      setProfile(prof);
      setRoles([userRole]);
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void hydrate();
    const onStorage = () => void hydrate();
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [hydrate]);

  const refresh = useCallback(async () => {
    await hydrate();
  }, [hydrate]);

  const signOut = useCallback(async () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('marichifleet.jwt_token');
      window.localStorage.removeItem('marichifleet.auth_user');
      window.localStorage.removeItem('marichifleet.demo');
      window.localStorage.removeItem('marichifleet.persona');
    }
    setSession(null);
    setProfile(null);
    setRoles([]);
  }, []);

  const value = useMemo<AuthValue>(() => {
    const caps = new Set<Capability>(roles.flatMap((r) => CAPABILITIES[r] ?? []));
    return {
      loading,
      session,
      user: session?.user ?? null,
      profile,
      tenantId: profile?.tenant_id ?? null,
      roles,
      can: (c) => caps.has(c) || roles.includes('FLEET_OWNER') || roles.includes('SUPER_ADMIN' as any),
      refresh,
      signOut,
    };
  }, [loading, session, profile, roles, refresh, signOut]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside AuthProvider");
  return v;
}
