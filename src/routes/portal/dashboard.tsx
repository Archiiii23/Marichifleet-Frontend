import { createFileRoute, Link } from "@tanstack/react-router";
import { KpiCard, Panel, StatusBadge } from "@/components/mf/primitives";
import { Amount, toMoney } from "@/components/mf/amount";
import { Button } from "@/components/ui/button";
import { fmtDateTime, useDb } from "@/domain/hooks";
import { useSession } from "@/domain/session";
import { invoiceOutstanding } from "@/domain/store";

export const Route = createFileRoute("/portal/dashboard")({
  head: () => ({
    meta: [
      { title: "Client portal — MarichiFleet" },
      { name: "description", content: "Track your shipments, proofs of delivery and invoices in one place." },
    ],
  }),
  component: PortalDashboard,
});

function PortalDashboard() {
  const db = useDb();
  const { persona } = useSession();
  const clientId = persona.clientId ?? db.clients[0]?.id;
  const bookings = db.bookings.filter((b) => b.clientId === clientId);
  const invoices = db.invoices.filter((i) => i.clientId === clientId);
  const live = bookings.filter((b) => ["dispatched", "in_transit"].includes(b.status));
  const outstanding = invoices.reduce((s, i) => s + invoiceOutstanding(i), 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Your shipments</h1>
          <p className="text-sm text-muted-foreground">{db.clients.find((c) => c.id === clientId)?.name}</p>
        </div>
        <Button asChild size="sm">
          <Link to="/portal/bookings/new">Request pickup</Link>
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="In transit" value={String(live.length)} hint="Moving right now" tone="info" to="/portal/bookings" />
        <KpiCard label="Total bookings" value={String(bookings.length)} hint="All time" to="/portal/bookings" />
        <div className="rounded-lg border border-border bg-card p-4">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Outstanding</span>
          <div className="mt-2 text-2xl font-bold tracking-tight">
            <Amount value={toMoney(outstanding)} />
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">{invoices.length} invoices</p>
        </div>
        <KpiCard label="Delivered" value={String(bookings.filter((b) => ["pod_received", "invoiced", "paid", "closed"].includes(b.status)).length)} tone="success" />
      </div>

      <Panel title="Active shipments">
        {live.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No shipments on the road right now.</p>
        ) : (
          <ul className="space-y-2">
            {live.map((b) => {
              const t = db.trips.find((x) => x.id === b.tripId);
              return (
                <li key={b.id} className="flex flex-wrap items-center gap-3 rounded-md border border-border p-3">
                  <span className="numeric text-sm font-medium">{b.ref}</span>
                  <span className="text-sm">{b.pickup.city} → {b.drop.city}</span>
                  {t && <span className="text-xs text-muted-foreground">ETA {fmtDateTime(t.etaISO)}</span>}
                  <StatusBadge status={b.status} className="ml-auto" />
                  <Button asChild size="sm" variant="outline">
                    <Link to="/portal/tracking/$bookingId" params={{ bookingId: b.id }}>Track</Link>
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <Panel title="Recent invoices">
        <ul className="space-y-2">
          {invoices.slice(0, 6).map((i) => (
            <li key={i.id} className="flex flex-wrap items-center gap-3 rounded-md border border-border p-3 text-sm">
              <Link to="/portal/invoices/$invoiceId" params={{ invoiceId: i.id }} className="numeric text-primary hover:underline">
                {i.ref}
              </Link>
              <div className="ml-auto">
                <Amount value={toMoney(i.total)} className="font-medium" />
              </div>
              <StatusBadge status={i.status} />
            </li>
          ))}
          {invoices.length === 0 && <p className="text-sm text-muted-foreground">No invoices yet.</p>}
        </ul>
      </Panel>
    </div>
  );
}
