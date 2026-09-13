import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { EmptyState, KpiCard, NoAccess, PageHeader, Panel, StatusBadge } from "@/components/mf/primitives";
import { Amount, toMoney } from "@/components/mf/amount";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { getExtras } from "@/domain/extras";
import { fmtDate, useAction, useDb } from "@/domain/hooks";
import { advanceExpense, getPrd, issueCreditNote, recordExpense, type Expense } from "@/domain/prd";
import { useSession } from "@/domain/session";

const CATEGORIES: Expense["category"][] = ["Fuel", "Toll", "Repairs", "Parts", "Salaries", "Insurance", "Office", "Other"];

export const Route = createFileRoute("/app/expenses")({
  head: () => ({
    meta: [
      { title: "Expenses & Credit Notes — MarichiFleet" },
      { name: "description", content: "Operating expense ledger, vendor payables and credit notes raised against client invoices." },
      { property: "og:title", content: "Expenses & Credit Notes — MarichiFleet" },
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
  const { persona, can, approvalLimits } = useSession();

  const [category, setCategory] = useState<Expense["category"]>("Repairs");
  const [amount, setAmount] = useState(0);
  const [note, setNote] = useState("");
  const [vendorId, setVendorId] = useState<string>("none");

  const [invoiceId, setInvoiceId] = useState(db.invoices[0]?.id ?? "");
  const [cnAmount, setCnAmount] = useState(0);
  const [reason, setReason] = useState("");

  if (!can("expenses:read") && !can("view_finance")) {
    return <NoAccess what="expenses and credit notes" />;
  }

  const totals = useMemo(() => {
    const total = prd.expenses.reduce((s, e) => s + e.amount, 0);
    const unpaid = prd.expenses.filter((e) => e.status !== "paid").reduce((s, e) => s + e.amount, 0);
    const revenue = db.invoices.reduce((s, i) => s + i.total, 0);
    const credited = prd.creditNotes.reduce((s, c) => s + c.amount, 0);
    return { total, unpaid, revenue, credited, profit: revenue - credited - total };
  }, [prd.expenses, prd.creditNotes, db.invoices]);

  const vendorName = (id?: string) => extras.vendors.find((v) => v.id === id)?.name ?? "—";
  const invoiceRef = (id: string) => db.invoices.find((i) => i.id === id)?.ref ?? id;

  // Max expense approval limit in rupees
  const maxApprovalRupees = approvalLimits ? approvalLimits.expense / 100 : Infinity;

  return (
    <>
      <PageHeader
        title="Expenses & Credit Notes"
        subtitle="Operating costs, maintenance settlements, fuel disbursements, and credits against disputed invoices."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Expenses Booked</span>
          <div className="mt-2 text-2xl font-bold tracking-tight">
            <Amount value={toMoney(totals.total)} />
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">All cost categories</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Awaiting Payment</span>
          <div className="mt-2 text-2xl font-bold tracking-tight text-warning">
            <Amount value={toMoney(totals.unpaid)} />
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">Approved payables in queue</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Credit Notes</span>
          <div className="mt-2 text-2xl font-bold tracking-tight">
            <Amount value={toMoney(totals.credited)} />
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">{prd.creditNotes.length} credit notes issued</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Net Operating Margin</span>
          <div className={`mt-2 text-2xl font-bold tracking-tight ${totals.profit >= 0 ? "text-emerald-500" : "text-destructive"}`}>
            <Amount value={toMoney(totals.profit)} />
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">Billed revenue less credits & costs</p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel
          title="Record Operating Expense"
          description={
            approvalLimits?.expense
              ? `Your role approval limit: ₹${(approvalLimits.expense / 100).toLocaleString("en-IN")}`
              : "Direct cost entry into general ledger"
          }
        >
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
              <span className="mb-1 block text-xs text-muted-foreground">Vendor / Workshop</span>
              <Select value={vendorId} onValueChange={setVendorId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Direct expense (No vendor)</SelectItem>
                  {extras.vendors.map((v) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-xs text-muted-foreground">Amount (₹)</span>
              <Input type="number" min={0} value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-xs text-muted-foreground">Description / Voucher Note</span>
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Trip ref, fuel slip, parts info…" />
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

        <Panel title="Issue a Credit Note" description="Credits reduce the outstanding balance on the client invoice.">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm sm:col-span-2">
              <span className="mb-1 block text-xs text-muted-foreground">Target Invoice</span>
              <Select value={invoiceId} onValueChange={setInvoiceId}>
                <SelectTrigger><SelectValue placeholder="Select invoice" /></SelectTrigger>
                <SelectContent>
                  {db.invoices.map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.ref} · ₹{(i.total - i.paid).toLocaleString("en-IN")} outstanding
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-xs text-muted-foreground">Credit Amount (₹)</span>
              <Input type="number" min={0} value={cnAmount} onChange={(e) => setCnAmount(Number(e.target.value))} />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-xs text-muted-foreground">Reason for Credit</span>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Shortage, demurrage waiver, damage…" />
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
                  <p className="truncate font-medium">{c.reason}</p>
                </div>
                <Amount value={toMoney(c.amount)} className="font-semibold text-destructive shrink-0" />
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel className="mt-4" title="Expense & Disbursement Ledger">
        {prd.expenses.length === 0 ? (
          <EmptyState title="Nothing booked yet" message="Recorded expenses appear here with their approval status." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="py-2.5 pr-3">Date</th>
                  <th className="py-2.5 pr-3">Category</th>
                  <th className="py-2.5 pr-3">Description</th>
                  <th className="py-2.5 pr-3">Vendor</th>
                  <th className="py-2.5 pr-3">Amount</th>
                  <th className="py-2.5 pr-3">Status</th>
                  <th className="py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {prd.expenses.map((e) => {
                  const canAct = e.amount <= maxApprovalRupees;
                  return (
                    <tr key={e.id} className="hover:bg-surface/40 transition-colors">
                      <td className="py-2.5 pr-3 text-muted-foreground text-xs">{fmtDate(e.atISO)}</td>
                      <td className="py-2.5 pr-3">
                        <span className="rounded bg-surface px-1.5 py-0.5 text-xs font-medium">
                          {e.category}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3 font-medium">{e.note}</td>
                      <td className="py-2.5 pr-3 text-muted-foreground text-xs">{vendorName(e.vendorId)}</td>
                      <td className="numeric py-2.5 pr-3">
                        <Amount value={toMoney(e.amount)} className="font-medium" />
                      </td>
                      <td className="py-2.5 pr-3"><StatusBadge status={e.status} /></td>
                      <td className="py-2.5 text-right">
                        {e.status !== "paid" && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!canAct}
                            title={!canAct ? `Amount exceeds your approval limit of ₹${maxApprovalRupees.toLocaleString("en-IN")}` : undefined}
                            onClick={() => run(() => advanceExpense(e.id, persona.name), "Expense updated.")}
                          >
                            {e.status === "recorded" ? "Approve" : "Mark paid"}
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}
