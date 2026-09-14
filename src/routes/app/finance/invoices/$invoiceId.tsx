import { createFileRoute, Link } from "@tanstack/react-router";
import { Copy, FileCheck2, Printer, QrCode, Send, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Metric, PageHeader, Panel, StatusBadge } from "@/components/mf/primitives";
import { PrintableInvoiceModal } from "@/components/mf/printable-invoice-modal";
import { Amount, toMoney } from "@/components/mf/amount";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { fmtDate, fmtDateTime, timeAgo, useAction, useDb } from "@/domain/hooks";
import { useSession } from "@/domain/session";
import { generateEInvoice, invoiceOutstanding, isOverdue, recordPayment, sendInvoice } from "@/domain/store";

export const Route = createFileRoute("/app/finance/invoices/$invoiceId")({
  head: () => ({
    meta: [
      { title: "Invoice — MarichiFleet" },
      { name: "description", content: "Invoice lines, tax, payments received and outstanding balance." },
      { property: "og:title", content: "Invoice — MarichiFleet" },
      { property: "og:description", content: "Freight invoice details, payments and e-invoice verification." },
      { name: "robots", content: "noindex" },
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
  const [printModalOpen, setPrintModalOpen] = useState(false);

  if (!inv) {
    return (
      <>
        <PageHeader title="Invoice not found" breadcrumb={[{ label: "Invoices", to: "/app/finance/invoices" }]} />
        <p className="text-sm text-muted-foreground">This invoice no longer exists.</p>
      </>
    );
  }

  const client = db.clients.find((c) => c.id === inv.clientId)!;
  const booking = db.bookings.find((b) => b.id === inv.bookingId);
  const payments = db.payments.filter((p) => p.invoiceId === inv.id);
  const history = db.audit.filter((a) => a.entityId === inv.id);

  const halfTax = (inv.total - inv.subtotal) / 2;

  return (
    <>
      <PageHeader
        title={inv.ref}
        breadcrumb={[{ label: "Invoices", to: "/app/finance/invoices" }, { label: inv.ref }]}
        subtitle={`${client.name} · GSTIN ${client.gstin}`}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={isOverdue(inv) ? "overdue" : inv.status} />
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 font-medium shadow-xs"
              onClick={() => setPrintModalOpen(true)}
            >
              <Printer className="size-3.5" />
              Print Bill
            </Button>
            {can("edit_finance") && (inv.status === "draft" || inv.status === "issued") && (
              <Button
                size="sm"
                className="gap-1.5"
                onClick={() => run(() => sendInvoice(inv.id, persona.name), "Invoice sent to client")}
              >
                <Send className="size-3.5" />
                Send to client
              </Button>
            )}
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-4">
          {/* Main Invoice Bill Panel */}
          <Panel title="Tax Invoice" description={`Raised ${fmtDate(inv.createdISO)} · Due ${fmtDate(inv.dueISO)}`}>
            <ul className="space-y-2 text-sm">
              {inv.lines.map((l) => (
                <li key={l.label} className="flex justify-between gap-4">
                  <span className="text-muted-foreground">{l.label}</span>
                  <Amount value={toMoney(l.amount)} />
                </li>
              ))}
            </ul>
            <Separator className="my-3" />
            <ul className="space-y-2 text-sm">
              <li className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <Amount value={toMoney(inv.subtotal)} />
              </li>
              <li className="flex justify-between text-xs text-muted-foreground">
                <span>CGST @ 6% (SAC {inv.sacCode ?? "996511"})</span>
                <Amount value={toMoney(halfTax)} />
              </li>
              <li className="flex justify-between text-xs text-muted-foreground">
                <span>SGST @ 6% (SAC {inv.sacCode ?? "996511"})</span>
                <Amount value={toMoney(halfTax)} />
              </li>
              <li className="flex justify-between text-base font-semibold border-t pt-2 mt-1">
                <span>Total Invoice Value</span>
                <Amount value={toMoney(inv.total)} className="text-base font-bold" />
              </li>
              <li className="flex justify-between">
                <span className="text-muted-foreground">Paid to date</span>
                <Amount value={toMoney(inv.paid)} className="text-success font-medium" />
              </li>
              <li className="flex justify-between font-medium">
                <span className="text-muted-foreground">Outstanding Balance</span>
                <Amount value={toMoney(invoiceOutstanding(inv))} className={invoiceOutstanding(inv) > 0 ? "text-warning" : "text-muted-foreground"} />
              </li>
            </ul>
            {booking && (
              <p className="mt-4 text-xs text-muted-foreground border-t pt-3">
                Linked to trip booking{" "}
                <Link to="/app/bookings/$bookingId" params={{ bookingId: booking.id }} className="text-primary font-medium hover:underline">
                  {booking.ref}
                </Link>{" "}
                · {booking.pickup.city} → {booking.drop.city} ({booking.distanceKm} km, {booking.cargo})
              </p>
            )}
          </Panel>

          {/* e-Invoice GST Compliance Card */}
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCheck2 className="size-4 text-primary" />
                <span className="text-sm font-semibold">GST e-Invoice (IRP Verified)</span>
              </div>
              {inv.irn ? (
                <span className="flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="size-3" />
                  IRN Generated
                </span>
              ) : (
                <span className="rounded bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                  IRN Pending
                </span>
              )}
            </div>

            {inv.irn ? (
              <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto]">
                <div className="space-y-2.5 text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
                      Invoice Reference Number (IRN)
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-mono text-[11px] break-all bg-surface px-2 py-1 rounded border border-border select-all">
                        {inv.irn}
                      </span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7 shrink-0"
                        title="Copy IRN"
                        onClick={() => {
                          void navigator.clipboard.writeText(inv.irn!);
                          toast.success("IRN copied to clipboard");
                        }}
                      >
                        <Copy className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/50">
                    <div>
                      <span className="text-muted-foreground text-[10px] uppercase font-semibold">Ack No</span>
                      <p className="font-mono text-xs">{inv.ackNo}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-[10px] uppercase font-semibold">Ack Timestamp</span>
                      <p className="font-mono text-xs">{inv.ackDateISO ? fmtDateTime(inv.ackDateISO) : "-"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-[10px] uppercase font-semibold">HSN / SAC Code</span>
                      <p className="font-mono text-xs">{inv.sacCode ?? "996511"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-[10px] uppercase font-semibold">Reverse Charge (RCM)</span>
                      <p className="font-mono text-xs">{inv.rcm ? "Yes" : "No"}</p>
                    </div>
                  </div>
                </div>
                {/* Visual QR Code simulation */}
                <div className="flex flex-col items-center justify-center rounded border border-border bg-white p-3 shadow-sm text-black self-start">
                  <QrCode className="size-20" />
                  <span className="text-[9px] font-mono text-center mt-1 text-zinc-600 font-semibold">
                    NIC-IRP Signed
                  </span>
                </div>
              </div>
            ) : (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                <p>This invoice is eligible for e-invoicing under GST Rule 48(4). Transmit to IRP to generate the signed IRN & QR code.</p>
                {can("edit_finance") && (
                  <Button
                    size="sm"
                    onClick={() => {
                      run(() => generateEInvoice(inv.id, persona.name), "e-Invoice IRN Generated & Signed with IRP portal");
                    }}
                  >
                    Generate IRN
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {can("edit_finance") && inv.status !== "paid" && (
            <Panel title="Record payment">
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Amount (₹)</Label>
                  <Input
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    inputMode="numeric"
                    placeholder={String(invoiceOutstanding(inv))}
                  />
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
                  <Label className="text-xs">Reference (UTR / Cheque No.)</Label>
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
                  <li key={p.id} className="flex items-center justify-between gap-3 border-b border-border/50 pb-2">
                    <span>
                      <Amount value={toMoney(p.amount)} className="block font-medium" />
                      <span className="text-xs text-muted-foreground font-mono">{p.mode} · {p.reference}</span>
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

      <PrintableInvoiceModal
        open={printModalOpen}
        onOpenChange={setPrintModalOpen}
        invoice={inv}
        client={client}
        booking={booking}
        trip={booking?.tripId ? db.trips.find((t) => t.id === booking.tripId) : null}
        vehicle={booking?.tripId ? db.vehicles.find((v) => v.currentTripId === booking.tripId) : null}
      />
    </>
  );
}
