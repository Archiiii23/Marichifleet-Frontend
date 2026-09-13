import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { MessageSquare, PhoneCall, Send, TrendingDown } from "lucide-react";
import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { KpiCard, NoAccess, PageHeader, Panel, StatusBadge } from "@/components/mf/primitives";
import { Amount, toMoney } from "@/components/mf/amount";
import { Button } from "@/components/ui/button";
import { fmtDate, inr, inrCompact, useAction, useDb } from "@/domain/hooks";
import { useSession } from "@/domain/session";
import { clientName, invoiceOutstanding, isOverdue, sendInvoice } from "@/domain/store";

export const Route = createFileRoute("/app/finance/receivables")({
  head: () => ({
    meta: [
      { title: "Receivables — MarichiFleet" },
      { name: "description", content: "Ageing buckets, client exposure and collection follow-ups." },
      { property: "og:title", content: "Receivables — MarichiFleet" },
      { property: "og:description", content: "Ageing buckets, client exposure and collection follow-ups." },
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

  if (!can("finance:read") && !can("view_finance")) {
    return (
      <>
        <PageHeader title="Receivables" />
        <NoAccess what="finance data" />
      </>
    );
  }

  const totalMinor = open.reduce((s, i) => s + invoiceOutstanding(i) * 100, 0);
  const overdue = open.filter(isOverdue);
  const overdueMinor = overdue.reduce((s, i) => s + invoiceOutstanding(i) * 100, 0);

  return (
    <>
      <PageHeader
        title="Receivables"
        subtitle="Where working capital is committed, DSO ageing buckets, and prioritized collection follow-ups."
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Outstanding</span>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight">
            <Amount value={{ minor: totalMinor, currency: "INR" }} />
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">{open.length} active invoices</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Overdue Balance</span>
            <span className="size-2 rounded-full bg-destructive" aria-hidden />
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-destructive">
            <Amount value={{ minor: overdueMinor, currency: "INR" }} />
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">{overdue.length} invoices past due</p>
        </div>

        <KpiCard label="Clients with balance" value={String(byClient.length)} hint="Active credit exposure" />
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Average Ticket</span>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight">
            <Amount value={{ minor: open.length ? Math.round(totalMinor / open.length) : 0, currency: "INR" }} />
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">Per open invoice</p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Panel title="DSO Ageing Buckets" description="Outstanding receivables grouped by days past contractual due date">
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

        <Panel title="Client Credit Exposure" description="Ranked by total outstanding balance">
          <ul className="max-h-64 space-y-2 overflow-y-auto pr-1">
            {byClient.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 text-sm border-b border-border/40 pb-2">
                <span className="truncate font-medium">{c.name}</span>
                <Amount value={toMoney(c.amt)} className="font-semibold" />
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel className="mt-4" title="Collection Queue" description="Oldest dues first — 1-tap WhatsApp reminders">
        <ul className="space-y-2">
          {[...open]
            .sort((a, b) => new Date(a.dueISO).getTime() - new Date(b.dueISO).getTime())
            .slice(0, 15)
            .map((i) => {
              const daysOverdue = Math.floor((Date.now() - new Date(i.dueISO).getTime()) / 86400_000);
              return (
                <li key={i.id} className="flex flex-wrap items-center gap-3 rounded-md border border-border p-3 transition-colors hover:bg-surface/50">
                  <span className="numeric text-sm font-medium">{i.ref}</span>
                  <span className="text-sm font-medium">{clientName(i.clientId)}</span>
                  <span className="text-xs text-muted-foreground">due {fmtDate(i.dueISO)}</span>
                  {daysOverdue > 0 && (
                    <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-semibold text-destructive">
                      {daysOverdue}d overdue
                    </span>
                  )}
                  <div className="ml-auto">
                    <Amount value={toMoney(invoiceOutstanding(i))} className="font-semibold" />
                  </div>
                  <StatusBadge status={isOverdue(i) ? "overdue" : i.status} />
                  {(can("billing:finalise") || can("edit_finance")) && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => run(() => sendInvoice(i.id, persona.name), "Collection reminder dispatched on WhatsApp & SMS")}
                    >
                      <MessageSquare className="size-3.5 text-emerald-500" />
                      Remind
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => navigate({ to: "/app/finance/invoices/$invoiceId", params: { invoiceId: i.id } })}
                  >
                    Open
                  </Button>
                </li>
              );
            })}
        </ul>
      </Panel>
    </>
  );
}
