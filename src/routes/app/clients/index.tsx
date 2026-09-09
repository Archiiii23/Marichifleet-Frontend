import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { DataTable } from "@/components/mf/data-table";
import { PageHeader } from "@/components/mf/primitives";
import { inr, useDb } from "@/domain/hooks";
import { invoiceOutstanding } from "@/domain/store";
import type { Client } from "@/domain/types";

export const Route = createFileRoute("/app/clients/")({
  head: () => ({
    meta: [
      { title: "Clients — MarichiFleet" },
      { name: "description", content: "Customer master with rate cards, credit terms and outstanding balances." },
    ],
  }),
  component: Clients,
});

function Clients() {
  const db = useDb();
  const navigate = useNavigate();
  const outstanding = (id: string) =>
    db.invoices.filter((i) => i.clientId === id).reduce((s, i) => s + invoiceOutstanding(i), 0);
  const volume = (id: string) => db.bookings.filter((b) => b.clientId === id).length;

  return (
    <>
      <PageHeader title="Clients" subtitle="Rate cards, credit terms and current exposure." />
      <DataTable<Client>
        rows={db.clients}
        searchKeys={(c) => `${c.name} ${c.city} ${c.segment} ${c.contactName}`}
        chips={[
          { id: "due", label: "With balance", test: (c) => outstanding(c.id) > 0 },
          { id: "3pl", label: "3PL", test: (c) => c.segment === "3PL" },
          { id: "mfg", label: "Manufacturers", test: (c) => c.segment === "Manufacturer" },
        ]}
        onRowClick={(c) => navigate({ to: "/app/clients/$clientId", params: { clientId: c.id } })}
        emptyTitle="No clients"
        emptyMessage="Add a client to start raising bookings."
        columns={[
          { key: "name", header: "Client", cell: (c) => <span className="font-medium">{c.name}</span>, sortValue: (c) => c.name },
          { key: "segment", header: "Segment", cell: (c) => c.segment, hideOnMobile: true },
          { key: "city", header: "City", cell: (c) => c.city, hideOnMobile: true },
          { key: "rate", header: "Rate/km", cell: (c) => <span className="numeric">₹{c.ratePerKm}</span>, sortValue: (c) => c.ratePerKm },
          { key: "credit", header: "Credit days", cell: (c) => <span className="numeric">{c.creditDays}</span>, sortValue: (c) => c.creditDays, hideOnMobile: true },
          { key: "vol", header: "Bookings", cell: (c) => <span className="numeric">{volume(c.id)}</span>, sortValue: (c) => volume(c.id) },
          { key: "out", header: "Outstanding", cell: (c) => <span className="numeric">{inr(outstanding(c.id))}</span>, sortValue: (c) => outstanding(c.id), className: "text-right" },
        ]}
      />
    </>
  );
}
