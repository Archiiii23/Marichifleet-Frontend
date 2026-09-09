import { createFileRoute, Link } from "@tanstack/react-router";
import { Panel, StatusBadge } from "@/components/mf/primitives";
import { fmtDateTime, useDb } from "@/domain/hooks";
import { useSession } from "@/domain/session";

export const Route = createFileRoute("/driver/trips/")({
  head: () => ({
    meta: [
      { title: "My trips — MarichiFleet Driver" },
      { name: "description", content: "All trips assigned to this driver, past and present." },
    ],
  }),
  component: DriverTrips,
});

function DriverTrips() {
  const db = useDb();
  const { persona } = useSession();
  const driverId = persona.driverId ?? db.drivers[0]?.id;
  const trips = db.trips.filter((t) => t.driverId === driverId);

  return (
    <div className="space-y-3">
      <h1 className="font-display text-xl font-semibold">My trips</h1>
      {trips.length === 0 && (
        <Panel title="Nothing here yet">
          <p className="text-sm text-muted-foreground">Assigned trips appear here.</p>
        </Panel>
      )}
      {trips.map((t) => {
        const b = db.bookings.find((x) => x.id === t.bookingId)!;
        return (
          <Link
            key={t.id}
            to="/driver/trips/$tripId"
            params={{ tripId: t.id }}
            className="block rounded-lg border border-border bg-card p-4 transition-colors hover:bg-surface"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="numeric text-sm font-medium">{t.ref}</span>
              <StatusBadge status={t.status} />
            </div>
            <p className="mt-1 text-sm">{b.pickup.city} → {b.drop.city}</p>
            <p className="text-xs text-muted-foreground">ETA {fmtDateTime(t.etaISO)} · {Math.round(t.progress * 100)}% complete</p>
          </Link>
        );
      })}
    </div>
  );
}
