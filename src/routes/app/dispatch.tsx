import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Check, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { EmptyState, NoAccess, PageHeader, Panel, StatusBadge } from "@/components/mf/primitives";
import { Amount, toMoney } from "@/components/mf/amount";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fmtDate, useAction, useDb } from "@/domain/hooks";
import { useSession } from "@/domain/session";
import { assignTrip, clientName, rankCandidates } from "@/domain/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/dispatch")({
  validateSearch: (s: Record<string, unknown>): { booking?: string } =>
    typeof s["booking"] === "string" ? { booking: s["booking"] } : {},

  head: () => ({
    meta: [
      { title: "Dispatch board — MarichiFleet" },
      { name: "description", content: "Match confirmed loads with eligible vehicles and drivers in one screen." },
    ],
  }),
  component: Dispatch,
});

function Dispatch() {
  const db = useDb();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const run = useAction();
  const { persona, can } = useSession();

  const queue = db.bookings.filter((b) => b.status === "confirmed");
  const [selectedId, setSelectedId] = useState<string | undefined>(search.booking ?? queue[0]?.id);
  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [driverId, setDriverId] = useState<string | null>(null);
  const [override, setOverride] = useState("");

  if (!can("dispatch")) {
    return (
      <>
        <PageHeader title="Dispatch board" />
        <NoAccess what="the dispatch board" />
      </>
    );
  }

  const booking = db.bookings.find((b) => b.id === selectedId) ?? queue[0];
  const ranked = booking ? rankCandidates(booking) : null;
  const chosenVehicle = ranked?.vehicles.find((v) => v.vehicle.id === vehicleId);
  const chosenDriver = ranked?.drivers.find((d) => d.driver.id === driverId);
  const needsOverride = (chosenVehicle && !chosenVehicle.eligible) || (chosenDriver && !chosenDriver.eligible);

  return (
    <>
      <PageHeader
        title="Dispatch board"
        subtitle="Confirmed loads on the left, ranked assets on the right. Ineligible assets explain why."
      />

      {queue.length === 0 ? (
        <EmptyState
          title="Nothing waiting for dispatch"
          message="Confirmed bookings appear here automatically. Confirm a submitted booking to fill the queue."
          actionLabel="Open bookings"
          onAction={() => navigate({ to: "/app/bookings" })}
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
          <Panel title="Awaiting dispatch" description={`${queue.length} confirmed loads`}>
            <div className="space-y-2">
              {queue.map((b) => (
                <button
                  key={b.id}
                  onClick={() => {
                    setSelectedId(b.id);
                    setVehicleId(null);
                    setDriverId(null);
                    setOverride("");
                  }}
                  className={cn(
                    "w-full rounded-md border p-3 text-left transition-colors",
                    booking?.id === b.id ? "border-primary bg-primary/10" : "border-border hover:bg-surface",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="numeric text-sm font-medium">{b.ref}</span>
                    <Amount value={toMoney(b.rate)} className="text-xs text-muted-foreground" />
                  </div>
                  <p className="mt-1 text-xs">{b.pickup.city} → {b.drop.city}</p>
                  <p className="text-xs text-muted-foreground">
                    {clientName(b.clientId)} · {b.weightTons}t {b.vehicleType} · {fmtDate(b.pickupISO)}
                  </p>
                </button>
              ))}
            </div>
          </Panel>

          {booking && ranked && (
            <div className="space-y-4">
              <Panel
                title={`Assign ${booking.ref}`}
                description={`${booking.pickup.city} → ${booking.drop.city} · ${booking.distanceKm} km · ${booking.weightTons}t`}
                actions={
                  <Button
                    size="sm"
                    disabled={!vehicleId || !driverId}
                    onClick={() => {
                      const res = run(
                        () =>
                          assignTrip({
                            bookingId: booking.id,
                            vehicleId: vehicleId!,
                            driverId: driverId!,
                            overrideReason: override || undefined,
                            actor: persona.name,
                          }),
                        "Trip created and driver notified on WhatsApp",
                      );
                      if (res.ok && res.id) navigate({ to: "/app/trips/$tripId", params: { tripId: res.id } });
                    }}
                  >
                    Create trip
                  </Button>
                }
              >
                {needsOverride && (
                  <div className="mb-4 rounded-md border border-warning/40 bg-warning/10 p-3">
                    <p className="flex items-center gap-2 text-sm text-warning">
                      <ShieldAlert className="size-4" aria-hidden />
                      {chosenVehicle && !chosenVehicle.eligible ? chosenVehicle.reason : chosenDriver?.reason}
                    </p>
                    <div className="mt-2 space-y-1.5">
                      <Label className="text-xs">Override reason (recorded in the audit trail)</Label>
                      <Input value={override} onChange={(e) => setOverride(e.target.value)} placeholder="Why is this assignment acceptable?" />
                    </div>
                  </div>
                )}

                <div className="grid gap-4 lg:grid-cols-2">
                  <div>
                    <p className="mb-2 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Vehicles</p>
                    <div className="max-h-96 space-y-1.5 overflow-y-auto pr-1">
                      {ranked.vehicles.map((c) => (
                        <button
                          key={c.vehicle.id}
                          onClick={() => setVehicleId(c.vehicle.id)}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-md border p-2.5 text-left text-sm transition-colors",
                            vehicleId === c.vehicle.id ? "border-primary bg-primary/10" : "border-border hover:bg-surface",
                            !c.eligible && "opacity-70",
                          )}
                        >
                          <span className="min-w-0 flex-1">
                            <span className="numeric block font-medium">{c.vehicle.regNo}</span>
                            <span className="block text-xs text-muted-foreground">
                              {c.vehicle.type} · {c.vehicle.capacityTons}t · {Math.round(c.proximity)} km away
                              {!c.eligible && ` · ${c.reason}`}
                            </span>
                          </span>
                          {c.eligible ? (
                            <span className="numeric text-xs text-success">{c.score}</span>
                          ) : (
                            <StatusBadge status={c.vehicle.status} />
                          )}
                          {vehicleId === c.vehicle.id && <Check className="size-4 text-primary" aria-hidden />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Drivers</p>
                    <div className="max-h-96 space-y-1.5 overflow-y-auto pr-1">
                      {ranked.drivers.map((c) => (
                        <button
                          key={c.driver.id}
                          onClick={() => setDriverId(c.driver.id)}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-md border p-2.5 text-left text-sm transition-colors",
                            driverId === c.driver.id ? "border-primary bg-primary/10" : "border-border hover:bg-surface",
                            !c.eligible && "opacity-70",
                          )}
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block font-medium">{c.driver.name}</span>
                            <span className="block text-xs text-muted-foreground">
                              ★ {c.driver.rating.toFixed(1)} · {c.driver.tripsCompleted} trips
                              {!c.eligible && ` · ${c.reason}`}
                            </span>
                          </span>
                          {c.eligible ? (
                            <span className="numeric text-xs text-success">{c.score}</span>
                          ) : (
                            <StatusBadge status={c.driver.status} />
                          )}
                          {driverId === c.driver.id && <Check className="size-4 text-primary" aria-hidden />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </Panel>
            </div>
          )}
        </div>
      )}
    </>
  );
}
