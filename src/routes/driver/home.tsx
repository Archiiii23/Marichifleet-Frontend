import { createFileRoute, Link } from "@tanstack/react-router";
import { CloudOff, Navigation, PhoneCall } from "lucide-react";
import { Metric, Panel, StatusBadge } from "@/components/mf/primitives";
import { Button } from "@/components/ui/button";
import { fmtDateTime, useAction, useDb } from "@/domain/hooks";
import { useSession } from "@/domain/session";
import { acceptTrip, startTrip } from "@/domain/store";
import { useI18n } from "@/domain/i18n";

export const Route = createFileRoute("/driver/home")({
  head: () => ({
    meta: [
      { title: "Driver Home — MarichiFleet" },
      { name: "description", content: "Today's assigned trips, acceptance and quick actions for drivers." },
    ],
  }),
  component: DriverHome,
});

function DriverHome() {
  const db = useDb();
  const run = useAction();
  const { persona, online } = useSession();
  const { t } = useI18n();
  const driverId = persona.driverId ?? db.drivers[0]?.id;
  const driver = db.drivers.find((d) => d.id === driverId);
  const trips = db.trips.filter((tItem) => tItem.driverId === driverId && tItem.status !== "completed");
  const vehicle = db.vehicles.find((v) => v.id === driver?.assignedVehicleId);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-semibold">
          {t("driver.greeting")}, {driver?.name.split(" ")[0] ?? "Driver"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {trips.length ? `${trips.length} ${t("driver.activeTrips")}` : t("driver.noTrips")}
        </p>
      </div>

      {!online && (
        <div className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-warning">
          <CloudOff className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{t("driver.offline")}</span>
        </div>
      )}

      <Panel title={t("driver.vehicle")}>
        {vehicle ? (
          <div className="grid grid-cols-2 gap-4">
            <Metric label={t("driver.regNo")} value={vehicle.regNo} />
            <Metric label={t("driver.fuelPct")} value={`${vehicle.fuelPct}%`} tone={vehicle.fuelPct < 25 ? "warning" : undefined} />
            <Metric label={t("driver.odometer")} value={`${vehicle.odometerKm.toLocaleString("en-IN")} km`} />
            <Metric label={t("driver.status")} value={<StatusBadge status={vehicle.status} />} />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No vehicle assigned yet.</p>
        )}
      </Panel>

      {trips.map((trip) => {
        const b = db.bookings.find((x) => x.id === trip.bookingId)!;
        return (
          <Panel key={trip.id} title={trip.ref} description={`${b.pickup.city} → ${b.drop.city}`}>
            <div className="grid grid-cols-2 gap-4">
              <Metric label="Cargo" value={`${b.cargo}`} />
              <Metric label="Weight" value={`${b.weightTons}t`} />
              <Metric label="ETA" value={fmtDateTime(trip.etaISO)} />
              <Metric label="Status" value={<StatusBadge status={trip.status} />} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {trip.status === "driver_assigned" && (
                <Button className="flex-1 h-12 text-base font-semibold" onClick={() => run(() => acceptTrip(trip.id, persona.name), "Trip accepted")}>
                  {t("driver.accept")}
                </Button>
              )}
              {trip.status === "driver_accepted" && (
                <Button className="flex-1 h-12 text-base font-semibold" onClick={() => run(() => startTrip(trip.id, persona.name), "Trip started")}>
                  <Navigation className="size-4 mr-1.5" aria-hidden /> {t("driver.start")}
                </Button>
              )}
              <Button asChild variant="outline" className="flex-1 h-12 text-base font-semibold">
                <Link to="/driver/trips/$tripId" params={{ tripId: trip.id }}>Open</Link>
              </Button>
            </div>
          </Panel>
        );
      })}

      {trips.length === 0 && (
        <Panel title={t("driver.noTrips")}>
          <p className="text-sm text-muted-foreground">
            New assignments arrive via WhatsApp and will pop up here on your mobile dashboard automatically.
          </p>
        </Panel>
      )}
    </div>
  );
}
