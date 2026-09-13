import { canBooking, canDocument, canInvoice, canJobCard, canTrip, labelize, type GuardResult } from "./machines";
import { buildSeed, distanceKm } from "./seed";
import type {
  Booking,
  BookingStatus,
  DbShape,
  DocumentStatus,
  Driver,
  Invoice,
  JobCardStatus,
  Notification,
  NotificationEvent,
  Place,
  Role,
  Trip,
  Vehicle,
} from "./types";

let db: DbShape | null = null;
let seq = 1000;

/** Lazy init — never at module scope (Workers forbid globals doing work). */
export function getDb(): DbShape {
  if (!db) db = buildSeed(Date.now());
  return db;
}

export function resetDb() {
  db = buildSeed(Date.now());
}

const nid = (p: string) => `${p}_${++seq}`;
const now = () => new Date().toISOString();

export function audit(actor: string, action: string, entity: string, entityId: string, from?: string, to?: string) {
  getDb().audit.unshift({ id: nid("au"), actor, action, entity, entityId, from, to, atISO: now() });
}

export function notify(input: {
  event: NotificationEvent;
  channel: Notification["channel"];
  recipient: string;
  recipientRole: Role;
  body: string;
  link?: string;
  entityRef?: string;
}) {
  const d = getDb();
  // Mock provider adapter: a small share of WhatsApp sends fail and can be retried.
  const failed = input.channel === "whatsapp" && d.notifications.length % 11 === 0;
  d.notifications.unshift({
    id: nid("nt"),
    status: failed ? "failed" : "delivered",
    attempts: failed ? 1 : 1,
    atISO: now(),
    ...input,
  });
}

