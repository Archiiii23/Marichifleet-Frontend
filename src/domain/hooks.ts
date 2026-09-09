import { useCallback, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { bump, getDb, getServerVersion, getVersion, subscribeDb, type ActionResult } from "./store";
import type { DbShape } from "./types";

/** Subscribes the component to every operational mutation in the app. */
export function useDb(): DbShape {
  useSyncExternalStore(subscribeDb, getVersion, getServerVersion);
  return getDb();
}

/**
 * Runs a guarded mutation: blocked transitions surface their reason as an
 * error toast, successes surface confirmation and refresh every screen.
 */
export function useAction() {
  return useCallback(<T extends ActionResult>(run: () => T, successMessage: string): T => {
    const res = run();
    if (res.ok) {
      bump();
      toast.success(successMessage);
    } else {
      toast.error("Action blocked", { description: res.reason });
    }
    return res;
  }, []);
}

export const inr = (n: number) =>
  `₹${Math.round(n).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

export const inrCompact = (n: number) => {
  if (Math.abs(n) >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
  if (Math.abs(n) >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`;
  return inr(n);
};

export function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
