import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Activity, BadgeIndianRupee, BarChart3, Bell, Boxes, Building2, ClipboardCheck,
  Command as CommandIcon, FileText, Fuel, Handshake, LayoutDashboard, LogOut, Map, MessageSquare, Package,
  Radio, Settings, ShieldCheck, Truck, Users, UsersRound, Warehouse, Wrench,
  UserCircle2, Menu, TriangleAlert, TrendingUp, Wifi, WifiOff, Zap,
  Search, BookOpen, CircleDot, Scale, Factory, Globe, Navigation,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { endDemoSession } from "@/domain/guard";
import { useDb, timeAgo } from "@/domain/hooks";
import { PERSONAS, useSession } from "@/domain/session";
import { roleLabel } from "@/domain/rbac";
import { roleLandingRoute } from "@/domain/rbac";
import { tickSimulation, bump } from "@/domain/store";
import { ThemeToggle } from "@/domain/theme";
import { cn } from "@/lib/utils";
import { StatusBadge } from "./primitives";
import type { Permission } from "@/domain/types";

/* ------------------------------------------------------------------ */
/* Navigation config — permission-gated, matching frontend.md s4.1-4.3 */
/* ------------------------------------------------------------------ */
interface NavItem {
  to: string;
  label: string;
  icon: typeof Truck;
  perm: Permission;
}

const NAV: Array<{ group: string; items: NavItem[] }> = [
  {
    group: "Overview",
    items: [
      { to: "/app/tower", label: "Control Tower", icon: Radio, perm: "tower:read" },
      { to: "/app/dashboard", label: "Daily Briefing", icon: LayoutDashboard, perm: "analytics:ops" },
      { to: "/app/approvals", label: "Approvals", icon: ClipboardCheck, perm: "approvals:read" },
    ],
  },
  {
    group: "Operations",
    items: [
      { to: "/app/dispatch", label: "Dispatch Board", icon: Radio, perm: "dispatch:read" },
      { to: "/app/bookings", label: "Bookings", icon: Package, perm: "bookings:read" },
      { to: "/app/routes", label: "Routes", icon: Navigation, perm: "dispatch:read" },
      { to: "/app/trips", label: "Trips", icon: Activity, perm: "trips:read" },
      { to: "/app/tracking", label: "Live Fleet", icon: Map, perm: "fleet:read" },
      { to: "/app/geofences", label: "Geofences", icon: CircleDot, perm: "geofences:manage" },
      { to: "/app/playback", label: "Trip Replay", icon: Activity, perm: "fleet:track" },
      { to: "/app/incidents", label: "Incidents", icon: TriangleAlert, perm: "incidents:read" },
      { to: "/app/pod", label: "POD Review", icon: ClipboardCheck, perm: "pod:read" },
    ],
  },
  {
    group: "Fleet",
    items: [
      { to: "/app/vehicles", label: "Vehicles", icon: Truck, perm: "fleet:read" },
      { to: "/app/drivers", label: "Drivers", icon: Users, perm: "drivers:read" },
      { to: "/app/fuel", label: "Fuel", icon: Fuel, perm: "expenses:read" },
    ],
  },
  {
    group: "Directory",
    items: [
      { to: "/app/clients", label: "Customers", icon: Boxes, perm: "customers:read" },
      { to: "/app/vendors", label: "Vendors", icon: Handshake, perm: "vendors:read" },
    ],
  },
  {
    group: "Workshop",
    items: [
      { to: "/app/workshop", label: "Job Cards", icon: Wrench, perm: "workshop:read" },
      { to: "/app/inventory", label: "Spare Parts", icon: Warehouse, perm: "inventory:read" },
    ],
  },
  {
    group: "Finance",
    items: [
      { to: "/app/finance/invoices/", label: "Invoices", icon: BadgeIndianRupee, perm: "finance:read" },
      { to: "/app/finance/receivables", label: "Receivables", icon: BadgeIndianRupee, perm: "finance:read" },
      { to: "/app/expenses", label: "Expenses", icon: BadgeIndianRupee, perm: "expenses:read" },
      { to: "/app/ledger", label: "Ledger", icon: BookOpen, perm: "ledger:read" },
      { to: "/app/finance/pnl", label: "Profit & Loss", icon: TrendingUp, perm: "analytics:profitability" },
    ],
  },
  {
    group: "Compliance",
    items: [
      { to: "/app/compliance", label: "Compliance", icon: ShieldCheck, perm: "compliance:read" },
    ],
  },
  {
    group: "Analytics",
    items: [
      { to: "/app/reports", label: "Reports", icon: BarChart3, perm: "analytics:ops" },
    ],
  },
  {
    group: "People",
    items: [
      { to: "/app/hr", label: "HR & Payroll", icon: UsersRound, perm: "hr:read" },
    ],
  },
  {
    group: "Communication",
    items: [
      { to: "/app/conversations", label: "WhatsApp Inbox", icon: MessageSquare, perm: "comms:read" },
      { to: "/app/automation", label: "Automation", icon: Zap, perm: "automation:read" },
    ],
  },
  {
    group: "Administration",
    items: [
      { to: "/app/roles", label: "Users & Roles", icon: UsersRound, perm: "admin:users" },
      { to: "/app/settings", label: "Settings", icon: Settings, perm: "admin:policies" },
      { to: "/app/audit", label: "Audit Log", icon: ShieldCheck, perm: "audit:read" },
      { to: "/admin", label: "Platform Admin", icon: Globe, perm: "platform:tenants" },
    ],
  },
];