export function retryNotification(id: string) {
  const n = getDb().notifications.find((x) => x.id === id);
  if (!n) return { ok: false, reason: "Message not found." };
  n.attempts += 1;
  n.status = "delivered";
  n.atISO = now();
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* Derived reads                                                       */
/* ------------------------------------------------------------------ */

export const byId = <T extends { id: string }>(arr: T[], id?: string) => arr.find((x) => x.id === id);

export function clientName(id: string) {
  return getDb().clients.find((c) => c.id === id)?.name ?? "Unknown client";
}

export function tripProfit(t: Trip) {
  return t.revenue - t.fuelCost - t.tollCost - t.driverCost;
}

export function invoiceOutstanding(i: Invoice) {
  return Math.max(0, i.total - i.paid);
}

export function isOverdue(i: Invoice) {
  return i.status !== "paid" && i.status !== "cancelled" && new Date(i.dueISO).getTime() < Date.now();
}

export function vehicleEligibility(v: Vehicle, booking?: Booking): GuardResult {
  if (v.status === "maintenance") return { ok: false, reason: "Vehicle is in the workshop." };
  if (v.status === "inactive") return { ok: false, reason: "Vehicle is marked inactive." };
  if (v.currentTripId) return { ok: false, reason: "Vehicle is already on a live trip." };
  const expired = getDb().docs.filter(
    (d) => d.entityType === "vehicle" && d.entityId === v.id && d.status === "expired",
  );
  if (expired.length) return { ok: false, reason: `${expired[0].kind} has expired.` };
  if (booking && v.capacityTons < booking.weightTons)
    return { ok: false, reason: `Capacity ${v.capacityTons}t is below load ${booking.weightTons}t.` };
  return { ok: true };
}

export function driverEligibility(d: Driver): GuardResult {
  if (d.status === "inactive") return { ok: false, reason: "Driver is inactive." };
  if (d.status === "leave") return { ok: false, reason: "Driver is on leave." };
  if (d.status === "on_trip") return { ok: false, reason: "Driver is already running a trip." };
  if (new Date(d.licenceExpiryISO).getTime() < Date.now())
    return { ok: false, reason: "Driving licence has expired." };
  if (d.status === "rest") return { ok: false, reason: "Driver is in mandatory rest period." };
  return { ok: true };
}

/** Ranks assignable assets for the dispatch board. */
export function rankCandidates(booking: Booking) {
  const d = getDb();
  const vehicles = d.vehicles
    .map((v) => {
      const g = vehicleEligibility(v, booking);
      const proximity = distanceKm({ lat: v.lat, lng: v.lng }, booking.pickup);
      const typeMatch = v.type === booking.vehicleType ? 1 : 0;
      const score = Math.round(typeMatch * 50 + Math.max(0, 50 - proximity / 20));
      return { vehicle: v, eligible: g.ok, reason: g.reason, proximity, score };
    })
    .sort((a, b) => Number(b.eligible) - Number(a.eligible) || b.score - a.score);

  const drivers = d.drivers
    .map((dr) => {
      const g = driverEligibility(dr);
      const score = Math.round(dr.rating * 12 + Math.min(30, dr.tripsCompleted / 10));
      return { driver: dr, eligible: g.ok, reason: g.reason, score };
    })
    .sort((a, b) => Number(b.eligible) - Number(a.eligible) || b.score - a.score);

  return { vehicles, drivers };
}

/* ------------------------------------------------------------------ */
/* Mutations — every one guards, audits and notifies                   */
/* ------------------------------------------------------------------ */

export interface ActionResult {
  ok: boolean;
  reason?: string;
  id?: string;
}

export function setBookingStatus(bookingId: string, to: BookingStatus, actor: string): ActionResult {
  const b = byId(getDb().bookings, bookingId);
  if (!b) return { ok: false, reason: "Booking not found." };
  const g = canBooking(b.status, to);
  if (!g.ok) return g;
  const from = b.status;
  b.status = to;
  audit(actor, `Booking → ${labelize(to)}`, "booking", b.id, labelize(from), labelize(to));
  return { ok: true, id: b.id };
}

export function createBooking(input: {
  clientId: string;
  pickup: Place;
  drop: Place;
  cargo: string;
  weightTons: number;
  vehicleType: Vehicle["type"];
  priority: Booking["priority"];
  rate: number;
  pickupISO: string;
  actor: string;
  source: string;
  submit: boolean;
}): ActionResult {
  const d = getDb();
  const client = byId(d.clients, input.clientId);
  if (!client) return { ok: false, reason: "Select a client." };
  if (!input.pickup.city || !input.drop.city) return { ok: false, reason: "Pickup and destination are required." };
  if (input.pickup.city === input.drop.city)
    return { ok: false, reason: "Pickup and destination must be different." };
  if (input.weightTons <= 0) return { ok: false, reason: "Enter the load weight." };
  if (input.rate <= 0) return { ok: false, reason: "Enter a freight rate." };

  const id = nid("bk");
  const ref = `MF-${25100 + d.bookings.length}`;
  const booking: Booking = {
    id,
    ref,
    tenantId: d.tenant.id,
    clientId: input.clientId,
    status: input.submit ? "submitted" : "draft",
    pickup: input.pickup,
    drop: input.drop,
    distanceKm: distanceKm(input.pickup, input.drop),
    cargo: input.cargo || "General cargo",
    weightTons: input.weightTons,
    vehicleType: input.vehicleType,
    priority: input.priority,
    rate: input.rate,
    pickupISO: input.pickupISO,
    createdISO: now(),
    createdBy: input.source,
  };
  d.bookings.unshift(booking);
  audit(input.actor, "Created booking", "booking", id, undefined, labelize(booking.status));
  notify({
    event: "BOOKING_CREATED",
    channel: "whatsapp",
    recipient: client.phone,
    recipientRole: "client",
    body: `Booking ${ref} received: ${booking.pickup.city} → ${booking.drop.city}, ${booking.cargo}.`,
    link: `/app/bookings/${id}`,
    entityRef: ref,
  });
  return { ok: true, id };
}

export function confirmBooking(bookingId: string, actor: string): ActionResult {
  const res = setBookingStatus(bookingId, "confirmed", actor);
  if (!res.ok) return res;
  const b = byId(getDb().bookings, bookingId)!;
  notify({
    event: "BOOKING_CONFIRMED",
    channel: "whatsapp",
    recipient: byId(getDb().clients, b.clientId)!.phone,
    recipientRole: "client",
    body: `Booking ${b.ref} is confirmed. We will share vehicle details shortly.`,
    link: `/app/bookings/${b.id}`,
    entityRef: b.ref,
  });
  return res;
}

export function assignTrip(input: {
  bookingId: string;
  vehicleId: string;
  driverId: string;
  overrideReason?: string;
  actor: string;
}): ActionResult {
  const d = getDb();
  const b = byId(d.bookings, input.bookingId);
  if (!b) return { ok: false, reason: "Booking not found." };
  if (!["confirmed", "assigned"].includes(b.status))
    return { ok: false, reason: `A booking must be confirmed before dispatch (currently ${labelize(b.status)}).` };

  const v = byId(d.vehicles, input.vehicleId);
  const dr = byId(d.drivers, input.driverId);
  if (!v || !dr) return { ok: false, reason: "Choose both a vehicle and a driver." };

  const vg = vehicleEligibility(v, b);
  const dg = driverEligibility(dr);
  const blocked = !vg.ok || !dg.ok;
  if (blocked && !input.overrideReason)
    return { ok: false, reason: vg.reason ?? dg.reason };

  const hardBlock = v.status === "maintenance" || v.status === "inactive" || !!v.currentTripId;
  if (hardBlock) return { ok: false, reason: vg.reason ?? "Vehicle is not operable." };

  const tripId = nid("tr");
  const route: Array<{ lat: number; lng: number }> = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    route.push({
      lat: b.pickup.lat + (b.drop.lat - b.pickup.lat) * t,
      lng: b.pickup.lng + (b.drop.lng - b.pickup.lng) * t,
    });
  }
  const trip: Trip = {
    id: tripId,
    ref: `TRP-${9100 + d.trips.length}`,
    tenantId: d.tenant.id,
    bookingId: b.id,
    vehicleId: v.id,
    driverId: dr.id,
    status: "driver_assigned",
    checkpoints: [
      { id: `${tripId}_c1`, label: "Loading at origin", city: b.pickup.city, lat: b.pickup.lat, lng: b.pickup.lng },
      { id: `${tripId}_c2`, label: "Highway checkpoint", city: "Midway", lat: (b.pickup.lat + b.drop.lat) / 2, lng: (b.pickup.lng + b.drop.lng) / 2 },
      { id: `${tripId}_c3`, label: "City entry", city: b.drop.city, lat: b.drop.lat - 0.15, lng: b.drop.lng - 0.15 },
      { id: `${tripId}_c4`, label: "Unloading at destination", city: b.drop.city, lat: b.drop.lat, lng: b.drop.lng },
    ],
    progress: 0,
    etaISO: new Date(Date.now() + (b.distanceKm / 45) * 3600_000).toISOString(),
    delayMins: 0,
    route,
    revenue: b.rate,
    fuelCost: Math.round(b.distanceKm * 11.4),
    tollCost: Math.round(b.distanceKm * 2.1),
    driverCost: Math.round(b.distanceKm * 3.4),
  };
  d.trips.unshift(trip);
  b.tripId = tripId;
  b.status = "assigned";
  dr.status = "on_trip";
  dr.assignedVehicleId = v.id;

  audit(input.actor, `Assigned ${v.regNo} / ${dr.name}${input.overrideReason ? " (override)" : ""}`, "booking", b.id, "Confirmed", "Assigned");
  if (input.overrideReason)
    audit(input.actor, `Compliance override: ${input.overrideReason}`, "trip", tripId);

  notify({
    event: "DRIVER_ASSIGNED",
    channel: "whatsapp",
    recipient: dr.phone,
    recipientRole: "driver",
    body: `New trip ${trip.ref}: ${b.pickup.city} → ${b.drop.city}. Open the app to accept.`,
    link: `/driver/trips/${tripId}`,
    entityRef: trip.ref,
  });
  return { ok: true, id: tripId };
}

