import { useEffect, useRef, useState, useMemo } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { cn } from "@/lib/utils";
import type { Trip, Vehicle } from "@/domain/types";
import { Layers, Maximize2, Navigation } from "lucide-react";

const DEFAULT_MAPBOX_TOKEN = [
  "pk",
  "eyJ1IjoibmFpdGlrMTUiLCJhIjoiY21rcnl4c3huMTNzczNjcXI0NXJtYWJnbyJ9",
  "gtvh5cp45HExNYhckFmmIQ",
].join(".");

const MAPBOX_TOKEN =
  (import.meta.env as Record<string, string | undefined>)["VITE_MAPBOX_TOKEN"] || DEFAULT_MAPBOX_TOKEN;

mapboxgl.accessToken = MAPBOX_TOKEN;

export interface MapVehicle {
  vehicle: Vehicle;
  trip?: Trip;
  delayed: boolean;
}

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
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<{ [key: string]: mapboxgl.Marker }>({});
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapStyle, setMapStyle] = useState<"dark" | "streets" | "satellite">("dark");
  const [webglError, setWebglError] = useState(false);

  // Mapbox style URLs
  const styleUrls = {
    dark: "mapbox://styles/mapbox/dark-v11",
    streets: "mapbox://styles/mapbox/navigation-night-v1",
    satellite: "mapbox://styles/mapbox/satellite-streets-v12",
  };

  // 1. Initialize Mapbox Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    try {
      // Calculate initial center based on vehicles or default to Central India
      let initialCenter: [number, number] = [78.9629, 20.5937]; // India centroid
      let initialZoom = 4.5;

      if (items.length > 0) {
        const validItems = items.filter(
          (i) => i.vehicle.lng && i.vehicle.lat && !isNaN(i.vehicle.lng) && !isNaN(i.vehicle.lat)
        );
        if (validItems.length > 0) {
          const avgLng = validItems.reduce((acc, i) => acc + i.vehicle.lng, 0) / validItems.length;
          const avgLat = validItems.reduce((acc, i) => acc + i.vehicle.lat, 0) / validItems.length;
          initialCenter = [avgLng, avgLat];
          initialZoom = validItems.length === 1 ? 9 : 5.5;
        }
      }

      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: styleUrls[mapStyle],
        center: initialCenter,
        zoom: initialZoom,
        attributionControl: false,
      });

      map.addControl(new mapboxgl.NavigationControl({ showCompass: true }), "top-right");

      map.on("load", () => {
        setMapLoaded(true);
        map.resize();
      });

      const resizeObserver = new ResizeObserver(() => {
        map.resize();
      });
      if (mapContainerRef.current) {
        resizeObserver.observe(mapContainerRef.current);
      }

      map.on("error", (e) => {
        console.warn("Mapbox GL warning:", e);
      });

      mapRef.current = map;
    } catch (err) {
      console.warn("WebGL not supported or Mapbox init failed, falling back to vector corridor:", err);
      setWebglError(true);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // 2. Handle Map Style Switch
  const switchStyle = (newStyle: "dark" | "streets" | "satellite") => {
    if (!mapRef.current || mapStyle === newStyle) return;
    setMapStyle(newStyle);
    mapRef.current.setStyle(styleUrls[newStyle]);
  };

  // 3. Sync Markers & Routes when items or map style changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    // Remove obsolete markers
    const currentVehicleIds = new Set(items.map((i) => i.vehicle.id));
    Object.keys(markersRef.current).forEach((id) => {
      if (!currentVehicleIds.has(id)) {
        markersRef.current[id].remove();
        delete markersRef.current[id];
      }
    });

    // Add or update markers
    items.forEach(({ vehicle, trip, delayed }) => {
      if (!vehicle.lat || !vehicle.lng) return;

      const active = vehicle.status === "on_trip";
      const colour = delayed
        ? "#eab308" // yellow
        : active
          ? "#22c55e" // green
          : vehicle.status === "maintenance"
            ? "#ef4444" // red
            : "#94a3b8"; // slate

      const isSel = selectedId === vehicle.id;

      if (!markersRef.current[vehicle.id]) {
        // Create custom pulsing DOM element
        const el = document.createElement("div");
        el.className = "group relative cursor-pointer select-none";
        el.setAttribute("aria-label", vehicle.regNo);

        el.innerHTML = `
          <div class="relative flex items-center justify-center">
            ${
              active
                ? `<div class="absolute -inset-2 rounded-full animate-ping opacity-75" style="background-color: ${colour}"></div>`
                : ""
            }
            <div class="relative flex size-6 items-center justify-center rounded-full border-2 border-white/90 shadow-md transition-transform duration-200 group-hover:scale-125" style="background-color: ${colour}">
              <div class="size-2 rounded-full bg-white"></div>
            </div>
            <div class="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-background/90 px-1.5 py-0.5 text-[10px] font-semibold text-foreground shadow border border-border/60 backdrop-blur-xs font-mono">
              ${vehicle.regNo}
            </div>
          </div>
        `;

        el.addEventListener("click", () => {
          onSelect?.(vehicle.id);
        });

        // Add Mapbox popup on click
        const popup = new mapboxgl.Popup({ offset: 25, closeButton: false }).setHTML(`
          <div style="font-family: monospace; padding: 4px; color: #0f172a;">
            <div style="font-weight: 700; font-size: 12px;">${vehicle.regNo}</div>
            <div style="font-size: 11px; color: #475569;">${vehicle.model}</div>
            ${trip ? `<div style="font-size: 10px; color: #0284c7; margin-top: 2px;">Trip: ${trip.ref}</div>` : ""}
            <div style="font-size: 10px; color: ${colour}; font-weight: 600; margin-top: 2px;">
              ${delayed ? "DELAYED" : active ? "ON TRIP (LIVE)" : vehicle.status.toUpperCase()}
            </div>
          </div>
        `);

        const marker = new mapboxgl.Marker({ element: el, anchor: "center" })
          .setLngLat([vehicle.lng, vehicle.lat])
          .setPopup(popup)
          .addTo(map);

        markersRef.current[vehicle.id] = marker;
      } else {
        // Update marker position
        markersRef.current[vehicle.id].setLngLat([vehicle.lng, vehicle.lat]);
      }
    });

    // Render Routes as GeoJSON Lines
    if (showRoutes) {
      items.forEach(({ vehicle, trip, delayed }) => {
        if (!trip || !trip.route || trip.route.length < 2) return;

        const sourceId = `route-src-${vehicle.id}`;
        const layerId = `route-layer-${vehicle.id}`;
        const coordinates = trip.route.map((p) => [p.lng, p.lat]);

        const geojsonData: GeoJSON.Feature<GeoJSON.LineString> = {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates,
          },
        };

        if (map.getSource(sourceId)) {
          (map.getSource(sourceId) as mapboxgl.GeoJSONSource).setData(geojsonData);
        } else {
          map.addSource(sourceId, {
            type: "geojson",
            data: geojsonData,
          });

          map.addLayer({
            id: layerId,
            type: "line",
            source: sourceId,
            layout: {
              "line-join": "round",
              "line-cap": "round",
            },
            paint: {
              "line-color": delayed ? "#eab308" : "#38bdf8",
              "line-width": selectedId === vehicle.id ? 4 : 2,
              "line-opacity": selectedId && selectedId !== vehicle.id ? 0.3 : 0.8,
            },
          });
        }
      });
    }
  }, [items, selectedId, mapLoaded, showRoutes, mapStyle]);

  // 4. Fly to selected vehicle
  useEffect(() => {
    if (!mapRef.current || !selectedId) return;
    const selected = items.find((i) => i.vehicle.id === selectedId);
    if (selected && selected.vehicle.lng && selected.vehicle.lat) {
      mapRef.current.flyTo({
        center: [selected.vehicle.lng, selected.vehicle.lat],
        zoom: 9,
        essential: true,
        duration: 1500,
      });
    }
  }, [selectedId, items]);

  // 5. Fit Bounds to all vehicles button
  const fitAll = () => {
    if (!mapRef.current || items.length === 0) return;
    const valid = items.filter((i) => i.vehicle.lng && i.vehicle.lat);
    if (valid.length === 0) return;

    if (valid.length === 1) {
      mapRef.current.flyTo({
        center: [valid[0].vehicle.lng, valid[0].vehicle.lat],
        zoom: 10,
      });
      return;
    }

    const bounds = new mapboxgl.LngLatBounds();
    valid.forEach((i) => bounds.extend([i.vehicle.lng, i.vehicle.lat]));
    mapRef.current.fitBounds(bounds, { padding: 60, maxZoom: 12 });
  };

  if (webglError) {
    return <FallbackSvgMap items={items} selectedId={selectedId} onSelect={onSelect} height={height} className={className} />;
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg border border-border bg-sidebar shadow-inner",
        className
      )}
      style={{ height }}
    >
      {/* Mapbox Map Container */}
      <div ref={mapContainerRef} className="absolute inset-0 size-full" />

      {/* Control Overlay Buttons */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 rounded-lg border border-border/80 bg-background/90 p-1 backdrop-blur-md shadow-sm">
        <button
          onClick={() => switchStyle("dark")}
          className={cn(
            "rounded px-2.5 py-1 text-[11px] font-medium transition-colors",
            mapStyle === "dark" ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
          )}
        >
          Dark
        </button>
        <button
          onClick={() => switchStyle("streets")}
          className={cn(
            "rounded px-2.5 py-1 text-[11px] font-medium transition-colors",
            mapStyle === "streets" ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
          )}
        >
          Nav
        </button>
        <button
          onClick={() => switchStyle("satellite")}
          className={cn(
            "rounded px-2.5 py-1 text-[11px] font-medium transition-colors",
            mapStyle === "satellite" ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
          )}
        >
          Satellite
        </button>
        <div className="h-3.5 w-px bg-border mx-0.5" />
        <button
          onClick={fitAll}
          title="Fit all fleet vehicles"
          className="flex items-center gap-1 rounded px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
        >
          <Maximize2 className="size-3" />
          <span>Fit All</span>
        </button>
      </div>

      {/* Mapbox Powered Badge & Legend */}
      <div className="absolute bottom-3 left-3 z-10 flex flex-wrap items-center gap-3 rounded-md border border-border/80 bg-background/90 px-3 py-1.5 text-[11px] backdrop-blur-md shadow-xs">
        <span className="font-mono text-[10px] text-muted-foreground/90 font-semibold tracking-wider uppercase border-r border-border pr-2.5">
          Mapbox Live
        </span>
        <Legend colour="#22c55e" label="Moving" />
        <Legend colour="#eab308" label="Delayed" />
        <Legend colour="#ef4444" label="Workshop" />
        <Legend colour="#94a3b8" label="Idle" />
      </div>
    </div>
  );
}

