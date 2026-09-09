import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { DataError, insertRow, selectOne, updateRow } from "./api";
import { emitNotification, writeAudit } from "./notifications";

export interface Ctx {
  tenantId: string;
  userId?: string | null;
  actorName?: string | null;
}

export type Booking = Tables<"bookings">;
export type Trip = Tables<"trips">;
export type Invoice = Tables<"invoices">;

const BOOKING_FLOW: Record<string, string[]> = {
  draft: ["submitted", "cancelled"],
  submitted: ["confirmed", "cancelled"],
  confirmed: ["assigned", "cancelled"],
  assigned: ["dispatched", "confirmed"],
  dispatched: ["in_transit"],
  in_transit: ["delivered"],
  delivered: ["pod_received"],
  pod_received: ["invoiced"],
  invoiced: ["partially_paid", "paid"],
  partially_paid: ["paid"],
  paid: ["closed"],
  closed: [],
  cancelled: [],
};

function assertTransition(from: string, to: string) {
  if (!(BOOKING_FLOW[from] ?? []).includes(to)) {
    throw new DataError(`A booking cannot move from ${from.replace(/_/g, " ")} to ${to.replace(/_/g, " ")}.`);
  }
}

function ref(prefix: string) {
  return `${prefix}-${Date.now().toString(36).toUpperCase().slice(-6)}`;
}

// ---------- bookings ----------

export interface NewBookingInput {
  client_id: string;
  pickup: Record<string, unknown>;
  drop_off: Record<string, unknown>;
  distance_km: number;
  cargo: string;
  weight_tons: number;
  vehicle_type: string;
  priority?: string;
  rate: number;
  pickup_at?: string | null;
  notes?: string | null;
  status?: string;
}

export async function createBooking(ctx: Ctx, input: NewBookingInput) {
  if (!input.client_id) throw new DataError("Choose a client for this booking.");
  if (!input.rate || input.rate <= 0) throw new DataError("Enter a rate greater than zero.");

  const booking = await insertRow("bookings", {
    tenant_id: ctx.tenantId,
    ref: ref("BK"),
    client_id: input.client_id,
    status: input.status ?? "submitted",
    pickup: input.pickup as never,
    drop_off: input.drop_off as never,
    distance_km: input.distance_km,
    cargo: input.cargo,
    weight_tons: input.weight_tons,
    vehicle_type: input.vehicle_type,
    priority: input.priority ?? "standard",
    rate: input.rate,
    pickup_at: input.pickup_at ?? null,
    notes: input.notes ?? null,
    created_by: ctx.userId ?? null,
  });

  await writeAudit({ ...ctx, action: "booking.created", entity: "booking", entityId: booking.id });
  await emitNotification({
    tenantId: ctx.tenantId,
    event: "BOOKING_CREATED",
    recipient: "operations",
    payload: { ref: booking.ref },
  });
  return booking;
}

export async function setBookingStatus(ctx: Ctx, bookingId: string, to: string) {
  const booking = await selectOne("bookings", bookingId);
  if (!booking) throw new DataError("Booking not found.");
  assertTransition(booking.status, to);
  const updated = await updateRow("bookings", bookingId, { status: to, updated_at: new Date().toISOString() });
  await writeAudit({ ...ctx, action: `booking.${to}`, entity: "booking", entityId: bookingId, metadata: { from: booking.status } });
  if (to === "confirmed") {
    await emitNotification({ tenantId: ctx.tenantId, event: "BOOKING_CONFIRMED", recipient: booking.client_id, payload: { ref: booking.ref } });
  }
  return updated;
}

// ---------- dispatch ----------