function tripTransition(tripId: string, to: Trip["status"], actor: string): ActionResult {
  const t = byId(getDb().trips, tripId);
  if (!t) return { ok: false, reason: "Trip not found." };
  const g = canTrip(t.status, to);
  if (!g.ok) return g;
  const from = t.status;
  t.status = to;
  audit(actor, `Trip → ${labelize(to)}`, "trip", t.id, labelize(from), labelize(to));
  return { ok: true, id: t.id };
}

export function acceptTrip(tripId: string, actor: string): ActionResult {
  const res = tripTransition(tripId, "driver_accepted", actor);
  if (!res.ok) return res;
  const t = byId(getDb().trips, tripId)!;
  const b = byId(getDb().bookings, t.bookingId)!;
  notify({
    event: "DRIVER_ACCEPTED",
    channel: "in_app",
    recipient: "Dispatch desk",
    recipientRole: "dispatcher",
    body: `${byId(getDb().drivers, t.driverId)!.name} accepted trip ${t.ref}.`,
    link: `/app/trips/${t.id}`,
    entityRef: t.ref,
  });
  if (b.status === "assigned") setBookingStatus(b.id, "dispatched", "System");
  return res;
}

export function startTrip(tripId: string, actor: string): ActionResult {
  const d = getDb();
  const t = byId(d.trips, tripId);
  if (!t) return { ok: false, reason: "Trip not found." };
  const res = tripTransition(tripId, "started", actor);
  if (!res.ok) return res;
  const v = byId(d.vehicles, t.vehicleId)!;
  v.status = "on_trip";
  v.currentTripId = t.id;
  v.speedKph = 46;
  v.lat = t.route[0].lat;
  v.lng = t.route[0].lng;
  v.lastPingISO = now();
  t.startedISO = now();
  t.progress = 0.02;
  t.checkpoints[0].doneISO = now();
  tripTransition(tripId, "in_transit", "System");
  const b = byId(d.bookings, t.bookingId)!;
  if (b.status === "assigned") setBookingStatus(b.id, "dispatched", "System");
  if (b.status === "dispatched") setBookingStatus(b.id, "in_transit", "System");
  notify({
    event: "TRIP_STARTED",
    channel: "whatsapp",
    recipient: byId(d.clients, b.clientId)!.phone,
    recipientRole: "client",
    body: `Your shipment ${b.ref} has started its journey from ${b.pickup.city}. Track it live.`,
    link: `/portal/tracking/${b.id}`,
    entityRef: b.ref,
  });
  return { ok: true, id: tripId };
}

