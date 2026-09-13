import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, KpiCard, NoAccess, PageHeader, Panel } from "@/components/mf/primitives";
import { Amount } from "@/components/mf/amount";
import { deriveLedger } from "@/domain/os/ops";
import { fmtDate, useDb } from "@/domain/hooks";
import { useSession } from "@/domain/session";

export const Route = createFileRoute("/app/ledger")({
  head: () => ({
    meta: [
      { title: "Ledger — MarichiFleet" },
      { name: "description", content: "Append-only double-entry ledger: every posting traces back to the document that caused it." },
      { property: "og:title", content: "Ledger — MarichiFleet" },
      { property: "og:description", content: "Balances, trial balance and postings for the transport business." },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Ledger,
});

function Ledger() {
  const db = useDb();
  const { can } = useSession();
  const [q, setQ] = useState("");
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const entries = useMemo(() => deriveLedger(db), [db]);

  if (!can("ledger:read") && !can("view_finance")) {
    return <NoAccess what="the general ledger" />;
  }

  const filtered = entries.filter((e) => {
    if (selectedAccount && e.account !== selectedAccount) return false;
    if (!q) return true;
    return `${e.narration} ${e.account} ${e.source}`.toLowerCase().includes(q.toLowerCase());
  });

  const balances = new Map<string, number>();
  for (const e of entries) {
    balances.set(e.account, (balances.get(e.account) ?? 0) + (e.debitMinor - e.creditMinor));
  }

  const debitsMinor = entries.reduce((s, e) => s + e.debitMinor, 0);
  const creditsMinor = entries.reduce((s, e) => s + e.creditMinor, 0);
  const diffMinor = debitsMinor - creditsMinor;

  return (
    <>
      <PageHeader
        title="General Ledger"
        subtitle="Double-entry postings are append-only. Financial records cannot be mutated or deleted — corrections are new journal entries."
        actions={
          <Button size="sm" variant="outline">
            Export Trial Balance
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-4">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Debits</span>
          <div className="mt-2 text-2xl font-bold tracking-tight">
            <Amount value={{ minor: debitsMinor, currency: "INR" }} />
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">{entries.length} validated postings</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Credits</span>
          <div className="mt-2 text-2xl font-bold tracking-tight">
            <Amount value={{ minor: creditsMinor, currency: "INR" }} />
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">Balanced trial entries</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Net Difference</span>
            <span className={`size-2 rounded-full ${diffMinor === 0 ? "bg-emerald-500" : "bg-warning"}`} aria-hidden />
          </div>
          <div className={`mt-2 text-2xl font-bold tracking-tight ${diffMinor === 0 ? "text-emerald-500" : "text-warning"}`}>
            <Amount value={{ minor: diffMinor, currency: "INR" }} />
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {diffMinor === 0 ? "Perfect balance (Trial Balance = 0)" : "Pending reconciliation batch"}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,300px)_1fr]">
        <Panel
          title="Account Balances"
          description="Click to filter ledger"
          actions={
            selectedAccount ? (
              <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => setSelectedAccount(null)}>
                Clear
              </Button>
            ) : null
          }
        >
          <ul className="divide-y divide-border">
            {Array.from(balances.entries()).map(([acct, balMinor]) => (
              <li key={acct}>
                <button
                  onClick={() => setSelectedAccount(selectedAccount === acct ? null : acct)}
                  className={`w-full flex items-center justify-between gap-2 py-2.5 px-2 text-sm rounded transition-colors text-left ${
                    selectedAccount === acct ? "bg-surface font-medium" : "hover:bg-surface/60"
                  }`}
                >
                  <span className="text-muted-foreground truncate">{acct}</span>
                  <Amount value={{ minor: balMinor, currency: "INR" }} className="font-mono font-medium" />
                </button>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel
          title="Journal Postings"
          description={selectedAccount ? `Filtered by ${selectedAccount} (${filtered.length} entries)` : `${filtered.length} entries`}
          actions={
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search narration, account or ref…"
              className="h-8 w-64"
            />
          }
        >
          {filtered.length === 0 ? (
            <EmptyState title="No matching postings" message="Nothing matches this search in the selected account or period." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="py-2.5 pr-3 font-semibold">Date</th>
                    <th className="py-2.5 pr-3 font-semibold">Narration & Document</th>
                    <th className="py-2.5 pr-3 font-semibold">Account</th>
                    <th className="py-2.5 pr-3 text-right font-semibold">Debit</th>
                    <th className="py-2.5 text-right font-semibold">Credit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filtered.slice(0, 120).map((e) => (
                    <tr key={e.id} className="hover:bg-surface/40 transition-colors">
                      <td className="numeric py-2.5 pr-3 text-xs text-muted-foreground">{fmtDate(e.atISO)}</td>
                      <td className="py-2.5 pr-3">
                        {e.sourceLink ? (
                          <Link to={e.sourceLink as "/"} className="font-medium text-foreground hover:text-primary transition-colors">
                            {e.narration}
                          </Link>
                        ) : (
                          <span className="font-medium">{e.narration}</span>
                        )}
                        <span className="block text-[11px] font-mono text-muted-foreground">{e.source}</span>
                      </td>
                      <td className="py-2.5 pr-3">
                        <span className="rounded bg-surface px-1.5 py-0.5 text-xs font-mono text-muted-foreground">
                          {e.account}
                        </span>
                      </td>
                      <td className="numeric py-2.5 pr-3 text-right">
                        {e.debitMinor ? <Amount value={{ minor: e.debitMinor, currency: "INR" }} className="font-mono" /> : "—"}
                      </td>
                      <td className="numeric py-2.5 text-right">
                        {e.creditMinor ? <Amount value={{ minor: e.creditMinor, currency: "INR" }} className="font-mono text-muted-foreground" /> : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}
