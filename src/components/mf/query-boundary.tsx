/**
 * <QueryBoundary> — wraps every data-bound region (Law 8).
 *
 * Four render props: loading, empty, error, degraded.
 * empty and error are SEPARATE and both are MANDATORY.
 * "An empty list must be distinguishable from a failed list."
 */
import { AlertTriangle, Inbox, RefreshCw, WifiOff } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type QueryState = "loading" | "empty" | "error" | "degraded" | "success";

interface QueryBoundaryProps {
  /** Current state */
  state: QueryState;
  /** Content when data is available and non-empty */
  children: ReactNode;
  /** What to show while loading */
  loadingContent?: ReactNode;
  /** REQUIRED: What to show when the data is empty. Must differ from error. */
  emptyTitle?: string;
  emptyMessage?: string;
  emptyAction?: { label: string; onClick: () => void };
  /** REQUIRED: What to show on error. Must differ from empty. */
  errorMessage?: string;
  errorRequestId?: string;
  onRetry?: () => void;
  /** What to show when the data is available but degraded (partial failure) */
  degradedMessage?: string;
  className?: string;
}

export function QueryBoundary({
  state,
  children,
  loadingContent,
  emptyTitle = "No data",
  emptyMessage = "Nothing to show here.",
  emptyAction,
  errorMessage = "Something went wrong.",
  errorRequestId,
  onRetry,
  degradedMessage,
  className,
}: QueryBoundaryProps) {
  if (state === "loading") {
    return (
      <div className={cn("space-y-3", className)} aria-busy="true" aria-label="Loading">
        {loadingContent ?? (
          <>
            <Skeleton className="h-10 w-full rounded-md" />
            <Skeleton className="h-10 w-full rounded-md" />
            <Skeleton className="h-10 w-full rounded-md" />
            <Skeleton className="h-10 w-3/4 rounded-md" />
          </>
        )}
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-destructive/40 bg-destructive/5 px-6 py-12 text-center",
        className,
      )}>
        <AlertTriangle className="size-8 text-destructive" aria-hidden />
        <h3 className="mt-3 font-display text-base font-semibold">Something went wrong</h3>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">{errorMessage}</p>
        {errorRequestId && (
          <p className="mt-1 text-[10px] font-mono text-muted-foreground/60">Request ID: {errorRequestId}</p>
        )}
        {onRetry && (
          <Button className="mt-4" size="sm" variant="outline" onClick={onRetry}>
            <RefreshCw className="size-3.5 mr-1.5" aria-hidden /> Try again
          </Button>
        )}
      </div>
    );
  }

  if (state === "empty") {
    return (
      <div className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-dashed border-border-strong/60 px-6 py-12 text-center",
        className,
      )}>
        <Inbox className="size-8 text-muted-foreground" aria-hidden />
        <h3 className="mt-3 font-display text-base font-semibold">{emptyTitle}</h3>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">{emptyMessage}</p>
        {emptyAction && (
          <Button className="mt-4" size="sm" onClick={emptyAction.onClick}>
            {emptyAction.label}
          </Button>
        )}
      </div>
    );
  }

  if (state === "degraded") {
    return (
      <div className={className}>
        <div className="mb-3 flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
          <WifiOff className="size-4 shrink-0" aria-hidden />
          <span>{degradedMessage ?? "Some data is unavailable (retrying)."}</span>
          {onRetry && (
            <Button size="sm" variant="ghost" className="ml-auto h-7 text-xs" onClick={onRetry}>
              Retry
            </Button>
          )}
        </div>
        {children}
      </div>
    );
  }

  // success
  return <div className={className}>{children}</div>;
}