export async function dispatchBooking(
  ctx: Ctx,
  input: { bookingId: string; vehicleId: string; driverId: string; overrideReason?: string },
) {
  const [booking, vehicle, driver] = await Promise.all([
    selectOne("bookings", input.bookingId),
    selectOne("vehicles", input.vehicleId),
    selectOne("drivers", input.driverId),
  ]);
  if (!booking) throw new DataError("Booking not found.");
  if (!vehicle) throw new DataError("Vehicle not found.");
  if (!driver) throw new DataError("Driver not found.");
  if (!["confirmed", "assigned"].includes(booking.status)) {
    throw new DataError("Only a confirmed booking can be dispatched.");
  }
  if (vehicle.status !== "available") throw new DataError(`Vehicle ${vehicle.reg_no} is ${vehicle.status.replace(/_/g, " ")}.`);
  if (driver.status !== "available") throw new DataError(`${driver.name} is ${driver.status.replace(/_/g, " ")}.`);

  const { data: docs } = await supabase
    .from("documents")
    .select("doc_type,status,owner_id")
    .in("owner_id", [input.vehicleId, input.driverId])
    .eq("status", "expired");
  if ((docs?.length ?? 0) > 0 && !input.overrideReason) {
    throw new DataError("Expired compliance documents block this assignment. Add an override reason to continue.");
  }

  const trip = await insertRow("trips", {
    tenant_id: ctx.tenantId,
    ref: ref("TR"),
    booking_id: booking.id,
    vehicle_id: vehicle.id,
    driver_id: driver.id,
    status: "driver_assigned",
    revenue: booking.rate,
    eta_at: booking.pickup_at,
    checkpoints: [] as never,
    route: [] as never,
  });

  await Promise.all([
    updateRow("bookings", booking.id, { status: "assigned", trip_id: trip.id, updated_at: new Date().toISOString() }),
    updateRow("vehicles", vehicle.id, { status: "on_trip", current_trip_id: trip.id }),
    updateRow("drivers", driver.id, { status: "on_trip", assigned_vehicle_id: vehicle.id }),
  ]);

  await writeAudit({
    ...ctx,
    action: "trip.assigned",
    entity: "trip",
    entityId: trip.id,
    metadata: { vehicle: vehicle.reg_no, driver: driver.name, override: input.overrideReason ?? null },
  });
  await emitNotification({
    tenantId: ctx.tenantId,
    event: "DRIVER_ASSIGNED",
    recipient: driver.phone ?? driver.name,
    payload: { trip: trip.ref, pickup: String((booking.pickup as { city?: string }).city ?? "") },
  });
  return trip;
}

// ---------- trips ----------

const TRIP_FLOW: Record<string, string[]> = {
  planned: ["driver_assigned"],
  driver_assigned: ["driver_accepted"],
  driver_accepted: ["started"],
  started: ["in_transit", "exception"],
  in_transit: ["arrived", "exception"],
  exception: ["in_transit"],
  arrived: ["delivered"],
  delivered: ["pod_uploaded"],
  pod_uploaded: ["completed"],
  completed: [],
};

export async function advanceTrip(ctx: Ctx, tripId: string, to: string, extra?: Record<string, unknown>) {
  const trip = await selectOne("trips", tripId);
  if (!trip) throw new DataError("Trip not found.");
  if (!(TRIP_FLOW[trip.status] ?? []).includes(to)) {
    throw new DataError(`This trip cannot move from ${trip.status.replace(/_/g, " ")} to ${to.replace(/_/g, " ")}.`);
  }
  const patch: Record<string, unknown> = { status: to, updated_at: new Date().toISOString(), ...extra };
  if (to === "started") patch["started_at"] = new Date().toISOString();
  if (to === "delivered") {
    patch["delivered_at"] = new Date().toISOString();
    patch["progress"] = 100;
  }
  const updated = await updateRow("trips", tripId, patch as never);

  if (to === "started") await setBookingStatus(ctx, trip.booking_id, "dispatched").catch(() => undefined);
  if (to === "in_transit") await setBookingStatus(ctx, trip.booking_id, "in_transit").catch(() => undefined);
  if (to === "delivered") {
    await setBookingStatus(ctx, trip.booking_id, "delivered").catch(() => undefined);
    await emitNotification({ tenantId: ctx.tenantId, event: "TRIP_DELIVERED", recipient: "operations", payload: { trip: trip.ref } });
  }
  await writeAudit({ ...ctx, action: `trip.${to}`, entity: "trip", entityId: tripId, metadata: { from: trip.status } });
  return updated;
}

export async function reportException(ctx: Ctx, tripId: string, type: string, note: string) {
  const updated = await updateRow("trips", tripId, {
    status: "exception",
    exception: { type, note, at: new Date().toISOString() } as never,
  });
  await emitNotification({ tenantId: ctx.tenantId, event: "BREAKDOWN_REPORTED", recipient: "operations", payload: { type, note } });
  await writeAudit({ ...ctx, action: "trip.exception", entity: "trip", entityId: tripId, metadata: { type, note } });
  return updated;
}

// ---------- proof of delivery ----------

