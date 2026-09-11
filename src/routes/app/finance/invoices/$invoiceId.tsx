import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Metric, PageHeader, Panel, StatusBadge } from "@/components/mf/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { fmtDate, fmtDateTime, inr, timeAgo, useAction, useDb } from "@/domain/hooks";
import { useSession } from "@/domain/session";
import { invoiceOutstanding, isOverdue, recordPayment, sendInvoice } from "@/domain/store";

export const Route = createFileRoute("/app/finance/invoices/$invoiceId")({
  head: () => ({
    meta: [
      { title: "Invoice — MarichiFleet" },
      { name: "description", content: "Invoice lines, tax, payments received and outstanding balance." },
    ],
  }),
  component: InvoiceDetail,
});

function InvoiceDetail() {
  const { invoiceId } = Route.useParams();
  const db = useDb();
  const run = useAction();
  const { persona, can } = useSession();
  const inv = db.invoices.find((i) => i.id === invoiceId);
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<"NEFT" | "UPI" | "Cheque" | "Cash">("NEFT");
  const [reference, setReference] = useState("");

  if (!inv) {
    return (
      <>
        <PageHeader title="Invoice not found" breadcrumb={[{ label: "Invoices", to: "/app/finance/invoices/" }]} />
        <p className="text-sm text-muted-foreground">This invoice no longer exists.</p>
      </>
    );
  }

  const client = db.clients.find((c) => c.id === inv.clientId)!;
  const booking = db.bookings.find((b) => b.id === inv.bookingId);
  const payments = db.payments.filter((p) => p.invoiceId === inv.id);
  const history = db.audit.filter((a) => a.entityId === inv.id);

  return (
    <>
      <PageHeader
        title={inv.ref}
        breadcrumb={[{ label: "Invoices", to: "/app/finance/invoices/" }, { label: inv.ref }]}
        subtitle={`${client.name} · ${client.gstin}`}
        actions={
          <>
            <StatusBadge status={isOverdue(inv) ? "overdue" : inv.status} />
            {can("edit_finance") && (inv.status === "draft" || inv.status === "issued") && (
              <Button size="sm" onClick={() => run(() => sendInvoice(inv.id, persona.name), "Invoice sent")}>Send to client</Button>
            )}
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Panel title="Invoice" description={`Raised ${fmtDate(inv.createdISO)} · due ${fmtDate(inv.dueISO)}`}>
          <ul className="space-y-2 text-sm">
            {inv.lines.map((l) => (
              <li key={l.label} className="flex justify-between gap-4">
                <span className="text-muted-foreground">{l.label}</span>
                <span className="numeric">{inr(l.amount)}</span>
              </li>
            ))}
          </ul>
          <Separator className="my-3" />
          <ul className="space-y-2 text-sm">
            <li className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="numeric">{inr(inv.subtotal)}</span></li>
            <li className="flex justify-between"><span className="text-muted-foreground">GST @ {inv.taxPct}%</span><span className="numeric">{inr(inv.total - inv.subtotal)}</span></li>
            <li className="flex justify-between text-base font-semibold"><span>Total</span><span className="numeric">{inr(inv.total)}</span></li>
            <li className="flex justify-between"><span className="text-muted-foreground">Paid</span><span className="numeric text-success">{inr(inv.paid)}</span></li>
            <li className="flex justify-between"><span className="text-muted-foreground">Outstanding</span><span className="numeric">{inr(invoiceOutstanding(inv))}</span></li>
          </ul>
          {booking && (
            <p className="mt-4 text-xs text-muted-foreground">
              Linked to booking{" "}
              <Link to="/app/bookings/$bookingId" params={{ bookingId: booking.id }} className="text-primary hover:underline">
                {booking.ref}
              </Link>{" "}
              · {booking.pickup.city} → {booking.drop.city}
            </p>
          )}
        </Panel>

        <div className="space-y-4">
          {can("edit_finance") && inv.status !== "paid" && (
            <Panel title="Record payment">
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Amount (₹)</Label>
                  <Input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="numeric" placeholder={String(invoiceOutstanding(inv))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Mode</Label>
                  <Select value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["NEFT", "UPI", "Cheque", "Cash"].map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Reference</Label>
                  <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="UTR / cheque no." />
                </div>
                <Button
                  className="w-full"
                  onClick={() => {
                    const res = run(
                      () => recordPayment(inv.id, Number(amount || invoiceOutstanding(inv)), mode, reference, persona.name),
                      "Payment recorded",
                    );
                    if (res.ok) {
                      setAmount("");
                      setReference("");
                    }
                  }}
                >
                  Record payment
                </Button>
              </div>
            </Panel>
          )}

          <Panel title="Payments received">
            {payments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {payments.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3">
                    <span>
                      <span className="numeric block">{inr(p.amount)}</span>
                      <span className="text-xs text-muted-foreground">{p.mode} · {p.reference}</span>
                    </span>
                    <span className="text-xs text-muted-foreground">{fmtDateTime(p.receivedISO)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Client">
            <div className="grid grid-cols-2 gap-3">
              <Metric label="Credit days" value={String(client.creditDays)} />
              <Metric label="City" value={client.city} />
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{client.contactName} · {client.phone}</p>
          </Panel>

          <Panel title="Audit trail">
            <ol className="space-y-2.5">
              {history.map((a) => (
                <li key={a.id} className="text-sm">
                  <p>{a.action}</p>
                  <p className="text-xs text-muted-foreground">{a.actor} · {timeAgo(a.atISO)}</p>
                </li>
              ))}
              {history.length === 0 && <p className="text-sm text-muted-foreground">No changes yet.</p>}
            </ol>
          </Panel>
        </div>
      </div>
    </>
  );
}
