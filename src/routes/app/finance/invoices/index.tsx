import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { DataTable } from "@/components/mf/data-table";
import { NoAccess, PageHeader, StatusBadge } from "@/components/mf/primitives";
import { Button } from "@/components/ui/button";
import { fmtDate, inr, useAction, useDb } from "@/domain/hooks";
import { useSession } from "@/domain/session";
import { clientName, invoiceOutstanding, isOverdue, sendInvoice } from "@/domain/store";
import type { Invoice } from "@/domain/types";

export const Route = createFileRoute("/app/finance/invoices/")({
  head: () => ({
    meta: [
      { title: "Invoices — MarichiFleet" },
      { name: "description", content: "Raise, send and settle freight invoices linked to signed PODs." },
    ],
  }),
  component: Invoices,
});

function Invoices() {
  const db = useDb();
  const navigate = useNavigate();
  const run = useAction();
  const { persona, can } = useSession();

  if (!can("view_finance")) {
    return (
      <>
        <PageHeader title="Invoices" />
        <NoAccess what="finance data" />
      </>
    );
  }

  return (
    <>
      <PageHeader title="Invoices" subtitle="Every invoice is anchored to a delivered trip with signed proof." />
      <DataTable<Invoice>
        rows={db.invoices}
        searchKeys={(i) => `${i.ref} ${clientName(i.clientId)}`}
        chips={[
          { id: "draft", label: "Draft", test: (i) => i.status === "draft" },
          { id: "sent", label: "Sent", test: (i) => i.status === "sent" || i.status === "issued" },
          { id: "overdue", label: "Overdue", test: isOverdue },
          { id: "paid", label: "Paid", test: (i) => i.status === "paid" },
        ]}
        onRowClick={(i) => navigate({ to: "/app/finance/invoices/$invoiceId", params: { invoiceId: i.id } })}
        bulkActions={
          can("edit_finance")
            ? [
                {
                  label: "Send selected",
                  run: (ids) => ids.forEach((id) => run(() => sendInvoice(id, persona.name), "Invoice sent")),
                },
              ]
            : undefined
        }
        emptyTitle="No invoices yet"
        emptyMessage="Capture a POD on a delivered trip, then raise the invoice from the booking."
        columns={[
          { key: "ref", header: "Invoice", cell: (i) => <span className="numeric font-medium">{i.ref}</span>, sortValue: (i) => i.ref },
          { key: "client", header: "Client", cell: (i) => clientName(i.clientId) },
          { key: "total", header: "Total", cell: (i) => <span className="numeric">{inr(i.total)}</span>, sortValue: (i) => i.total, className: "text-right" },
          { key: "out", header: "Outstanding", cell: (i) => <span className="numeric">{inr(invoiceOutstanding(i))}</span>, sortValue: (i) => invoiceOutstanding(i), className: "text-right" },
          { key: "due", header: "Due", cell: (i) => fmtDate(i.dueISO), sortValue: (i) => i.dueISO, hideOnMobile: true },
          { key: "status", header: "Status", cell: (i) => <StatusBadge status={isOverdue(i) ? "overdue" : i.status} /> },
          {
            key: "action",
            header: "",
            className: "text-right",
            cell: (i) =>
              can("edit_finance") && (i.status === "draft" || i.status === "issued") ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    run(() => sendInvoice(i.id, persona.name), "Invoice sent to client");
                  }}
                >
                  Send
                </Button>
              ) : null,
          },
        ]}
      />
    </>
  );
}
