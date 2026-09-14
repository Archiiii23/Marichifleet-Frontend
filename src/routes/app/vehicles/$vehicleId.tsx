import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { FleetMap } from "@/components/mf/fleet-map";
import { Metric, PageHeader, Panel, StatusBadge } from "@/components/mf/primitives";
import { Button } from "@/components/ui/button";
import { fmtDate, fmtDateTime, inr, timeAgo, useDb } from "@/domain/hooks";
import { useSession } from "@/domain/session";
import { deleteVehicle, tripProfit } from "@/domain/store";

export const Route = createFileRoute("/app/vehicles/$vehicleId")({
  head: () => ({
    meta: [
      { title: "Vehicle detail — MarichiFleet" },
      { name: "description", content: "Utilisation, fuel history, documents and workshop record for one vehicle." },
    ],
  }),
  component: VehicleDetail,
});

function VehicleDetail() {
  const { vehicleId } = Route.useParams();
  const db = useDb();
  const navigate = useNavigate();
  const { persona } = useSession();
  const v = db.vehicles.find((x) => x.id === vehicleId);

  if (!v) {
    return (
      <>
        <PageHeader title="Vehicle not found" breadcrumb={[{ label: "Vehicles", to: "/app/vehicles" }]} />
        <p className="text-sm text-muted-foreground">This vehicle is no longer in the fleet register.</p>
      </>
    );
  }

  const trips = db.trips.filter((t) => t.vehicleId === v.id);
  const fuel = db.fuelLogs.filter((f) => f.vehicleId === v.id);
  const docs = db.docs.filter((d) => d.entityType === "vehicle" && d.entityId === v.id);
  const jobs = db.jobCards.filter((j) => j.vehicleId === v.id);
  const liveTrip = db.trips.find((t) => t.id === v.currentTripId);

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete vehicle ${v.regNo}?`)) {
      deleteVehicle(v.id, persona.name);
      toast.success(`Vehicle ${v.regNo} deleted`);
      navigate({ to: "/app/vehicles" });
    }
  };

  return (
    <>
      <PageHeader
        title={v.regNo}
        breadcrumb={[{ label: "Vehicles", to: "/app/vehicles" }, { label: v.regNo }]}
        subtitle={`${v.make} · ${v.type} · ${v.capacityTons}t capacity`}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={v.status} />
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
            >
              <Trash2 className="size-4" />
              Delete Vehicle
            </Button>
          </div>
        }
      />
      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4">
          <Panel title="Position" description={`Last ping ${timeAgo(v.lastPingISO)}`}>
            <FleetMap items={[{ vehicle: v, trip: liveTrip, delayed: false }]} selectedId={v.id} height={300} />
          </Panel>
          <Panel title="Trip history" description={`${trips.length} trips`}>
            <ul className="space-y-2">
              {trips.slice(0, 10).map((t) => (
                <li key={t.id} className="flex flex-wrap items-center gap-3 rounded-md border border-border p-3 text-sm">
                  <Link to="/app/trips/$tripId" params={{ tripId: t.id }} className="numeric text-primary hover:underline">
                    {t.ref}
                  </Link>
                  <StatusBadge status={t.status} />
                  <span className="numeric ml-auto">{inr(tripProfit(t))}</span>
                </li>
              ))}
              {trips.length === 0 && <p className="text-sm text-muted-foreground">No trips recorded.</p>}
            </ul>
          </Panel>
          <Panel title="Fuel log" description={`${fuel.length} refuels · ${inr(fuel.reduce((s, f) => s + f.cost, 0))} spent`}>
            <ul className="space-y-2 text-sm">
              {fuel.slice(0, 10).map((f) => (
                <li key={f.id} className="flex flex-wrap items-center gap-3">
                  <span className="numeric">{f.litres}L</span>
                  <span className="numeric">{inr(f.cost)}</span>
                  <span className="text-muted-foreground">{f.station}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{fmtDateTime(f.atISO)}</span>
                </li>
              ))}
              {fuel.length === 0 && <p className="text-muted-foreground">No refuels logged.</p>}
            </ul>
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title="Vitals">
            <div className="grid grid-cols-2 gap-4">
              <Metric label="Odometer" value={`${v.odometerKm.toLocaleString("en-IN")} km`} />
              <Metric label="Service due at" value={`${v.serviceDueKm.toLocaleString("en-IN")} km`} tone={v.odometerKm >= v.serviceDueKm - 2000 ? "warning" : undefined} />
              <Metric label="Fuel" value={`${v.fuelPct}%`} tone={v.fuelPct < 25 ? "warning" : undefined} />
              <Metric label="Speed" value={`${v.speedKph} km/h`} />
            </div>
          </Panel>
          <Panel title="Documents">
            <ul className="space-y-2 text-sm">
              {docs.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-3">
                  <span>
                    <span className="block">{d.kind}</span>
                    <span className="text-xs text-muted-foreground">expires {fmtDate(d.expiryISO)}</span>
                  </span>
                  <StatusBadge status={d.status} />
                </li>
              ))}
              {docs.length === 0 && <p className="text-muted-foreground">No documents on file.</p>}
            </ul>
          </Panel>
          <Panel title="Workshop history">
            <ul className="space-y-2 text-sm">
              {jobs.map((j) => (
                <li key={j.id} className="flex items-start justify-between gap-3">
                  <span className="min-w-0">
                    <span className="numeric block">{j.ref}</span>
                    <span className="block truncate text-xs text-muted-foreground">{j.issue}</span>
                  </span>
                  <StatusBadge status={j.status} />
                </li>
              ))}
              {jobs.length === 0 && <p className="text-muted-foreground">No job cards.</p>}
            </ul>
          </Panel>
        </div>
      </div>
    </>
  );
}
