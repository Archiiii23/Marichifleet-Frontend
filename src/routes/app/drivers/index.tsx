import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { DataTable } from "@/components/mf/data-table";
import { PageHeader, StatusBadge } from "@/components/mf/primitives";
import { fmtDate, useDb } from "@/domain/hooks";
import type { Driver } from "@/domain/types";

export const Route = createFileRoute("/app/drivers/")({
  head: () => ({
    meta: [
      { title: "Drivers — MarichiFleet" },
      { name: "description", content: "Driver roster with availability, licence validity and performance." },
    ],
  }),
  component: Drivers,
});

function Drivers() {
  const db = useDb();
  const navigate = useNavigate();

  return (
    <>
      <PageHeader title="Drivers" subtitle="Roster, availability and licence compliance." />
      <DataTable<Driver>
        rows={db.drivers}
        searchKeys={(d) => `${d.name} ${d.phone} ${d.licenceNo}`}
        chips={[
          { id: "available", label: "Available", test: (d) => d.status === "available" },
          { id: "trip", label: "On trip", test: (d) => d.status === "on_trip" },
          { id: "rest", label: "Rest / leave", test: (d) => d.status === "rest" || d.status === "leave" },
          { id: "licence", label: "Licence expiring", test: (d) => new Date(d.licenceExpiryISO).getTime() < Date.now() + 60 * 86400_000 },
        ]}
        onRowClick={(d) => navigate({ to: "/app/drivers/$driverId", params: { driverId: d.id } })}
        emptyTitle="No drivers"
        emptyMessage="Add drivers before dispatching loads."
        columns={[
          { key: "name", header: "Driver", cell: (d) => <span className="font-medium">{d.name}</span>, sortValue: (d) => d.name },
          { key: "phone", header: "Phone", cell: (d) => <span className="numeric">{d.phone}</span>, hideOnMobile: true },
          { key: "licence", header: "Licence expiry", cell: (d) => fmtDate(d.licenceExpiryISO), sortValue: (d) => d.licenceExpiryISO, hideOnMobile: true },
          { key: "rating", header: "Rating", cell: (d) => <span className="numeric">★ {d.rating.toFixed(1)}</span>, sortValue: (d) => d.rating },
          { key: "trips", header: "Trips", cell: (d) => <span className="numeric">{d.tripsCompleted}</span>, sortValue: (d) => d.tripsCompleted },
          { key: "status", header: "Status", cell: (d) => <StatusBadge status={d.status} /> },
        ]}
      />
    </>
  );
}
