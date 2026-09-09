import { createFileRoute, Link } from "@tanstack/react-router";
import { Metric, Panel, StatusBadge } from "@/components/mf/primitives";
import { fmtDate, inr, useDb } from "@/domain/hooks";
import { invoiceOutstanding, isOverdue } from "@/domain/store";

export const Route = createFileRoute("/portal/invoices/$invoiceId")({
  head: () => ({
    meta: [
      { title: "Invoice — MarichiFleet" },
      { name: "description", content: "Invoice breakdown, taxes, payments received and balance due." },
    ],
  }),
  component: PortalInvoice,
});

function PortalInvoice() {
  const { invoiceId } = Route.useParams();
  const db = useDb();
  const inv = db.invoices.find((i) => i.id === invoiceId);
  if (!inv) return <p className="text-sm text-muted-foreground">Invoice not found.</p>;
  const booking = db.bookings.find((b) => b.id === inv.bookingId);
  const payments = db.payments.filter((p) => p.invoiceId === inv.id);
  const bal = invoiceOutstanding(inv);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">{inv.ref}</h1>
          <p className="text-sm text-muted-foreground">
            Issued {fmtDate(inv.issuedISO)} · due {fmtDate(inv.dueISO)}
          </p>
        </div>
        <StatusBadge status={isOverdue(inv) ? "overdue" : inv.status} />
      </div>

      <Panel title="Charges">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="pb-2">Description</th>
              <th className="pb-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {inv.lines.map((l, idx) => (
              <tr key={idx} className="border-b border-border/60">
                <td className="py-2">{l.label}</td>
                <td className="numeric py-2 text-right">{inr(l.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Metric label="Subtotal" value={inr(inv.subtotal)} />
          <Metric label="GST" value={inr(inv.tax)} />
          <Metric label="Total" value={inr(inv.total)} />
          <Metric label="Balance due" value={inr(bal)} tone={bal > 0 ? "warning" : "success"} />
        </div>
      </Panel>

      <Panel title="Payments received">
        {payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {payments.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3 rounded-md border border-border p-3">
                <span className="numeric">{inr(p.amount)}</span>
                <span className="text-muted-foreground">{p.method} · {p.reference}</span>
                <span className="ml-auto text-xs text-muted-foreground">{fmtDate(p.atISO)}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {booking && (
        <Panel title="Linked shipment">
          <Link
            to="/portal/bookings/$bookingId"
            params={{ bookingId: booking.id }}
            className="numeric text-primary hover:underline"
          >
            {booking.ref}
          </Link>
          <span className="ml-3 text-sm text-muted-foreground">
            {booking.pickup.city} → {booking.drop.city}
          </span>
        </Panel>
      )}
    </div>
  );
}
