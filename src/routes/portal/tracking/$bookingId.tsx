import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { FleetMap } from "@/components/mf/fleet-map";
import { Metric, Panel, StatusBadge } from "@/components/mf/primitives";
import { fmtDateTime, timeAgo, useDb } from "@/domain/hooks";

export const Route = createFileRoute("/portal/tracking/$bookingId")({
  head: () => ({
    meta: [
      { title: "Live tracking — MarichiFleet" },
      { name: "description", content: "Follow your consignment on the map with live ETA and checkpoints." },
      { property: "og:title", content: "Live shipment tracking — MarichiFleet" },
      { property: "og:description", content: "Follow shipment movement, ETA and completed checkpoints." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PortalTracking,
});

function PortalTracking() {
  const { bookingId } = Route.useParams();
  const db = useDb();
  const b = db.bookings.find((x) => x.id === bookingId);
  const trip = db.trips.find((t) => t.id === b?.tripId);
  const [playback, setPlayback] = useState(100);

  if (!b) return <p className="text-sm text-muted-foreground">Shipment not found.</p>;
  if (!trip) {
    return (
      <Panel title="Not yet dispatched">
        <p className="text-sm text-muted-foreground">
          Live tracking opens as soon as a vehicle is assigned to {b.ref}.
        </p>
      </Panel>
    );
  }

  const vehicle = db.vehicles.find((v) => v.id === trip.vehicleId);
  const driver = db.drivers.find((d) => d.id === trip.driverId);
  const stale = vehicle ? Date.now() - new Date(vehicle.lastPingISO).getTime() > 15 * 60_000 : false;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">{b.ref}</h1>
          <p className="text-sm text-muted-foreground">{b.pickup.city} → {b.drop.city}</p>
        </div>
        <StatusBadge status={trip.status} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Panel title="Live position">
          {vehicle && (() => {
            const index = Math.min(trip.route.length - 1, Math.round((playback / 100) * (trip.route.length - 1)));
            const point = trip.route[index] ?? { lat: vehicle.lat, lng: vehicle.lng };
            const playbackVehicle = { ...vehicle, lat: point.lat, lng: point.lng };
            return <><FleetMap items={[{ vehicle: playbackVehicle, trip, delayed: trip.delayMins > 30 }]} selectedId={vehicle.id} height={420} /><div className="mt-3"><div className="flex justify-between text-xs text-muted-foreground"><span>Trip start</span><span>{playback === 100 ? "Live" : `${playback}% of route`}</span></div><input className="mt-2 w-full accent-primary" type="range" min={0} max={100} value={playback} onChange={(event) => setPlayback(Number(event.target.value))} aria-label="Trip route playback" /></div></>;
          })()}
        </Panel>
        <div className="space-y-4">
          <Panel title="Journey">
            <div className="grid grid-cols-2 gap-4">
              <Metric label="Progress" value={`${Math.round(trip.progress * 100)}%`} />
              <Metric label="ETA" value={fmtDateTime(trip.etaISO)} />
              <Metric label="Delay" value={`${trip.delayMins} min`} tone={trip.delayMins > 30 ? "warning" : undefined} />
              <Metric label="Vehicle" value={vehicle?.regNo ?? "—"} />
              <Metric label="Driver" value={driver?.name ?? "—"} />
              <Metric
                label="Last update"
                value={vehicle ? timeAgo(vehicle.lastPingISO) : "—"}
                tone={stale ? "warning" : undefined}
              />
            </div>
            {stale && (
              <p className="mt-3 rounded-md border border-warning/40 bg-warning/10 p-2 text-xs text-warning">
                Location has not refreshed recently. Our team is checking with the driver.
              </p>
            )}
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
        </div>
      </div>
    </div>
  );
}
