import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { FleetMap } from "@/components/mf/fleet-map";
import { PageHeader, Panel, StatusBadge } from "@/components/mf/primitives";
import { Input } from "@/components/ui/input";
import { fmtDateTime, timeAgo, useDb } from "@/domain/hooks";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/tracking")({
  head: () => ({
    meta: [
      { title: "Live fleet — MarichiFleet" },
      { name: "description", content: "Synchronised map and list view of every vehicle, with stale-ping warnings." },
    ],
  }),
  component: Tracking,
});

const STALE_MS = 10 * 60 * 1000;

function Tracking() {
  const db = useDb();
  const [selected, setSelected] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const items = useMemo(
    () =>
      db.vehicles.map((v) => {
        const trip = db.trips.find((t) => t.id === v.currentTripId);
        return { vehicle: v, trip, delayed: !!trip && (trip.delayMins > 30 || trip.status === "exception") };
      }),
    [db],
  );

  const list = items.filter((i) =>
    `${i.vehicle.regNo} ${i.vehicle.type} ${i.trip?.ref ?? ""}`.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <>
      <PageHeader
        title="Live fleet"
        subtitle="Map and list stay in sync. Vehicles with no ping for ten minutes are flagged as stale."
      />
      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <FleetMap items={items} selectedId={selected} onSelect={setSelected} height={620} />
        <Panel title="Vehicles" description={`${items.filter((i) => i.vehicle.status === "on_trip").length} moving now`}>
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filter by registration or trip"
            className="mb-3 h-9"
            aria-label="Filter vehicles"
          />
          <div className="max-h-[520px] space-y-1.5 overflow-y-auto pr-1">
            {list.map(({ vehicle: v, trip, delayed }) => {
              const stale = Date.now() - new Date(v.lastPingISO).getTime() > STALE_MS;
              return (
                <button
                  key={v.id}
                  onClick={() => setSelected(v.id)}
                  className={cn(
                    "w-full rounded-md border p-2.5 text-left transition-colors",
                    selected === v.id ? "border-primary bg-primary/10" : "border-border hover:bg-surface",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="numeric text-sm font-medium">{v.regNo}</span>
                    <StatusBadge status={delayed ? "exception" : v.status} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {v.type} · <span className="numeric">{v.speedKph}</span> km/h · fuel <span className="numeric">{v.fuelPct}%</span>
                  </p>
                  <p className={cn("text-xs", stale ? "text-warning" : "text-muted-foreground")}>
                    {stale ? "Stale signal · " : "Last ping "}
                    {timeAgo(v.lastPingISO)}
                  </p>
                  {trip && (
                    <p className="mt-1 text-xs">
                      <Link
                        to="/app/trips/$tripId"
                        params={{ tripId: trip.id }}
                        className="text-primary hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {trip.ref}
                      </Link>{" "}
                      · ETA {fmtDateTime(trip.etaISO)}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </Panel>
      </div>
    </>
  );
}
