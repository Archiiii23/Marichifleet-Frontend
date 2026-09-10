import { createFileRoute } from "@tanstack/react-router";
import { Pause, Play } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { EmptyState, PageHeader, Panel, StatusBadge } from "@/components/mf/primitives";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { fmtDateTime, useDb } from "@/domain/hooks";

export const Route = createFileRoute("/app/playback")({
  head: () => ({
    meta: [
      { title: "Trip playback — MarichiFleet" },
      { name: "description", content: "Replay any recorded trip route point by point to review stops, deviations and idle time." },
      { property: "og:title", content: "Trip playback — MarichiFleet" },
      { property: "og:description", content: "Scrub through a completed trip's recorded route history." },
    ],
  }),
  component: Playback,
});

function Playback() {
  const db = useDb();
  const withRoute = db.trips.filter((t) => t.route.length > 1);
  const [tripId, setTripId] = useState(withRoute[0]?.id ?? "");
  const trip = withRoute.find((t) => t.id === tripId) ?? withRoute[0];
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => setIdx(0), [tripId]);

  useEffect(() => {
    if (!playing || !trip) return;
    const t = window.setInterval(() => {
      setIdx((i) => {
        if (i >= trip.route.length - 1) {
          setPlaying(false);
          return i;
        }
        return i + 1;
      });
    }, 220);
    return () => window.clearInterval(t);
  }, [playing, trip]);

  const path = useMemo(() => {
    if (!trip) return { d: "", pts: [] as Array<{ x: number; y: number }> };
    const lats = trip.route.map((p) => p.lat);
    const lngs = trip.route.map((p) => p.lng);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    const sx = (v: number) => 20 + ((v - minLng) / (maxLng - minLng || 1)) * 560;
    const sy = (v: number) => 260 - ((v - minLat) / (maxLat - minLat || 1)) * 220;
    const pts = trip.route.map((p) => ({ x: sx(p.lng), y: sy(p.lat) }));
    return { d: pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" "), pts };
  }, [trip]);

  if (!trip) {
    return (
      <>
        <PageHeader title="Trip playback" subtitle="Replay a recorded route." />
        <EmptyState title="No recorded routes yet" message="Once a trip has moved, its breadcrumb trail can be replayed here." />
      </>
    );
  }

  const head = path.pts[Math.min(idx, path.pts.length - 1)]!;
  const booking = db.bookings.find((b) => b.id === trip.bookingId);
  const vehicle = db.vehicles.find((v) => v.id === trip.vehicleId);

  return (
    <>
      <PageHeader
        title="Trip playback"
        subtitle="Scrub through a trip's recorded breadcrumb trail to review stops, detours and idle stretches."
        actions={
          <Select value={trip.id} onValueChange={setTripId}>
            <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
            <SelectContent>
              {withRoute.map((t) => {
                const b = db.bookings.find((x) => x.id === t.bookingId);
                return (
                  <SelectItem key={t.id} value={t.id}>
                    {t.ref} · {b ? `${b.pickup.city} → ${b.drop.city}` : "route"}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        }
      />

      <Panel
        title={`${trip.ref} — ${booking ? `${booking.pickup.city} → ${booking.drop.city}` : "route"}`}
        description={vehicle ? `${vehicle.regNo} · ${vehicle.make}` : undefined}
        actions={<StatusBadge status={trip.status} />}
      >
        <svg viewBox="0 0 600 280" className="h-72 w-full rounded-md border border-border bg-surface" role="img" aria-label="Recorded route">
          <path d={path.d} fill="none" stroke="currentColor" className="text-border-strong" strokeWidth="2" />
          <path
            d={path.pts.slice(0, idx + 1).map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ")}
            fill="none"
            stroke="currentColor"
            className="text-primary"
            strokeWidth="3"
          />
          <circle cx={head.x} cy={head.y} r="6" className="fill-primary" />
        </svg>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button size="sm" variant="outline" onClick={() => setPlaying((p) => !p)}>
            {playing ? <Pause className="size-3.5" aria-hidden /> : <Play className="size-3.5" aria-hidden />}
            {playing ? "Pause" : "Play"}
          </Button>
          <Slider
            className="min-w-40 flex-1"
            value={[idx]}
            min={0}
            max={trip.route.length - 1}
            step={1}
            onValueChange={([v]) => setIdx(v ?? 0)}
            aria-label="Playback position"
          />
          <span className="numeric text-xs text-muted-foreground">
            Point {idx + 1} / {trip.route.length}
          </span>
        </div>

        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs uppercase tracking-wider text-muted-foreground">Started</dt>
            <dd>{trip.startedISO ? fmtDateTime(trip.startedISO) : "Not started"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-muted-foreground">Delivered</dt>
            <dd>{trip.deliveredISO ? fmtDateTime(trip.deliveredISO) : "In progress"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-muted-foreground">Delay</dt>
            <dd>{trip.delayMins > 0 ? `${trip.delayMins} min behind plan` : "On schedule"}</dd>
          </div>
        </dl>
      </Panel>
    </>
  );
}
