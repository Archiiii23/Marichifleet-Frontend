import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { DataTable } from "@/components/mf/data-table";
import { KpiCard, StatusBadge } from "@/components/mf/primitives";
import { fmtDate, inr, inrCompact, useDb } from "@/domain/hooks";
import { useSession } from "@/domain/session";
import { invoiceOutstanding, isOverdue } from "@/domain/store";
import type { Invoice } from "@/domain/types";

export const Route = createFileRoute("/portal/invoices/")({
  head: () => ({
    meta: [
      { title: "Invoices — MarichiFleet" },
      { name: "description", content: "Your freight invoices, payments and outstanding balance." },
    ],
  }),
  component: PortalInvoices,
});

function PortalInvoices() {
  const db = useDb();
  const navigate = useNavigate();
  const { persona } = useSession();
  const clientId = persona.clientId ?? db.clients[0]?.id;
  const rows = db.invoices.filter((i) => i.clientId === clientId);
  const outstanding = rows.reduce((s, i) => s + invoiceOutstanding(i), 0);
  const overdue = rows.filter(isOverdue);

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-semibold">Invoices</h1>
      <div className="grid gap-3 sm:grid-cols-3">
        <KpiCard label="Outstanding" value={inrCompact(outstanding)} hint="Across all invoices" />
        <KpiCard label="Overdue" value={String(overdue.length)} tone={overdue.length ? "danger" : "success"} hint="Past due date" />
        <KpiCard label="Invoices" value={String(rows.length)} hint="All time" />
      </div>
      <DataTable<Invoice>
        rows={rows}
        searchKeys={(i) => i.ref}
        chips={[
          { id: "open", label: "Unpaid", test: (i) => invoiceOutstanding(i) > 0 },
          { id: "overdue", label: "Overdue", test: isOverdue },
        ]}
        onRowClick={(i) => navigate({ to: "/portal/invoices/$invoiceId", params: { invoiceId: i.id } })}
        emptyTitle="No invoices yet"
        emptyMessage="Invoices appear here once deliveries are completed."
        columns={[
          { key: "ref", header: "Invoice", cell: (i) => <span className="numeric font-medium">{i.ref}</span> },
          { key: "issued", header: "Issued", cell: (i) => (i.issuedISO ? fmtDate(i.issuedISO) : "—"), sortValue: (i) => i.issuedISO ?? "", hideOnMobile: true },
          { key: "due", header: "Due", cell: (i) => fmtDate(i.dueISO), sortValue: (i) => i.dueISO, hideOnMobile: true },
          { key: "total", header: "Total", cell: (i) => <span className="numeric">{inr(i.total)}</span>, className: "text-right" },
          { key: "bal", header: "Outstanding", cell: (i) => <span className="numeric">{inr(invoiceOutstanding(i))}</span>, className: "text-right" },
          { key: "status", header: "Status", cell: (i) => <StatusBadge status={isOverdue(i) ? "overdue" : i.status} /> },
          {
            key: "pay",
            header: "",
            cell: (i) =>
              invoiceOutstanding(i) > 0 ? (
                <Button
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate({ to: "/portal/pay/$invoiceId", params: { invoiceId: i.id } });
                  }}
                >
                  Pay
                </Button>
              ) : (
                <span className="text-xs text-muted-foreground">Settled</span>
              ),
          },

        ]}
      />
    </div>
  );
}
