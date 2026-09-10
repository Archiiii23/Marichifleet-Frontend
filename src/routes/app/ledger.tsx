import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, KpiCard, PageHeader, Panel } from "@/components/mf/primitives";
import { deriveLedger } from "@/domain/os/ops";
import { useDb, money, fmtDate } from "@/domain/hooks";
import { NoAccess } from "@/components/mf/primitives";
import { useSession } from "@/domain/session";

export const Route = createFileRoute("/app/ledger")({
  head: () => ({
    meta: [
      { title: "Ledger — MarichiFleet" },
      { name: "description", content: "Append-only double-entry ledger: every posting traces back to the document that caused it." },
      { property: "og:title", content: "Ledger — MarichiFleet" },
      { property: "og:description", content: "Balances, trial balance and postings for the transport business." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Ledger,
});

function Ledger() {
  const db = useDb();
  const { can } = useSession();
  const [q, setQ] = useState("");
  const entries = useMemo(() => deriveLedger(db), [db]);

  if (!can("view_finance")) return <NoAccess what="the ledger" />;

  const filtered = entries.filter(
    (e) => !q || `${e.narration} ${e.account} ${e.source}`.toLowerCase().includes(q.toLowerCase()),
  );

  const balances = new Map<string, number>();
  for (const e of entries) {
    balances.set(e.account, (balances.get(e.account) ?? 0) + (e.debitMinor - e.creditMinor) / 100);
  }
  const debits = entries.reduce((s, e) => s + e.debitMinor, 0) / 100;
  const credits = entries.reduce((s, e) => s + e.creditMinor, 0) / 100;

  return (
    <>
      <PageHeader
        title="Ledger"
        subtitle="Postings are append-only. Nothing financial is edited or deleted — corrections are new entries."
        actions={<Button size="sm" variant="outline">Export period</Button>}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard label="Total debits" value={money(debits)} hint={`${entries.length} postings`} />
        <KpiCard label="Total credits" value={money(credits)} hint="Trial balance" />
        <KpiCard
          label="Difference"
          value={money(debits - credits)}
          hint={Math.round(debits - credits) === 0 ? "Balanced" : "Unbalanced — open items pending"}
          tone={Math.round(debits - credits) === 0 ? "success" : "warning"}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,300px)_1fr]">
        <Panel title="Balances" description="By account">
          <ul className="divide-y divide-border">
            {Array.from(balances.entries()).map(([acct, bal]) => (
              <li key={acct} className="flex items-center justify-between gap-2 py-2 text-sm">
                <span className="text-muted-foreground">{acct}</span>
                <span className="numeric font-medium">{money(bal)}</span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel
          title="Postings"
          description={`${filtered.length} entries`}
          actions={
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search narration, account or source"
              className="h-8 w-56"
            />
          }
        >
          {filtered.length === 0 ? (
            <EmptyState title="No matching postings" message="Nothing matches this search in the current period." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">Date</th>
                    <th className="py-2 pr-3 font-medium">Narration</th>
                    <th className="py-2 pr-3 font-medium">Account</th>
                    <th className="py-2 pr-3 text-right font-medium">Debit</th>
                    <th className="py-2 text-right font-medium">Credit</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(0, 120).map((e) => (
                    <tr key={e.id} className="border-b border-border/60">
                      <td className="numeric py-2 pr-3 text-xs text-muted-foreground">{fmtDate(e.atISO)}</td>
                      <td className="py-2 pr-3">
                        {e.sourceLink ? (
                          <Link to={e.sourceLink as "/"} className="hover:text-primary">
                            {e.narration}
                          </Link>
                        ) : (
                          e.narration
                        )}
                      </td>
                      <td className="py-2 pr-3 text-muted-foreground">{e.account}</td>
                      <td className="numeric py-2 pr-3 text-right">{e.debitMinor ? money(e.debitMinor / 100) : "—"}</td>
                      <td className="numeric py-2 text-right">{e.creditMinor ? money(e.creditMinor / 100) : "—"}</td>
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
