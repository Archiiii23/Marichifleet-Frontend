import { createFileRoute } from "@tanstack/react-router";
import { FleetMap } from "@/components/mf/fleet-map";
import { Metric, Panel, StatusBadge } from "@/components/mf/primitives";
import { fmtDateTime, timeAgo, useDb } from "@/domain/hooks";

export const Route = createFileRoute("/track/$token")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Track your consignment — MarichiFleet" },
      { name: "description", content: "Public shipment tracking: live position, checkpoints and estimated arrival." },
      { property: "og:title", content: "Track your consignment — MarichiFleet" },
      { property: "og:description", content: "Live position, checkpoints and estimated arrival for your MarichiFleet shipment." },
    ],
  }),
  component: PublicTrack,
});

function PublicTrack() {
  const { token } = Route.useParams();
  const db = useDb();
  const trip = db.trips.find((t) => t.ref.toLowerCase() === token.toLowerCase());

  if (!trip) {
    return (
      <main className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-semibold">Tracking link not recognised</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This link may have expired. Please ask your MarichiFleet contact for a fresh tracking link.
        </p>
      </main>
    );
  }

  const b = db.bookings.find((x) => x.id === trip.bookingId)!;
  const vehicle = db.vehicles.find((v) => v.id === trip.vehicleId);
  const stale = vehicle ? Date.now() - new Date(vehicle.lastPingISO).getTime() > 15 * 60_000 : false;

  return (
    <main className="mx-auto max-w-4xl space-y-4 px-4 py-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-primary">MarichiFleet tracking</p>
          <h1 className="font-display text-2xl font-semibold">{b.pickup.city} → {b.drop.city}</h1>
          <p className="numeric text-sm text-muted-foreground">{trip.ref}</p>
        </div>
        <StatusBadge status={trip.status} />
      </header>

      <Panel title="Live position">
        {vehicle && (
          <FleetMap items={[{ vehicle, trip, delayed: trip.delayMins > 30 }]} selectedId={vehicle.id} height={380} />
        )}
      </Panel>

      <Panel title="Status">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Metric label="Progress" value={`${Math.round(trip.progress * 100)}%`} />
          <Metric label="ETA" value={fmtDateTime(trip.etaISO)} />
          <Metric label="Delay" value={`${trip.delayMins} min`} tone={trip.delayMins > 30 ? "warning" : undefined} />
          <Metric label="Last update" value={vehicle ? timeAgo(vehicle.lastPingISO) : "—"} tone={stale ? "warning" : undefined} />
        </div>
      </Panel>

      <Panel title="Checkpoints">
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
    </main>
  );
}
