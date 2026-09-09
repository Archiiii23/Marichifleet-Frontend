import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import type { Role } from "./types";
import { CAPABILITIES, type Capability } from "./rbac";

export type Profile = Tables<"profiles">;

interface AuthValue {
  loading: boolean;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  tenantId: string | null;
  roles: Role[];
  can: (c: Capability) => boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthValue | null>(null);

async function loadAccount(userId: string) {
  const [{ data: profile }, { data: roleRows }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", userId),
  ]);
  return {
    profile: (profile as Profile | null) ?? null,
    roles: ((roleRows ?? []).map((r) => r.role) as Role[]),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);

  const hydrate = useCallback(async (s: Session | null) => {
    if (!s?.user) {
      setProfile(null);
      setRoles([]);
      setLoading(false);
      return;
    }
    let account = await loadAccount(s.user.id);
    if (!account.profile?.tenant_id) {
      // First sign-in: create the company workspace and make this user its owner.
      const company = (s.user.user_metadata?.["company_name"] as string | undefined) ?? "My Fleet";
      await supabase.rpc("bootstrap_tenant", { _company_name: company });
      account = await loadAccount(s.user.id);
    }
    setProfile(account.profile);
    setRoles(account.roles);
    setLoading(false);
  }, []);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "INITIAL_SESSION" || event === "USER_UPDATED") {
        void hydrate(s);
      }
    });
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      void hydrate(data.session);
    });
    return () => sub.subscription.unsubscribe();
  }, [hydrate]);

  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    await hydrate(data.session);
  }, [hydrate]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
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
      can: (c) => caps.has(c),
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
