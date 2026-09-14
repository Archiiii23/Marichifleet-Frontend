import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Check, CheckCircle, ShieldAlert, Truck, ArrowRight } from "lucide-react";
import { useState } from "react";
import { EmptyState, NoAccess, PageHeader, Panel, StatusBadge } from "@/components/mf/primitives";
import { Amount, toMoney } from "@/components/mf/amount";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fmtDate, useAction, useDb } from "@/domain/hooks";
import { useSession } from "@/domain/session";
import { assignTrip, clientName, confirmBooking, dispatchBooking, markVehicleDelivered, rankCandidates } from "@/domain/store";
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

  const [filterTab, setFilterTab] = useState<"all" | "pending" | "assigned" | "dispatched">("all");
  const allLoads = db.bookings.filter((b) => ["submitted", "confirmed", "assigned", "dispatched", "in_transit"].includes(b.status));
  const queue = allLoads.filter((b) => {
    if (filterTab === "pending") return b.status === "confirmed" || b.status === "submitted";
    if (filterTab === "assigned") return b.status === "assigned";
    if (filterTab === "dispatched") return b.status === "dispatched" || b.status === "in_transit";
    return true;
  });

  const [selectedId, setSelectedId] = useState<string | undefined>(search.booking ?? allLoads[0]?.id);
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

  const booking = db.bookings.find((b) => b.id === (selectedId || search.booking)) ?? queue[0] ?? allLoads[0];
  const ranked = booking ? rankCandidates(booking) : null;
  const chosenVehicle = ranked?.vehicles.find((v) => v.vehicle.id === vehicleId);
  const chosenDriver = ranked?.drivers.find((d) => d.driver.id === driverId);
  const needsOverride = (chosenVehicle && !chosenVehicle.eligible) || (chosenDriver && !chosenDriver.eligible);

  const activeTrip = booking?.tripId ? db.trips.find((t) => t.id === booking.tripId) : null;
  const assignedVehicle = activeTrip ? db.vehicles.find((v) => v.id === activeTrip.vehicleId) : null;
  const assignedDriver = activeTrip ? db.drivers.find((d) => d.id === activeTrip.driverId) : null;

  return (
    <>
      <PageHeader
        title="Dispatch board"
        subtitle="Confirmed loads on the left, ranked assets on the right. Ineligible assets explain why."
      />

      {allLoads.length === 0 ? (
        <EmptyState
          title="Nothing waiting for dispatch"
          message="Confirmed bookings appear here automatically. Confirm a submitted booking to fill the queue."
          actionLabel="Open bookings"
          onAction={() => navigate({ to: "/app/bookings" })}
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-[340px_1fr]">
          <Panel title="Dispatch queue" description={`${queue.length} loads matching filter`}>
            <div className="flex flex-wrap gap-1 border-b border-border pb-2 mb-2 text-xs">
              <button
                type="button"
                onClick={() => setFilterTab("all")}
                className={cn("px-2 py-1 rounded font-medium transition-colors", filterTab === "all" ? "bg-primary/10 text-primary font-semibold" : "text-muted-foreground hover:text-foreground")}
              >
                All ({allLoads.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab("pending")}
                className={cn("px-2 py-1 rounded font-medium transition-colors", filterTab === "pending" ? "bg-primary/10 text-primary font-semibold" : "text-muted-foreground hover:text-foreground")}
              >
                Needs Asset ({allLoads.filter((b) => b.status === "submitted" || b.status === "confirmed").length})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab("assigned")}
                className={cn("px-2 py-1 rounded font-medium transition-colors", filterTab === "assigned" ? "bg-primary/10 text-primary font-semibold" : "text-muted-foreground hover:text-foreground")}
              >
                Assigned ({allLoads.filter((b) => b.status === "assigned").length})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab("dispatched")}
                className={cn("px-2 py-1 rounded font-medium transition-colors", filterTab === "dispatched" ? "bg-primary/10 text-primary font-semibold" : "text-muted-foreground hover:text-foreground")}
              >
                Dispatched ({allLoads.filter((b) => b.status === "dispatched" || b.status === "in_transit").length})
              </button>
            </div>

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
                    <StatusBadge status={b.status} />
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <p className="text-xs font-medium">{b.pickup.city} → {b.drop.city}</p>
                    <Amount value={toMoney(b.rate)} className="text-xs font-semibold" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {clientName(b.clientId)} · {b.weightTons}t {b.vehicleType} · {fmtDate(b.pickupISO)}
                  </p>
                </button>
              ))}
            </div>
          </Panel>

          {booking && ranked && (
            <div className="space-y-4">
              <Panel
                title={`Dispatch & Assignment: ${booking.ref}`}
                description={`${booking.pickup.city} → ${booking.drop.city} · ${booking.distanceKm} km · ${booking.weightTons}t`}
                actions={
                  <div className="flex flex-wrap items-center gap-2">
                    {booking.status === "submitted" && (
                      <Button
                        size="sm"
                        onClick={() => run(() => confirmBooking(booking.id, persona.name), "Booking confirmed")}
                      >
                        Confirm Booking
                      </Button>
                    )}
                    {booking.status === "assigned" && (
                      <>
                        <Button
                          size="sm"
                          className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium gap-1.5"
                          onClick={() => {
                            const res = run(() => dispatchBooking(booking.id, persona.name), "Trip dispatched — vehicle is on trip");
                            if (res.ok) navigate({ to: "/app/trips" });
                          }}
                        >
                          <Truck className="size-3.5" /> Dispatch Trip Now
                        </Button>
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm gap-1.5"
                          onClick={() => {
                            const res = run(() => markVehicleDelivered(booking.id, persona.name), `Vehicle marked delivered for ${booking.ref}`);
                            if (res.ok) setSelectedId(queue.find((b) => b.id !== booking.id)?.id);
                          }}
                        >
                          <CheckCircle className="size-3.5" /> Mark Vehicle Delivered
                        </Button>
                      </>
                    )}
                    {["dispatched", "in_transit"].includes(booking.status) && (
                      <>
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm gap-1.5"
                          onClick={() => {
                            const res = run(() => markVehicleDelivered(booking.id, persona.name), `Vehicle marked delivered for ${booking.ref}`);
                            if (res.ok) setSelectedId(queue.find((b) => b.id !== booking.id)?.id);
                          }}
                        >
                          <CheckCircle className="size-3.5" /> Mark Vehicle Delivered
                        </Button>
                        {booking.tripId && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate({ to: "/app/trips/$tripId", params: { tripId: booking.tripId! } })}
                          >
                            Live Trip →
                          </Button>
                        )}
                      </>
                    )}
                    <Button
                      size="sm"
                      variant={booking.status === "assigned" || ["dispatched", "in_transit"].includes(booking.status) ? "outline" : "default"}
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
                          booking.status === "assigned" ? "Assets reassigned successfully" : "Trip created and driver notified on WhatsApp",
                        );
                        if (res.ok && res.id) navigate({ to: "/app/trips/$tripId", params: { tripId: res.id } });
                      }}
                    >
                      {booking.status === "assigned" ? "Reassign Assets" : "Assign & Create Trip"}
                    </Button>
                  </div>
                }
              >
                {/* Active Trip & Vehicle Delivery Quick Card */}
                {activeTrip && (
                  <div className="mb-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{activeTrip.ref}</span>
                          <StatusBadge status={activeTrip.status} />
                          <span className="text-xs text-muted-foreground">· Progress: {Math.round(activeTrip.progress * 100)}%</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {booking.pickup.city} → {booking.drop.city} · {booking.distanceKm} km
                        </p>
                      </div>
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm gap-1.5"
                        onClick={() => {
                          const res = run(() => markVehicleDelivered(booking.id, persona.name), `Vehicle marked delivered for ${booking.ref}`);
                          if (res.ok) setSelectedId(queue.find((b) => b.id !== booking.id)?.id);
                        }}
                      >
                        <CheckCircle className="size-4" /> Mark Vehicle Delivered
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 text-xs">
                      <div>
                        <span className="text-muted-foreground block text-[11px] uppercase tracking-wide">Assigned Vehicle</span>
                        <span className="font-medium numeric">{assignedVehicle?.regNo ?? "—"}</span>
                        <span className="text-muted-foreground block">{assignedVehicle?.type} ({assignedVehicle?.capacityTons}t)</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[11px] uppercase tracking-wide">Assigned Driver</span>
                        <span className="font-medium">{assignedDriver?.name ?? "—"}</span>
                        <span className="text-muted-foreground block">{assignedDriver?.phone}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[11px] uppercase tracking-wide">Delivery Bay</span>
                        <span className="font-medium">{booking.drop.city}</span>
                        <span className="text-muted-foreground block truncate">{booking.drop.address}</span>
                      </div>
                    </div>
                  </div>
                )}
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
