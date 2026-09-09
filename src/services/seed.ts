import { supabase } from "@/integrations/supabase/client";
import { DataError } from "./api";

/**
 * Fills a brand-new workspace with believable Indian road-freight data so every
 * screen has something real to show. Clearly marked as demo and safe to re-run.
 */
export async function seedDemoData(tenantId: string) {
  const { count } = await supabase
    .from("vehicles")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId);
  if ((count ?? 0) > 0) return { skipped: true as const };

  const t = tenantId;
  const now = Date.now();
  const iso = (daysFromNow: number) => new Date(now + daysFromNow * 864e5).toISOString();

  const { data: clients, error: clientErr } = await supabase
    .from("clients")
    .insert([
      { tenant_id: t, name: "Adarsh Steel Works", contact_name: "Rohit Kulkarni", phone: "+919820011223", email: "rohit@adarshsteel.in", city: "Pune", gstin: "27AABCA1234K1Z5", credit_limit: 1500000, payment_terms_days: 30 },
      { tenant_id: t, name: "Sunrise Agro Foods", contact_name: "Kavita Nair", phone: "+919845566778", email: "kavita@sunriseagro.in", city: "Nashik", gstin: "27AACSS9876L1Z2", credit_limit: 900000, payment_terms_days: 21 },
      { tenant_id: t, name: "Meridian Retail", contact_name: "Arjun Sethi", phone: "+919833344556", email: "arjun@meridianretail.in", city: "Mumbai", gstin: "27AAECM4567P1Z9", credit_limit: 2500000, payment_terms_days: 45 },
    ])
    .select();
  if (clientErr) throw new DataError(clientErr.message);

  const { data: vehicles, error: vehicleErr } = await supabase
    .from("vehicles")
    .insert([
      { tenant_id: t, reg_no: "MH12 AB 4521", make: "Tata", model: "Signa 4825.TK", vehicle_type: "trailer", capacity_tons: 25, status: "available", odometer_km: 184220, lat: 18.5204, lng: 73.8567 },
      { tenant_id: t, reg_no: "MH14 CD 7788", make: "Ashok Leyland", model: "2820 6x4", vehicle_type: "truck", capacity_tons: 18, status: "available", odometer_km: 96140, lat: 19.076, lng: 72.8777 },
      { tenant_id: t, reg_no: "MH15 EF 3390", make: "BharatBenz", model: "1917R", vehicle_type: "truck", capacity_tons: 12, status: "in_maintenance", odometer_km: 142380, lat: 19.9975, lng: 73.7898 },
      { tenant_id: t, reg_no: "MH04 GH 1120", make: "Eicher", model: "Pro 3019", vehicle_type: "container", capacity_tons: 9, status: "available", odometer_km: 61220, lat: 18.5204, lng: 73.8567 },
    ])
    .select();
  if (vehicleErr) throw new DataError(vehicleErr.message);

  const { data: drivers, error: driverErr } = await supabase
    .from("drivers")
    .insert([
      { tenant_id: t, name: "Ramesh Yadav", phone: "+919812340001", licence_no: "MH1220110004521", licence_expiry: iso(240).slice(0, 10), status: "available", rating: 4.7, experience_years: 12 },
      { tenant_id: t, name: "Imran Shaikh", phone: "+919812340002", licence_no: "MH1420130009912", licence_expiry: iso(60).slice(0, 10), status: "available", rating: 4.4, experience_years: 8 },
      { tenant_id: t, name: "Suresh Pawar", phone: "+919812340003", licence_no: "MH1520090003318", licence_expiry: iso(-10).slice(0, 10), status: "on_leave", rating: 4.1, experience_years: 15 },
    ])
    .select();
  if (driverErr) throw new DataError(driverErr.message);

  await supabase.from("documents").insert([
    { tenant_id: t, owner_type: "vehicle", owner_id: vehicles![0]!.id, doc_type: "insurance", number: "INS-4521", expires_on: iso(120).slice(0, 10) },
    { tenant_id: t, owner_type: "vehicle", owner_id: vehicles![1]!.id, doc_type: "fitness", number: "FIT-7788", expires_on: iso(18).slice(0, 10) },
    { tenant_id: t, owner_type: "vehicle", owner_id: vehicles![2]!.id, doc_type: "permit", number: "PMT-3390", expires_on: iso(-5).slice(0, 10) },
    { tenant_id: t, owner_type: "driver", owner_id: drivers![0]!.id, doc_type: "licence", number: "MH1220110004521", expires_on: iso(240).slice(0, 10) },
  ]);

  const { data: bookings } = await supabase
    .from("bookings")
    .insert([
      { tenant_id: t, ref: "BK-1001", client_id: clients![0]!.id, status: "submitted", pickup: { city: "Pune", address: "Chakan MIDC Phase II", lat: 18.7606, lng: 73.8636 }, drop_off: { city: "Surat", address: "Sachin GIDC", lat: 21.1702, lng: 72.8311 }, distance_km: 418, cargo: "TMT bars", weight_tons: 21, vehicle_type: "trailer", priority: "standard", rate: 62000, pickup_at: iso(1) },
      { tenant_id: t, ref: "BK-1002", client_id: clients![1]!.id, status: "confirmed", pickup: { city: "Nashik", address: "Satpur MIDC", lat: 19.9975, lng: 73.7898 }, drop_off: { city: "Mumbai", address: "Bhiwandi Hub", lat: 19.2967, lng: 73.0631 }, distance_km: 168, cargo: "Packaged foods", weight_tons: 11, vehicle_type: "truck", priority: "express", rate: 27500, pickup_at: iso(0) },
      { tenant_id: t, ref: "BK-1003", client_id: clients![2]!.id, status: "delivered", pickup: { city: "Mumbai", address: "JNPT Gate 3", lat: 18.9498, lng: 72.9525 }, drop_off: { city: "Pune", address: "Ranjangaon", lat: 18.7606, lng: 74.2461 }, distance_km: 152, cargo: "Retail cartons", weight_tons: 8, vehicle_type: "container", priority: "standard", rate: 24000, pickup_at: iso(-2) },
    ])
    .select();

  await supabase.from("fuel_logs").insert([
    { tenant_id: t, vehicle_id: vehicles![0]!.id, driver_id: drivers![0]!.id, litres: 180, cost: 18540, odometer_km: 184100, station: "HP Chakan", filled_at: iso(-3) },
    { tenant_id: t, vehicle_id: vehicles![1]!.id, driver_id: drivers![1]!.id, litres: 140, cost: 14420, odometer_km: 96010, station: "IOC Nashik", filled_at: iso(-1) },
  ]);

  await supabase.from("vendors").insert([
    { tenant_id: t, name: "Sai Auto Works", category: "workshop", phone: "+912066554433", city: "Pune" },
    { tenant_id: t, name: "Tyre Junction", category: "tyres", phone: "+912066112233", city: "Nashik" },
  ]);

  return { skipped: false as const, clients: clients?.length ?? 0, vehicles: vehicles?.length ?? 0, bookings: bookings?.length ?? 0 };
}