export function completeCheckpoint(tripId: string, checkpointId: string, actor: string): ActionResult {
  const d = getDb();
  const t = byId(d.trips, tripId);
  if (!t) return { ok: false, reason: "Trip not found." };
  if (!["started", "in_transit", "exception"].includes(t.status))
    return { ok: false, reason: "Start the trip before updating checkpoints." };
  const cp = t.checkpoints.find((c) => c.id === checkpointId);
  if (!cp) return { ok: false, reason: "Checkpoint not found." };
  if (cp.doneISO) return { ok: false, reason: "Checkpoint already completed." };
  const idx = t.checkpoints.indexOf(cp);
  if (idx > 0 && !t.checkpoints[idx - 1].doneISO)
    return { ok: false, reason: "Complete the previous checkpoint first." };
  cp.doneISO = now();
  t.progress = (idx + 1) / t.checkpoints.length;
  const v = byId(d.vehicles, t.vehicleId)!;
  const p = t.route[Math.min(t.route.length - 1, Math.floor(t.progress * t.route.length))];
  v.lat = p.lat;
  v.lng = p.lng;
  v.lastPingISO = now();
  t.etaISO = new Date(Date.now() + (1 - t.progress) * 8 * 3600_000).toISOString();
  audit(actor, `Checkpoint: ${cp.label}`, "trip", t.id);
  notify({
    event: "ETA_UPDATED",
    channel: "whatsapp",
    recipient: byId(d.clients, byId(d.bookings, t.bookingId)!.clientId)!.phone,
    recipientRole: "client",
    body: `${cp.label} completed for ${t.ref}. Updated ETA ${new Date(t.etaISO).toLocaleString("en-IN")}.`,
    link: `/app/trips/${t.id}`,
    entityRef: t.ref,
  });
  if (t.progress >= 1) {
    t.status = "in_transit";
    tripTransition(tripId, "arrived", "System");
    v.speedKph = 0;
  }
  return { ok: true };
}