export function AppShell({ children }: { children: ReactNode }) {
  const { persona, setPersona, can, roleLabel: currentRoleLabel, landingRoute, online, setOnline } = useSession();
  const db = useDb();
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(
    persona.branchScope?.[0] ?? null,
  );
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const activeBranch = useMemo(
    () => db.branches.find((b) => b.id === selectedBranchId) ?? null,
    [db.branches, selectedBranchId],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Live GPS simulation for the control tower.
  useEffect(() => {
    const t = window.setInterval(() => {
      if (tickSimulation() > 0) bump();
    }, 4000);
    return () => window.clearInterval(t);
  }, []);

  // Filter nav by permissions — only show items the role can access
  const groups = useMemo(
    () => NAV.map((g) => ({ ...g, items: g.items.filter((i) => can(i.perm)) })).filter((g) => g.items.length),
    [can],
  );

  const unread = db.notifications.filter((n) => n.status !== "read").slice(0, 8);

  const nav = (
    <nav className="flex flex-col gap-5 py-4">
      {groups.map((g) => (
        <div key={g.group}>
          <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {g.group}
          </p>
          {g.items.map((item) => {
            const active = pathname === item.to || pathname.startsWith(item.to + "/");
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileNav(false)}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                )}
              >
                <item.icon className="size-4 shrink-0" aria-hidden />
                <span className="truncate">{item.label}</span>
                {active && <span className="ml-auto h-4 w-0.5 rounded-full bg-primary" aria-hidden />}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <Brand />
        <ScrollArea className="flex-1 px-2">{nav}</ScrollArea>
        <div className="border-t border-sidebar-border p-3 text-[11px] text-muted-foreground">
          <p className="font-medium text-sidebar-foreground">{db.tenant.name}</p>
          <p>Demo mode · seeded operations data</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background/90 px-3 backdrop-blur md:px-6">
          <Sheet open={mobileNav} onOpenChange={setMobileNav}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 bg-sidebar p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <Brand />
              <ScrollArea className="h-[calc(100vh-3.5rem)] px-2">{nav}</ScrollArea>
            </SheetContent>
          </Sheet>

          <button
            onClick={() => setPaletteOpen(true)}
            className="flex h-9 flex-1 items-center gap-2 rounded-md border border-border bg-card px-3 text-left text-sm text-muted-foreground transition-colors hover:border-border-strong md:max-w-sm"
          >
            <CommandIcon className="size-4" aria-hidden />
            <span className="truncate">Search bookings, trips, vehicles…</span>
            <kbd className="ml-auto hidden rounded border border-border px-1.5 py-0.5 text-[10px] md:inline">⌘K</kbd>
          </button>

          {/* Branch switcher */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="hidden h-9 items-center gap-1.5 px-2.5 text-xs md:flex">
                <Building2 className="size-3.5 text-muted-foreground" aria-hidden />
                <span className="max-w-[120px] truncate font-medium">
                  {activeBranch ? activeBranch.name : "All Branches"}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Operating Branch
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setSelectedBranchId(null)}>
                <span className="flex-1">All Branches (Global)</span>
                {!selectedBranchId && <span className="text-[10px] text-primary">Active</span>}
              </DropdownMenuItem>
              {db.branches.map((b) => (
                <DropdownMenuItem key={b.id} onClick={() => setSelectedBranchId(b.id)}>
                  <span className="flex-1">{b.name}</span>
                  {selectedBranchId === b.id && <span className="text-[10px] text-primary">Active</span>}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Connection status chip */}
          <button
            onClick={() => setOnline(!online)}
            title="Click to toggle simulated online/offline state"
            className={cn(
              "hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors md:flex",
              online
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
            )}
          >
            {online ? <Wifi className="size-3" aria-hidden /> : <WifiOff className="size-3" aria-hidden />}
            <span>{online ? "Live" : "Offline"}</span>
          </button>

          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
                  <Bell className="size-4.5" />
                  {unread.length > 0 && (
                    <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-primary" aria-hidden />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>Recent activity</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {unread.length === 0 && <div className="p-3 text-sm text-muted-foreground">Nothing new.</div>}
                {unread.map((n) => (
                  <DropdownMenuItem
                    key={n.id}
                    className="flex-col items-start gap-1"
                    onClick={() => n.link && navigate({ to: n.link })}
                  >
                    <div className="flex w-full items-center justify-between gap-2">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{n.event}</span>
                      <span className="text-[10px] text-muted-foreground">{timeAgo(n.atISO)}</span>
                    </div>
                    <span className="text-xs leading-snug">{n.body}</span>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate({ to: "/app/communications" })}>
                  Open communications centre
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 px-2">
                  <UserCircle2 className="size-5" aria-hidden />
                  <span className="hidden text-left leading-tight sm:block">
                    <span className="block text-xs font-medium">{persona.name}</span>
                    <span className="block text-[10px] text-muted-foreground">{currentRoleLabel}</span>
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72 max-h-[70vh] overflow-auto">
                <DropdownMenuLabel>Switch demo persona ({PERSONAS.length} roles)</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {PERSONAS.map((p) => (
                  <DropdownMenuItem
                    key={p.id}
                    onClick={() => {
                      setPersona(p.id);
                      const dest = roleLandingRoute(p.role);
                      navigate({ to: dest });
                    }}
                  >
                    <span className="flex-1">
                      <span className="block text-sm">{p.name}</span>
                      <span className="block text-[11px] text-muted-foreground">{roleLabel(p.role)}</span>
                    </span>
                    {p.id === persona.id && <span className="text-[10px] text-primary">Active</span>}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    endDemoSession();
                    navigate({ to: "/" });
                  }}
                >
                  <LogOut className="size-4" aria-hidden /> Sign out
                </DropdownMenuItem>

              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <main className="flex-1 px-4 pb-16 md:px-8">{children}</main>
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}

function Brand() {
  return (
    <Link to="/app/dashboard" className="flex h-14 shrink-0 items-center gap-2 border-b border-sidebar-border px-4">
      <span className="flex size-7 items-center justify-center rounded bg-primary">
        <Truck className="size-4 text-primary-foreground" aria-hidden />
      </span>
      <span className="font-display text-sm font-semibold uppercase tracking-[0.18em]">MarichiFleet</span>
    </Link>
  );
}

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const db = useDb();
  const navigate = useNavigate();
  const go = (to: string) => {
    onOpenChange(false);
    navigate({ to });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl overflow-hidden p-0">
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        <Command>
          <CommandInput placeholder="Jump to a booking, trip, vehicle, driver, client or invoice…" />
          <CommandList className="max-h-[60vh]">
            <CommandEmpty>No matching record.</CommandEmpty>
            <CommandGroup heading="Go to">
              {[
                ["Control Tower", "/app/tower"],
                ["Dispatch Board", "/app/dispatch"],
                ["Live Fleet", "/app/tracking"],
                ["Receivables", "/app/finance/receivables"],
                ["Communications", "/app/communications"],
              ].map(([label, to]) => (
                <CommandItem key={to} value={label} onSelect={() => go(to)}>
                  {label}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="Bookings">
              {db.bookings.slice(0, 24).map((b) => (
                <CommandItem key={b.id} value={`${b.ref} ${b.pickup.city} ${b.drop.city}`} onSelect={() => go(`/app/bookings/${b.id}`)}>
                  <span className="numeric mr-2 text-xs text-muted-foreground">{b.ref}</span>
                  {b.pickup.city} → {b.drop.city}
                  <StatusBadge status={b.status} className="ml-auto" />
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="Vehicles">
              {db.vehicles.map((v) => (
                <CommandItem key={v.id} value={`${v.regNo} ${v.make}`} onSelect={() => go(`/app/vehicles/${v.id}`)}>
                  <span className="numeric mr-2 text-xs">{v.regNo}</span>
                  <span className="text-muted-foreground">{v.make}</span>
                  <StatusBadge status={v.status} className="ml-auto" />
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="Drivers">
              {db.drivers.slice(0, 20).map((d) => (
                <CommandItem key={d.id} value={d.name} onSelect={() => go(`/app/drivers/${d.id}`)}>
                  {d.name}
                  <StatusBadge status={d.status} className="ml-auto" />
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="Invoices">
              {db.invoices.slice(0, 20).map((i) => (
                <CommandItem key={i.id} value={i.ref} onSelect={() => go(`/app/finance/invoices/${i.id}`)}>
                  <span className="numeric mr-2 text-xs">{i.ref}</span>
                  <StatusBadge status={i.status} className="ml-auto" />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
