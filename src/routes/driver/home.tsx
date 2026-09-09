import { createFileRoute, Link } from "@tanstack/react-router";
import { CloudOff, Navigation } from "lucide-react";
import { Metric, Panel, StatusBadge } from "@/components/mf/primitives";
import { Button } from "@/components/ui/button";
import { fmtDateTime, useAction, useDb } from "@/domain/hooks";
import { useSession } from "@/domain/session";
import { acceptTrip, startTrip } from "@/domain/store";

export const Route = createFileRoute("/driver/home")({
  head: () => ({
    meta: [
      { title: "Driver home — MarichiFleet" },
      { name: "description", content: "Today's assigned trips, acceptance and quick actions for drivers." },
    ],
  }),
  component: DriverHome,
});

function DriverHome() {
  const db = useDb();
  const run = useAction();
  const { persona, online } = useSession();
  const driverId = persona.driverId ?? db.drivers[0]?.id;
  const driver = db.drivers.find((d) => d.id === driverId);
  const trips = db.trips.filter((t) => t.driverId === driverId && t.status !== "completed");
  const vehicle = db.vehicles.find((v) => v.id === driver?.assignedVehicleId);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-semibold">Good day, {driver?.name.split(" ")[0] ?? "driver"}</h1>
        <p className="text-sm text-muted-foreground">
          {trips.length ? `${trips.length} active assignment${trips.length > 1 ? "s" : ""}` : "No assignments right now"}
        </p>
      </div>

      {!online && (
        <div className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-warning">
          <CloudOff className="mt-0.5 size-4 shrink-0" aria-hidden />
          You are offline. Actions are queued on the device and sync when the connection returns.
        </div>
      )}

      <Panel title="Your vehicle">
        {vehicle ? (
          <div className="grid grid-cols-2 gap-4">
            <Metric label="Registration" value={vehicle.regNo} />
            <Metric label="Fuel" value={`${vehicle.fuelPct}%`} tone={vehicle.fuelPct < 25 ? "warning" : undefined} />
            <Metric label="Odometer" value={`${vehicle.odometerKm.toLocaleString("en-IN")} km`} />
            <Metric label="Status" value={<StatusBadge status={vehicle.status} />} />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No vehicle assigned yet.</p>
        )}
      </Panel>

      {trips.map((t) => {
        const b = db.bookings.find((x) => x.id === t.bookingId)!;
        return (
          <Panel key={t.id} title={t.ref} description={`${b.pickup.city} → ${b.drop.city}`}>
            <div className="grid grid-cols-2 gap-4">
              <Metric label="Cargo" value={`${b.cargo}`} />
              <Metric label="Weight" value={`${b.weightTons}t`} />
              <Metric label="ETA" value={fmtDateTime(t.etaISO)} />
              <Metric label="Status" value={<StatusBadge status={t.status} />} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {t.status === "driver_assigned" && (
                <Button className="flex-1" onClick={() => run(() => acceptTrip(t.id, persona.name), "Trip accepted")}>
                  Accept trip
                </Button>
              )}
              {t.status === "driver_accepted" && (
                <Button className="flex-1" onClick={() => run(() => startTrip(t.id, persona.name), "Trip started")}>
                  <Navigation className="size-4" aria-hidden /> Start trip
                </Button>
              )}
              <Button asChild variant="outline" className="flex-1">
                <Link to="/driver/trips/$tripId" params={{ tripId: t.id }}>Open</Link>
              </Button>
            </div>
          </Panel>
        );
      })}

      {trips.length === 0 && (
        <Panel title="No active trips">
          <p className="text-sm text-muted-foreground">
            New assignments arrive on WhatsApp and appear here instantly.
          </p>
        </Panel>
      )}
    </div>
  );
}
