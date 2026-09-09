import { createFileRoute } from "@tanstack/react-router";
import { PackageSearch } from "lucide-react";
import { useState } from "react";
import { EmptyState, KpiCard, PageHeader, Panel, StatusBadge } from "@/components/mf/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getExtras, issueStock, receiveStock } from "@/domain/extras";
import { fmtDateTime, inr, inrCompact, useAction, useDb } from "@/domain/hooks";
import { useSession } from "@/domain/session";

export const Route = createFileRoute("/app/inventory")({
  head: () => ({
    meta: [
      { title: "Spare parts inventory — MarichiFleet" },
      { name: "description", content: "Parts catalogue, stock on hand, reorder alerts and issue-to-job-card movements." },
      { property: "og:title", content: "Spare parts inventory — MarichiFleet" },
      { property: "og:description", content: "Stock on hand, reorder alerts and workshop part issues." },
    ],
  }),
  component: Inventory,
});

function Inventory() {
  useDb();
  const extras = getExtras();
  const run = useAction();
  const { persona, can } = useSession();
  const editable = can("edit_workshop") || can("edit_fleet");

  const [partId, setPartId] = useState(extras.parts[0]?.id ?? "");
  const [qty, setQty] = useState("1");
  const [ref, setRef] = useState("");
  const [query, setQuery] = useState("");

  const list = extras.parts.filter((p) =>
    `${p.name} ${p.sku} ${p.category}`.toLowerCase().includes(query.toLowerCase()),
  );
  const low = extras.parts.filter((p) => p.stock <= p.reorderLevel);
  const value = extras.parts.reduce((s, p) => s + p.stock * p.unitCost, 0);

  const submit = (kind: "receive" | "issue") => {
    const n = Number(qty);
    run(
      () => (kind === "receive" ? receiveStock(partId, n, ref, persona.name) : issueStock(partId, n, ref, persona.name)),
      kind === "receive" ? "Stock received" : "Parts issued",
    );
    setQty("1");
    setRef("");
  };

  return (
    <>
      <PageHeader
        title="Spare parts inventory"
        subtitle="Stock on hand, reorder alerts and every movement between the store and the workshop."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Line items" value={String(extras.parts.length)} hint="Active catalogue" />
        <KpiCard label="Stock value" value={inrCompact(value)} hint="At last purchase cost" />
        <KpiCard label="Below reorder" value={String(low.length)} tone="warning" hint="Raise a purchase order" />
        <KpiCard label="Movements" value={String(extras.movements.length)} hint="Receipts and issues logged" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_340px]">
        <Panel
          title="Parts catalogue"
          description="Stock below the reorder level is flagged."
          actions={
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search part or SKU"
              className="h-8 w-48"
              aria-label="Search parts"
            />
          }
        >
          {list.length === 0 ? (
            <EmptyState icon={PackageSearch} title="No parts match" message="Try a different part name, SKU or category." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="py-2 pr-3">Part</th>
                    <th className="py-2 pr-3">SKU</th>
                    <th className="py-2 pr-3">Location</th>
                    <th className="py-2 pr-3 text-right">Unit cost</th>
                    <th className="py-2 pr-3 text-right">Stock</th>
                    <th className="py-2">State</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((p) => (
                    <tr key={p.id} className="border-b border-border/60 last:border-0">
                      <td className="py-2 pr-3">
                        <span className="block font-medium">{p.name}</span>
                        <span className="text-xs text-muted-foreground">{p.category}</span>
                      </td>
                      <td className="numeric py-2 pr-3 text-xs">{p.sku}</td>
                      <td className="py-2 pr-3 text-xs text-muted-foreground">{p.location}</td>
                      <td className="numeric py-2 pr-3 text-right">{inr(p.unitCost)}</td>
                      <td className="numeric py-2 pr-3 text-right">
                        {p.stock}
                        <span className="text-xs text-muted-foreground"> / {p.reorderLevel}</span>
                      </td>
                      <td className="py-2">
                        <StatusBadge status={p.stock <= p.reorderLevel ? "critical" : "available"} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <div className="space-y-4">
          <Panel title="Stock movement" description="Issue parts to a job card or record a goods receipt.">
            {editable ? (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Part</Label>
                  <Select value={partId} onValueChange={setPartId}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select part" />
                    </SelectTrigger>
                    <SelectContent>
                      {extras.parts.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} ({p.stock})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Quantity</Label>
                    <Input className="mt-1" value={qty} inputMode="numeric" onChange={(e) => setQty(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">Reference</Label>
                    <Input className="mt-1" value={ref} onChange={(e) => setRef(e.target.value)} placeholder="JC-431" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1" onClick={() => submit("issue")}>
                    Issue to job card
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => submit("receive")}>
                    Receive stock
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Your role can view stock but not move it. Switch to the workshop persona to issue or receive parts.
              </p>
            )}
          </Panel>

          <Panel title="Recent movements">
            {extras.movements.length === 0 ? (
              <EmptyState title="No movements yet" message="Issues and receipts will appear here." />
            ) : (
              <ul className="space-y-2">
                {extras.movements.slice(0, 12).map((m) => {
                  const p = extras.parts.find((x) => x.id === m.partId);
                  return (
                    <li key={m.id} className="rounded-md border border-border p-2.5 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">{p?.name ?? "Part"}</span>
                        <StatusBadge status={m.kind === "receive" ? "valid" : "in_progress"} />
                      </div>
                      <p className="mt-1 text-muted-foreground">
                        {m.kind === "receive" ? "+" : "−"}
                        {m.qty} · {m.ref} · {fmtDateTime(m.atISO)}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
