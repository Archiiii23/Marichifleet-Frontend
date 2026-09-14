import { apiClient } from "./apiClient";
import type { Tables } from "@/types/database";

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

export async function pushFix(_tenantId: string, fix: GpsFix) {
  await apiClient.post(`/tower/vehicles/${fix.vehicleId}/location`, {
    latitude: fix.lat,
    longitude: fix.lng,
    speedKmH: fix.speedKph,
    bearing: fix.heading,
  }).catch(() => undefined);
}

/** Advances every moving vehicle by one simulated fix. */
export async function tickFleet(tenantId: string) {
  try {
    const trips = await apiClient.get<any[]>('/tower/trips').catch(() => []);
    if (!trips?.length) return 0;
    const vehicles = await apiClient.get<any[]>('/tower/vehicles').catch(() => []);

    for (const trip of trips) {
      const vehicle = vehicles?.find((v: any) => v.id === trip.vehicleId || v.regNumber === trip.vehicleRegNumber);
      if (!vehicle) continue;
      const fix = provider.next(vehicle, trip);
      await pushFix(tenantId, fix);
    }
    return trips.length;
  } catch {
    return 0;
  }
}
