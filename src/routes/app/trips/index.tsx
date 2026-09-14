import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { DataTable } from "@/components/mf/data-table";
import { PageHeader, StatusBadge } from "@/components/mf/primitives";
import { Button } from "@/components/ui/button";
import { fmtDateTime, inr, useDb } from "@/domain/hooks";
import { useSession } from "@/domain/session";
import { deleteTrip, tripProfit } from "@/domain/store";
import type { Trip } from "@/domain/types";

export const Route = createFileRoute("/app/trips/")({
  head: () => ({
    meta: [
      { title: "Trips — MarichiFleet" },
      { name: "description", content: "Every dispatched trip with progress, delay and contribution margin." },
    ],
  }),
  component: Trips,
});

function Trips() {
  const db = useDb();
  const navigate = useNavigate();
  const { persona } = useSession();
  const veh = (id: string) => db.vehicles.find((v) => v.id === id)?.regNo ?? "—";
  const drv = (id: string) => db.drivers.find((d) => d.id === id)?.name ?? "—";
  const lane = (t: Trip) => {
    const b = db.bookings.find((x) => x.id === t.bookingId);
    return b ? `${b.pickup.city} → ${b.drop.city}` : "—";
  };

  return (
    <>
      <PageHeader title="Trips" subtitle="Dispatched work, live progress and per-trip profitability." />
      <DataTable<Trip>
        rows={db.trips}
        searchKeys={(t) => `${t.ref} ${veh(t.vehicleId)} ${drv(t.driverId)} ${lane(t)}`}
        chips={[
          { id: "live", label: "Live", test: (t) => ["started", "in_transit", "arrived"].includes(t.status) },
          { id: "exception", label: "Exceptions", test: (t) => t.status === "exception" },
          { id: "delayed", label: "Delayed", test: (t) => t.delayMins > 30 },
          { id: "done", label: "Completed", test: (t) => t.status === "completed" },
        ]}
        onRowClick={(t) => navigate({ to: "/app/trips/$tripId", params: { tripId: t.id } })}
        emptyTitle="No trips yet"
        emptyMessage="Assign a vehicle and driver on the dispatch board to create the first trip."
        columns={[
          { key: "ref", header: "Trip", cell: (t) => <span className="numeric font-medium">{t.ref}</span>, sortValue: (t) => t.ref },
          { key: "lane", header: "Lane", cell: lane },
          { key: "veh", header: "Vehicle", cell: (t) => <span className="numeric">{veh(t.vehicleId)}</span>, hideOnMobile: true },
          { key: "drv", header: "Driver", cell: (t) => drv(t.driverId), hideOnMobile: true },
          {
            key: "progress",
            header: "Progress",
            cell: (t) => (
              <span className="flex items-center gap-2">
                <span className="h-1.5 w-20 overflow-hidden rounded-full bg-surface">
                  <span className="block h-full rounded-full bg-primary" style={{ width: `${Math.round(t.progress * 100)}%` }} />
                </span>
                <span className="numeric text-xs">{Math.round(t.progress * 100)}%</span>
              </span>
            ),
            sortValue: (t) => t.progress,
          },
          { key: "eta", header: "ETA", cell: (t) => fmtDateTime(t.etaISO), sortValue: (t) => t.etaISO, hideOnMobile: true },
          {
            key: "profit",
            header: "Contribution",
            cell: (t) => <span className="numeric">{inr(tripProfit(t))}</span>,
            sortValue: (t) => tripProfit(t),
            className: "text-right",
          },
          { key: "status", header: "Status", cell: (t) => <StatusBadge status={t.status} /> },
          {
            key: "actions",
            header: "",
            className: "w-10 text-right",
            cell: (t) => (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`Are you sure you want to delete trip ${t.ref}?`)) {
                    deleteTrip(t.id, persona.name);
                    toast.success(`Trip ${t.ref} deleted`);
                  }
                }}
                title={`Delete trip ${t.ref}`}
              >
                <Trash2 className="size-4" />
              </Button>
            ),
          },
        ]}
      />
    </>
  );
}
