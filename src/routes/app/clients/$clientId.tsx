import { createFileRoute, Link } from "@tanstack/react-router";
import { Calculator, CreditCard, FileSpreadsheet, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { Metric, PageHeader, Panel, StatusBadge } from "@/components/mf/primitives";
import { Amount, toMoney } from "@/components/mf/amount";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fmtDate, useDb } from "@/domain/hooks";
import { invoiceOutstanding } from "@/domain/store";
import type { Vehicle } from "@/domain/types";

export const Route = createFileRoute("/app/clients/$clientId")({
  head: () => ({
    meta: [
      { title: "Client Account — MarichiFleet" },
      { name: "description", content: "Booking history, rate card and receivables for one customer." },
      { property: "og:title", content: "Client account — MarichiFleet" },
      { property: "og:description", content: "Client bookings, commercial terms, billing history and credit exposure." },
    ],
  }),
  component: ClientDetail,
});

function ClientDetail() {
  const { clientId } = Route.useParams();
  const db = useDb();
  const c = db.clients.find((x) => x.id === clientId);

  // Rate calculator state
  const [calcKm, setCalcKm] = useState<number>(450);
  const [calcVehicle, setCalcVehicle] = useState<Vehicle["type"]>("Truck");

  if (!c) {
    return (
      <>
        <PageHeader title="Client not found" breadcrumb={[{ label: "Clients", to: "/app/clients" }]} />
        <p className="text-sm text-muted-foreground">This client is no longer on file.</p>
      </>
    );
  }

  const bookings = db.bookings.filter((b) => b.clientId === c.id);
  const invoices = db.invoices.filter((i) => i.clientId === c.id);
  const rates = db.rateCards.filter((r) => r.clientId === c.id);
  const outstanding = invoices.reduce((s, i) => s + invoiceOutstanding(i), 0);
  const overdue = invoices.filter((i) => i.status !== "paid" && new Date(i.dueISO).getTime() < Date.now());
  const oldestDue = overdue.sort((a, b) => a.dueISO.localeCompare(b.dueISO))[0];

  // Calculated tariff based on client's contracted rate card
  const activeRate = rates.find((r) => r.vehicleType === calcVehicle) ?? rates[0];
  const estBase = activeRate ? Math.max(activeRate.minCharge, calcKm * activeRate.perKm) : calcKm * c.ratePerKm;
  const estGst = Math.round(estBase * 0.12);
  const estTotal = estBase + estGst;

  return (
    <>
      <PageHeader
        title={c.name}
        breadcrumb={[{ label: "Clients", to: "/app/clients" }, { label: c.name }]}
        subtitle={`${c.segment} · ${c.city} · GSTIN ${c.gstin}`}
      />
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4">
          <Panel title="Bookings & Loads" description={`${bookings.length} shipments logged`}>
            <ul className="space-y-2">
              {bookings.slice(0, 12).map((b) => (
                <li key={b.id} className="flex flex-wrap items-center gap-3 rounded-md border border-border p-3 text-sm">
                  <Link to="/app/bookings/$bookingId" params={{ bookingId: b.id }} className="numeric text-primary font-medium hover:underline">
                    {b.ref}
                  </Link>
                  <span>{b.pickup.city} → {b.drop.city}</span>
                  <span className="text-xs text-muted-foreground">({b.distanceKm} km · {b.weightTons}t)</span>
                  <div className="ml-auto">
                    <Amount value={toMoney(b.rate)} className="font-semibold" />
                  </div>
                  <StatusBadge status={b.status} />
                </li>
              ))}
              {bookings.length === 0 && <p className="text-sm text-muted-foreground">No bookings yet.</p>}
            </ul>
          </Panel>

          <Panel title="Invoices & Bilateral Billing" description="Recent freight bills">
            <ul className="space-y-2">
              {invoices.map((i) => (
                <li key={i.id} className="flex flex-wrap items-center gap-3 rounded-md border border-border p-3 text-sm">
                  <Link to="/app/finance/invoices/$invoiceId" params={{ invoiceId: i.id }} className="numeric text-primary font-medium hover:underline">
                    {i.ref}
                  </Link>
                  <span className="text-xs text-muted-foreground">due {fmtDate(i.dueISO)}</span>
                  <div className="ml-auto">
                    <Amount value={toMoney(i.total)} className="font-semibold" />
                  </div>
                  <StatusBadge status={i.status} />
                </li>
              ))}
              {invoices.length === 0 && <p className="text-sm text-muted-foreground">No invoices raised.</p>}
            </ul>
          </Panel>

          {/* Rate Card & Freight Estimator Tool */}
          <Panel
            title="Contract Freight Calculator"
            description="Simulate instant freight quotations against client's contracted tariff"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Vehicle Type</label>
                <Select value={calcVehicle} onValueChange={(v) => setCalcVehicle(v as Vehicle["type"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {rates.map((r) => (
                      <SelectItem key={r.id} value={r.vehicleType}>{r.vehicleType} (₹{r.perKm}/km)</SelectItem>
                    ))}
                    {!rates.length && <SelectItem value={calcVehicle}>{calcVehicle}</SelectItem>}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Corridor Distance (km)</label>
                <Input
                  type="number"
                  min={1}
                  value={calcKm}
                  onChange={(e) => setCalcKm(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="mt-4 rounded-md border border-border bg-surface p-3 space-y-2 text-sm">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Base Freight ({calcKm} km @ ₹{activeRate?.perKm ?? c.ratePerKm}/km)</span>
                <Amount value={toMoney(estBase)} />
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">GST @ 12% (SAC 996511)</span>
                <Amount value={toMoney(estGst)} />
              </div>
              <div className="flex justify-between font-semibold border-t border-border pt-2">
                <span>Estimated Total Freight</span>
                <Amount value={toMoney(estTotal)} className="text-primary text-base font-bold" />
              </div>
            </div>
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title="Commercial Terms">
            <div className="grid grid-cols-2 gap-4">
              <Metric label="Base rate / km" value={`₹${c.ratePerKm}`} />
              <Metric label="Credit terms" value={`${c.creditDays} days`} />
              <Metric label="Outstanding" value={<Amount value={toMoney(outstanding)} />} tone={outstanding > 0 ? "warning" : "success"} />
              <Metric label="Lifetime billed" value={<Amount value={toMoney(invoices.reduce((s, i) => s + i.total, 0))} />} />
            </div>
          </Panel>

          <Panel title="Credit Exposure Control" description="Live credit risk against contracted terms">
            <div className="grid grid-cols-2 gap-4">
              <Metric label="Open invoices" value={String(invoices.filter((i) => invoiceOutstanding(i) > 0).length)} />
              <Metric label="Overdue count" value={String(overdue.length)} tone={overdue.length ? "danger" : "success"} />
              <Metric label="Oldest due" value={oldestDue ? fmtDate(oldestDue.dueISO) : "Current"} />
              <Metric label="Payment status" value={overdue.length ? "Overdue" : "In terms"} tone={overdue.length ? "danger" : "success"} />
            </div>
          </Panel>

          <Panel title="Contracted Rate Cards">
            <ul className="space-y-2 text-sm">
              {rates.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 border-b border-border/50 pb-2">
                  <span className="font-medium">{r.vehicleType}</span>
                  <div className="text-right">
                    <span className="text-xs font-mono">₹{r.perKm}/km</span>
                    <span className="block text-[11px] text-muted-foreground">
                      min <Amount value={toMoney(r.minCharge)} />
                    </span>
                  </div>
                </li>
              ))}
              {rates.length === 0 && <p className="text-muted-foreground text-sm">Default base rate card applies.</p>}
            </ul>
          </Panel>

          <Panel title="Account Contact">
            <p className="text-sm font-medium">{c.contactName}</p>
            <p className="text-sm text-muted-foreground font-mono">{c.phone}</p>
            <p className="text-sm text-muted-foreground">{c.email}</p>
          </Panel>
        </div>
      </div>
    </>
  );
}
