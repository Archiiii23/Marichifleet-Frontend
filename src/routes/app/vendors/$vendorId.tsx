import { createFileRoute, Link } from "@tanstack/react-router";
import { Metric, PageHeader, Panel, StatusBadge } from "@/components/mf/primitives";
import { Button } from "@/components/ui/button";
import { getExtras } from "@/domain/extras";
import { fmtDate, money, useDb } from "@/domain/hooks";
import { getPrd } from "@/domain/prd";

export const Route = createFileRoute("/app/vendors/$vendorId")({
  head: () => ({ meta: [
    { title: "Vendor detail — MarichiFleet" },
    { name: "description", content: "Vendor purchase orders, spend, payables, contacts and performance." },
    { property: "og:title", content: "Vendor detail — MarichiFleet" },
    { property: "og:description", content: "Supplier performance, purchasing history and outstanding payables." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: VendorDetail,
});

function VendorDetail() {
  useDb();
  const { vendorId } = Route.useParams();
  const extras = getExtras();
  const prd = getPrd();
  const vendor = extras.vendors.find((v) => v.id === vendorId);
  if (!vendor) return <PageHeader title="Vendor not found" breadcrumb={[{ label: "Vendors", to: "/app/vendors" }]} />;
  const orders = prd.purchaseOrders.filter((p) => p.vendorId === vendor.id);
  const expenses = prd.expenses.filter((e) => e.vendorId === vendor.id);
  const committed = orders.filter((p) => p.status === "draft" || p.status === "sent").reduce((s, p) => s + p.total, 0);
  const unpaid = expenses.filter((e) => e.status !== "paid").reduce((s, e) => s + e.amount, 0);
  return <>
    <PageHeader title={vendor.name} subtitle={`${vendor.kind} · ${vendor.city}`} breadcrumb={[{ label: "Vendors", to: "/app/vendors" }, { label: vendor.name }]} actions={<Button asChild size="sm"><Link to="/app/purchase-orders">Raise purchase order</Link></Button>} />
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Panel title="Contact"><Metric label="Contact person" value={vendor.contact} /><p className="numeric mt-2 text-sm text-muted-foreground">{vendor.phone}</p></Panel>
      <Panel title="Performance"><Metric label="Supplier rating" value={`${vendor.rating.toFixed(1)} / 5`} /><p className="mt-2 text-sm text-muted-foreground">Operational quality score</p></Panel>
      <Panel title="Spend"><Metric label="Year to date" value={money(vendor.spendYtd)} /><p className="mt-2 text-sm text-muted-foreground">{orders.length} purchase orders</p></Panel>
      <Panel title="Exposure"><Metric label="Open commitment" value={money(committed + unpaid)} tone={committed + unpaid ? "warning" : undefined} /><p className="mt-2 text-sm text-muted-foreground">Orders plus unpaid expenses</p></Panel>
    </div>
    <div className="mt-4 grid gap-4 lg:grid-cols-2">
      <Panel title="Purchase orders">
        <ul className="divide-y divide-border">{orders.map((po) => <li key={po.id} className="flex items-center gap-3 py-3 text-sm"><span className="numeric font-medium">{po.ref}</span><span className="text-muted-foreground">{fmtDate(po.raisedISO)}</span><span className="numeric ml-auto">{money(po.total)}</span><StatusBadge status={po.status} /></li>)}{orders.length === 0 && <li className="py-8 text-center text-sm text-muted-foreground">No purchase orders for this vendor.</li>}</ul>
      </Panel>
      <Panel title="Payables and expenses">
        <ul className="divide-y divide-border">{expenses.map((expense) => <li key={expense.id} className="flex items-center gap-3 py-3 text-sm"><div><p>{expense.note}</p><p className="text-xs text-muted-foreground">{expense.category} · {fmtDate(expense.atISO)}</p></div><span className="numeric ml-auto">{money(expense.amount)}</span><StatusBadge status={expense.status} /></li>)}{expenses.length === 0 && <li className="py-8 text-center text-sm text-muted-foreground">No expenses booked to this vendor.</li>}</ul>
      </Panel>
    </div>
  </>;
}