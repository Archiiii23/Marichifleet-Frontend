import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Circle } from "lucide-react";
import { useState } from "react";
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
  completeCheckpoint, markDelivered, reportException, resumeTrip, startTrip, tripProfit,
} from "@/domain/store";

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

  return (
    <>
      <PageHeader
        title={`${t.ref} · ${b.pickup.city} → ${b.drop.city}`}
        breadcrumb={[{ label: "Trips", to: "/app/trips" }, { label: t.ref }]}
        subtitle={`${v.regNo} · ${d.name} · booking ${b.ref}`}
        actions={
          <>
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
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-4">
          <Panel title="Live position" description={`Last ping ${timeAgo(v.lastPingISO)} · ${v.speedKph} km/h`}>
            <FleetMap items={[{ vehicle: v, trip: t, delayed: t.delayMins > 30 || t.status === "exception" }]} selectedId={v.id} height={340} />
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
