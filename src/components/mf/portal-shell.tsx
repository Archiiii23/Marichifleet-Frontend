import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { LogOut, Truck } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/domain/session";
import { ThemeToggle } from "@/domain/theme";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/portal/dashboard", label: "Overview" },
  { to: "/portal/bookings", label: "My bookings" },
  { to: "/portal/exceptions", label: "Issues" },
  { to: "/portal/invoices", label: "Invoices" },
];

export function PortalShell({ children }: { children: ReactNode }) {
  const { persona, setPersona } = useSession();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
          <Link to="/portal/dashboard" className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded bg-primary">
              <Truck className="size-4 text-primary-foreground" aria-hidden />
            </span>
            <span className="font-display text-sm font-semibold uppercase tracking-[0.18em]">MarichiFleet</span>
          </Link>
          <nav className="hidden gap-1 sm:flex">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to as "/"}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm",
                  pathname.startsWith(n.to) ? "bg-surface text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden text-right text-xs leading-tight sm:block">
              <span className="block font-medium">{persona.name}</span>
              <span className="block text-muted-foreground">{persona.title}</span>
            </span>
            <ThemeToggle />
            <Button
              size="icon"
              variant="ghost"
              aria-label="Exit portal"
              onClick={() => {
                setPersona("u_dispatcher");
                navigate({ to: "/app/dashboard" });
              }}
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto border-t border-border px-4 py-2 sm:hidden">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to as "/"} className="whitespace-nowrap rounded-md px-3 py-1.5 text-sm text-muted-foreground">
              {n.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 pb-16 pt-6">{children}</main>
    </div>
  );
}
