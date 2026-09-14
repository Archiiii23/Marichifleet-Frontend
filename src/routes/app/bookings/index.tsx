import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { DataTable } from "@/components/mf/data-table";
import { PageHeader, StatusBadge } from "@/components/mf/primitives";
import { Button } from "@/components/ui/button";
import { fmtDate, inr, useDb } from "@/domain/hooks";
import { useSession } from "@/domain/session";
import { clientName, deleteBooking } from "@/domain/store";
import type { Booking } from "@/domain/types";

export const Route = createFileRoute("/app/bookings/")({
  head: () => ({
    meta: [
      { title: "Bookings — MarichiFleet" },
      { name: "description", content: "Every freight order from enquiry to closure, with lifecycle status." },
    ],
  }),
  component: Bookings,
});

function Bookings() {
  const db = useDb();
  const navigate = useNavigate();
  const { persona } = useSession();

  return (
    <>
      <PageHeader
        title="Bookings"
        subtitle="Freight orders across the full lifecycle — draft to closed."
        actions={
          <Button asChild size="sm">
            <Link to="/app/bookings/new">New booking</Link>
          </Button>
        }
      />
      <DataTable<Booking>
        rows={db.bookings}
        searchKeys={(b) => `${b.ref} ${clientName(b.clientId)} ${b.pickup.city} ${b.drop.city} ${b.cargo}`}
        chips={[
          { id: "action", label: "Needs action", test: (b) => ["submitted", "confirmed", "pod_pending"].includes(b.status) },
          { id: "live", label: "In transit", test: (b) => ["dispatched", "in_transit"].includes(b.status) },
          { id: "billing", label: "Ready to bill", test: (b) => b.status === "pod_received" },
          { id: "closed", label: "Closed", test: (b) => b.status === "closed" || b.status === "paid" },
        ]}
        onRowClick={(b) => navigate({ to: "/app/bookings/$bookingId", params: { bookingId: b.id } })}
        emptyTitle="No bookings yet"
        emptyMessage="Create the first freight order to start the dispatch workflow."
        emptyAction={{ label: "New booking", onAction: () => navigate({ to: "/app/bookings/new" }) }}
        columns={[
          { key: "ref", header: "Reference", cell: (b) => <span className="numeric font-medium">{b.ref}</span>, sortValue: (b) => b.ref },
          { key: "client", header: "Client", cell: (b) => clientName(b.clientId), sortValue: (b) => clientName(b.clientId) },
          {
            key: "lane",
            header: "Lane",
            cell: (b) => (
              <span className="whitespace-nowrap">
                {b.pickup.city} <span className="text-muted-foreground">→</span> {b.drop.city}
              </span>
            ),
          },
          { key: "cargo", header: "Cargo", cell: (b) => `${b.cargo} · ${b.weightTons}t`, hideOnMobile: true },
          { key: "pickup", header: "Pickup", cell: (b) => fmtDate(b.pickupISO), sortValue: (b) => b.pickupISO, hideOnMobile: true },
          { key: "rate", header: "Rate", cell: (b) => <span className="numeric">{inr(b.rate)}</span>, sortValue: (b) => b.rate, className: "text-right" },
          { key: "status", header: "Status", cell: (b) => <StatusBadge status={b.status} /> },
          {
            key: "actions",
            header: "",
            className: "w-10 text-right",
            cell: (b) => (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`Are you sure you want to delete booking ${b.ref}?`)) {
                    deleteBooking(b.id, persona.name);
                    toast.success(`Booking ${b.ref} deleted`);
                  }
                }}
                title={`Delete booking ${b.ref}`}
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
