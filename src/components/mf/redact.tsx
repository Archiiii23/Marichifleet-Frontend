/**
 * <Redact> — renders a field only if the current role's allowlist includes it.
 *
 * A redacted field is undefined in the response, not "***" (frontend.md s5.19).
 * This component renders the absence gracefully: a dash, a lock icon, or nothing.
 * The client never receives a value it must hide — the server omits it.
 */
import { Lock } from "lucide-react";
import type { ReactNode } from "react";
import { useSession } from "@/domain/session";
import { canSeeField } from "@/domain/rbac";
import { cn } from "@/lib/utils";

interface RedactProps<T> {
  /** Entity.field key, e.g. "trip.freightAmountMinor" */
  field: string;
  /** The value to render (may be undefined if redacted by the server) */
  value: T | undefined | null;
  /** Render function when the value is available and the role can see it */
  children: (value: T) => ReactNode;
  /** What to show when redacted. Default: dash + lock icon */
  fallback?: ReactNode;
  className?: string;
}

export function Redact<T>({ field, value, children, fallback, className }: RedactProps<T>) {
  const { persona } = useSession();
  const allowed = canSeeField(persona.role, field);

  if (!allowed || value == null) {
    if (fallback !== undefined) return <>{fallback}</>;
    return (
      <span className={cn("inline-flex items-center gap-1 text-muted-foreground", className)}>
        <span>—</span>
        <Lock className="size-3 opacity-50" aria-hidden />
      </span>
    );
  }

  return <>{children(value)}</>;
}
