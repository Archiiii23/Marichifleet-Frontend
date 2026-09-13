/**
 * <FixAge> — the ONLY way staleness is rendered (Law 3).
 *
 * "A number without an age is a lie." Every position pin, every KPI card,
 * every dashboard, every ETA carries its own age.
 *
 * Four states:
 *   fresh    age <= cadence * 1.5        green dot, "fix 40s ago"
 *   lagging  age <= cadence * 4          amber dot, "fix 4 min ago"
 *   stale    age >  cadence * 4          grey pin, "NO FIX 41 min"
 *   gap      no fix and ignition unknown grey outline, "tracker silent"
 */
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Freshness = "fresh" | "lagging" | "stale" | "gap";

const freshnessClasses: Record<Freshness, string> = {
  fresh: "text-emerald-600 dark:text-emerald-400",
  lagging: "text-amber-600 dark:text-amber-400",
  stale: "text-muted-foreground",
  gap: "text-muted-foreground/50",
};

const dotClasses: Record<Freshness, string> = {
  fresh: "bg-emerald-500",
  lagging: "bg-amber-500",
  stale: "bg-gray-400",
  gap: "border border-gray-400 bg-transparent",
};

function formatAge(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s ago`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h ago`;
  return `${Math.round(seconds / 86400)}d ago`;
}

function getFreshness(ageSec: number | null, cadenceSec: number): Freshness {
  if (ageSec == null) return "gap";
  if (ageSec <= cadenceSec * 1.5) return "fresh";
  if (ageSec <= cadenceSec * 4) return "lagging";
  return "stale";
}

interface FixAgeProps {
  /** ISO timestamp of the last fix / data point */
  ts?: string | null | undefined;
  /** Alias for ts */
  atISO?: string | null | undefined;
  /** Expected cadence in seconds (e.g. 30 for GPS, 300 for a KPI) */
  expectedCadenceSec?: number;
  /** Alias for expectedCadenceSec */
  cadenceSec?: number;
  /** Show the dot indicator */
  showDot?: boolean;
  /** Prefix text: "fix", "as of", "last update" */
  prefix?: string;
  /** Additional class names */
  className?: string;
}

export function FixAge({
  ts,
  atISO,
  expectedCadenceSec,
  cadenceSec,
  showDot = true,
  prefix = "fix",
  className,
}: FixAgeProps) {
  const timestamp = ts ?? atISO;
  const cadence = expectedCadenceSec ?? cadenceSec ?? 60;
  const [now, setNow] = useState(Date.now());

  // Tick every 10s to update relative time
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 10_000);
    return () => clearInterval(t);
  }, []);

  if (!timestamp) {
    return (
      <span className={cn("inline-flex items-center gap-1.5 text-xs", freshnessClasses.gap, className)}>
        {showDot && <span className={cn("size-1.5 rounded-full shrink-0", dotClasses.gap)} aria-hidden />}
        <span>tracker silent</span>
      </span>
    );
  }

  const ageSec = (now - new Date(timestamp).getTime()) / 1000;
  const freshness = getFreshness(ageSec, cadence);

  const label = freshness === "stale"
    ? `NO FIX ${formatAge(ageSec).replace(" ago", "")}`
    : `${prefix} ${formatAge(ageSec)}`;

  return (
    <span
      className={cn("inline-flex items-center gap-1.5 text-xs", freshnessClasses[freshness], className)}
      title={`Last update: ${new Date(timestamp).toLocaleString()}`}
    >
      {showDot && <span className={cn("size-1.5 rounded-full shrink-0", dotClasses[freshness])} aria-hidden />}
      <span>{label}</span>
    </span>
  );
}

/** Get the freshness state for programmatic use (e.g. pin styling) */
export function getFixFreshness(ts: string | null | undefined, cadenceSec = 60): Freshness {
  if (!ts) return "gap";
  const ageSec = (Date.now() - new Date(ts).getTime()) / 1000;
  return getFreshness(ageSec, cadenceSec);
}

export type { Freshness };
