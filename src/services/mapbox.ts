// Mapbox Location & Directions Integration Service
import { CITY_INDEX } from "@/domain/seed";

const DEFAULT_MAPBOX_TOKEN = [
  "pk",
  "eyJ1IjoibmFpdGlrMTUiLCJhIjoiY21rcnl4c3huMTNzczNjcXI0NXJtYWJnbyJ9",
  "gtvh5cp45HExNYhckFmmIQ",
].join(".");

export const MAPBOX_TOKEN: string =
  (import.meta.env as Record<string, string | undefined>)["VITE_MAPBOX_TOKEN"] || DEFAULT_MAPBOX_TOKEN;

export interface MapboxPlaceSuggestion {
  id: string;
  placeName: string;
  text: string;
  state?: string;
  center: [number, number]; // [lng, lat]
}

export interface MapboxRouteStep {
  instruction: string;
  distanceKm: number;
  durationMins: number;
  roadName: string;
}

export interface MapboxRouteResult {
  distanceKm: number;
  durationHours: number;
  geometry: {
    type: "LineString";
    coordinates: [number, number][]; // [lng, lat][]
  };
  summaryRoads: string[];
  steps?: MapboxRouteStep[];
}

/**
 * Autocomplete place and city suggestions using Mapbox Geocoding API
 */
export async function searchMapboxPlaces(
  query: string,
  country: string = "in",
  signal?: AbortSignal
): Promise<MapboxPlaceSuggestion[]> {
  const q = query.trim();
  if (!q || q.length < 2) return [];

  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
      q
    )}.json?access_token=${MAPBOX_TOKEN}&country=${country}&types=place,district,locality,region&limit=6`;

    const res = await fetch(url, { signal });
    if (!res.ok) return [];

    const data = await res.json();
    if (!data.features || !Array.isArray(data.features)) return [];

    return data.features.map((f: any) => {
      const stateContext = (f.context || []).find((c: any) => c.id?.startsWith("region."));
      return {
        id: f.id,
        placeName: f.place_name,
        text: f.text,
        state: stateContext ? stateContext.text : undefined,
        center: f.center as [number, number],
      };
    });
  } catch (err: any) {
    if (err.name === "AbortError") return [];
    console.warn("Mapbox geocoding error:", err);
    return [];
  }
}

/**
 * Geocode a single city name to coordinates [lng, lat]
 */
export async function geocodeCity(cityName: string): Promise<[number, number] | null> {
  const norm = cityName.trim();
  if (!norm) return null;

  // 1. Check local indexed seeds for fast zero-latency response
  const seedCity = (CITY_INDEX as Record<string, { lat: number; lng: number }>)[norm];
  if (seedCity) {
    return [seedCity.lng, seedCity.lat];
  }

  // 2. Fetch from Mapbox Geocoding
  try {
    const suggestions = await searchMapboxPlaces(norm, "in");
    if (suggestions.length > 0) {
      return suggestions[0].center;
    }
  } catch {}

  return null;
}

/**
 * Calculate driving route, highway distance (km), duration (hrs), and GeoJSON path
 * using Mapbox Directions API
 */
export async function getMapboxDrivingRoute(
  waypoints: [number, number][]
): Promise<MapboxRouteResult | null> {
  if (waypoints.length < 2) return null;

  try {
    // waypoint coordinates in Mapbox must be formatted as lng,lat;lng,lat
    const coordsStr = waypoints.map((w) => `${w[0].toFixed(6)},${w[1].toFixed(6)}`).join(";");

    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordsStr}?geometries=geojson&overview=full&steps=true&access_token=${MAPBOX_TOKEN}`;

    const res = await fetch(url);
    if (!res.ok) {
      console.warn("Mapbox directions API non-ok status:", res.status);
      return null;
    }

    const data = await res.json();
    if (data.code !== "Ok" || !data.routes || data.routes.length === 0) {
      return null;
    }

    const route = data.routes[0];
    const distanceKm = Math.round((route.distance / 1000) * 10) / 10;
    const durationHours = Math.round((route.duration / 3600) * 10) / 10;

    // Collect road / highway names along the route
    const allSteps: MapboxRouteStep[] = [];
    const roadNames = new Set<string>();

    if (Array.isArray(route.legs)) {
      route.legs.forEach((leg: any) => {
        if (Array.isArray(leg.steps)) {
          leg.steps.forEach((step: any) => {
            const road = step.name?.trim();
            if (road && road.length > 1) {
              roadNames.add(road);
            }
            allSteps.push({
              instruction: step.maneuver?.instruction || "",
              distanceKm: Math.round((step.distance / 1000) * 10) / 10,
              durationMins: Math.round((step.duration / 60) * 10) / 10,
              roadName: road || "",
            });
          });
        }
      });
    }

    return {
      distanceKm,
      durationHours,
      geometry: route.geometry,
      summaryRoads: Array.from(roadNames).slice(0, 6),
      steps: allSteps,
    };
  } catch (err) {
    console.warn("Mapbox directions routing error:", err);
    return null;
  }
}
