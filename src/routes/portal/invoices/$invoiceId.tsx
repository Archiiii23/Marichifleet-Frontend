import { createFileRoute, Link } from "@tanstack/react-router";
import { Download, FileCheck2, QrCode, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Metric, Panel, StatusBadge } from "@/components/mf/primitives";
import { Amount, toMoney } from "@/components/mf/amount";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fmtDate, useAction, useDb } from "@/domain/hooks";
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
    const text = [
      `MarichiFleet Payment Receipt`,
      `Invoice: ${inv.ref}`,
      `Amount: ₹${payment.amount.toLocaleString("en-IN")}`,
      `Mode: ${payment.mode}`,
      `UTR / Ref: ${payment.reference}`,
      `Received: ${fmtDate(payment.receivedISO)}`,
      inv.irn ? `GST IRN: ${inv.irn}` : "",
    ].filter(Boolean).join("\n");
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${inv.ref}-receipt.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">{inv.ref}</h1>
          <p className="text-sm text-muted-foreground">
            Issued {inv.issuedISO ? fmtDate(inv.issuedISO) : "—"} · Due {fmtDate(inv.dueISO)}
          </p>
        </div>
        <StatusBadge status={isOverdue(inv) ? "overdue" : inv.status} />
      </div>

      {/* GST e-Invoice Certification banner */}
      {inv.irn && (
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileCheck2 className="size-4 text-emerald-500" />
              <span className="text-sm font-semibold">Government Verified e-Invoice</span>
            </div>
            <span className="flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="size-3" />
              IRP Signed
            </span>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="min-w-0">
              <span className="text-[10px] uppercase text-muted-foreground font-semibold">IRN (64-char Hash)</span>
              <p className="font-mono text-[11px] truncate select-all">{inv.irn}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[11px] font-mono text-muted-foreground">Ack: {inv.ackNo}</span>
              <QrCode className="size-8 text-muted-foreground" />
            </div>
          </div>
        </div>
      )}

      <Panel title="Itemised Freight Charges">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="pb-2">Description</th>
              <th className="pb-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {inv.lines.map((l, idx) => (
              <tr key={idx}>
                <td className="py-2.5 font-medium">{l.label}</td>
                <td className="numeric py-2.5 text-right">
                  <Amount value={toMoney(l.amount)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-4 grid grid-cols-2 gap-4 border-t border-border pt-3 sm:grid-cols-4">
          <Metric label="Subtotal" value={<Amount value={toMoney(inv.subtotal)} />} />
          <Metric label={`GST ${inv.taxPct}% (SAC 996511)`} value={<Amount value={toMoney(inv.total - inv.subtotal)} />} />
          <Metric label="Total Invoiced" value={<Amount value={toMoney(inv.total)} className="font-bold" />} />
          <Metric
            label="Balance Due"
            value={<Amount value={toMoney(bal)} className={bal > 0 ? "text-warning font-bold" : "text-success font-bold"} />}
            tone={bal > 0 ? "warning" : "success"}
          />
        </div>
      </Panel>

      <Panel title="Payments Recorded">
        {payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No payments recorded yet against this invoice.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {payments.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3 rounded-md border border-border p-3">
                <Amount value={toMoney(p.amount)} className="font-semibold" />
                <span className="text-muted-foreground font-mono text-xs">{p.mode} · {p.reference}</span>
                <span className="ml-auto text-xs text-muted-foreground">{fmtDate(p.receivedISO)}</span>
                <Button size="icon" variant="ghost" aria-label={`Download receipt for ${p.reference}`} onClick={() => downloadReceipt(p.id)}>
                  <Download className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Commercial Review & Disputes" description="Raise a billing query; collections pause while customer accounting reviews.">
        {dispute ? (
          <div className="space-y-2 text-sm">
            <StatusBadge status={dispute.status} />
            <p className="font-medium">{dispute.reason}</p>
            <p className="text-muted-foreground">{dispute.detail}</p>
            <p className="text-xs text-muted-foreground">Raised {fmtDate(dispute.raisedISO)}</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-[220px_1fr_auto] sm:items-end">
            <label>
              <span className="mb-1 block text-xs text-muted-foreground">Reason</span>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Incorrect charge">Incorrect charge</SelectItem>
                  <SelectItem value="Service issue">Service issue</SelectItem>
                  <SelectItem value="Duplicate invoice">Duplicate invoice</SelectItem>
                  <SelectItem value="Missing document">Missing document / POD</SelectItem>
                </SelectContent>
              </Select>
            </label>
            <label>
              <span className="mb-1 block text-xs text-muted-foreground">What should we review?</span>
              <Input value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="Describe the discrepancy…" />
            </label>
            <Button
              variant="outline"
              onClick={() => {
                const result = run(() => raiseInvoiceDispute(inv.id, reason, detail, persona.name), "Invoice review opened");
                if (result.ok) setDetail("");
              }}
            >
              Request review
            </Button>
          </div>
        )}
      </Panel>

      {booking && (
        <Panel title="Linked Shipment">
          <Link
            to="/portal/bookings/$bookingId"
            params={{ bookingId: booking.id }}
            className="numeric text-primary font-medium hover:underline"
          >
            {booking.ref}
          </Link>
          <span className="ml-3 text-sm text-muted-foreground">
            {booking.pickup.city} → {booking.drop.city} ({booking.cargo}, {booking.weightTons}t)
          </span>
        </Panel>
      )}
    </div>
  );
}
