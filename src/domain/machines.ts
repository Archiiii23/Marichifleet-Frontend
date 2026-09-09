import type { BookingStatus, DocumentStatus, InvoiceStatus, JobCardStatus, TripStatus } from "./types";

export interface GuardResult {
  ok: boolean;
  reason?: string;
}

const bookingFlow: Record<BookingStatus, BookingStatus[]> = {
  draft: ["submitted", "cancelled"],
  submitted: ["confirmed", "cancelled"],
  confirmed: ["assigned", "cancelled"],
  assigned: ["dispatched", "confirmed", "cancelled"],
  dispatched: ["in_transit", "cancelled"],
  in_transit: ["delivered"],
  delivered: ["pod_pending"],
  pod_pending: ["pod_received"],
  pod_received: ["invoiced"],
  invoiced: ["partially_paid", "paid"],
  partially_paid: ["paid"],
  paid: ["closed"],
  closed: [],
  cancelled: [],
};

const tripFlow: Record<TripStatus, TripStatus[]> = {
  planned: ["driver_assigned"],
  driver_assigned: ["driver_accepted", "planned"],
  driver_accepted: ["started"],
  started: ["in_transit", "exception"],
  in_transit: ["arrived", "exception"],
  exception: ["in_transit", "arrived"],
  arrived: ["delivered"],
  delivered: ["pod_uploaded"],
  pod_uploaded: ["completed"],
  completed: [],
};

const invoiceFlow: Record<InvoiceStatus, InvoiceStatus[]> = {
  draft: ["issued", "cancelled"],
  issued: ["sent", "cancelled"],
  sent: ["partially_paid", "paid", "overdue", "cancelled"],
  overdue: ["partially_paid", "paid", "cancelled"],
  partially_paid: ["paid", "overdue"],
  paid: [],
  cancelled: [],
};

const jobFlow: Record<JobCardStatus, JobCardStatus[]> = {
  reported: ["inspected"],
  inspected: ["job_created"],
  job_created: ["parts_required", "in_progress"],
  parts_required: ["in_progress"],
  in_progress: ["completed"],
  completed: ["released"],
  released: [],
};

const docFlow: Record<DocumentStatus, DocumentStatus[]> = {
  valid: ["expiring", "expired"],
  expiring: ["renewal_pending", "expired"],
  expired: ["renewal_pending"],
  renewal_pending: ["renewed"],
  renewed: ["valid"],
};

function check<T extends string>(map: Record<T, T[]>, from: T, to: T, label: string): GuardResult {
  if (from === to) return { ok: true };
  return map[from]?.includes(to)
    ? { ok: true }
    : { ok: false, reason: `${label} cannot move from “${labelize(from)}” to “${labelize(to)}”.` };
}

export const canBooking = (from: BookingStatus, to: BookingStatus) =>
  check(bookingFlow, from, to, "Booking");
export const canTrip = (from: TripStatus, to: TripStatus) => check(tripFlow, from, to, "Trip");
export const canInvoice = (from: InvoiceStatus, to: InvoiceStatus) =>
  check(invoiceFlow, from, to, "Invoice");
export const canJobCard = (from: JobCardStatus, to: JobCardStatus) =>
  check(jobFlow, from, to, "Job card");
export const canDocument = (from: DocumentStatus, to: DocumentStatus) =>
  check(docFlow, from, to, "Document");

export function labelize(value: string): string {
  return value
    .split("_")
    .map((w) => (w.length <= 3 && w === w.toUpperCase() ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}

export const bookingOrder: BookingStatus[] = [
  "draft",
  "submitted",
  "confirmed",
  "assigned",
  "dispatched",
  "in_transit",
  "delivered",
  "pod_pending",
  "pod_received",
  "invoiced",
  "partially_paid",
  "paid",
  "closed",
];

export const tripOrder: TripStatus[] = [
  "planned",
  "driver_assigned",
  "driver_accepted",
  "started",
  "in_transit",
  "arrived",
  "delivered",
  "pod_uploaded",
  "completed",
];

export type Tone = "neutral" | "info" | "success" | "warning" | "danger";

export function statusTone(status: string): Tone {
  switch (status) {
    case "paid":
    case "completed":
    case "delivered":
    case "pod_received":
    case "available":
    case "valid":
    case "renewed":
    case "released":
    case "driver_accepted":
      return "success";
    case "overdue":
    case "expired":
    case "exception":
    case "cancelled":
    case "inactive":
    case "critical":
      return "danger";
    case "expiring":
    case "pod_pending":
    case "partially_paid":
    case "maintenance":
    case "parts_required":
    case "renewal_pending":
    case "leave":
    case "express":
      return "warning";
    case "in_transit":
    case "dispatched":
    case "on_trip":
    case "started":
    case "sent":
    case "issued":
    case "invoiced":
    case "confirmed":
    case "in_progress":
      return "info";
    default:
      return "neutral";
  }
}
