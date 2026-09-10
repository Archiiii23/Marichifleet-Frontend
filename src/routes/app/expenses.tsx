import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { EmptyState, KpiCard, PageHeader, Panel, StatusBadge } from "@/components/mf/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { getExtras } from "@/domain/extras";
import { fmtDate, money, moneyCompact, useAction, useDb } from "@/domain/hooks";
import { advanceExpense, getPrd, issueCreditNote, recordExpense, type Expense } from "@/domain/prd";
import { useSession } from "@/domain/session";

const CATEGORIES: Expense["category"][] = ["Fuel", "Toll", "Repairs", "Parts", "Salaries", "Insurance", "Office", "Other"];

export const Route = createFileRoute("/app/expenses")({
  head: () => ({
    meta: [
      { title: "Expenses & credit notes — MarichiFleet" },
      { name: "description", content: "Operating expense ledger, vendor payables and credit notes raised against client invoices." },
      { property: "og:title", content: "Expenses & credit notes — MarichiFleet" },
      { property: "og:description", content: "Track what the fleet spends and what has been credited back to clients." },
    ],
  }),
  component: Expenses,
});

function Expenses() {
  const db = useDb();
  const prd = getPrd();
  const extras = getExtras();
  const run = useAction();
  const { persona } = useSession();

  const [category, setCategory] = useState<Expense["category"]>("Repairs");
  const [amount, setAmount] = useState(0);
  const [note, setNote] = useState("");
  const [vendorId, setVendorId] = useState<string>("none");

  const [invoiceId, setInvoiceId] = useState(db.invoices[0]?.id ?? "");
  const [cnAmount, setCnAmount] = useState(0);
  const [reason, setReason] = useState("");

  const totals = useMemo(() => {
    const total = prd.expenses.reduce((s, e) => s + e.amount, 0);
    const unpaid = prd.expenses.filter((e) => e.status !== "paid").reduce((s, e) => s + e.amount, 0);
    const revenue = db.invoices.reduce((s, i) => s + i.total, 0);
    const credited = prd.creditNotes.reduce((s, c) => s + c.amount, 0);
    return { total, unpaid, revenue, credited, profit: revenue - credited - total };
  }, [prd.expenses, prd.creditNotes, db.invoices]);

  const vendorName = (id?: string) => extras.vendors.find((v) => v.id === id)?.name ?? "—";
  const invoiceRef = (id: string) => db.invoices.find((i) => i.id === id)?.ref ?? id;

  return (
    <>
      <PageHeader
        title="Expenses & credit notes"
        subtitle="The cost side of the ledger: operating expenses, vendor payables, and credits issued against disputed invoices."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Expenses booked" value={moneyCompact(totals.total)} hint="All categories" />
        <KpiCard label="Awaiting payment" value={moneyCompact(totals.unpaid)} tone={totals.unpaid > 0 ? "warning" : "success"} hint="Recorded and approved" />
        <KpiCard label="Credit notes" value={moneyCompact(totals.credited)} hint={`${prd.creditNotes.length} issued`} />
        <KpiCard label="Net position" value={moneyCompact(totals.profit)} tone={totals.profit >= 0 ? "success" : "danger"} hint="Invoiced revenue less credits and expenses" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title="Record an expense">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block text-xs text-muted-foreground">Category</span>
              <Select value={category} onValueChange={(v) => setCategory(v as Expense["category"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-xs text-muted-foreground">Vendor (optional)</span>
              <Select value={vendorId} onValueChange={setVendorId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No vendor</SelectItem>
                  {extras.vendors.map((v) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-xs text-muted-foreground">Amount</span>
              <Input type="number" min={0} value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-xs text-muted-foreground">Description</span>
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="What was this for?" />
            </label>
          </div>
          <Button
            className="mt-3"
            size="sm"
            onClick={() => {
              const res = run(
                () => recordExpense({ category, amount, note, ...(vendorId !== "none" ? { vendorId } : {}) }, persona.name),
                "Expense recorded.",
              );
              if (res.ok) { setAmount(0); setNote(""); }
            }}
          >
            Record expense
          </Button>
        </Panel>

        <Panel title="Issue a credit note" description="Credits reduce the outstanding balance on the client invoice.">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm sm:col-span-2">
              <span className="mb-1 block text-xs text-muted-foreground">Invoice</span>
              <Select value={invoiceId} onValueChange={setInvoiceId}>
                <SelectTrigger><SelectValue placeholder="Invoice" /></SelectTrigger>
                <SelectContent>
                  {db.invoices.map((i) => (
                    <SelectItem key={i.id} value={i.id}>{i.ref} · {money(i.total - i.paid)} outstanding</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-xs text-muted-foreground">Amount</span>
              <Input type="number" min={0} value={cnAmount} onChange={(e) => setCnAmount(Number(e.target.value))} />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-xs text-muted-foreground">Reason</span>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is this credited?" />
            </label>
          </div>
          <Button
            className="mt-3"
            size="sm"
            variant="outline"
            onClick={() => {
              const res = run(() => issueCreditNote(invoiceId, cnAmount, reason, persona.name), "Credit note issued.");
              if (res.ok) { setCnAmount(0); setReason(""); }
            }}
          >
            Issue credit note
          </Button>

          <ul className="mt-4 divide-y divide-border text-sm">
            {prd.creditNotes.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <p className="numeric text-xs text-muted-foreground">{c.ref} · {invoiceRef(c.invoiceId)}</p>
                  <p className="truncate">{c.reason}</p>
                </div>
                <span className="numeric shrink-0">{money(c.amount)}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel className="mt-4" title="Expense ledger">
        {prd.expenses.length === 0 ? (
          <EmptyState title="Nothing booked yet" message="Recorded expenses appear here with their approval status." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="py-2 pr-3">Date</th>
                  <th className="py-2 pr-3">Category</th>
                  <th className="py-2 pr-3">Description</th>
                  <th className="py-2 pr-3">Vendor</th>
                  <th className="py-2 pr-3">Amount</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {prd.expenses.map((e) => (
                  <tr key={e.id} className="border-b border-border/60">
                    <td className="py-2.5 pr-3 text-muted-foreground">{fmtDate(e.atISO)}</td>
                    <td className="py-2.5 pr-3">{e.category}</td>
                    <td className="py-2.5 pr-3">{e.note}</td>
                    <td className="py-2.5 pr-3 text-muted-foreground">{vendorName(e.vendorId)}</td>
                    <td className="numeric py-2.5 pr-3">{money(e.amount)}</td>
                    <td className="py-2.5 pr-3"><StatusBadge status={e.status} /></td>
                    <td className="py-2.5">
                      {e.status !== "paid" && (
                        <Button size="sm" variant="outline" onClick={() => run(() => advanceExpense(e.id, persona.name), "Expense updated.")}>
                          {e.status === "recorded" ? "Approve" : "Mark paid"}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}