export async function uploadPod(
  ctx: Ctx,
  input: { tripId: string; bookingId: string; receiverName: string; otp: string; photoNote?: string; file?: File | Blob },
) {
  if (!input.receiverName.trim()) throw new DataError("Enter who received the shipment.");
  if (!/^\d{4,6}$/.test(input.otp)) throw new DataError("Enter the delivery OTP shared with the receiver.");

  let filePath: string | null = null;
  if (input.file) {
    const name = `${ctx.tenantId}/${input.tripId}-${Date.now()}`;
    const { error } = await supabase.storage.from("pod-files").upload(name, input.file, { upsert: true });
    if (error) throw new DataError(`Upload failed: ${error.message}`);
    filePath = name;
  }

  const pod = await insertRow("pods", {
    tenant_id: ctx.tenantId,
    trip_id: input.tripId,
    booking_id: input.bookingId,
    receiver_name: input.receiverName,
    otp: input.otp,
    photo_note: input.photoNote ?? null,
    file_path: filePath,
    verified: true,
  });

  await updateRow("trips", input.tripId, { pod_id: pod.id, status: "pod_uploaded" });
  await setBookingStatus(ctx, input.bookingId, "pod_received").catch(() => undefined);
  await emitNotification({ tenantId: ctx.tenantId, event: "POD_AVAILABLE", recipient: "client", payload: { pod: pod.id } });
  await writeAudit({ ...ctx, action: "pod.uploaded", entity: "pod", entityId: pod.id });
  return pod;
}

/** Private files are never public — hand out a short-lived signed link instead. */
export async function podFileUrl(path: string) {
  const { data, error } = await supabase.storage.from("pod-files").createSignedUrl(path, 300);
  if (error) throw new DataError(error.message);
  return data.signedUrl;
}

// ---------- invoicing ----------

export async function createInvoiceForBooking(ctx: Ctx, bookingId: string, taxPct = 18) {
  const booking = await selectOne("bookings", bookingId);
  if (!booking) throw new DataError("Booking not found.");
  if (!["pod_received", "delivered"].includes(booking.status)) {
    throw new DataError("An invoice can only be raised once proof of delivery is in.");
  }
  const { data: pod } = await supabase.from("pods").select("id").eq("booking_id", bookingId).maybeSingle();

  const subtotal = Number(booking.rate);
  const taxAmount = Math.round(subtotal * (taxPct / 100) * 100) / 100;
  const total = subtotal + taxAmount;

  const invoice = await insertRow("invoices", {
    tenant_id: ctx.tenantId,
    number: ref("INV"),
    client_id: booking.client_id,
    booking_id: booking.id,
    trip_id: booking.trip_id,
    pod_id: pod?.id ?? null,
    status: "issued",
    subtotal,
    tax_pct: taxPct,
    tax_amount: taxAmount,
    total,
    due_date: new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10),
  });

  await insertRow("invoice_lines", {
    tenant_id: ctx.tenantId,
    invoice_id: invoice.id,
    description: `Freight ${String((booking.pickup as { city?: string }).city ?? "")} → ${String((booking.drop_off as { city?: string }).city ?? "")}`,
    qty: 1,
    unit_price: subtotal,
    amount: subtotal,
  });

  await updateRow("bookings", booking.id, { invoice_id: invoice.id, status: "invoiced", updated_at: new Date().toISOString() });
  await emitNotification({ tenantId: ctx.tenantId, event: "INVOICE_CREATED", recipient: booking.client_id, payload: { number: invoice.number, total } });
  await writeAudit({ ...ctx, action: "invoice.created", entity: "invoice", entityId: invoice.id, metadata: { total } });
  return invoice;
}

export async function recordPayment(
  ctx: Ctx,
  input: { invoiceId: string; amount: number; method?: string; reference?: string },
) {
  const invoice = await selectOne("invoices", input.invoiceId);
  if (!invoice) throw new DataError("Invoice not found.");
  if (input.amount <= 0) throw new DataError("Enter an amount greater than zero.");
  if (input.amount > Number(invoice.balance)) throw new DataError("That is more than the outstanding balance.");

  const payment = await insertRow("payments", {
    tenant_id: ctx.tenantId,
    invoice_id: invoice.id,
    client_id: invoice.client_id,
    amount: input.amount,
    method: input.method ?? "bank_transfer",
    reference: input.reference ?? null,
  });

  const fresh = await selectOne("invoices", invoice.id);
  if (fresh?.status === "paid" && invoice.booking_id) {
    await updateRow("bookings", invoice.booking_id, { status: "paid", updated_at: new Date().toISOString() }).catch(() => undefined);
  }
  await emitNotification({ tenantId: ctx.tenantId, event: "PAYMENT_RECEIVED", recipient: invoice.client_id, payload: { amount: input.amount } });
  await writeAudit({ ...ctx, action: "payment.recorded", entity: "invoice", entityId: invoice.id, metadata: { amount: input.amount } });
  return payment;
}
