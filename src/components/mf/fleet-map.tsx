import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { Trip, Vehicle } from "@/domain/types";

const BOUNDS = { minLat: 8, maxLat: 30.5, minLng: 68, maxLng: 90 };

function project(lat: number, lng: number, w: number, h: number) {
  const x = ((lng - BOUNDS.minLng) / (BOUNDS.maxLng - BOUNDS.minLng)) * w;
  const y = (1 - (lat - BOUNDS.minLat) / (BOUNDS.maxLat - BOUNDS.minLat)) * h;
  return { x, y };
}

export interface MapVehicle {
  vehicle: Vehicle;
  trip?: Trip;
  delayed: boolean;
}

/**
 * Custom control-tower map surface. Coordinates are projected onto a stylised
 * corridor canvas; the component contract (markers + selection) is what a real
 * map provider would later implement.
 */
export function FleetMap({
  items,
  selectedId,
  onSelect,
  showRoutes = true,
  className,
  height = 460,
}: {
  items: MapVehicle[];
  selectedId?: string | null;
  onSelect?: (vehicleId: string) => void;
  showRoutes?: boolean;
  className?: string;
  height?: number;
}) {
  const W = 1000;
  const H = 620;

  const routes = useMemo(
    () =>
      items
        .filter((i) => i.trip && showRoutes)
        .map((i) => ({
          id: i.vehicle.id,
          delayed: i.delayed,
          d: i
            .trip!.route.map((p, idx) => {
              const { x, y } = project(p.lat, p.lng, W, H);
              return `${idx === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
            })
            .join(" "),
        })),
    [items, showRoutes],
  );

  return (
    <div
      className={cn("relative overflow-hidden rounded-lg border border-border bg-sidebar", className)}
      style={{ height }}
    >
      <div className="grid-canvas absolute inset-0 opacity-40" aria-hidden />
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="absolute inset-0 size-full"
        role="img"
        aria-label={`Fleet map showing ${items.length} vehicles`}
      >
        <defs>
          <radialGradient id="mf-glow" cx="50%" cy="45%" r="60%">
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.10" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>
        <rect width={W} height={H} fill="url(#mf-glow)" />

        {routes.map((r) => (
          <g key={r.id}>
            <path
              d={r.d}
              fill="none"
              stroke={r.delayed ? "var(--color-warning)" : "var(--color-info)"}
              strokeOpacity={selectedId && selectedId !== r.id ? 0.12 : 0.34}
              strokeWidth={selectedId === r.id ? 2.6 : 1.4}
            />
            {selectedId === r.id && (
              <path
                d={r.d}
                fill="none"
                stroke="var(--color-primary)"
                strokeWidth={2.6}
                strokeDasharray="10 12"
                style={{ animation: "mf-dash 1.6s linear infinite" }}
              />
            )}
          </g>
        ))}

        {items.map(({ vehicle, delayed, trip }) => {
          const { x, y } = project(vehicle.lat, vehicle.lng, W, H);
          const active = vehicle.status === "on_trip";
          const colour = delayed
            ? "var(--color-warning)"
            : active
              ? "var(--color-success)"
              : vehicle.status === "maintenance"
                ? "var(--color-destructive)"
                : "var(--color-muted-foreground)";
          const isSel = selectedId === vehicle.id;
          return (
            <g
              key={vehicle.id}
              transform={`translate(${x},${y})`}
              onClick={() => onSelect?.(vehicle.id)}
              className={onSelect ? "cursor-pointer" : undefined}
              tabIndex={onSelect ? 0 : -1}
              role={onSelect ? "button" : undefined}
              aria-label={`${vehicle.regNo}${trip ? `, trip ${trip.ref}` : ""}`}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSelect?.(vehicle.id);
              }}
            >
              {active && (
                <circle r={9} fill={colour} opacity={0.5} style={{ animation: "mf-pulse-ring 2.4s ease-out infinite" }} />
              )}
              <circle r={isSel ? 9 : 6} fill={colour} stroke="var(--color-background)" strokeWidth={2} />
              {isSel && (
                <text x={12} y={4} fontSize={13} fill="var(--color-foreground)" className="font-mono">
                  {vehicle.regNo}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      <div className="absolute bottom-3 left-3 flex flex-wrap gap-3 rounded-md border border-border bg-background/85 px-3 py-2 text-[11px] backdrop-blur">
        <Legend colour="var(--color-success)" label="Moving" />
        <Legend colour="var(--color-warning)" label="Delayed" />
        <Legend colour="var(--color-destructive)" label="Workshop" />
        <Legend colour="var(--color-muted-foreground)" label="Idle" />
      </div>
    </div>
  );
}

function Legend({ colour, label }: { colour: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-muted-foreground">
      <span className="size-2 rounded-full" style={{ background: colour }} aria-hidden />
      {label}
    </span>
  );
}
