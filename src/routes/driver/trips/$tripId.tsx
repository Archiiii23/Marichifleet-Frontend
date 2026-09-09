import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, Circle, CloudOff } from "lucide-react";
import { useState } from "react";
import { Metric, Panel, StatusBadge } from "@/components/mf/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { fmtDateTime, useAction, useDb } from "@/domain/hooks";
import { useSession } from "@/domain/session";
import {
  acceptTrip, capturePod, completeCheckpoint, markDelivered, reportException, startTrip,
} from "@/domain/store";

export const Route = createFileRoute("/driver/trips/$tripId")({
  head: () => ({
    meta: [
      { title: "Trip — MarichiFleet Driver" },
      { name: "description", content: "Checkpoints, exception reporting and proof-of-delivery capture." },
    ],
  }),
  component: DriverTrip,
});

function DriverTrip() {
  const { tripId } = Route.useParams();
  const db = useDb();
  const run = useAction();
  const navigate = useNavigate();
  const { persona, online } = useSession();
  const [receiver, setReceiver] = useState("");
  const [otp, setOtp] = useState("");
  const [note, setNote] = useState("");
  const [signed, setSigned] = useState(false);

  const t = db.trips.find((x) => x.id === tripId);
  if (!t) return <p className="text-sm text-muted-foreground">Trip not found.</p>;
  const b = db.bookings.find((x) => x.id === t.bookingId)!;
  const pod = db.pods.find((p) => p.tripId === t.id);

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between gap-2">
          <h1 className="font-display text-xl font-semibold">{t.ref}</h1>
          <StatusBadge status={t.status} />
        </div>
        <p className="text-sm text-muted-foreground">{b.pickup.city} → {b.drop.city} · {b.cargo}</p>
      </div>

      {!online && (
        <p className="flex items-center gap-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-xs text-warning">
          <CloudOff className="size-4" aria-hidden /> Offline — updates are stored on the device and pushed on reconnect.
        </p>
      )}

      <Panel title="Trip">
        <div className="grid grid-cols-2 gap-4">
          <Metric label="Weight" value={`${b.weightTons}t`} />
          <Metric label="ETA" value={fmtDateTime(t.etaISO)} />
          <Metric label="Progress" value={`${Math.round(t.progress * 100)}%`} />
          <Metric label="Delay" value={`${t.delayMins} min`} tone={t.delayMins > 30 ? "warning" : undefined} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {t.status === "driver_assigned" && (
            <Button className="flex-1" onClick={() => run(() => acceptTrip(t.id, persona.name), "Trip accepted")}>Accept</Button>
          )}
          {t.status === "driver_accepted" && (
            <Button className="flex-1" onClick={() => run(() => startTrip(t.id, persona.name), "Trip started")}>Start trip</Button>
          )}
          {["in_transit", "arrived", "exception"].includes(t.status) && (
            <Button className="flex-1" variant="outline" onClick={() => run(() => markDelivered(t.id, persona.name), "Delivery confirmed")}>
              Mark delivered
            </Button>
          )}
          <Button variant="ghost" onClick={() => navigate({ to: "/driver/exception" })}>Report issue</Button>
        </div>
      </Panel>

      <Panel title="Checkpoints">
        <ol className="space-y-3">
          {t.checkpoints.map((c) => (
            <li key={c.id} className="flex items-center gap-3">
              {c.doneISO ? (
                <CheckCircle2 className="size-4 shrink-0 text-success" aria-hidden />
              ) : (
                <Circle className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              )}
              <span className="min-w-0 flex-1">
                <span className="block text-sm">{c.label}</span>
                <span className="block text-xs text-muted-foreground">{c.doneISO ? fmtDateTime(c.doneISO) : c.city}</span>
              </span>
              {!c.doneISO && (
                <Button size="sm" variant="outline" onClick={() => run(() => completeCheckpoint(t.id, c.id, persona.name), "Checkpoint saved")}>
                  Done
                </Button>
              )}
            </li>
          ))}
        </ol>
      </Panel>

      <Panel title="Proof of delivery" description={pod ? "Captured" : "Required before the trip can close"}>
        {pod ? (
          <div className="space-y-2 text-sm">
            <Metric label="Received by" value={pod.receiverName} />
            <Metric label="Captured" value={fmtDateTime(pod.capturedISO)} />
            <p className="text-muted-foreground">{pod.photoNote}</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1.5"><Label className="text-xs">Receiver name</Label><Input value={receiver} onChange={(e) => setReceiver(e.target.value)} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Delivery OTP</Label><Input value={otp} onChange={(e) => setOtp(e.target.value)} inputMode="numeric" placeholder="4–6 digits" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Photo note</Label><Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Condition of consignment at unloading" /></div>
            <button
              type="button"
              onClick={() => setSigned(true)}
              className={
                signed
                  ? "flex h-24 w-full items-center justify-center rounded-md border border-success/50 bg-success/10 text-sm text-success"
                  : "flex h-24 w-full items-center justify-center rounded-md border border-dashed border-border-strong text-sm text-muted-foreground"
              }
            >
              {signed ? "Signature captured" : "Tap to capture receiver signature"}
            </button>
            <Button
              className="w-full"
              onClick={() =>
                run(
                  () =>
                    capturePod({
                      tripId: t.id,
                      receiverName: receiver,
                      otp,
                      photoNote: note,
                      signatureSeed: signed ? `${t.id}-sig` : "",
                      actor: persona.name,
                    }),
                  "POD submitted — client notified",
                )
              }
            >
              Submit POD
            </Button>
          </div>
        )}
      </Panel>
    </div>
  );
}
