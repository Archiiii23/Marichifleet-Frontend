import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, Circle, Trash2, Navigation, Route as RouteIcon, ArrowRight, CornerDownRight, Compass, Loader2, RefreshCw, MapPin, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { FleetMap } from "@/components/mf/fleet-map";
import { Metric, PageHeader, Panel, StatusBadge } from "@/components/mf/primitives";
import { Amount, toMoney } from "@/components/mf/amount";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fmtDateTime, timeAgo, useAction, useDb } from "@/domain/hooks";
import { useSession } from "@/domain/session";
import { canSeeField } from "@/domain/rbac";
import {
  completeCheckpoint, deleteTrip, markDelivered, reportException, resumeTrip, startTrip, tripProfit,
} from "@/domain/store";
import { cn } from "@/lib/utils";
import { getMapboxDrivingRoute, geocodeCity, MapboxRouteResult } from "@/services/mapbox";

export const Route = createFileRoute("/app/trips/$tripId")({
  head: () => ({
    meta: [
      { title: "Trip detail — MarichiFleet" },
      { name: "description", content: "Checkpoints, exceptions, live position and trip economics." },
    ],
  }),
  component: TripDetail,
});

function TripDetail() {
  const { tripId } = Route.useParams();
  const db = useDb();
  const navigate = useNavigate();
  const run = useAction();
  const { persona, can } = useSession();
  const [exType, setExType] = useState("Traffic delay");
  const [exNote, setExNote] = useState("");

  const t = db.trips.find((x) => x.id === tripId);
  if (!t) {
    return (
      <>
        <PageHeader title="Trip not found" breadcrumb={[{ label: "Trips", to: "/app/trips" }]} />
        <p className="text-sm text-muted-foreground">This trip no longer exists.</p>
      </>
    );
  }
  const b = db.bookings.find((x) => x.id === t.bookingId)!;
  const v = db.vehicles.find((x) => x.id === t.vehicleId)!;
  const d = db.drivers.find((x) => x.id === t.driverId)!;
  const pod = db.pods.find((p) => p.tripId === t.id);
  const history = db.audit.filter((a) => a.entityId === t.id);

  // Mapbox Live Road Route & Distance calculation
  const [mapboxRoute, setMapboxRoute] = useState<MapboxRouteResult | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [showSteps, setShowSteps] = useState(false);

  const fetchRoadRoute = async () => {
    if (!b?.pickup?.city || !b?.drop?.city) return;
    setIsLoadingRoute(true);
    try {
      let pCoords: [number, number] | null = [b.pickup.lng, b.pickup.lat];
      let dCoords: [number, number] | null = [b.drop.lng, b.drop.lat];

      if (!pCoords[0] || !pCoords[1] || (pCoords[0] === 18.52 && pCoords[1] === 73.856 && b.pickup.city !== "Pune")) {
        pCoords = await geocodeCity(b.pickup.city);
      }
      if (!dCoords[0] || !dCoords[1] || (dCoords[0] === 17.385 && dCoords[1] === 78.486 && b.drop.city !== "Hyderabad")) {
        dCoords = await geocodeCity(b.drop.city);
      }

      if (pCoords && dCoords) {
        const routeRes = await getMapboxDrivingRoute([pCoords, dCoords]);
        if (routeRes) {
          setMapboxRoute(routeRes);
          toast.success("Mapbox Highway Route Calculated", {
            description: `${routeRes.distanceKm} km via actual road network (${routeRes.durationHours} hrs).`,
          });
        }
      }
    } catch (err) {
      console.warn("Could not load Mapbox road route for trip:", err);
    } finally {
      setIsLoadingRoute(false);
    }
  };

  useEffect(() => {
    fetchRoadRoute();
  }, [b?.pickup?.city, b?.drop?.city]);

  const actualDistance = mapboxRoute ? mapboxRoute.distanceKm : t.distanceKm;
  const coveredDistance = Math.round(actualDistance * t.progress * 10) / 10;
  const remainingDistance = Math.max(0, Math.round((actualDistance - coveredDistance) * 10) / 10);
  const estHours = mapboxRoute ? mapboxRoute.durationHours : Math.round((actualDistance / 42) * 10) / 10;

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete trip ${t.ref}?`)) {
      deleteTrip(t.id, persona.name);
      toast.success(`Trip ${t.ref} deleted`);
      navigate({ to: "/app/trips" });
    }
  };

  return (
    <>
      <PageHeader
        title={`${t.ref} · ${b.pickup.city} → ${b.drop.city}`}
        breadcrumb={[{ label: "Trips", to: "/app/trips" }, { label: t.ref }]}
        subtitle={`${v.regNo} · ${d.name} · booking ${b.ref}`}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={t.status} />
            {can("dispatch") && t.status === "driver_accepted" && (
              <Button size="sm" onClick={() => run(() => startTrip(t.id, persona.name), "Trip started")}>Start trip</Button>
            )}
            {can("dispatch") && t.status === "exception" && (
              <Button size="sm" variant="outline" onClick={() => run(() => resumeTrip(t.id, persona.name), "Trip resumed")}>
                Clear exception
              </Button>
            )}
            {can("dispatch") && ["in_transit", "arrived"].includes(t.status) && (
              <Button size="sm" onClick={() => run(() => markDelivered(t.id, persona.name), "Marked delivered")}>
                Mark delivered
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
            >
              <Trash2 className="size-4" />
              Delete Trip
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-4">
          <Panel title="Live position" description={`Last ping ${timeAgo(v.lastPingISO)} · ${v.speedKph} km/h`}>
            <FleetMap
              items={[{ vehicle: v, trip: t, delayed: t.delayMins > 30 || t.status === "exception" }]}
              selectedId={v.id}
              height={360}
              activeRoadPath={mapboxRoute?.geometry.coordinates}
              pickupLocation={{
                city: b.pickup.city,
                coords: [b.pickup.lng, b.pickup.lat],
              }}
              dropLocation={{
                city: b.drop.city,
                coords: [b.drop.lng, b.drop.lat],
              }}
            />
          </Panel>

          {/* Automatic Route Planner Panel */}
          <Panel
            title="Automatic Route Planner (Mapbox Driving Engine)"
            description="High-precision road path, actual highway distances and driving duration"
            actions={
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1.5"
                onClick={fetchRoadRoute}
                disabled={isLoadingRoute}
              >
                <RefreshCw className={cn("size-3", isLoadingRoute && "animate-spin")} />
                <span>Recalculate Route</span>
              </Button>
            }
          >
            <div className="space-y-4">
              {/* Route Summary Banner */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg bg-primary/10 border border-primary/20">
                <div className="flex items-center gap-2">
                  <div className="size-8 rounded-md bg-primary/20 flex items-center justify-center text-primary">
                    <Navigation className="size-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <span>{b.pickup.city}</span>
                      <ArrowRight className="size-3 text-primary" />
                      <span>{b.drop.city}</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Compass className="size-3 text-primary/70" />
                      <span>Highway Route: {mapboxRoute?.summaryRoads && mapboxRoute.summaryRoads.length > 0 ? mapboxRoute.summaryRoads.slice(0, 3).join(" → ") : "National Highway Corridor"}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-semibold">
                    Mapbox Directions Verified
                  </span>
                </div>
              </div>

              {/* 4 Metric Cards for the Route Planner */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-lg border border-border/70 bg-card p-3 space-y-1">
                  <div className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Actual Road Distance</div>
                  <div className="text-lg font-bold font-mono text-foreground">{actualDistance} km</div>
                  <div className="text-[10px] text-primary">Via truck road network</div>
                </div>

                <div className="rounded-lg border border-border/70 bg-card p-3 space-y-1">
                  <div className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Driving Duration</div>
                  <div className="text-lg font-bold font-mono text-foreground">{estHours} hrs</div>
                  <div className="text-[10px] text-muted-foreground">Standard highway transit</div>
                </div>

                <div className="rounded-lg border border-border/70 bg-card p-3 space-y-1">
                  <div className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Distance Covered</div>
                  <div className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">{coveredDistance} km</div>
                  <div className="text-[10px] text-muted-foreground">{Math.round(t.progress * 100)}% route completed</div>
                </div>

                <div className="rounded-lg border border-border/70 bg-card p-3 space-y-1">
                  <div className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Remaining Distance</div>
                  <div className="text-lg font-bold font-mono text-amber-500">{remainingDistance} km</div>
                  <div className="text-[10px] text-muted-foreground">To {b.drop.city} destination</div>
                </div>
              </div>

              {/* Highway Corridors Chips */}
              {mapboxRoute?.summaryRoads && mapboxRoute.summaryRoads.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-xs text-muted-foreground font-medium mr-1">Highways:</span>
                  {mapboxRoute.summaryRoads.map((road, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground text-xs font-mono border border-border/60"
                    >
                      <MapPin className="size-2.5 text-primary" />
                      <span>{road}</span>
                    </span>
                  ))}
                </div>
              )}

              {/* Turn-by-Turn Maneuver Toggle */}
              {mapboxRoute?.steps && mapboxRoute.steps.length > 0 && (
                <div className="border-t border-border/60 pt-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7 gap-1.5 text-primary p-0 hover:bg-transparent hover:underline"
                    onClick={() => setShowSteps(!showSteps)}
                  >
                    <RouteIcon className="size-3.5" />
                    <span>{showSteps ? "Hide Turn-by-Turn Legs" : `View Highway Segments & Directions (${mapboxRoute.steps.length})`}</span>
                  </Button>

                  {showSteps && (
                    <ul className="mt-2.5 space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {mapboxRoute.steps.map((step, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2 text-xs py-1 px-2 rounded bg-muted/40 border border-border/40"
                        >
                          <CornerDownRight className="size-3 text-primary mt-0.5 shrink-0" />
                          <span className="flex-1 text-muted-foreground">
                            {step.instruction || `Drive along ${step.roadName}`}
                          </span>
                          <span className="font-mono text-[11px] font-semibold shrink-0">
                            {step.distanceKm} km
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </Panel>

          <Panel title="Checkpoints" description="Completed in sequence by the driver or dispatch desk">
            <ol className="space-y-3">
              {t.checkpoints.map((c) => (
                <li key={c.id} className="flex items-start gap-3">
                  {c.doneISO ? (
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                  ) : (
                    <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">{c.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.city} · {c.doneISO ? fmtDateTime(c.doneISO) : "pending"}
                    </p>
                  </div>
                  {can("dispatch") && !c.doneISO && (
                    <Button size="sm" variant="outline" onClick={() => run(() => completeCheckpoint(t.id, c.id, persona.name), "Checkpoint updated")}>
                      Complete
                    </Button>
                  )}
                </li>
              ))}
            </ol>
          </Panel>

          {can("dispatch") && (
            <Panel title="Raise exception" description="Delays and breakdowns alert dispatch and open a job card">
              <div className="grid gap-3 sm:grid-cols-[200px_1fr_auto] sm:items-end">
                <div className="space-y-1.5">
                  <Label className="text-xs">Type</Label>
                  <Input value={exType} onChange={(e) => setExType(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Note</Label>
                  <Input value={exNote} onChange={(e) => setExNote(e.target.value)} placeholder="What happened?" />
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    const res = run(() => reportException(t.id, exType, exNote, persona.name), "Exception logged");
                    if (res.ok) setExNote("");
                  }}
                >
                  Report
                </Button>
              </div>
              {t.exception && (
                <p className="mt-3 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm text-warning">
                  {t.exception.type}: {t.exception.note} · {timeAgo(t.exception.atISO)}
                </p>
              )}
            </Panel>
          )}
        </div>

        <div className="space-y-4">
          <Panel title="Trip economics">
            <div className="grid grid-cols-2 gap-4">
              <Metric
                label="Revenue"
                value={
                  canSeeField(persona.role, "trip.freightAmountMinor") ? (
                    <Amount value={toMoney(t.revenue)} />
                  ) : (
                    <Amount value={undefined} />
                  )
                }
              />
              <Metric
                label="Fuel"
                value={
                  canSeeField(persona.role, "trip.costs") ? (
                    <Amount value={toMoney(t.fuelCost)} />
                  ) : (
                    <Amount value={undefined} />
                  )
                }
              />
              <Metric
                label="Tolls"
                value={
                  canSeeField(persona.role, "trip.costs") ? (
                    <Amount value={toMoney(t.tollCost)} />
                  ) : (
                    <Amount value={undefined} />
                  )
                }
              />
              <Metric
                label="Driver cost"
                value={
                  canSeeField(persona.role, "trip.costs") ? (
                    <Amount value={toMoney(t.driverCost)} />
                  ) : (
                    <Amount value={undefined} />
                  )
                }
              />
              <Metric
                label="Contribution"
                value={
                  canSeeField(persona.role, "trip.marginMinor") ? (
                    <Amount value={toMoney(tripProfit(t))} />
                  ) : (
                    <Amount value={undefined} />
                  )
                }
                tone="success"
              />
              <Metric label="Delay" value={`${t.delayMins} min`} tone={t.delayMins > 30 ? "warning" : undefined} />
            </div>
          </Panel>

          <Panel title="Proof of delivery">
            {pod ? (
              <div className="space-y-2 text-sm">
                <Metric label="Received by" value={pod.receiverName} />
                <Metric label="Captured" value={fmtDateTime(pod.capturedISO)} />
                <p className="text-muted-foreground">{pod.photoNote}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Captured by the driver after delivery.</p>
            )}
          </Panel>

          <Panel
            title="Booking"
            actions={
              <Button asChild size="sm" variant="ghost">
                <Link to="/app/bookings/$bookingId" params={{ bookingId: b.id }}>Open booking</Link>
              </Button>
            }
          >
            <div className="grid grid-cols-2 gap-3">
              <Metric label="Reference" value={b.ref} />
              <Metric label="Status" value={<StatusBadge status={b.status} />} />
              <Metric label="Cargo" value={`${b.cargo}`} />
              <Metric label="Weight" value={`${b.weightTons}t`} />
            </div>
          </Panel>

          <Panel title="Audit trail">
            <ol className="space-y-2.5">
              {history.slice(0, 12).map((a) => (
                <li key={a.id} className="text-sm">
                  <p>{a.action}</p>
                  <p className="text-xs text-muted-foreground">{a.actor} · {timeAgo(a.atISO)}</p>
                </li>
              ))}
            </ol>
          </Panel>
        </div>
      </div>
    </>
  );
}
