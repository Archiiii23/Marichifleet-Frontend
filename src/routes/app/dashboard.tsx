import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle, BadgeIndianRupee, ClipboardCheck, Clock, ShieldCheck, Truck, TrendingUp,
} from "lucide-react";
import { useMemo } from "react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { FleetMap } from "@/components/mf/fleet-map";
import { KpiCard, PageHeader, Panel, StatusBadge, Metric } from "@/components/mf/primitives";
import { Button } from "@/components/ui/button";
import { fmtDateTime, inr, inrCompact, timeAgo, useDb } from "@/domain/hooks";
import { useSession } from "@/domain/session";
import { invoiceOutstanding, isOverdue, tripProfit } from "@/domain/store";

export const Route = createFileRoute("/app/dashboard")({
  head: () => ({
    meta: [
      { title: "Control Tower — MarichiFleet" },
      { name: "description", content: "Live fleet, dispatch, delivery and receivables health in one operational view." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const db = useDb();
  const { can } = useSession();

  const live = db.trips.filter((t) => ["started", "in_transit", "exception", "arrived"].includes(t.status));
  const delayed = live.filter((t) => t.delayMins > 30 || t.status === "exception");
  const podPending = db.bookings.filter((b) => b.status === "pod_pending" || b.status === "delivered");
  const overdue = db.invoices.filter(isOverdue);
  const receivables = db.invoices.reduce((s, i) => s + invoiceOutstanding(i), 0);
  const expiring = db.docs.filter((d) => d.status === "expiring" || d.status === "expired");
  const revenue = db.invoices.reduce((s, i) => s + i.total, 0);
  const completed = db.trips.filter((t) => t.status === "completed");
  const profit = completed.reduce((s, t) => s + tripProfit(t), 0);

  const mapItems = useMemo(
    () =>
      db.vehicles.map((v) => {
        const trip = db.trips.find((t) => t.id === v.currentTripId);
        return { vehicle: v, trip, delayed: !!trip && (trip.delayMins > 30 || trip.status === "exception") };
      }),
    [db],
  );

  const lane = useMemo(() => {
    const map = new Map<string, { lane: string; trips: number; revenue: number }>();
    db.trips.forEach((t) => {
      const b = db.bookings.find((x) => x.id === t.bookingId);
      if (!b) return;
      const key = `${b.pickup.city}→${b.drop.city}`;
      const e = map.get(key) ?? { lane: key, trips: 0, revenue: 0 };
      e.trips += 1;
      e.revenue += t.revenue;
      map.set(key, e);
    });
    return [...map.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 6);
  }, [db]);

  const trend = useMemo(() => {
    const days: Array<{ day: string; revenue: number; trips: number }> = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400_000);
      const label = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
      const dayTrips = db.trips.filter(
        (t) => t.deliveredISO && new Date(t.deliveredISO).toDateString() === d.toDateString(),
      );
      days.push({ day: label, revenue: dayTrips.reduce((s, t) => s + t.revenue, 0), trips: dayTrips.length });
    }
    return days;
  }, [db]);

  return (
    <>
      <PageHeader
        title="Control Tower"
        subtitle={`${db.tenant.name} · live operational picture across ${db.branches.length} branches`}
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link to="/app/dispatch">Dispatch board</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/app/bookings/new">New booking</Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Vehicles on trip"
          value={`${db.vehicles.filter((v) => v.status === "on_trip").length}/${db.vehicles.length}`}
          hint={`${db.vehicles.filter((v) => v.status === "available").length} available · ${db.vehicles.filter((v) => v.status === "maintenance").length} in workshop`}
          icon={Truck}
          to="/app/tracking"
        />
        <KpiCard
          label="Delayed trips"
          value={String(delayed.length)}
          hint="Beyond 30 min or with an open exception"
          tone={delayed.length ? "warning" : "neutral"}
          icon={Clock}
          to="/app/trips"
        />
        <KpiCard
          label="POD pending"
          value={String(podPending.length)}
          hint="Delivered loads awaiting proof capture"
          tone={podPending.length ? "warning" : "neutral"}
          icon={ClipboardCheck}
          to="/app/pod"
        />
        <KpiCard
          label="Compliance alerts"
          value={String(expiring.length)}
          hint="Documents expiring or expired"
          tone={expiring.length ? "danger" : "success"}
          icon={ShieldCheck}
          to="/app/compliance"
        />
      </div>

      {can("view_finance") && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Billed revenue" value={inrCompact(revenue)} hint="All invoices raised" icon={BadgeIndianRupee} to="/app/finance/invoices/" />
          <KpiCard label="Receivables" value={inrCompact(receivables)} hint="Outstanding across clients" tone="info" icon={BadgeIndianRupee} to="/app/finance/receivables" />
          <KpiCard label="Overdue invoices" value={String(overdue.length)} hint={inrCompact(overdue.reduce((s, i) => s + invoiceOutstanding(i), 0))} tone={overdue.length ? "danger" : "success"} icon={AlertTriangle} to="/app/finance/receivables" />
          <KpiCard label="Trip contribution" value={inrCompact(profit)} hint={`${completed.length} completed trips after fuel, tolls and driver cost`} tone="success" icon={TrendingUp} to="/app/trips" />
        </div>
      )}

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Panel
          title="Live fleet"
          description={`${live.length} trips moving now · positions refresh every few seconds`}
          actions={
            <Button asChild size="sm" variant="ghost">
              <Link to="/app/tracking">Open full map</Link>
            </Button>
          }
        >
          <FleetMap items={mapItems} height={420} />
        </Panel>

        <Panel title="Needs attention" description="Ranked by operational risk">
          <div className="space-y-2">
            {delayed.length === 0 && podPending.length === 0 && overdue.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">Everything is running to plan.</p>
            )}
            {delayed.slice(0, 4).map((t) => {
              const b = db.bookings.find((x) => x.id === t.bookingId)!;
              return (
                <Link
                  key={t.id}
                  to="/app/trips/$tripId"
                  params={{ tripId: t.id }}
                  className="block rounded-md border border-warning/40 bg-warning/5 p-3 transition-colors hover:bg-warning/10"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="numeric text-sm font-medium">{t.ref}</span>
                    <StatusBadge status={t.status} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {b.pickup.city} → {b.drop.city} · {t.exception ? t.exception.type : `${t.delayMins} min behind`} · ETA {fmtDateTime(t.etaISO)}
                  </p>
                </Link>
              );
            })}
            {podPending.slice(0, 3).map((b) => (
              <Link
                key={b.id}
                to="/app/bookings/$bookingId"
                params={{ bookingId: b.id }}
                className="block rounded-md border border-border p-3 transition-colors hover:bg-surface"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="numeric text-sm font-medium">{b.ref}</span>
                  <StatusBadge status={b.status} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">POD not captured for {b.drop.city} delivery</p>
              </Link>
            ))}
            {can("view_finance") &&
              overdue.slice(0, 3).map((i) => (
                <Link
                  key={i.id}
                  to="/app/finance/invoices/$invoiceId"
                  params={{ invoiceId: i.id }}
                  className="block rounded-md border border-destructive/40 bg-destructive/5 p-3 transition-colors hover:bg-destructive/10"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="numeric text-sm font-medium">{i.ref}</span>
                    <StatusBadge status="overdue" />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {inr(invoiceOutstanding(i))} outstanding · due {fmtDateTime(i.dueISO)}
                  </p>
                </Link>
              ))}
          </div>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Panel title="Delivered revenue, last 14 days" description="Revenue recognised on delivery date">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ left: -18, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={false} />
                <YAxis tickFormatter={(v) => inrCompact(Number(v))} tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={false} width={70} />
                <Tooltip
                  formatter={(v) => inr(Number(v))}
                  contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }}
                />
                <Area dataKey="revenue" stroke="var(--color-primary)" fill="url(#rev)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Top lanes" description="Revenue concentration by corridor">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={lane} layout="vertical" margin={{ left: 10, right: 12 }}>
                <CartesianGrid stroke="var(--color-border)" horizontal={false} />
                <XAxis type="number" tickFormatter={(v) => inrCompact(Number(v))} tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="lane" width={140} tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(v) => inr(Number(v))}
                  contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }}
                />
                <Bar dataKey="revenue" fill="var(--color-info)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Panel title="Operational activity" description="Every state change is audited">
          <ol className="space-y-3">
            {db.audit.slice(0, 8).map((a) => (
              <li key={a.id} className="flex gap-3 text-sm">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                <span className="min-w-0">
                  <span className="block truncate">{a.action}</span>
                  <span className="text-xs text-muted-foreground">
                    {a.actor} · {timeAgo(a.atISO)}
                    {a.from && a.to ? ` · ${a.from} → ${a.to}` : ""}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </Panel>

        <Panel title="Fleet health" description="Utilisation and cost per kilometre">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Metric label="Utilisation" value={`${Math.round((db.vehicles.filter((v) => v.status === "on_trip").length / db.vehicles.length) * 100)}%`} />
            <Metric label="Avg fuel level" value={`${Math.round(db.vehicles.reduce((s, v) => s + v.fuelPct, 0) / db.vehicles.length)}%`} />
            <Metric label="In workshop" value={String(db.vehicles.filter((v) => v.status === "maintenance").length)} tone="warning" />
            <Metric label="Drivers available" value={String(db.drivers.filter((d) => d.status === "available").length)} />
            <Metric label="Open job cards" value={String(db.jobCards.filter((j) => j.status !== "released").length)} />
            <Metric label="Fuel spend" value={inrCompact(db.fuelLogs.reduce((s, f) => s + f.cost, 0))} />
          </div>
        </Panel>
      </div>
    </>
  );
}
