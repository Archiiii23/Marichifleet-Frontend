import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { EmptyState, KpiCard, PageHeader, Panel, StatusBadge } from "@/components/mf/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { getExtras } from "@/domain/extras";
import { fmtDate, money, moneyCompact, useAction, useDb } from "@/domain/hooks";
import {
  cancelPurchaseOrder, getPrd, raisePurchaseOrder, receivePurchaseOrder, sendPurchaseOrder,
} from "@/domain/prd";
import { useSession } from "@/domain/session";

export const Route = createFileRoute("/app/purchase-orders")({
  head: () => ({
    meta: [
      { title: "Purchase orders — MarichiFleet" },
      { name: "description", content: "Raise purchase orders on vendors, send them out and receive parts into stock at weighted average cost." },
      { property: "og:title", content: "Purchase orders — MarichiFleet" },
      { property: "og:description", content: "Vendor purchase orders from raise to goods receipt." },
    ],
  }),
  component: PurchaseOrders,
});

function PurchaseOrders() {
  useDb();
  const prd = getPrd();
  const extras = getExtras();
  const run = useAction();
  const { persona } = useSession();

  const lowStock = extras.parts.filter((p) => p.stock <= p.reorderLevel);
  const [vendorId, setVendorId] = useState(extras.vendors[0]?.id ?? "");
  const [partId, setPartId] = useState(lowStock[0]?.id ?? extras.parts[0]?.id ?? "");
  const [qty, setQty] = useState(10);
  const [note, setNote] = useState("");

  const open = prd.purchaseOrders.filter((p) => p.status === "draft" || p.status === "sent");
  const committed = open.reduce((s, p) => s + p.total, 0);

  const partName = (id: string) => extras.parts.find((p) => p.id === id)?.name ?? "Part";
  const vendorName = (id: string) => extras.vendors.find((v) => v.id === id)?.name ?? "Vendor";

  return (
    <>
      <PageHeader
        title="Purchase orders"
        subtitle="Raise orders against low stock or job cards, then receive goods so inventory and average cost stay accurate."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Open orders" value={String(open.length)} hint="Draft and sent" />
        <KpiCard label="Committed spend" value={moneyCompact(committed)} hint="Not yet received" />
        <KpiCard label="Below reorder level" value={String(lowStock.length)} tone={lowStock.length ? "warning" : "success"} hint="Parts needing replenishment" to="/app/inventory" />
        <KpiCard label="Received this period" value={String(prd.purchaseOrders.filter((p) => p.status === "received").length)} hint="Goods receipts logged" />
      </div>

      <Panel className="mt-4" title="Raise a purchase order" description="Prices default to the current catalogue cost for the part.">
        <div className="grid gap-3 md:grid-cols-5">
          <label className="text-sm">
            <span className="mb-1 block text-xs text-muted-foreground">Vendor</span>
            <Select value={vendorId} onValueChange={setVendorId}>
              <SelectTrigger><SelectValue placeholder="Vendor" /></SelectTrigger>
              <SelectContent>
                {extras.vendors.map((v) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </label>
          <label className="text-sm md:col-span-2">
            <span className="mb-1 block text-xs text-muted-foreground">Part</span>
            <Select value={partId} onValueChange={setPartId}>
              <SelectTrigger><SelectValue placeholder="Part" /></SelectTrigger>
              <SelectContent>
                {extras.parts.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} · {p.stock} in stock
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs text-muted-foreground">Quantity</span>
            <Input type="number" min={1} value={qty} onChange={(e) => setQty(Number(e.target.value))} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs text-muted-foreground">Note</span>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason for the order" />
          </label>
        </div>
        <Button
          className="mt-3"
          size="sm"
          onClick={() => {
            const res = run(() => raisePurchaseOrder(vendorId, partId, qty, note, persona.name), "Purchase order raised as draft.");
            if (res.ok) setNote("");
          }}
        >
          Raise purchase order
        </Button>
      </Panel>

      <Panel className="mt-4" title="Order book">
        {prd.purchaseOrders.length === 0 ? (
          <EmptyState title="No purchase orders yet" message="Raise your first order above and it will appear here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="py-2 pr-3">Order</th>
                  <th className="py-2 pr-3">Vendor</th>
                  <th className="py-2 pr-3">Items</th>
                  <th className="py-2 pr-3">Value</th>
                  <th className="py-2 pr-3">Raised</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {prd.purchaseOrders.map((po) => (
                  <tr key={po.id} className="border-b border-border/60 align-top">
                    <td className="numeric py-2.5 pr-3">{po.ref}</td>
                    <td className="py-2.5 pr-3">{vendorName(po.vendorId)}</td>
                    <td className="py-2.5 pr-3 text-muted-foreground">
                      {po.lines.map((l) => `${l.qty} × ${partName(l.partId)}`).join(", ")}
                    </td>
                    <td className="numeric py-2.5 pr-3">{money(po.total)}</td>
                    <td className="py-2.5 pr-3 text-muted-foreground">{fmtDate(po.raisedISO)}</td>
                    <td className="py-2.5 pr-3"><StatusBadge status={po.status} /></td>
                    <td className="py-2.5">
                      <div className="flex flex-wrap gap-1.5">
                        {po.status === "draft" && (
                          <Button size="sm" variant="outline" onClick={() => run(() => sendPurchaseOrder(po.id, persona.name), `${po.ref} sent to the vendor.`)}>
                            Send
                          </Button>
                        )}
                        {po.status === "sent" && (
                          <Button size="sm" onClick={() => run(() => receivePurchaseOrder(po.id, persona.name), `${po.ref} received into stock.`)}>
                            Receive
                          </Button>
                        )}
                        {po.status !== "received" && po.status !== "cancelled" && (
                          <Button size="sm" variant="ghost" onClick={() => run(() => cancelPurchaseOrder(po.id, persona.name), `${po.ref} cancelled.`)}>
                            Cancel
                          </Button>
                        )}
                        {po.status === "received" && po.receivedISO && (
                          <span className="text-xs text-muted-foreground">Received {fmtDate(po.receivedISO)}</span>
                        )}
                      </div>
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
