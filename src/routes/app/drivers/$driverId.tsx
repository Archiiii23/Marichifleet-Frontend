import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Metric, PageHeader, Panel, StatusBadge } from "@/components/mf/primitives";
import { Button } from "@/components/ui/button";
import { fmtDate, inr, useDb } from "@/domain/hooks";
import { useSession } from "@/domain/session";
import { deleteDriver, tripProfit } from "@/domain/store";

export const Route = createFileRoute("/app/drivers/$driverId")({
  head: () => ({
    meta: [
      { title: "Driver detail — MarichiFleet" },
      { name: "description", content: "Trip history, licence status and performance for one driver." },
    ],
  }),
  component: DriverDetail,
});

function DriverDetail() {
  const { driverId } = Route.useParams();
  const db = useDb();
  const navigate = useNavigate();
  const { persona } = useSession();
  const d = db.drivers.find((x) => x.id === driverId);

  if (!d) {
    return (
      <>
        <PageHeader title="Driver not found" breadcrumb={[{ label: "Drivers", to: "/app/drivers" }]} />
        <p className="text-sm text-muted-foreground">This driver is no longer on the roster.</p>
      </>
    );
  }

  const trips = db.trips.filter((t) => t.driverId === d.id);
  const docs = db.docs.filter((x) => x.entityType === "driver" && x.entityId === d.id);

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete driver ${d.name}?`)) {
      deleteDriver(d.id, persona.name);
      toast.success(`Driver ${d.name} deleted`);
      navigate({ to: "/app/drivers" });
    }
  };

  return (
    <>
      <PageHeader
        title={d.name}
        breadcrumb={[{ label: "Drivers", to: "/app/drivers" }, { label: d.name }]}
        subtitle={`${d.phone} · licence ${d.licenceNo}`}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={d.status} />
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
            >
              <Trash2 className="size-4" />
              Delete Driver
            </Button>
          </div>
        }
      />
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Panel title="Trips" description={`${trips.length} assigned`}>
          <ul className="space-y-2">
            {trips.slice(0, 12).map((t) => {
              const b = db.bookings.find((x) => x.id === t.bookingId);
              return (
                <li key={t.id} className="flex flex-wrap items-center gap-3 rounded-md border border-border p-3 text-sm">
                  <Link to="/app/trips/$tripId" params={{ tripId: t.id }} className="numeric text-primary hover:underline">
                    {t.ref}
                  </Link>
                  <span>{b ? `${b.pickup.city} → ${b.drop.city}` : "—"}</span>
                  <StatusBadge status={t.status} className="ml-auto" />
                  <span className="numeric">{inr(tripProfit(t))}</span>
                </li>
              );
            })}
            {trips.length === 0 && <p className="text-sm text-muted-foreground">No trips yet.</p>}
          </ul>
        </Panel>
        <div className="space-y-4">
          <Panel title="Performance">
            <div className="grid grid-cols-2 gap-4">
              <Metric label="Rating" value={`★ ${d.rating.toFixed(1)}`} />
              <Metric label="Trips completed" value={String(d.tripsCompleted)} />
              <Metric label="Licence expiry" value={fmtDate(d.licenceExpiryISO)} tone={new Date(d.licenceExpiryISO) < new Date() ? "danger" : undefined} />
              <Metric label="Assigned vehicle" value={db.vehicles.find((v) => v.id === d.assignedVehicleId)?.regNo ?? "—"} />
            </div>
          </Panel>
          <Panel title="Documents">
            <ul className="space-y-2 text-sm">
              {docs.map((x) => (
                <li key={x.id} className="flex items-center justify-between gap-3">
                  <span>
                    <span className="block">{x.kind}</span>
                    <span className="text-xs text-muted-foreground">expires {fmtDate(x.expiryISO)}</span>
                  </span>
                  <StatusBadge status={x.status} />
                </li>
              ))}
              {docs.length === 0 && <p className="text-muted-foreground">No documents on file.</p>}
            </ul>
          </Panel>
        </div>
      </div>
    </>
  );
}
