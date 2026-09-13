/**
 * <Amount> — the ONLY way money is rendered (Law 2, frontend.md s11.3).
 *
 * - Never a float in state; money is integer minor units + ISO 4217.
 * - Never arithmetic in a component; sums, taxes and totals arrive computed.
 * - When value is undefined (redacted field), renders a dash + lock icon.
 */
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Money } from "@/domain/types";

const CURRENCY_CONFIG: Record<string, { symbol: string; locale: string; decimals: number }> = {
  INR: { symbol: "₹", locale: "en-IN", decimals: 2 },
  ZMW: { symbol: "ZMW", locale: "en-ZM", decimals: 2 },
  AED: { symbol: "AED", locale: "ar-AE", decimals: 2 },
  SAR: { symbol: "SAR", locale: "ar-SA", decimals: 2 },
  USD: { symbol: "$", locale: "en-US", decimals: 2 },
};

function formatMoney(value: Money, compact?: boolean): string {
  const cfg = CURRENCY_CONFIG[value.currency] ?? CURRENCY_CONFIG["INR"]!;
  const amount = value.minor / (10 ** cfg.decimals);

  if (compact) {
    if (Math.abs(amount) >= 10_000_000) return `${cfg.symbol} ${(amount / 10_000_000).toFixed(1)}Cr`;
    if (Math.abs(amount) >= 100_000)    return `${cfg.symbol} ${(amount / 100_000).toFixed(1)}L`;
    if (Math.abs(amount) >= 1_000)      return `${cfg.symbol} ${(amount / 1_000).toFixed(1)}K`;
  }

  const formatted = new Intl.NumberFormat(cfg.locale, {
    minimumFractionDigits: cfg.decimals,
    maximumFractionDigits: cfg.decimals,
  }).format(Math.abs(amount));

  return `${cfg.symbol} ${formatted}`;
}

interface AmountProps {
  /** Money value, or undefined for redacted fields */
  value: Money | undefined | null;
  /** Compact display: INR 1.85L */
  compact?: boolean;
  /** Show sign: +₹600.00 */
  sign?: boolean;
  /** Additional class names */
  className?: string;
}

export function Amount({ value, compact, sign, className }: AmountProps) {
  if (value == null) {
    return (
      <span className={cn("inline-flex items-center gap-1 text-muted-foreground", className)}>
        <span aria-label="Redacted">—</span>
        <Lock className="size-3 opacity-60" aria-hidden />
      </span>
    );
  }

  const formatted = formatMoney(value, compact);
  const prefix = sign ? (value.minor >= 0 ? "+" : "−") : (value.minor < 0 ? "−" : "");

  return (
    <span className={cn("numeric tabular-nums", className)} title={formatMoney(value)}>
      {prefix}{formatted}
    </span>
  );
}

/**
 * Convert a plain number (like the existing store uses) + currency to Money.
 * Convenience wrapper during migration from float-based money to minor-units.
 */
export function toMoney(amount: number, currency: Money["currency"] = "INR"): Money {
  return { minor: Math.round(amount * 100), currency };
}

/**
 * Format a minor-unit amount as a readable string (for use outside JSX).
 */
export function formatAmount(value: Money | undefined | null, compact?: boolean): string {
  if (value == null) return "—";
  return formatMoney(value, compact);
}
