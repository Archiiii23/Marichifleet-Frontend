import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { EmptyState, Panel, StatusBadge } from "@/components/mf/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { fmtDate, money, useAction, useDb } from "@/domain/hooks";
import { useSession } from "@/domain/session";
import { recordPayment } from "@/domain/store";

const MODES = ["UPI", "NEFT", "Cheque", "Cash"] as const;

export const Route = createFileRoute("/portal/pay/$invoiceId")({
  head: () => ({
    meta: [
      { title: "Pay invoice — MarichiFleet client portal" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PayInvoice,
});

function PayInvoice() {
  const { invoiceId } = useParams({ from: "/portal/pay/$invoiceId" });
  const db = useDb();
  const run = useAction();
  const navigate = useNavigate();
  const { persona } = useSession();

  const invoice = db.invoices.find((i) => i.id === invoiceId);
  const outstanding = invoice ? invoice.total - invoice.paid : 0;
  const [amount, setAmount] = useState(outstanding);
  const [mode, setMode] = useState<(typeof MODES)[number]>("UPI");
  const [reference, setReference] = useState("");
  const [processing, setProcessing] = useState(false);
  const [receiptId, setReceiptId] = useState("");

  if (!invoice) {
    return <EmptyState title="Invoice not found" message="This invoice may have been cancelled. Check your invoice list." />;
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div>
        <h1 className="font-display text-2xl font-semibold">Pay {invoice.ref}</h1>
        <p className="text-sm text-muted-foreground">Due {fmtDate(invoice.dueISO)}</p>
      </div>

      <Panel title="Invoice summary" actions={<StatusBadge status={invoice.status} />}>
        <dl className="grid grid-cols-3 gap-3 text-sm">
          <div>
            <dt className="text-xs uppercase tracking-wider text-muted-foreground">Total</dt>
            <dd className="numeric text-lg font-semibold">{money(invoice.total)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-muted-foreground">Paid</dt>
            <dd className="numeric text-lg font-semibold">{money(invoice.paid)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-muted-foreground">Outstanding</dt>
            <dd className="numeric text-lg font-semibold">{money(outstanding)}</dd>
          </div>
        </dl>
      </Panel>

      <Panel title={receiptId ? "Payment confirmed" : "Make a payment"} description={receiptId ? "Your receipt is available in the invoice activity." : "Payments are confirmed against your invoice immediately."}>
        {receiptId ? (
          <div className="space-y-4" role="status" aria-live="polite">
            <div className="rounded-md border border-success/30 bg-success/10 p-4">
              <p className="font-medium text-success">Payment received</p>
              <p className="mt-1 text-sm text-muted-foreground">Receipt {receiptId} · {money(amount)} via {mode}</p>
            </div>
            <Button className="w-full" onClick={() => navigate({ to: "/portal/invoices/$invoiceId", params: { invoiceId: invoice.id } })}>View invoice and receipt</Button>
          </div>
        ) : outstanding <= 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-success">This invoice is fully settled. Thank you.</p>
            <Button variant="outline" onClick={() => navigate({ to: "/portal/invoices/$invoiceId", params: { invoiceId: invoice.id } })}>View receipt</Button>
          </div>
        ) : (
          <div className="space-y-3">
            <label className="block text-sm">
              <span className="mb-1 block text-xs text-muted-foreground">Amount</span>
              <Input type="number" min={1} max={outstanding} value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-xs text-muted-foreground">Method</span>
              <Select value={mode} onValueChange={(v) => setMode(v as (typeof MODES)[number])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MODES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-xs text-muted-foreground">Reference</span>
              <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="UTR / cheque number" />
            </label>
            <div className="flex gap-2">
              <Button
                disabled={processing || amount <= 0 || amount > outstanding}
                onClick={() => {
                  setProcessing(true);
                  const res = run(
                    () => recordPayment(invoice.id, amount, mode, reference || "Portal payment", persona.name),
                    "Payment received — thank you.",
                  );
                  setProcessing(false);
                  if (res.ok) setReceiptId(`RCT-${res.id?.slice(-6).toUpperCase() ?? Date.now().toString().slice(-6)}`);
                }}
              >
                {processing ? "Confirming…" : `Pay ${money(amount)}`}
              </Button>
              <Button variant="outline" onClick={() => navigate({ to: "/portal/invoices" })}>
                Back to invoices
              </Button>
            </div>
          </div>
        )}
      </Panel>
    </div>
  );
}
