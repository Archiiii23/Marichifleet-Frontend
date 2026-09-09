import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Panel, StatusBadge } from "@/components/mf/primitives";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAction, useDb } from "@/domain/hooks";
import { useSession } from "@/domain/session";
import { reportException } from "@/domain/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/driver/exception")({
  head: () => ({
    meta: [
      { title: "Report an issue — MarichiFleet Driver" },
      { name: "description", content: "Raise a delay, breakdown or detention from the road." },
    ],
  }),
  component: DriverException,
});

const TYPES = ["Traffic delay", "Breakdown", "Detention at loading", "Accident", "Route diversion", "Weather"];

function DriverException() {
  const db = useDb();
  const run = useAction();
  const navigate = useNavigate();
  const { persona } = useSession();
  const driverId = persona.driverId ?? db.drivers[0]?.id;
  const live = db.trips.filter((t) => t.driverId === driverId && ["started", "in_transit", "exception"].includes(t.status));
  const [tripId, setTripId] = useState(live[0]?.id ?? "");
  const [type, setType] = useState(TYPES[0]);
  const [note, setNote] = useState("");

  return (
    <div className="space-y-4">
      <h1 className="font-display text-xl font-semibold">Report an issue</h1>
      {live.length === 0 ? (
        <Panel title="No running trip">
          <p className="text-sm text-muted-foreground">Issues can be raised only while a trip is running.</p>
        </Panel>
      ) : (
        <Panel title="Details" description="Dispatch is alerted immediately; breakdowns open a workshop job card.">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Trip</Label>
              <div className="space-y-1.5">
                {live.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTripId(t.id)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-md border p-2.5 text-left text-sm",
                      tripId === t.id ? "border-primary bg-primary/10" : "border-border",
                    )}
                  >
                    <span className="numeric">{t.ref}</span>
                    <StatusBadge status={t.status} />
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Type</Label>
              <div className="flex flex-wrap gap-1.5">
                {TYPES.map((x) => (
                  <button
                    key={x}
                    onClick={() => setType(x)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs",
                      type === x ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground",
                    )}
                  >
                    {x}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">What happened?</Label>
              <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
            <Button
              className="w-full"
              onClick={() => {
                const res = run(() => reportException(tripId, type, note, persona.name), "Dispatch has been alerted");
                if (res.ok) navigate({ to: "/driver/trips/$tripId", params: { tripId } });
              }}
            >
              Send report
            </Button>
          </div>
        </Panel>
      )}
    </div>
  );
}
