import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { DataTable } from "@/components/mf/data-table";
import { StatusBadge } from "@/components/mf/primitives";
import { Button } from "@/components/ui/button";
import { fmtDate, inr, useDb } from "@/domain/hooks";
import { useSession } from "@/domain/session";
import type { Booking } from "@/domain/types";

export const Route = createFileRoute("/portal/bookings/")({
  head: () => ({
    meta: [
      { title: "My bookings — MarichiFleet" },
      { name: "description", content: "Every shipment you have requested, with live status." },
    ],
  }),
  component: PortalBookings,
});

function PortalBookings() {
  const db = useDb();
  const navigate = useNavigate();
  const { persona } = useSession();
  const clientId = persona.clientId ?? db.clients[0]?.id;
  const rows = db.bookings.filter((b) => b.clientId === clientId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-semibold">My bookings</h1>
        <Button asChild size="sm">
          <Link to="/portal/bookings/new">Request pickup</Link>
        </Button>
      </div>
      <DataTable<Booking>
        rows={rows}
        searchKeys={(b) => `${b.ref} ${b.pickup.city} ${b.drop.city} ${b.cargo}`}
        chips={[
          { id: "live", label: "In transit", test: (b) => ["dispatched", "in_transit"].includes(b.status) },
          { id: "done", label: "Delivered", test: (b) => ["pod_received", "invoiced", "paid", "closed"].includes(b.status) },
        ]}
        onRowClick={(b) => navigate({ to: "/portal/bookings/$bookingId", params: { bookingId: b.id } })}
        emptyTitle="No bookings yet"
        emptyMessage="Request your first pickup and we will confirm it within the hour."
        emptyAction={{ label: "Request pickup", onAction: () => navigate({ to: "/portal/bookings/new" }) }}
        columns={[
          { key: "ref", header: "Reference", cell: (b) => <span className="numeric font-medium">{b.ref}</span> },
          { key: "lane", header: "Lane", cell: (b) => `${b.pickup.city} → ${b.drop.city}` },
          { key: "cargo", header: "Cargo", cell: (b) => `${b.cargo} · ${b.weightTons}t`, hideOnMobile: true },
          { key: "pickup", header: "Pickup", cell: (b) => fmtDate(b.pickupISO), sortValue: (b) => b.pickupISO, hideOnMobile: true },
          { key: "rate", header: "Freight", cell: (b) => <span className="numeric">{inr(b.rate)}</span>, className: "text-right" },
          { key: "status", header: "Status", cell: (b) => <StatusBadge status={b.status} /> },
        ]}
      />
    </div>
  );
}
