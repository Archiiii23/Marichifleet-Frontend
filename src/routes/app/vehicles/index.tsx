import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { DataTable } from "@/components/mf/data-table";
import { KpiCard, PageHeader, StatusBadge } from "@/components/mf/primitives";
import { timeAgo, useDb } from "@/domain/hooks";
import type { Vehicle } from "@/domain/types";

export const Route = createFileRoute("/app/vehicles/")({
  head: () => ({
    meta: [
      { title: "Vehicles — MarichiFleet" },
      { name: "description", content: "Fleet register with status, utilisation, fuel and service position." },
    ],
  }),
  component: Vehicles,
});

function Vehicles() {
  const db = useDb();
  const navigate = useNavigate();

  return (
    <>
      <PageHeader title="Vehicles" subtitle="Registered fleet, live status and service position." />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Fleet size" value={String(db.vehicles.length)} hint="Across all branches" />
        <KpiCard label="On trip" value={String(db.vehicles.filter((v) => v.status === "on_trip").length)} tone="info" />
        <KpiCard label="Available" value={String(db.vehicles.filter((v) => v.status === "available").length)} tone="success" />
        <KpiCard label="In workshop" value={String(db.vehicles.filter((v) => v.status === "maintenance").length)} tone="warning" to="/app/workshop" />
      </div>
      <DataTable<Vehicle>
        rows={db.vehicles}
        searchKeys={(v) => `${v.regNo} ${v.make} ${v.type}`}
        chips={[
          { id: "available", label: "Available", test: (v) => v.status === "available" },
          { id: "trip", label: "On trip", test: (v) => v.status === "on_trip" },
          { id: "workshop", label: "Workshop", test: (v) => v.status === "maintenance" },
          { id: "service", label: "Service due", test: (v) => v.odometerKm >= v.serviceDueKm - 2000 },
        ]}
        onRowClick={(v) => navigate({ to: "/app/vehicles/$vehicleId", params: { vehicleId: v.id } })}
        emptyTitle="No vehicles"
        emptyMessage="Add vehicles to start dispatching loads."
        columns={[
          { key: "reg", header: "Registration", cell: (v) => <span className="numeric font-medium">{v.regNo}</span>, sortValue: (v) => v.regNo },
          { key: "make", header: "Make & type", cell: (v) => `${v.make} · ${v.type}`, hideOnMobile: true },
          { key: "cap", header: "Capacity", cell: (v) => `${v.capacityTons}t`, sortValue: (v) => v.capacityTons },
          { key: "odo", header: "Odometer", cell: (v) => <span className="numeric">{v.odometerKm.toLocaleString("en-IN")} km</span>, sortValue: (v) => v.odometerKm, hideOnMobile: true },
          {
            key: "fuel",
            header: "Fuel",
            cell: (v) => (
              <span className="flex items-center gap-2">
                <span className="h-1.5 w-14 overflow-hidden rounded-full bg-surface">
                  <span className={v.fuelPct < 25 ? "block h-full bg-warning" : "block h-full bg-success"} style={{ width: `${v.fuelPct}%` }} />
                </span>
                <span className="numeric text-xs">{v.fuelPct}%</span>
              </span>
            ),
            sortValue: (v) => v.fuelPct,
          },
          { key: "ping", header: "Last ping", cell: (v) => timeAgo(v.lastPingISO), hideOnMobile: true },
          { key: "status", header: "Status", cell: (v) => <StatusBadge status={v.status} /> },
        ]}
      />
    </>
  );
}
