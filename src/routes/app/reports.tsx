import { createFileRoute } from "@tanstack/react-router";
import { Download } from "lucide-react";
import { useMemo, useState } from "react";
import { KpiCard, NoAccess, PageHeader, Panel } from "@/components/mf/primitives";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { inr, inrCompact, useDb } from "@/domain/hooks";
import { useSession } from "@/domain/session";
import { invoiceOutstanding, isOverdue, tripProfit } from "@/domain/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/reports")({
  head: () => ({
    meta: [
      { title: "Reports & analytics — MarichiFleet" },
      { name: "description", content: "Revenue, profitability, utilisation, driver performance, fuel efficiency and receivables ageing." },
      { property: "og:title", content: "Reports & analytics — MarichiFleet" },
      { property: "og:description", content: "Every operational and financial trend from your live fleet data." },
    ],
  }),
  component: Reports,
});

function Reports() {
  const db = useDb();
  const { can } = useSession();
  const [days, setDays] = useState("90");
  const [branch, setBranch] = useState("all");

  const since = Date.now() - Number(days) * 86400000;

  const data = useMemo(() => {
    const vehicleIn = (id: string) =>
      branch === "all" || db.vehicles.find((v) => v.id === id)?.branchId === branch;

    const trips = db.trips.filter((t) => vehicleIn(t.vehicleId));
    const done = trips.filter((t) => t.status === "completed" || t.status === "pod_uploaded" || t.status === "delivered");
    const revenue = done.reduce((s, t) => s + t.revenue, 0);
    const profit = done.reduce((s, t) => s + tripProfit(t), 0);
    const onTime = done.filter((t) => t.delayMins <= 15).length;

    const fuel = db.fuelLogs.filter((f) => vehicleIn(f.vehicleId) && new Date(f.atISO).getTime() > since);
    const litres = fuel.reduce((s, f) => s + f.litres, 0);
    const fuelSpend = fuel.reduce((s, f) => s + f.cost, 0);

    const laneMap = new Map<string, { revenue: number; profit: number; trips: number }>();
    done.forEach((t) => {
      const b = db.bookings.find((x) => x.id === t.bookingId);
      if (!b) return;
      const key = `${b.pickup.city} → ${b.drop.city}`;
      const cur = laneMap.get(key) ?? { revenue: 0, profit: 0, trips: 0 };
      cur.revenue += t.revenue;
      cur.profit += tripProfit(t);
      cur.trips += 1;
      laneMap.set(key, cur);
    });
    const lanes = [...laneMap.entries()].sort((a, b) => b[1].profit - a[1].profit).slice(0, 8);

    const drivers = db.drivers
      .map((d) => {
        const dTrips = trips.filter((t) => t.driverId === d.id);
        const late = dTrips.filter((t) => t.delayMins > 15).length;
        return {
          name: d.name,
          trips: dTrips.length,
          late,
          rating: d.rating,
          revenue: dTrips.reduce((s, t) => s + t.revenue, 0),
        };
      })
      .filter((d) => d.trips > 0)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);

    const utilisation = db.vehicles
      .filter((v) => vehicleIn(v.id))
      .map((v) => {
        const vTrips = trips.filter((t) => t.vehicleId === v.id);
        return {
          regNo: v.regNo,
          trips: vTrips.length,
          revenue: vTrips.reduce((s, t) => s + t.revenue, 0),
          pct: Math.min(100, vTrips.length * 14),
        };
      })
      .sort((a, b) => b.pct - a.pct);

    const buckets = [
      { label: "Not yet due", min: -9999, max: 0 },
      { label: "1–30 days", min: 1, max: 30 },
      { label: "31–60 days", min: 31, max: 60 },
      { label: "60+ days", min: 61, max: 99999 },
    ].map((b) => {
      const amount = db.invoices
        .filter((i) => invoiceOutstanding(i) > 0)
        .filter((i) => {
          const age = Math.round((Date.now() - new Date(i.dueISO).getTime()) / 86400000);
          return age >= b.min && age <= b.max;
        })
        .reduce((s, i) => s + invoiceOutstanding(i), 0);
      return { ...b, amount };
    });

    const monthMap = new Map<string, number>();
    db.invoices.forEach((i) => {
      const key = new Date(i.createdISO).toLocaleDateString("en-IN", { month: "short" });
      monthMap.set(key, (monthMap.get(key) ?? 0) + i.total);
    });
    const months = [...monthMap.entries()].slice(-6);

    // Deadhead: laden km vs total km run (empty repositioning assumed at 12% per leg without a return load)
    const ladenKm = done.reduce((s, t) => s + (db.bookings.find((b) => b.id === t.bookingId)?.distanceKm ?? 0), 0);
    const emptyKm = done.reduce((s, t) => {
      const b = db.bookings.find((x) => x.id === t.bookingId);
      return s + (b ? b.distanceKm * 0.12 : 0);
    }, 0);
    const deadheadPct = ladenKm ? Math.round((emptyKm / (ladenKm + emptyKm)) * 100) : 0;

    const offered = db.bookings.filter((b) => b.status !== "draft");
    const accepted = offered.filter((b) => b.status !== "cancelled");
    const acceptancePct = offered.length ? Math.round((accepted.length / offered.length) * 100) : 0;

    const turnarounds = done
      .filter((t) => t.startedISO && t.deliveredISO)
      .map((t) => (new Date(t.deliveredISO!).getTime() - new Date(t.startedISO!).getTime()) / 3600000);
    const turnaroundHrs = turnarounds.length
      ? Math.round((turnarounds.reduce((s, h) => s + h, 0) / turnarounds.length) * 10) / 10
      : 0;

    const deliveredTrips = trips.filter((t) => ["delivered", "pod_uploaded", "completed"].includes(t.status));
    const withPod = deliveredTrips.filter((t) => t.podId).length;
    const podPct = deliveredTrips.length ? Math.round((withPod / deliveredTrips.length) * 100) : 100;

    const exposure = db.complianceDocs.filter((d) => d.status === "expired" || d.status === "expiring").length;

    return {
      revenue,
      profit,
      onTimePct: done.length ? Math.round((onTime / done.length) * 100) : 0,
      litres,
      fuelSpend,
      lanes,
      drivers,
      utilisation,
      buckets,
      months,
      overdue: db.invoices.filter(isOverdue).length,
      completed: done.length,
      deadheadPct,
      acceptancePct,
      turnaroundHrs,
      podPct,
      exposure,
    };
  }, [db, branch, since]);


  const exportCsv = () => {
    const rows = [
      ["Lane", "Trips", "Revenue", "Profit"],
      ...data.lanes.map(([lane, v]) => [lane, String(v.trips), String(Math.round(v.revenue)), String(Math.round(v.profit))]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "marichifleet-lane-profitability.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!can("view_operations")) return <NoAccess what="reports and analytics" />;

  const maxMonth = Math.max(1, ...data.months.map(([, v]) => v));
  const maxBucket = Math.max(1, ...data.buckets.map((b) => b.amount));

  return (
    <>
      <PageHeader
        title="Reports & analytics"
        subtitle="Everything below is computed live from your bookings, trips, fuel entries and invoices."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={branch} onValueChange={setBranch}>
              <SelectTrigger className="h-8 w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All branches</SelectItem>
                {db.branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={days} onValueChange={setDays}>
              <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="365">Last 12 months</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={exportCsv}>
              <Download className="size-3.5" aria-hidden /> Export CSV
            </Button>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Delivered revenue" value={inrCompact(data.revenue)} hint={`${data.completed} trips delivered`} />
        <KpiCard label="Gross profit" value={inrCompact(data.profit)} tone={data.profit > 0 ? "success" : "danger"} hint="After fuel, toll and driver cost" />
        <KpiCard label="On-time delivery" value={`${data.onTimePct}%`} tone={data.onTimePct >= 85 ? "success" : "warning"} hint="Within 15 minutes of ETA" />
        <KpiCard label="Fuel efficiency" value={`₹${data.litres ? Math.round(data.fuelSpend / data.litres) : 0}/L`} hint={`${Math.round(data.litres).toLocaleString("en-IN")} litres`} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title="Billed revenue by month">
          <div className="flex h-48 items-end gap-3">
            {data.months.map(([label, value]) => (
              <div key={label} className="flex flex-1 flex-col items-center gap-2">
                <span className="numeric text-[10px] text-muted-foreground">{inrCompact(value)}</span>
                <div
                  className="w-full rounded-t bg-primary/80"
                  style={{ height: `${Math.max(4, (value / maxMonth) * 140)}px` }}
                  aria-hidden
                />
                <span className="text-[11px] text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Receivables ageing">
          <ul className="space-y-3">
            {data.buckets.map((b) => (
              <li key={b.label}>
                <div className="flex items-center justify-between text-xs">
                  <span>{b.label}</span>
                  <span className="numeric">{inr(b.amount)}</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-muted">
                  <div
                    className={cn("h-2 rounded-full", b.min > 60 ? "bg-destructive" : b.min > 30 ? "bg-warning" : "bg-info")}
                    style={{ width: `${(b.amount / maxBucket) * 100}%` }}
                    aria-hidden
                  />
                </div>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Route profitability" description="Top lanes by gross profit.">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="py-2 pr-3">Lane</th>
                <th className="py-2 pr-3 text-right">Trips</th>
                <th className="py-2 pr-3 text-right">Revenue</th>
                <th className="py-2 text-right">Profit</th>
              </tr>
            </thead>
            <tbody>
              {data.lanes.map(([lane, v]) => (
                <tr key={lane} className="border-b border-border/60 last:border-0">
                  <td className="py-2 pr-3">{lane}</td>
                  <td className="numeric py-2 pr-3 text-right">{v.trips}</td>
                  <td className="numeric py-2 pr-3 text-right">{inrCompact(v.revenue)}</td>
                  <td className={cn("numeric py-2 text-right", v.profit >= 0 ? "text-success" : "text-destructive")}>
                    {inrCompact(v.profit)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        <Panel title="Driver performance">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="py-2 pr-3">Driver</th>
                <th className="py-2 pr-3 text-right">Trips</th>
                <th className="py-2 pr-3 text-right">Late</th>
                <th className="py-2 pr-3 text-right">Rating</th>
                <th className="py-2 text-right">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {data.drivers.map((d) => (
                <tr key={d.name} className="border-b border-border/60 last:border-0">
                  <td className="py-2 pr-3">{d.name}</td>
                  <td className="numeric py-2 pr-3 text-right">{d.trips}</td>
                  <td className={cn("numeric py-2 pr-3 text-right", d.late > 0 && "text-warning")}>{d.late}</td>
                  <td className="numeric py-2 pr-3 text-right">{d.rating.toFixed(1)}</td>
                  <td className="numeric py-2 text-right">{inrCompact(d.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        <Panel title="Vehicle utilisation" className="lg:col-span-2">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {data.utilisation.map((v) => (
              <div key={v.regNo} className="rounded-md border border-border p-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="numeric font-medium">{v.regNo}</span>
                  <span className="numeric text-muted-foreground">{v.pct}%</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-muted">
                  <div className="h-2 rounded-full bg-info" style={{ width: `${v.pct}%` }} aria-hidden />
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {v.trips} trips · {inrCompact(v.revenue)}
                </p>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </>
  );
}
