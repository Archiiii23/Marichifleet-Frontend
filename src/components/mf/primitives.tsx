import { Link } from "@tanstack/react-router";
import {
  AlertTriangle, ArrowRight, CheckCircle2, CircleDashed, Clock, Info, Inbox, RefreshCw, XCircle,
} from "lucide-react";
import type { ReactNode } from "react";
import { labelize, statusTone, type Tone } from "@/domain/machines";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const toneClass: Record<Tone, string> = {
  neutral: "border-border-strong/70 bg-surface text-muted-foreground",
  info: "border-info/40 bg-info/10 text-info",
  success: "border-success/40 bg-success/10 text-success",
  warning: "border-warning/40 bg-warning/10 text-warning",
  danger: "border-destructive/45 bg-destructive/12 text-destructive",
};

const toneIcon: Record<Tone, typeof Info> = {
  neutral: CircleDashed,
  info: Clock,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
};

/** Status is never colour-only: icon + text + badge, per the PRD design rules. */
export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const tone = statusTone(status);
  const Icon = toneIcon[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide",
        toneClass[tone],
        className,
      )}
    >
      <Icon className="size-3 shrink-0" aria-hidden />
      {labelize(status)}
    </span>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
  breadcrumb,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  breadcrumb?: Array<{ label: string; to?: string }>;
}) {
  return (
    <header className="sticky top-0 z-20 -mx-4 mb-6 border-b border-border bg-background/85 px-4 py-4 backdrop-blur md:-mx-8 md:px-8">
      {breadcrumb?.length ? (
        <nav className="mb-1.5 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
          {breadcrumb.map((b, i) => (
            <span key={b.label} className="flex items-center gap-1">
              {i > 0 && <span aria-hidden>/</span>}
              {b.to ? (
                <Link to={b.to as "/"} className="hover:text-foreground">
                  {b.label}
                </Link>

              ) : (
                <span>{b.label}</span>
              )}
            </span>
          ))}
        </nav>
      ) : null}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight md:text-[28px]">{title}</h1>
          {subtitle && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

export function KpiCard({
  label,
  value,
  hint,
  trend,
  tone = "neutral",
  to,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint?: string;
  trend?: string;
  tone?: Tone;
  to?: string;
  icon?: typeof Info;
}) {
  const body = (
    <div
      className={cn(
        "group h-full rounded-lg border border-border bg-card p-4 transition-colors",
        to && "hover:border-border-strong hover:bg-surface",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
        {Icon && <Icon className={cn("size-4", tone === "danger" ? "text-destructive" : tone === "warning" ? "text-warning" : "text-muted-foreground")} aria-hidden />}
      </div>
      <p className="numeric mt-3 text-3xl font-semibold leading-none">{value}</p>
      <div className="mt-2 flex items-center justify-between gap-2">
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        {trend && <span className="text-xs text-success">{trend}</span>}
      </div>
      {to && (
        <span className="mt-3 inline-flex items-center gap-1 text-xs text-primary opacity-0 transition-opacity group-hover:opacity-100">
          Open <ArrowRight className="size-3" aria-hidden />
        </span>
      )}
    </div>
  );
  return to ? (
    <Link to={to as "/"} className="block h-full">
      {body}

    </Link>
  ) : (
    body
  );
}

export function Panel({
  title,
  description,
  actions,
  children,
  className,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-lg border border-border bg-card", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div>
          <h2 className="font-display text-sm font-semibold uppercase tracking-[0.12em]">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
        </div>
        {actions}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

export function EmptyState({
  title,
  message,
  actionLabel,
  onAction,
  icon: Icon = Inbox,
}: {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: typeof Inbox;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border-strong/60 px-6 py-12 text-center">
      <Icon className="size-8 text-muted-foreground" aria-hidden />
      <h3 className="mt-3 font-display text-base font-semibold">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{message}</p>
      {actionLabel && onAction && (
        <Button className="mt-4" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-destructive/40 bg-destructive/5 px-6 py-12 text-center">
      <AlertTriangle className="size-8 text-destructive" aria-hidden />
      <h3 className="mt-3 font-display text-base font-semibold">Something went wrong</h3>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{message}</p>
      {onRetry && (
        <Button className="mt-4" size="sm" variant="outline" onClick={onRetry}>
          <RefreshCw className="size-3.5" aria-hidden /> Try again
        </Button>
      )}
    </div>
  );
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="Loading records">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-11 w-full rounded-md" />
      ))}
    </div>
  );
}

export function NoAccess({ what }: { what: string }) {
  return (
    <div className="rounded-lg border border-warning/40 bg-warning/5 p-6">
      <h3 className="font-display text-base font-semibold">Restricted</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Your role does not have permission to view {what}. Switch persona from the top bar to explore this area.
      </p>
    </div>
  );
}

export function Metric({ label, value, tone }: { label: string; value: ReactNode; tone?: Tone }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p
        className={cn(
          "numeric mt-1 text-lg font-semibold",
          tone === "danger" && "text-destructive",
          tone === "success" && "text-success",
          tone === "warning" && "text-warning",
        )}
      >
        {value}
      </p>
    </div>
  );
}
