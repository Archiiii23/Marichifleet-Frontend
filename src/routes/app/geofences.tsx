import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { KpiCard, PageHeader, Panel } from "@/components/mf/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useAction, useDb } from "@/domain/hooks";
import { getPrd, removeGeofence, saveGeofence, type Geofence } from "@/domain/prd";
import { useSession } from "@/domain/session";

const KINDS: Geofence["kind"][] = ["depot", "client site", "checkpoint", "restricted"];

/** Rough great-circle distance in km — enough for geofence containment in the demo. */
function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export const Route = createFileRoute("/app/geofences")({
  head: () => ({
    meta: [
      { title: "Geofences — MarichiFleet" },
      { name: "description", content: "Depot, client site and restricted-area geofences with automatic trip status changes and dwell alerts." },
      { property: "og:title", content: "Geofences — MarichiFleet" },
      { property: "og:description", content: "Define zones that update trip status and raise dwell alerts automatically." },
    ],
  }),
  component: Geofences;
});

function Geofences() {
  const db = useDb();
  const prd = getPrd();
  const run = useAction();
  const { persona } = useSession();

  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [kind, setKind] = useState<Geofence["kind"]>("client site");
  const [radiusKm, setRadius] = useState(1.5);
  const [lat, setLat] = useState(19.076);
  const [lng, setLng] = useState(72.8777);
  const [autoStatus, setAutoStatus] = useState(true);

  const inside = prd.geofences.map((g) => ({
    fence: g,
    vehicles: db.vehicles.filter((v) => distanceKm(v, g) <= g.radiusKm),
  }));
  const insideCount = inside.reduce((s, i) => s + i.vehicles.length, 0);

  return (
    <>
      <PageHeader
        title="Geofences"
        subtitle="Zones the control tower watches: arriving vehicles can change trip status automatically, and long dwells raise an alert."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Geofences" value={String(prd.geofences.length)} hint="Across all branches" />
        <KpiCard label="Vehicles inside a zone" value={String(insideCount)} hint="Live positions" to="/app/tracking" />
        <KpiCard label="Auto-status zones" value={String(prd.geofences.filter((g) => g.autoStatus).length)} hint="Update trips on entry" />
        <KpiCard label="Restricted zones" value={String(prd.geofences.filter((g) => g.kind === "restricted").length)} tone="warning" hint="Deviation alerts" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_340px]">
        <Panel title="Zones">
          <ul className="divide-y divide-border">
            {inside.map(({ fence: g, vehicles }) => (
              <li key={g.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{g.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {g.kind} · {g.city} · {g.radiusKm} km radius · dwell alert {g.dwellAlertMins}m
                    {g.autoStatus ? " · auto-status on" : ""}
                  </p>
                </div>
                <span className="numeric text-sm">{vehicles.length} inside</span>
                <Button size="sm" variant="ghost" onClick={() => run(() => removeGeofence(g.id, persona.name), `${g.name} removed.`)}>
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Add a zone">
          <div className="space-y-3">
            <label className="block text-sm">
              <span className="mb-1 block text-xs text-muted-foreground">Name</span>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Chennai warehouse" />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-xs text-muted-foreground">City</span>
              <Input value={city} onChange={(e) => setCity(e.target.value)} />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-xs text-muted-foreground">Type</span>
              <Select value={kind} onValueChange={(v) => setKind(v as Geofence["kind"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {KINDS.map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                </SelectContent>
              </Select>
            </label>
            <div className="grid grid-cols-3 gap-2">
              <label className="block text-sm">
                <span className="mb-1 block text-xs text-muted-foreground">Lat</span>
                <Input type="number" value={lat} onChange={(e) => setLat(Number(e.target.value))} />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs text-muted-foreground">Lng</span>
                <Input type="number" value={lng} onChange={(e) => setLng(Number(e.target.value))} />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs text-muted-foreground">Radius km</span>
                <Input type="number" step="0.1" value={radiusKm} onChange={(e) => setRadius(Number(e.target.value))} />
              </label>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={autoStatus} onCheckedChange={setAutoStatus} aria-label="Auto status" />
              Change trip status on entry
            </label>
            <Button
              className="w-full"
              size="sm"
              onClick={() => {
                const res = run(
                  () => saveGeofence({ name, city, kind, lat, lng, radiusKm, autoStatus, dwellAlertMins: 45 }, persona.name),
                  "Geofence created.",
                );
                if (res.ok) { setName(""); setCity(""); }
              }}
            >
              Add geofence
            </Button>
          </div>
        </Panel>
      </div>
    </>
  );
}
