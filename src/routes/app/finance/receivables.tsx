import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { KpiCard, NoAccess, PageHeader, Panel, StatusBadge } from "@/components/mf/primitives";
import { Button } from "@/components/ui/button";
import { fmtDate, inr, inrCompact, useAction, useDb } from "@/domain/hooks";
import { useSession } from "@/domain/session";
import { clientName, invoiceOutstanding, isOverdue, sendInvoice } from "@/domain/store";

export const Route = createFileRoute("/app/finance/receivables")({
  head: () => ({
    meta: [
      { title: "Receivables — MarichiFleet" },
      { name: "description", content: "Ageing buckets, client exposure and collection follow-ups." },
    ],
  }),
  component: Receivables,
});

const BUCKETS = [
  { id: "current", label: "Not due", min: -9999, max: 0 },
  { id: "b30", label: "1–30 days", min: 1, max: 30 },
  { id: "b60", label: "31–60 days", min: 31, max: 60 },
  { id: "b90", label: "60+ days", min: 61, max: 99999 },
];

function Receivables() {
  const db = useDb();
  const run = useAction();
  const navigate = useNavigate();
  const { persona, can } = useSession();

  const open = db.invoices.filter((i) => invoiceOutstanding(i) > 0 && i.status !== "cancelled" && i.status !== "draft");

  const ageing = useMemo(
    () =>
      BUCKETS.map((b) => {
        const rows = open.filter((i) => {
          const days = Math.floor((Date.now() - new Date(i.dueISO).getTime()) / 86400_000);
          return days >= b.min && days <= b.max;
        });
        return { bucket: b.label, amount: rows.reduce((s, i) => s + invoiceOutstanding(i), 0), count: rows.length };
      }),
    [open],
  );

  const byClient = useMemo(() => {
    const m = new Map<string, number>();
    open.forEach((i) => m.set(i.clientId, (m.get(i.clientId) ?? 0) + invoiceOutstanding(i)));
    return [...m.entries()].map(([id, amt]) => ({ id, name: clientName(id), amt })).sort((a, b) => b.amt - a.amt);
  }, [open]);

  if (!can("view_finance")) {
    return (
      <>
        <PageHeader title="Receivables" />
        <NoAccess what="finance data" />
      </>
    );
  }

  const total = open.reduce((s, i) => s + invoiceOutstanding(i), 0);
  const overdue = open.filter(isOverdue);

  return (
    <>
      <PageHeader title="Receivables" subtitle="Where the cash is stuck, and who to chase first." />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total outstanding" value={inrCompact(total)} hint={`${open.length} open invoices`} />
        <KpiCard label="Overdue" value={inrCompact(overdue.reduce((s, i) => s + invoiceOutstanding(i), 0))} hint={`${overdue.length} invoices past due`} tone="danger" />
        <KpiCard label="Clients with balance" value={String(byClient.length)} hint="Active credit exposure" />
        <KpiCard label="Average ticket" value={inrCompact(open.length ? total / open.length : 0)} hint="Per open invoice" />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Panel title="Ageing" description="Outstanding by days past due">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ageing} margin={{ left: -10, right: 8 }}>
                <CartesianGrid stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="bucket" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v) => inrCompact(Number(v))} tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} width={70} />
                <Tooltip
                  formatter={(v) => inr(Number(v))}
                  contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }}
                />
                <Bar dataKey="amount" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Client exposure" description="Largest balances first">
          <ul className="max-h-64 space-y-2 overflow-y-auto pr-1">
            {byClient.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate">{c.name}</span>
                <span className="numeric">{inr(c.amt)}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel className="mt-4" title="Collection list" description="Oldest dues first">
        <ul className="space-y-2">
          {[...open]
            .sort((a, b) => new Date(a.dueISO).getTime() - new Date(b.dueISO).getTime())
            .slice(0, 15)
            .map((i) => (
              <li key={i.id} className="flex flex-wrap items-center gap-3 rounded-md border border-border p-3">
                <span className="numeric text-sm font-medium">{i.ref}</span>
                <span className="text-sm">{clientName(i.clientId)}</span>
                <span className="text-xs text-muted-foreground">due {fmtDate(i.dueISO)}</span>
                <span className="numeric ml-auto text-sm">{inr(invoiceOutstanding(i))}</span>
                <StatusBadge status={isOverdue(i) ? "overdue" : i.status} />
                {can("edit_finance") && (
                  <Button size="sm" variant="outline" onClick={() => run(() => sendInvoice(i.id, persona.name), "Reminder sent on WhatsApp")}>
                    Send reminder
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => navigate({ to: "/app/finance/invoices/$invoiceId", params: { invoiceId: i.id } })}>
                  Open
                </Button>
              </li>
            ))}
        </ul>
      </Panel>
    </>
  );
}
