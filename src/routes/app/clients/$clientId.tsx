import { createFileRoute, Link } from "@tanstack/react-router";
import { Metric, PageHeader, Panel, StatusBadge } from "@/components/mf/primitives";
import { fmtDate, inr, useDb } from "@/domain/hooks";
import { invoiceOutstanding } from "@/domain/store";

export const Route = createFileRoute("/app/clients/$clientId")({
  head: () => ({
    meta: [
      { title: "Client detail — MarichiFleet" },
      { name: "description", content: "Booking history, rate card and receivables for one customer." },
      { property: "og:title", content: "Client account — MarichiFleet" },
      { property: "og:description", content: "Client bookings, commercial terms, billing history and credit exposure." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ClientDetail,
});

function ClientDetail() {
  const { clientId } = Route.useParams();
  const db = useDb();
  const c = db.clients.find((x) => x.id === clientId);

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

  return (
    <>
      <PageHeader
        title={c.name}
        breadcrumb={[{ label: "Clients", to: "/app/clients" }, { label: c.name }]}
        subtitle={`${c.segment} · ${c.city} · GSTIN ${c.gstin}`}
      />
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4">
          <Panel title="Bookings" description={`${bookings.length} orders`}>
            <ul className="space-y-2">
              {bookings.slice(0, 12).map((b) => (
                <li key={b.id} className="flex flex-wrap items-center gap-3 rounded-md border border-border p-3 text-sm">
                  <Link to="/app/bookings/$bookingId" params={{ bookingId: b.id }} className="numeric text-primary hover:underline">
                    {b.ref}
                  </Link>
                  <span>{b.pickup.city} → {b.drop.city}</span>
                  <span className="numeric ml-auto">{inr(b.rate)}</span>
                  <StatusBadge status={b.status} />
                </li>
              ))}
              {bookings.length === 0 && <p className="text-sm text-muted-foreground">No bookings yet.</p>}
            </ul>
          </Panel>
          <Panel title="Invoices" description={`${inr(outstanding)} outstanding`}>
            <ul className="space-y-2">
              {invoices.map((i) => (
                <li key={i.id} className="flex flex-wrap items-center gap-3 rounded-md border border-border p-3 text-sm">
                  <Link to="/app/finance/invoices/$invoiceId" params={{ invoiceId: i.id }} className="numeric text-primary hover:underline">
                    {i.ref}
                  </Link>
                  <span className="text-xs text-muted-foreground">due {fmtDate(i.dueISO)}</span>
                  <span className="numeric ml-auto">{inr(i.total)}</span>
                  <StatusBadge status={i.status} />
                </li>
              ))}
              {invoices.length === 0 && <p className="text-sm text-muted-foreground">No invoices raised.</p>}
            </ul>
          </Panel>
        </div>
        <div className="space-y-4">
          <Panel title="Commercial terms">
            <div className="grid grid-cols-2 gap-4">
              <Metric label="Rate per km" value={`₹${c.ratePerKm}`} />
              <Metric label="Credit days" value={String(c.creditDays)} />
              <Metric label="Outstanding" value={inr(outstanding)} tone={outstanding > 0 ? "warning" : "success"} />
              <Metric label="Lifetime billed" value={inr(invoices.reduce((s, i) => s + i.total, 0))} />
            </div>
          </Panel>
          <Panel title="Credit control" description="Live exposure against the agreed payment window.">
            <div className="grid grid-cols-2 gap-4">
              <Metric label="Open invoices" value={String(invoices.filter((i) => invoiceOutstanding(i) > 0).length)} />
              <Metric label="Overdue invoices" value={String(overdue.length)} tone={overdue.length ? "danger" : "success"} />
              <Metric label="Exposure" value={inr(outstanding)} tone={outstanding ? "warning" : "success"} />
              <Metric label="Oldest due" value={oldestDue ? fmtDate(oldestDue.dueISO) : "Current"} />
            </div>
          </Panel>
          <Panel title="Rate card">
            <ul className="space-y-2 text-sm">
              {rates.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3">
                  <span>{r.vehicleType}</span>
                  <span className="numeric text-muted-foreground">₹{r.perKm}/km · min {inr(r.minCharge)}</span>
                </li>
              ))}
              {rates.length === 0 && <p className="text-muted-foreground">No rate card configured.</p>}
            </ul>
          </Panel>
          <Panel title="Contact">
            <p className="text-sm">{c.contactName}</p>
            <p className="text-sm text-muted-foreground">{c.phone}</p>
            <p className="text-sm text-muted-foreground">{c.email}</p>
          </Panel>
        </div>
      </div>
    </>
  );
}
