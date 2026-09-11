import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { KpiCard, NoAccess, PageHeader, Panel } from "@/components/mf/primitives";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getPrd } from "@/domain/prd";
import { money, moneyCompact, useDb } from "@/domain/hooks";
import { useSession } from "@/domain/session";
import { tripProfit } from "@/domain/store";

export const Route = createFileRoute("/app/finance/pnl")({
  head: () => ({ meta: [
    { title: "Profit & loss — MarichiFleet" },
    { name: "description", content: "Profitability by client, route and vehicle with operating expense coverage." },
    { property: "og:title", content: "Profit & loss — MarichiFleet" },
    { property: "og:description", content: "Trace fleet revenue, direct costs and operating expenses by business dimension." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: ProfitAndLoss,
});

function ProfitAndLoss() {
  const db = useDb();
  const { can } = useSession();
  const [dimension, setDimension] = useState<"client" | "route" | "vehicle">("client");
  const rows = useMemo(() => {
    const map = new Map<string, { label: string; trips: number; revenue: number; directCost: number }>();
    for (const trip of db.trips.filter((item) => item.status === "delivered" || item.status === "completed")) {
      const booking = db.bookings.find((b) => b.id === trip.bookingId);
      const vehicle = db.vehicles.find((v) => v.id === trip.vehicleId);
      const client = db.clients.find((c) => c.id === booking?.clientId);
      const key = dimension === "client" ? client?.id : dimension === "vehicle" ? vehicle?.id : booking ? `${booking.pickup.city}-${booking.drop.city}` : undefined;
      const label = dimension === "client" ? client?.name : dimension === "vehicle" ? vehicle?.regNo : booking ? `${booking.pickup.city} → ${booking.drop.city}` : undefined;
      if (!key || !label) continue;
      const current = map.get(key) ?? { label, trips: 0, revenue: 0, directCost: 0 };
      current.trips += 1; current.revenue += trip.revenue; current.directCost += trip.revenue - tripProfit(trip); map.set(key, current);
    }
    return [...map.values()].map((row) => ({ ...row, contribution: row.revenue - row.directCost, margin: row.revenue ? Math.round(((row.revenue - row.directCost) / row.revenue) * 100) : 0 })).sort((a, b) => b.contribution - a.contribution);
  }, [db, dimension]);
  if (!can("view_finance")) return <NoAccess what="profit and loss" />;
  const revenue = rows.reduce((s, r) => s + r.revenue, 0);
  const direct = rows.reduce((s, r) => s + r.directCost, 0);
  const opex = getPrd().expenses.reduce((s, e) => s + e.amount, 0);
  const net = revenue - direct - opex;
  return <>
    <PageHeader title="Profit & loss" subtitle="Operational contribution by client, route and vehicle, reconciled with recorded expenses." actions={<><Select value={dimension} onValueChange={(v) => setDimension(v as typeof dimension)}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="client">By client</SelectItem><SelectItem value="route">By route</SelectItem><SelectItem value="vehicle">By vehicle</SelectItem></SelectContent></Select><Button asChild size="sm" variant="outline"><Link to="/app/ledger">Open ledger</Link></Button></>} />
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><KpiCard label="Revenue" value={moneyCompact(revenue)} /><KpiCard label="Direct trip costs" value={moneyCompact(direct)} /><KpiCard label="Operating expenses" value={moneyCompact(opex)} /><KpiCard label="Net position" value={moneyCompact(net)} tone={net >= 0 ? "success" : "danger"} /></div>
    <Panel className="mt-4" title={`Profitability ${dimension === "client" ? "by client" : dimension === "route" ? "by route" : "by vehicle"}`}>
      <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-sm"><thead><tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground"><th className="py-2 pr-3">Dimension</th><th className="py-2 pr-3 text-right">Trips</th><th className="py-2 pr-3 text-right">Revenue</th><th className="py-2 pr-3 text-right">Direct cost</th><th className="py-2 pr-3 text-right">Contribution</th><th className="py-2 text-right">Margin</th></tr></thead><tbody>{rows.map((row) => <tr key={row.label} className="border-b border-border/60"><td className="py-2.5 pr-3 font-medium">{row.label}</td><td className="numeric py-2.5 pr-3 text-right">{row.trips}</td><td className="numeric py-2.5 pr-3 text-right">{money(row.revenue)}</td><td className="numeric py-2.5 pr-3 text-right">{money(row.directCost)}</td><td className="numeric py-2.5 pr-3 text-right">{money(row.contribution)}</td><td className="numeric py-2.5 text-right">{row.margin}%</td></tr>)}</tbody></table></div>
    </Panel>
  </>;
}