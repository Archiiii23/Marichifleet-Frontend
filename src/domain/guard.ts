import { redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

/**
 * Entry guard for the ERP, driver and client surfaces.
 * A real signed-in account passes; so does an explicit demo session started
 * from `/login`, which keeps the seeded walkthrough available.
 */
export const DEMO_KEY = "marichifleet.demo";

export function startDemoSession() {
  if (typeof window !== "undefined") window.localStorage.setItem(DEMO_KEY, "1");
}

export function endDemoSession() {
  if (typeof window !== "undefined") window.localStorage.removeItem(DEMO_KEY);
}

export function isDemoSession() {
  return typeof window !== "undefined" && window.localStorage.getItem(DEMO_KEY) === "1";
}

export async function requireSignIn() {
  if (isDemoSession()) return;
  if (typeof window !== "undefined" && window.localStorage.getItem("marichifleet.jwt_token")) return;
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw redirect({ to: "/auth" });
}