export function reportException(tripId: string, type: string, note: string, actor: string): ActionResult {
  const d = getDb();
  const t = byId(d.trips, tripId);
  if (!t) return { ok: false, reason: "Trip not found." };
  if (!["started", "in_transit", "exception"].includes(t.status))
    return { ok: false, reason: "Exceptions can only be raised on a running trip." };
  t.exception = { type, note, atISO: now() };
  t.delayMins += 45;
  t.status = "exception";
  const v = byId(d.vehicles, t.vehicleId)!;
  v.speedKph = 0;
  audit(actor, `Exception reported: ${type}`, "trip", t.id);
  notify({
    event: type.toLowerCase().includes("break") ? "BREAKDOWN_REPORTED" : "TRIP_DELAYED",
    channel: "in_app",
    recipient: "Dispatch desk",
    recipientRole: "dispatcher",
    body: `${type} on trip ${t.ref}: ${note}`,
    link: `/app/trips/${t.id}`,
    entityRef: t.ref,
  });
  if (type.toLowerCase().includes("break")) {
    d.jobCards.unshift({
      id: nid("jc"),
      ref: `JC-${3100 + d.jobCards.length}`,
      vehicleId: t.vehicleId,
      issue: `Breakdown on trip ${t.ref}: ${note}`,
      status: "reported",
      partsCost: 0,
      labourCost: 0,
      openedISO: now(),
    });
  }
  return { ok: true };
}

export function resumeTrip(tripId: string, actor: string): ActionResult {
  const t = byId(getDb().trips, tripId);
  if (!t) return { ok: false, reason: "Trip not found." };
  if (t.status !== "exception") return { ok: false, reason: "This trip has no open exception." };
  t.status = "in_transit";
  t.exception = undefined;
  audit(actor, "Exception cleared, trip resumed", "trip", t.id);
  return { ok: true };
}

export function advanceJobCard(
  jobCardId: string,
  to: JobCardStatus,
  actor: string,
  costs?: { partsCost: number; labourCost: number },
): ActionResult {
  const d = getDb();
  const job = byId(d.jobCards, jobCardId);
  if (!job) return { ok: false, reason: "Job card not found." };
  const guard = canJobCard(job.status, to);
  if (!guard.ok) return guard;
  if (costs) {
    if (costs.partsCost < 0 || costs.labourCost < 0) return { ok: false, reason: "Costs cannot be negative." };
    job.partsCost = costs.partsCost;
    job.labourCost = costs.labourCost;
  }
  if (to === "in_progress" && job.partsCost + job.labourCost <= 0) {
    return { ok: false, reason: "Add a parts or labour estimate before starting work." };
  }
  const from = job.status;
  job.status = to;
  if (to === "released") {
    job.closedISO = now();
    const vehicle = byId(d.vehicles, job.vehicleId);
    if (vehicle && vehicle.status === "maintenance") vehicle.status = "available";
  }
  audit(actor, `Job card → ${labelize(to)}`, "job_card", job.id, labelize(from), labelize(to));
  return { ok: true, id: job.id };
}

export function markDelivered(tripId: string, actor: string): ActionResult {
  const d = getDb();
  const t = byId(d.trips, tripId);
  if (!t) return { ok: false, reason: "Trip not found." };
  if (t.status === "in_transit" || t.status === "exception") {
    if (t.checkpoints.some((c) => !c.doneISO))
      return { ok: false, reason: "All checkpoints must be completed before delivery." };
    t.status = "arrived";
  }
  const res = tripTransition(tripId, "delivered", actor);
  if (!res.ok) return res;
  t.deliveredISO = now();
  t.progress = 1;
  const b = byId(d.bookings, t.bookingId)!;
  if (b.status === "in_transit") setBookingStatus(b.id, "delivered", "System");
  if (b.status === "delivered") setBookingStatus(b.id, "pod_pending", "System");
  notify({
    event: "TRIP_DELIVERED",
    channel: "whatsapp",
    recipient: byId(d.clients, b.clientId)!.phone,
    recipientRole: "client",
    body: `Shipment ${b.ref} delivered at ${b.drop.city}. POD will follow shortly.`,
    link: `/portal/bookings/${b.id}`,
    entityRef: b.ref,
  });
  return res;
}

