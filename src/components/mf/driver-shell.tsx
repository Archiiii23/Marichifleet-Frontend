import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { CloudOff, Cloud, Fuel, Home, Inbox, Languages, LogOut, Route as RouteIcon, TriangleAlert, Wallet, RefreshCw } from "lucide-react";
import { useMemo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/domain/session";
import { ThemeToggle } from "@/domain/theme";
import { cn } from "@/lib/utils";
import { useDb } from "@/domain/hooks";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { I18nProvider, useI18n } from "@/domain/i18n";

export function DriverShell({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
      <DriverShellInner>{children}</DriverShellInner>
    </I18nProvider>
  );
}

function DriverShellInner({ children }: { children: ReactNode }) {
  const { persona, online, setOnline, setPersona } = useSession();
  const { lang, setLang, t } = useI18n();
  const db = useDb();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();

  const tabs = useMemo(
    () => [
      { to: "/driver/home", label: t("driver.home"), icon: Home },
      { to: "/driver/trips", label: t("driver.trips"), icon: RouteIcon },
      { to: "/driver/inbox", label: t("driver.inbox"), icon: Inbox },
      { to: "/driver/fuel", label: t("driver.fuel"), icon: Fuel },
      { to: "/driver/exception", label: t("driver.report"), icon: TriangleAlert },
      { to: "/driver/payslips", label: t("driver.pay"), icon: Wallet },
    ],
    [t],
  );

  const pendingSync = useMemo(() => {
    if (online) return [];
    const trips = db.trips.filter((trip) => trip.driverId === persona.driverId);
    return [
      ...trips.filter((trip) => trip.status === "exception").map((trip) => ({ id: `incident-${trip.id}`, label: `${trip.ref} incident update`, type: "Incident" })),
      ...trips.filter((trip) => trip.status === "delivered" && !trip.podId).map((trip) => ({ id: `pod-${trip.id}`, label: `${trip.ref} delivery proof`, type: "POD" })),
    ];
  }, [db, online, persona.driverId]);

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col bg-background">
      <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-border bg-background/95 px-3 backdrop-blur">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{persona.name}</p>
          <p className="text-[11px] text-muted-foreground">
            {online ? t("driver.synced") : t("driver.offline")}
          </p>
        </div>

        {/* Vernacular Language Switcher */}
        <Button
          size="sm"
          variant="outline"
          className="h-8 px-2 text-xs font-semibold gap-1"
          title="Switch language between English and Hindi"
          onClick={() => setLang(lang === "en" ? "hi" : "en")}
        >
          <Languages className="size-3.5" />
          <span>{lang === "en" ? "हिन्दी" : "English"}</span>
        </Button>

        <Popover>
          <PopoverTrigger asChild>
            <Button size="sm" variant={online ? "outline" : "destructive"} className="h-8 relative gap-1 px-2 text-xs">
              {online ? <Cloud className="size-3.5" /> : <CloudOff className="size-3.5" />}
              <span>{online ? "Online" : `${pendingSync.length} queued`}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">Offline Sync Queue</p>
              <span className="text-xs text-muted-foreground">{online ? "Connected" : "No cellular signal"}</span>
            </div>
            <ul className="my-3 space-y-2">
              {pendingSync.map((item) => (
                <li key={item.id} className="rounded-md border border-border p-2 text-xs">
                  <span className="font-medium">{item.type}</span>
                  <p className="mt-0.5 text-muted-foreground">{item.label}</p>
                </li>
              ))}
              {pendingSync.length === 0 && <li className="py-2 text-sm text-muted-foreground">All driver updates are committed to the control tower.</li>}
            </ul>
            <Button size="sm" variant="outline" className="w-full" onClick={() => setOnline(!online)}>
              <RefreshCw className="size-3.5 mr-1" />
              {online ? "Simulate Offline Mode" : "Reconnect & Sync Queue"}
            </Button>
          </PopoverContent>
        </Popover>

        <ThemeToggle />

        <Button
          size="icon"
          variant="ghost"
          aria-label="Exit driver app"
          className="size-8"
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
        {tabs.map((tItem) => {
          const active = pathname.startsWith(tItem.to);
          return (
            <Link
              key={tItem.to}
              to={tItem.to}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[10px] font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <tItem.icon className="size-5 shrink-0" aria-hidden />
              <span>{tItem.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
