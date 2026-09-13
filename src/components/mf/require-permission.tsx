/**
 * <RequirePermission> — the client-side UX guard (Law 6).
 *
 * This exists so a user does not see a button that will 403.
 * It is NOT a security control. The server is the authority.
 *
 * A guard failure renders the fallback (null by default), NOT a redirect to login.
 * Redirecting a permission failure to /login is how you generate
 * "random logouts" support tickets that are actually authorisation bugs.
 */
import type { ReactNode } from "react";
import type { Permission } from "@/domain/types";
import { useSession } from "@/domain/session";

interface RequirePermissionProps {
  /** The permission to check */
  perm: Permission;
  /** What to render if the check fails. Default: null (nothing). */
  fallback?: ReactNode;
  children: ReactNode;
}

export function RequirePermission({ perm, fallback = null, children }: RequirePermissionProps) {
  const { can } = useSession();

  if (!can(perm)) return <>{fallback}</>;
  return <>{children}</>;
}

/** Require ANY of the given permissions */
export function RequireAnyPermission({
  perms,
  fallback = null,
  children,
}: {
  perms: Permission[];
  fallback?: ReactNode;
  children: ReactNode;
}) {
  const { canAny } = useSession();

  if (!canAny(perms)) return <>{fallback}</>;
  return <>{children}</>;
}
