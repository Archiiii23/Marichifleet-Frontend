import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { EmptyState, KpiCard, Panel, StatusBadge } from "@/components/mf/primitives";
import { Button } from "@/components/ui/button";
import { fmtDateTime, timeAgo, useDb } from "@/domain/hooks";
import { deriveCases } from "@/domain/os/cases";
import { useSession } from "@/domain/session";

export const Route = createFileRoute("/portal/exceptions")({
  head: () => ({
    meta: [
      { title: "Shipment issues — MarichiFleet" },
      { name: "description", content: "Anything holding up your loads, what caused it and what is being done about it." },
    ],
  }),
  component: PortalExceptions,
});

function PortalExceptions() {
  const db = useDb();
  const { persona } = useSession();
  const clientId = persona.clientId ?? db.clients[0]?.id;
  const client = db.clients.find((c) => c.id === clientId);

  const myBookingIds = new Set(db.bookings.filter((b) => b.clientId === clientId).map((b) => b.id));
  const cases = deriveCases(db).filter((c) => {
    const trip = db.trips.find((t) => t.id === c.tripId);
    return trip ? myBookingIds.has(trip.bookingId) : false;
  });

  const late = db.trips.filter((t) => myBookingIds.has(t.bookingId) && t.delayMins > 25 && t.status !== "completed");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-semibold">Issues on your loads</h1>
        <p className="text-sm text-muted-foreground">{client?.name} · updated live from the road</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <KpiCard label="Open issues" value={String(cases.length)} hint="Being worked on now" tone={cases.length ? "danger" : undefined} />
        <KpiCard label="Running late" value={String(late.length)} hint="More than 25 minutes behind" tone={late.length ? "warning" : undefined} />
        <KpiCard label="On plan" value={String(db.trips.filter((t) => myBookingIds.has(t.bookingId) && t.delayMins <= 25 && t.status !== "completed").length)} hint="No action needed" />
      </div>

      <Panel title="Open issues" description="You see the same case file our control room sees">
        {cases.length === 0 ? (
          <EmptyState title="Nothing is held up" message="All of your loads are moving to plan. We will message you the moment that changes." icon={ShieldCheck} />
        ) : (
          <ul className="-m-4 divide-y divide-border">
            {cases.map((c) => (
              <li key={c.id} className="space-y-2 px-4 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={c.severity} />
                  <span className="text-sm font-medium capitalize">{c.headline}</span>
                  <span className="ml-auto text-xs text-muted-foreground">reported {timeAgo(c.openedISO)}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {c.lane} · {c.note}
                </p>
                <p className="text-sm">
                  <span className="text-muted-foreground">What happens next: </span>
                  {c.recommendation.detail}
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button size="sm" variant="outline" asChild>
                    <Link to="/portal/bookings">View shipment</Link>
                  </Button>
                  <Button size="sm" variant="ghost" asChild>
                    <a href="tel:+911800000000">Call your account manager</a>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Delays without an incident" description="Traffic and waiting time, no fault reported">
        {late.length === 0 ? (
          <EmptyState title="No delays" message="Nothing is running behind schedule." />
        ) : (
          <ul className="-m-4 divide-y divide-border">
            {late.map((t) => {
              const b = db.bookings.find((x) => x.id === t.bookingId);
              return (
                <li key={t.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                  <span className="font-medium">{t.ref}</span>
                  <span className="text-muted-foreground">
                    {b ? `${b.pickup.city} → ${b.drop.city}` : ""}
                  </span>
                  <span className="ml-auto text-xs text-warning">{t.delayMins} min behind</span>
                  <span className="text-xs text-muted-foreground">revised ETA {fmtDateTime(t.etaISO)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}
