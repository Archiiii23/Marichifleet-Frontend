import { createFileRoute, Link } from "@tanstack/react-router";
import { Star } from "lucide-react";
import { useState } from "react";
import { EmptyState, KpiCard, PageHeader, Panel } from "@/components/mf/primitives";
import { Input } from "@/components/ui/input";
import { getExtras } from "@/domain/extras";
import { inr, inrCompact, useDb } from "@/domain/hooks";

export const Route = createFileRoute("/app/vendors")({
  head: () => ({
    meta: [
      { title: "Vendors & partners — MarichiFleet" },
      { name: "description", content: "Garages, fuel stations, tyre and parts suppliers with spend, ratings and payables." },
      { property: "og:title", content: "Vendors & partners — MarichiFleet" },
      { property: "og:description", content: "Vendor spend, ratings and outstanding payables in one register." },
    ],
  }),
  component: Vendors,
});

function Vendors() {
  useDb();
  const extras = getExtras();
  const [query, setQuery] = useState("");
  const list = extras.vendors.filter((v) =>
    `${v.name} ${v.kind} ${v.city}`.toLowerCase().includes(query.toLowerCase()),
  );
  const spend = extras.vendors.reduce((s, v) => s + v.spendYtd, 0);
  const payable = extras.vendors.reduce((s, v) => s + v.payable, 0);

  return (
    <>
      <PageHeader
        title="Vendors & partners"
        subtitle="Garages, fuel points, tyre and parts suppliers, partner transporters and insurers."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Vendors" value={String(extras.vendors.length)} hint="Active relationships" />
        <KpiCard label="Spend YTD" value={inrCompact(spend)} hint="All categories" />
        <KpiCard label="Payables" value={inrCompact(payable)} tone={payable > 0 ? "warning" : "neutral"} hint="Awaiting settlement" />
        <KpiCard
          label="Avg rating"
          value={(extras.vendors.reduce((s, v) => s + v.rating, 0) / (extras.vendors.length || 1)).toFixed(1)}
          hint="Out of 5"
        />
      </div>

      <Panel
        className="mt-4"
        title="Vendor register"
        actions={
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search vendor or city"
            className="h-8 w-52"
            aria-label="Search vendors"
          />
        }
      >
        {list.length === 0 ? (
          <EmptyState title="No vendors match" message="Try another name, category or city." />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {list.map((v) => (
              <article key={v.id} className="rounded-lg border border-border bg-surface p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-display text-sm font-semibold">{v.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {v.kind} · {v.city}
                    </p>
                  </div>
                  <span className="flex items-center gap-1 text-xs text-warning">
                    <Star className="size-3.5" aria-hidden /> {v.rating.toFixed(1)}
                  </span>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <dt className="text-muted-foreground">Contact</dt>
                    <dd>{v.contact}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Phone</dt>
                    <dd className="numeric">{v.phone}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Spend YTD</dt>
                    <dd className="numeric">{inr(v.spendYtd)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Payable</dt>
                    <dd className={v.payable > 0 ? "numeric text-warning" : "numeric"}>{inr(v.payable)}</dd>
                  </div>
                </dl>
                <Button asChild size="sm" variant="outline" className="mt-3 w-full">
                  <Link to="/app/vendors/$vendorId" params={{ vendorId: v.id }}>Open vendor</Link>
                </Button>
              </article>
            ))}
          </div>
        )}
      </Panel>
    </>
  );
}
