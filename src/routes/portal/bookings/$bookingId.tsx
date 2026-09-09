import { createFileRoute, Link } from "@tanstack/react-router";
import { Metric, Panel, StatusBadge } from "@/components/mf/primitives";
import { Button } from "@/components/ui/button";
import { fmtDate, fmtDateTime, inr, useDb } from "@/domain/hooks";

export const Route = createFileRoute("/portal/bookings/$bookingId")({
  head: () => ({
    meta: [
      { title: "Shipment — MarichiFleet" },
      { name: "description", content: "Status, vehicle, proof of delivery and invoice for your shipment." },
    ],
  }),
  component: PortalBooking,
});

function PortalBooking() {
  const { bookingId } = Route.useParams();
  const db = useDb();
  const b = db.bookings.find((x) => x.id === bookingId);
  if (!b) return <p className="text-sm text-muted-foreground">Shipment not found.</p>;
  const trip = db.trips.find((t) => t.id === b.tripId);
  const pod = db.pods.find((p) => p.bookingId === b.id);
  const invoice = db.invoices.find((i) => i.id === b.invoiceId);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">{b.ref}</h1>
          <p className="text-sm text-muted-foreground">{b.pickup.city} → {b.drop.city} · {b.cargo}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={b.status} />
          {trip && (
            <Button asChild size="sm" variant="outline">
              <Link to="/portal/tracking/$bookingId" params={{ bookingId: b.id }}>Track live</Link>
            </Button>
          )}
        </div>
      </div>

      <Panel title="Shipment">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Metric label="Weight" value={`${b.weightTons}t`} />
          <Metric label="Distance" value={`${b.distanceKm} km`} />
          <Metric label="Pickup" value={fmtDate(b.pickupISO)} />
          <Metric label="Freight" value={inr(b.rate)} />
        </div>
      </Panel>

      {trip && (
        <Panel title="Journey" description={`${Math.round(trip.progress * 100)}% complete · ETA ${fmtDateTime(trip.etaISO)}`}>
          <ol className="space-y-2">
            {trip.checkpoints.map((c) => (
              <li key={c.id} className="flex items-center gap-3 text-sm">
                <span className={c.doneISO ? "size-2 rounded-full bg-success" : "size-2 rounded-full bg-border-strong"} aria-hidden />
                <span>{c.label}</span>
                <span className="ml-auto text-xs text-muted-foreground">{c.doneISO ? fmtDateTime(c.doneISO) : "pending"}</span>
              </li>
            ))}
          </ol>
        </Panel>
      )}

      <Panel title="Proof of delivery">
        {pod ? (
          <div className="grid gap-4 sm:grid-cols-3">
            <Metric label="Received by" value={pod.receiverName} />
            <Metric label="Captured" value={fmtDateTime(pod.capturedISO)} />
            <Metric label="Verified" value={pod.verified ? "Yes" : "No"} tone={pod.verified ? "success" : "warning"} />
            <p className="text-sm text-muted-foreground sm:col-span-3">{pod.photoNote}</p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Available once the consignment is delivered and signed.</p>
        )}
      </Panel>

      <Panel title="Invoice">
        {invoice ? (
          <div className="flex flex-wrap items-center gap-3">
            <Link to="/portal/invoices/$invoiceId" params={{ invoiceId: invoice.id }} className="numeric text-primary hover:underline">
              {invoice.ref}
            </Link>
            <span className="numeric">{inr(invoice.total)}</span>
            <StatusBadge status={invoice.status} />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Raised after delivery is confirmed with signed proof.</p>
        )}
      </Panel>
    </div>
  );
}
