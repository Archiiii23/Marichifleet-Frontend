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

const CURRENCY: Record<string, { symbol: string; locale: string; lakhs: boolean }> = {
  INR: { symbol: "₹", locale: "en-IN", lakhs: true },
  ZMW: { symbol: "K", locale: "en-ZM", lakhs: false },
  AED: { symbol: "AED ", locale: "en-AE", lakhs: false },
  SAR: { symbol: "SAR ", locale: "en-SA", lakhs: false },
  USD: { symbol: "$", locale: "en-US", lakhs: false },
};

/** Tenant currency, so the same screens work for India, Zambia and the Gulf. */
export function currency() {
  return CURRENCY[getDb().tenant.currency] ?? CURRENCY.INR;
}

export const money = (n: number) => {
  const c = currency();
  return `${c.symbol}${Math.round(n).toLocaleString(c.locale, { maximumFractionDigits: 0 })}`;
};

export const moneyCompact = (n: number) => {
  const c = currency();
  if (c.lakhs) {
    if (Math.abs(n) >= 1e7) return `${c.symbol}${(n / 1e7).toFixed(2)} Cr`;
    if (Math.abs(n) >= 1e5) return `${c.symbol}${(n / 1e5).toFixed(2)} L`;
  } else {
    if (Math.abs(n) >= 1e6) return `${c.symbol}${(n / 1e6).toFixed(2)}M`;
    if (Math.abs(n) >= 1e3) return `${c.symbol}${(n / 1e3).toFixed(1)}k`;
  }
  return money(n);
};

/** Legacy aliases — existing screens keep working, now currency-aware. */
export const inr = money;
export const inrCompact = moneyCompact;


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