export function capturePod(input: {
  tripId: string;
  receiverName: string;
  otp: string;
  photoNote: string;
  signatureSeed: string;
  actor: string;
}): ActionResult {
  const d = getDb();
  const t = byId(d.trips, input.tripId);
  if (!t) return { ok: false, reason: "Trip not found." };
  if (t.status !== "delivered" && t.status !== "arrived")
    return { ok: false, reason: "Mark the trip delivered before capturing POD." };
  if (!input.receiverName.trim()) return { ok: false, reason: "Receiver name is required." };
  if (!/^\d{4,6}$/.test(input.otp)) return { ok: false, reason: "Enter the 4–6 digit delivery OTP." };
  if (!input.signatureSeed) return { ok: false, reason: "Capture the receiver signature." };
  if (t.status === "arrived") {
    const r = markDelivered(t.id, input.actor);
    if (!r.ok) return r;
  }

  const podId = nid("pod");
  d.pods.unshift({
    id: podId,
    tripId: t.id,
    bookingId: t.bookingId,
    receiverName: input.receiverName,
    signatureSeed: input.signatureSeed,
    photoNote: input.photoNote || "Consignment photo captured at unloading bay.",
    otp: input.otp,
    capturedISO: now(),
    verified: true,
  });
  t.podId = podId;
  tripTransition(t.id, "pod_uploaded", input.actor);
  tripTransition(t.id, "completed", "System");
  const v = byId(d.vehicles, t.vehicleId)!;
  v.status = "available";
  v.currentTripId = undefined;
  v.speedKph = 0;
  const dr = byId(d.drivers, t.driverId)!;
  dr.status = "available";

  const b = byId(d.bookings, t.bookingId)!;
  if (b.status === "pod_pending") setBookingStatus(b.id, "pod_received", "System");
  audit(input.actor, "POD captured", "trip", t.id);
  notify({
    event: "POD_AVAILABLE",
    channel: "whatsapp",
    recipient: byId(d.clients, b.clientId)!.phone,
    recipientRole: "client",
    body: `POD for ${b.ref} is available. Signed by ${input.receiverName}.`,
    link: `/portal/pod/${b.id}`,
    entityRef: b.ref,
  });
  return { ok: true, id: podId };
}

export function invoiceEligibility(bookingId: string): GuardResult {
  const d = getDb();
  const b = byId(d.bookings, bookingId);
  if (!b) return { ok: false, reason: "Booking not found." };
  if (b.invoiceId) return { ok: false, reason: "This booking is already invoiced." };
  if (b.status !== "pod_received")
    return { ok: false, reason: "An invoice needs a delivered trip with POD received." };
  return { ok: true };
}

export function createInvoice(bookingId: string, actor: string, extraCharges = 0): ActionResult {
  const g = invoiceEligibility(bookingId);
  if (!g.ok) return g;
  const d = getDb();
  const b = byId(d.bookings, bookingId)!;
  const client = byId(d.clients, b.clientId)!;
  const lines = [
    { label: `Freight ${b.pickup.city} → ${b.drop.city} (${b.distanceKm} km)`, amount: b.rate },
    { label: "Loading / unloading", amount: 1200 },
  ];
  if (extraCharges > 0) lines.push({ label: "Detention / additional charges", amount: extraCharges });
  const subtotal = lines.reduce((s, l) => s + l.amount, 0);
  const total = Math.round(subtotal * 1.12);
  const id = nid("inv");
  d.invoices.unshift({
    id,
    ref: `INV-${7100 + d.invoices.length}`,
    tenantId: d.tenant.id,
    clientId: b.clientId,
    bookingId: b.id,
    tripId: b.tripId!,
    status: "draft",
    lines,
    subtotal,
    taxPct: 12,
    total,
    paid: 0,
    dueISO: new Date(Date.now() + client.creditDays * 86400_000).toISOString(),
    createdISO: now(),
  });
  b.invoiceId = id;
  setBookingStatus(b.id, "invoiced", "System");
  audit(actor, "Invoice draft created", "invoice", id);
  notify({
    event: "INVOICE_CREATED",
    channel: "email",
    recipient: client.email,
    recipientRole: "client",
    body: `Invoice draft raised for booking ${b.ref}, total ₹${total.toLocaleString("en-IN")}.`,
    link: `/app/finance/invoices/${id}`,
    entityRef: b.ref,
  });
  return { ok: true, id };
}

