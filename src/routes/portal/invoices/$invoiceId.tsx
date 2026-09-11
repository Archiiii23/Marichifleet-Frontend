import { createFileRoute, Link } from "@tanstack/react-router";
import { Download } from "lucide-react";
import { useState } from "react";
import { Metric, Panel, StatusBadge } from "@/components/mf/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fmtDate, inr, useAction, useDb } from "@/domain/hooks";
import { getPrd, raiseInvoiceDispute } from "@/domain/prd";
import { useSession } from "@/domain/session";
import { invoiceOutstanding, isOverdue } from "@/domain/store";

export const Route = createFileRoute("/portal/invoices/$invoiceId")({
  head: () => ({
    meta: [
      { title: "Client invoice — MarichiFleet" },
      { name: "description", content: "Invoice breakdown, taxes, payments received and balance due." },
      { property: "og:title", content: "Client invoice — MarichiFleet" },
      { property: "og:description", content: "Invoice charges, payment receipts, linked delivery and dispute status." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PortalInvoice,
});

function PortalInvoice() {
  const { invoiceId } = Route.useParams();
  const db = useDb();
  const prd = getPrd();
  const run = useAction();
  const { persona } = useSession();
  const [reason, setReason] = useState("Incorrect charge");
  const [detail, setDetail] = useState("");
  const inv = db.invoices.find((i) => i.id === invoiceId);
  if (!inv) return <p className="text-sm text-muted-foreground">Invoice not found.</p>;
  const booking = db.bookings.find((b) => b.id === inv.bookingId);
  const payments = db.payments.filter((p) => p.invoiceId === inv.id);
  const bal = invoiceOutstanding(inv);
  const dispute = prd.invoiceDisputes.find((d) => d.invoiceId === inv.id && d.status !== "resolved");
  const downloadReceipt = (paymentId: string) => {
    const payment = payments.find((p) => p.id === paymentId);
    if (!payment) return;
    const text = [`MarichiFleet payment receipt`, `Invoice: ${inv.ref}`, `Amount: ${inr(payment.amount)}`, `Method: ${payment.mode}`, `Reference: ${payment.reference}`, `Received: ${fmtDate(payment.receivedISO)}`].join("\n");
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `${inv.ref}-receipt.txt`; anchor.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">{inv.ref}</h1>
          <p className="text-sm text-muted-foreground">
            Issued {inv.issuedISO ? fmtDate(inv.issuedISO) : "—"} · due {fmtDate(inv.dueISO)}
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
          <Metric label={`GST ${inv.taxPct}%`} value={inr(inv.total - inv.subtotal)} />
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
                <span className="text-muted-foreground">{p.mode} · {p.reference}</span>
                <span className="ml-auto text-xs text-muted-foreground">{fmtDate(p.receivedISO)}</span>
                <Button size="icon" variant="ghost" aria-label={`Download receipt for ${p.reference}`} onClick={() => downloadReceipt(p.id)}><Download className="size-4" /></Button>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Invoice review" description="Raise one review at a time; collections pause while finance investigates.">
        {dispute ? (
          <div className="space-y-2 text-sm"><StatusBadge status={dispute.status} /><p className="font-medium">{dispute.reason}</p><p className="text-muted-foreground">{dispute.detail}</p><p className="text-xs text-muted-foreground">Raised {fmtDate(dispute.raisedISO)}</p></div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-[220px_1fr_auto] sm:items-end">
            <label><span className="mb-1 block text-xs text-muted-foreground">Reason</span><Select value={reason} onValueChange={setReason}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Incorrect charge">Incorrect charge</SelectItem><SelectItem value="Service issue">Service issue</SelectItem><SelectItem value="Duplicate invoice">Duplicate invoice</SelectItem><SelectItem value="Missing document">Missing document</SelectItem></SelectContent></Select></label>
            <label><span className="mb-1 block text-xs text-muted-foreground">What should we review?</span><Input value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="Describe the disputed line or amount" /></label>
            <Button variant="outline" onClick={() => { const result = run(() => raiseInvoiceDispute(inv.id, reason, detail, persona.name), "Invoice review opened"); if (result.ok) setDetail(""); }}>Request review</Button>
          </div>
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