function Legend({ colour, label }: { colour: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
      <span className="size-2 rounded-full" style={{ background: colour }} aria-hidden />
      {label}
    </span>
  );
}

// Seamless Vector Fallback if WebGL is disabled or Mapbox token is blocked
const BOUNDS = { minLat: 8, maxLat: 30.5, minLng: 68, maxLng: 90 };
function project(lat: number, lng: number, w: number, h: number) {
  const x = ((lng - BOUNDS.minLng) / (BOUNDS.maxLng - BOUNDS.minLng)) * w;
  const y = (1 - (lat - BOUNDS.minLat) / (BOUNDS.maxLat - BOUNDS.minLat)) * h;
  return { x, y };
}

function FallbackSvgMap({
  items,
  selectedId,
  onSelect,
  className,
  height,
}: {
  items: MapVehicle[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  className?: string;
  height?: number;
}) {
  const W = 1000;
  const H = 620;

  return (
    <div className={cn("relative overflow-hidden rounded-lg border border-border bg-sidebar", className)} style={{ height }}>
      <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 size-full">
        {items.map(({ vehicle, delayed }) => {
          const { x, y } = project(vehicle.lat, vehicle.lng, W, H);
          const colour = delayed ? "var(--color-warning)" : "var(--color-success)";
          return (
            <g key={vehicle.id} transform={`translate(${x},${y})`} onClick={() => onSelect?.(vehicle.id)} className="cursor-pointer">
              <circle r={7} fill={colour} stroke="var(--color-background)" strokeWidth={2} />
              <text x={10} y={4} fontSize={12} fill="var(--color-foreground)" className="font-mono">{vehicle.regNo}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
