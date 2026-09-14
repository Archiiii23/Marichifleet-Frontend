import { redirect } from "@tanstack/react-router";

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
  throw redirect({ to: "/auth" });
}
