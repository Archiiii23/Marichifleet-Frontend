import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { CloudOff, Cloud, Fuel, Home, Inbox, LogOut, Route as RouteIcon, TriangleAlert, Wallet } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/domain/session";
import { ThemeToggle } from "@/domain/theme";
import { cn } from "@/lib/utils";

const TABS = [
  { to: "/driver/home", label: "Home", icon: Home },
  { to: "/driver/trips", label: "Trips", icon: RouteIcon },
  { to: "/driver/inbox", label: "Inbox", icon: Inbox },
  { to: "/driver/fuel", label: "Fuel", icon: Fuel },
  { to: "/driver/exception", label: "Report", icon: TriangleAlert },
  { to: "/driver/payslips", label: "Pay", icon: Wallet },
];


export function DriverShell({ children }: { children: ReactNode }) {
  const { persona, online, setOnline, setPersona } = useSession();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col bg-background">
      <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-border bg-background/95 px-4 backdrop-blur">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{persona.name}</p>
          <p className="text-[11px] text-muted-foreground">
            {online ? "All work synced" : "Offline — entries queue until signal returns"}
          </p>
        </div>

        <Button
          size="sm"
          variant={online ? "outline" : "destructive"}
          onClick={() => setOnline(!online)}
          className="gap-1.5"
        >
          {online ? <Cloud className="size-3.5" /> : <CloudOff className="size-3.5" />}
          {online ? "Online" : "Offline"}
        </Button>
        <ThemeToggle />
        <Button
          size="icon"
          variant="ghost"
          aria-label="Exit driver app"
          onClick={() => {
            setPersona("u_dispatcher");
            navigate({ to: "/app/dashboard" });
          }}
        >
          <LogOut className="size-4" />
        </Button>
      </header>

      <main className="flex-1 px-4 pb-24 pt-4">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto flex max-w-lg border-t border-border bg-background/95 backdrop-blur">
        {TABS.map((t) => {
          const active = pathname.startsWith(t.to);
          return (
            <Link
              key={t.to}
              to={t.to as "/"}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-3 text-[11px]",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <t.icon className="size-5" aria-hidden />
              {t.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