export function sendInvoice(invoiceId: string, actor: string): ActionResult {
  const d = getDb();
  const inv = byId(d.invoices, invoiceId);
  if (!inv) return { ok: false, reason: "Invoice not found." };
  if (inv.status === "draft") {
    const g = canInvoice("draft", "issued");
    if (!g.ok) return g;
    inv.status = "issued";
    inv.issuedISO = now();
  }
  const g2 = canInvoice(inv.status, "sent");
  if (!g2.ok) return g2;
  inv.status = "sent";
  const client = byId(d.clients, inv.clientId)!;
  audit(actor, "Invoice sent to client", "invoice", inv.id, "Issued", "Sent");
  notify({
    event: "PAYMENT_REMINDER",
    channel: "whatsapp",
    recipient: client.phone,
    recipientRole: "client",
    body: `Invoice ${inv.ref} for ₹${inv.total.toLocaleString("en-IN")} is due on ${new Date(inv.dueISO).toLocaleDateString("en-IN")}.`,
    link: `/portal/invoices/${inv.id}`,
    entityRef: inv.ref,
  });
  return { ok: true, id: inv.id };
}

export function generateEInvoice(invoiceId: string, actor: string): ActionResult {
  const d = getDb();
  const inv = byId(d.invoices, invoiceId);
  if (!inv) return { ok: false, reason: "Invoice not found." };
  
  // Generate deterministic 64-char hex IRN from invoice ID and tenant
  const chars = "0123456789abcdef";
  let fakeHex = "";
  for (let i = 0; i < 64; i++) {
    fakeHex += chars[(inv.id.charCodeAt(i % inv.id.length) * 31 + i * 7) % 16];
  }
  
  inv.irn = fakeHex;
  inv.ackNo = `1224${Math.floor(1000000000 + Math.random() * 9000000000)}`;
  inv.ackDateISO = now();
  inv.sacCode = "996511";
  inv.rcm = false;
  inv.qrCodeData = `NIC-IRP:GSTIN:${d.tenant.name.slice(0, 5).toUpperCase()}:IRN:${inv.irn}:DOC:${inv.ref}:VAL:${inv.total}:ACK:${inv.ackNo}`;
  
  audit(actor, "Generated e-Invoice IRN & Signed QR Code", "invoice", inv.id);
  return { ok: true, id: inv.id };
}

export function recordPayment(invoiceId: string, amount: number, mode: "NEFT" | "UPI" | "Cheque" | "Cash", reference: string, actor: string): ActionResult {
  const d = getDb();
  const inv = byId(d.invoices, invoiceId);
  if (!inv) return { ok: false, reason: "Invoice not found." };
  if (inv.status === "draft") return { ok: false, reason: "Send the invoice before recording payment." };
  if (inv.status === "paid") return { ok: false, reason: "This invoice is already settled." };
  if (amount <= 0) return { ok: false, reason: "Enter a payment amount." };
  if (amount > invoiceOutstanding(inv))
    return { ok: false, reason: `Amount exceeds the outstanding ₹${invoiceOutstanding(inv).toLocaleString("en-IN")}.` };

  d.payments.unshift({
    id: nid("pay"),
    invoiceId: inv.id,
    clientId: inv.clientId,
    amount,
    mode,
    reference: reference || `TXN${Math.floor(Date.now() / 1000)}`,
    receivedISO: now(),
  });
  inv.paid += amount;
  const from = inv.status;
  inv.status = inv.paid >= inv.total ? "paid" : "partially_paid";
  const b = byId(d.bookings, inv.bookingId);
  if (b) {
    if (inv.status === "partially_paid" && b.status === "invoiced") setBookingStatus(b.id, "partially_paid", "System");
    if (inv.status === "paid") {
      if (b.status === "invoiced") setBookingStatus(b.id, "paid", "System");
      else if (b.status === "partially_paid") setBookingStatus(b.id, "paid", "System");
      setBookingStatus(b.id, "closed", "System");
    }
  }
  audit(actor, `Payment ₹${amount.toLocaleString("en-IN")} via ${mode}`, "invoice", inv.id, labelize(from), labelize(inv.status));
  notify({
    event: "PAYMENT_RECEIVED",
    channel: "whatsapp",
    recipient: byId(d.clients, inv.clientId)!.phone,
    recipientRole: "client",
    body: `Payment of ₹${amount.toLocaleString("en-IN")} received against ${inv.ref}. Thank you.`,
    link: `/app/finance/invoices/${inv.id}`,
    entityRef: inv.ref,
  });
  return { ok: true, id: inv.id };
}

