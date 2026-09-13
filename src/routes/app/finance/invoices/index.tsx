import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { DataTable } from "@/components/mf/data-table";
import { KpiCard, NoAccess, PageHeader, Panel, StatusBadge } from "@/components/mf/primitives";
import { Amount, toMoney } from "@/components/mf/amount";
import { Button } from "@/components/ui/button";
import { fmtDate, useAction, useDb } from "@/domain/hooks";
import { useSession } from "@/domain/session";
import { clientName, createInvoice, invoiceOutstanding, isOverdue, sendInvoice } from "@/domain/store";
import type { Invoice } from "@/domain/types";

export const Route = createFileRoute("/app/finance/invoices/")({
  head: () => ({
    meta: [
      { title: "Invoices — MarichiFleet" },
      { name: "description", content: "Raise, send and settle freight invoices linked to signed PODs." },
      { property: "og:title", content: "Invoices — MarichiFleet" },
      { property: "og:description", content: "Raise, send and settle freight invoices linked to signed PODs." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Invoices,
});

function Invoices() {
  const db = useDb();
  const navigate = useNavigate();
  const run = useAction();
  const { persona, can } = useSession();

  if (!can("finance:read") && !can("view_finance")) {
    return (
      <>
        <PageHeader title="Invoices" />
        <NoAccess what="finance data" />
      </>
    );
  }

  const ready = db.bookings.filter((b) => b.status === "pod_received" && !b.invoiceId);
  const outstandingMinor = db.invoices.reduce((sum, invoice) => sum + invoiceOutstanding(invoice) * 100, 0);

  return (
    <>
      <PageHeader
        title="Invoices"
        subtitle="Every freight invoice is anchored to a delivered trip with signed proof of delivery."
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Ready to bill" value={String(ready.length)} tone={ready.length ? "warning" : "success"} hint="Signed POD, no invoice" />
        <KpiCard label="Invoice book" value={String(db.invoices.length)} hint="Draft through paid" />
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Outstanding</span>
            <span className="size-2 rounded-full bg-warning" aria-hidden />
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight">
            <Amount value={{ minor: outstandingMinor, currency: "INR" }} />
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">Across active freight receivables</p>
        </div>
        <KpiCard label="Paid" value={String(db.invoices.filter((i) => i.status === "paid").length)} tone="success" hint="Fully settled" />
      </div>

      {ready.length > 0 && (can("billing:draft") || can("edit_finance")) && (
        <Panel className="mb-4" title="Ready to bill" description="Delivered loads with approved proof of delivery.">
          <ul className="divide-y divide-border">
            {ready.map((booking) => (
              <li key={booking.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                <span className="numeric font-medium">{booking.ref}</span>
                <span>{clientName(booking.clientId)}</span>
                <span className="text-muted-foreground">{booking.pickup.city} → {booking.drop.city}</span>
                <div className="ml-auto">
                  <Amount value={toMoney(booking.rate)} className="font-medium" />
                </div>
                <Button size="sm" onClick={() => run(() => createInvoice(booking.id, persona.name), "Draft invoice created")}>
                  Create invoice
                </Button>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <DataTable<Invoice>
        rows={db.invoices}
        searchKeys={(i) => `${i.ref} ${clientName(i.clientId)} ${i.irn ?? ""}`}
        chips={[
          { id: "draft", label: "Draft", test: (i) => i.status === "draft" },
          { id: "sent", label: "Sent", test: (i) => i.status === "sent" || i.status === "issued" },
          { id: "overdue", label: "Overdue", test: isOverdue },
          { id: "paid", label: "Paid", test: (i) => i.status === "paid" },
          { id: "einvoiced", label: "e-Invoiced", test: (i) => !!i.irn },
        ]}
        onRowClick={(i) => navigate({ to: "/app/finance/invoices/$invoiceId", params: { invoiceId: i.id } })}
        bulkActions={
          (can("billing:draft") || can("edit_finance"))
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
          {
            key: "irn",
            header: "e-Invoice",
            cell: (i) =>
              i.irn ? (
                <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="size-3" />
                  IRN Done
                </span>
              ) : (
                <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                  Pending
                </span>
              ),
          },
          {
            key: "total",
            header: "Total",
            cell: (i) => <Amount value={toMoney(i.total)} className="font-medium" />,
            sortValue: (i) => i.total,
            className: "text-right",
          },
          {
            key: "out",
            header: "Outstanding",
            cell: (i) => (
              <Amount
                value={toMoney(invoiceOutstanding(i))}
                className={invoiceOutstanding(i) > 0 ? "font-medium text-warning" : "text-muted-foreground"}
              />
            ),
            sortValue: (i) => invoiceOutstanding(i),
            className: "text-right",
          },
          { key: "due", header: "Due", cell: (i) => fmtDate(i.dueISO), sortValue: (i) => i.dueISO, hideOnMobile: true },
          { key: "status", header: "Status", cell: (i) => <StatusBadge status={isOverdue(i) ? "overdue" : i.status} /> },
          {
            key: "action",
            header: "",
            className: "text-right",
            cell: (i) =>
              (can("billing:draft") || can("edit_finance")) && (i.status === "draft" || i.status === "issued") ? (
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
