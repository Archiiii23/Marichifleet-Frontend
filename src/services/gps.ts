import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export interface GpsFix {
  vehicleId: string;
  tripId?: string | null;
  lat: number;
  lng: number;
  speedKph: number;
  heading: number;
  recordedAt: string;
}

/** Swap this for a real telematics adapter later — callers never change. */
export interface GpsProvider {
  readonly id: string;
  readonly isMock: boolean;
  next(vehicle: Tables<"vehicles">, trip?: Tables<"trips"> | null): GpsFix;
}

export const mockGpsProvider: GpsProvider = {
  id: "mock-gps",
  isMock: true,
  next(vehicle, trip) {
    const route = (trip?.route as Array<{ lat: number; lng: number }> | undefined) ?? [];
    const progress = Math.min(1, (Number(trip?.progress ?? 0) + 4) / 100);
    const point = route.length ? route[Math.min(route.length - 1, Math.floor(progress * (route.length - 1)))] : null;
    const lat = point?.lat ?? vehicle.lat + (Math.random() - 0.5) * 0.05;
    const lng = point?.lng ?? vehicle.lng + (Math.random() - 0.5) * 0.05;
    return {
      vehicleId: vehicle.id,
      tripId: trip?.id ?? null,
      lat,
      lng,
      speedKph: trip ? 38 + Math.round(Math.random() * 26) : 0,
      heading: Math.round(Math.random() * 359),
      recordedAt: new Date().toISOString(),
    };
  },
};

let provider: GpsProvider = mockGpsProvider;
export function setGpsProvider(next: GpsProvider) {
  provider = next;
}
export function getGpsProvider() {
  return provider;
}

export async function pushFix(tenantId: string, fix: GpsFix) {
  await supabase.from("gps_pings").insert({
    tenant_id: tenantId,
    vehicle_id: fix.vehicleId,
    trip_id: fix.tripId ?? null,
    lat: fix.lat,
    lng: fix.lng,
    speed_kph: fix.speedKph,
    heading: fix.heading,
    source: provider.id,
    recorded_at: fix.recordedAt,
  });
  await supabase
    .from("vehicles")
    .update({ lat: fix.lat, lng: fix.lng, speed_kph: fix.speedKph, last_ping_at: fix.recordedAt })
    .eq("id", fix.vehicleId);
}

/** Advances every moving vehicle by one simulated fix. */
export async function tickFleet(tenantId: string) {
  const { data: trips } = await supabase
    .from("trips")
    .select("*")
    .in("status", ["started", "in_transit"]);
  if (!trips?.length) return 0;
  const vehicleIds = trips.map((t) => t.vehicle_id).filter(Boolean) as string[];
  if (!vehicleIds.length) return 0;
  const { data: vehicles } = await supabase.from("vehicles").select("*").in("id", vehicleIds);

  for (const trip of trips) {
    const vehicle = vehicles?.find((v) => v.id === trip.vehicle_id);
    if (!vehicle) continue;
    const fix = provider.next(vehicle, trip);
    await pushFix(tenantId, fix);
    await supabase
      .from("trips")
      .update({ progress: Math.min(100, Number(trip.progress) + 4) })
      .eq("id", trip.id);
  }
  return trips.length;
}