export function addFuelLog(input: {
  vehicleId: string;
  tripId?: string;
  litres: number;
  cost: number;
  odometerKm: number;
  station: string;
  actor: string;
}): ActionResult {
  const d = getDb();
  const v = byId(d.vehicles, input.vehicleId);
  if (!v) return { ok: false, reason: "Vehicle not found." };
  if (input.litres <= 0 || input.cost <= 0) return { ok: false, reason: "Enter litres and amount." };
  if (input.odometerKm < v.odometerKm - 50)
    return { ok: false, reason: `Odometer cannot be below the last reading (${v.odometerKm.toLocaleString("en-IN")} km).` };
  d.fuelLogs.unshift({
    id: nid("fl"),
    vehicleId: input.vehicleId,
    tripId: input.tripId,
    litres: input.litres,
    cost: input.cost,
    odometerKm: input.odometerKm,
    station: input.station || "Highway fuel station",
    atISO: now(),
  });
  v.odometerKm = input.odometerKm;
  v.fuelPct = Math.min(100, v.fuelPct + 35);
  if (input.tripId) {
    const t = byId(d.trips, input.tripId);
    if (t) t.fuelCost += input.cost;
  }
  audit(input.actor, `Fuel ${input.litres}L / ₹${input.cost.toLocaleString("en-IN")}`, "vehicle", v.id);
  return { ok: true };
}

/** Advances every live trip a little — powers the control-tower simulation. */
export function tickSimulation() {
  const d = getDb();
  let moved = 0;
  d.trips.forEach((t) => {
    if (t.status !== "in_transit" || t.progress >= 0.985) return;
    t.progress = Math.min(0.985, t.progress + 0.004 + Math.random() * 0.004);
    const v = byId(d.vehicles, t.vehicleId);
    if (!v) return;
    const p = t.route[Math.min(t.route.length - 1, Math.floor(t.progress * t.route.length))];
    v.lat = p.lat;
    v.lng = p.lng;
    v.speedKph = 34 + Math.round(Math.random() * 38);
    v.lastPingISO = now();
    moved++;
  });
  return moved;
}

/* ------------------------------------------------------------------ */
/* Reactivity — tiny external store so every screen stays in sync      */
/* ------------------------------------------------------------------ */

let version = 0;
const listeners = new Set<() => void>();

export function bump() {
  version++;
  listeners.forEach((l) => l());
}

export function subscribeDb(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export const getVersion = () => version;
export const getServerVersion = () => 0;

/**
 * Compliance renewals: request a renewal for an expiring/expired document, then
 * confirm it once the new paper arrives. Illegal jumps are refused by the
 * document state machine.
 */
export function advanceDocument(docId: string, to: DocumentStatus, actor: string, newExpiryISO?: string): ActionResult {
  const doc = getDb().docs.find((d) => d.id === docId);
  if (!doc) return { ok: false, reason: "That document no longer exists." };
  const guard = canDocument(doc.status, to);
  if (!guard.ok) return { ok: false, reason: guard.reason };
  const from = doc.status;
  doc.status = to;
  if (to === "renewed") {
    doc.expiryISO = newExpiryISO ?? new Date(Date.now() + 365 * 86400000).toISOString();
    doc.status = "valid";
  }
  audit(actor, `Document ${labelize(to)}`, "document", docId, from, doc.status);
  notify({
    event: "DOCUMENT_EXPIRING",
    channel: "in_app",
    recipient: "Compliance desk",
    recipientRole: "manager",
    body: `${doc.kind} ${doc.number} is now ${labelize(doc.status).toLowerCase()}.`,
    link: "/app/compliance",
    entityRef: doc.number,
  });
  return { ok: true };
}
