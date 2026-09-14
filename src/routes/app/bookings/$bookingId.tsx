import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, CheckCircle, FileCheck2, FileText, RefreshCw, Send, Trash2, Truck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Metric, PageHeader, Panel, StatusBadge } from "@/components/mf/primitives";
import { PodReviewModal } from "@/components/mf/pod-review-modal";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { fmtDate, fmtDateTime, inr, timeAgo, useAction, useDb } from "@/domain/hooks";
import { bookingOrder } from "@/domain/machines";
import { useSession } from "@/domain/session";
import { confirmBooking, createInvoice, deleteBooking, dispatchBooking, invoiceEligibility, markVehicleDelivered, setBookingStatus, tripProfit } from "@/domain/store";

export const Route = createFileRoute("/app/bookings/$bookingId")({
  head: () => ({
    meta: [
      { title: "Booking detail — MarichiFleet" },
      { name: "description", content: "Full lifecycle of a freight order: dispatch, trip, POD, invoice and payment." },
    ],
  }),
  component: BookingDetail,
});

function BookingDetail() {
  const { bookingId } = Route.useParams();
  const db = useDb();
  const run = useAction();
  const navigate = useNavigate();
  const { persona, can } = useSession();

  const b = db.bookings.find((x) => x.id === bookingId);
  if (!b) {
    return (
      <>
        <PageHeader title="Booking not found" breadcrumb={[{ label: "Bookings", to: "/app/bookings" }]} />
        <p className="text-sm text-muted-foreground">This booking reference no longer exists.</p>
      </>
    );
  }

  const client = db.clients.find((c) => c.id === b.clientId)!;
  const trip = db.trips.find((t) => t.id === b.tripId);
  const pod = db.pods.find((p) => p.bookingId === b.id);
  const invoice = db.invoices.find((i) => i.id === b.invoiceId);
  const history = db.audit.filter((a) => a.entityId === b.id || (trip && a.entityId === trip.id));
  const canInvoiceNow = invoiceEligibility(b.id);
  const [podReviewOpen, setPodReviewOpen] = useState(false);

  return (
    <>
      <PageHeader
        title={`${b.ref} · ${b.pickup.city} → ${b.drop.city}`}
        breadcrumb={[{ label: "Bookings", to: "/app/bookings" }, { label: b.ref }]}
        subtitle={`${client.name} · ${b.cargo} · ${b.weightTons}t · ${b.vehicleType}`}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={b.status} />
            {can("edit_booking") && b.status === "draft" && (
              <Button size="sm" onClick={() => run(() => setBookingStatus(b.id, "submitted", persona.name), "Booking submitted")}>
                Submit
              </Button>
            )}
            {can("edit_booking") && b.status === "submitted" && (
              <Button size="sm" onClick={() => {
                const res = run(() => confirmBooking(b.id, persona.name), "Booking confirmed");
                if (res.ok) navigate({ to: "/app/dispatch", search: { booking: b.id } });
              }}>
                Confirm & Move to Dispatch <ArrowRight className="size-3.5 ml-1" />
              </Button>
            )}
            {can("dispatch") && b.status === "confirmed" && (
              <Button size="sm" onClick={() => navigate({ to: "/app/dispatch", search: { booking: b.id } })}>
                Assign vehicle & Dispatch <ArrowRight className="size-3.5 ml-1" />
              </Button>
            )}
            {can("dispatch") && b.status === "assigned" && (
              <>
                <Button size="sm" variant="outline" onClick={() => navigate({ to: "/app/dispatch", search: { booking: b.id } })}>
                  <RefreshCw className="size-3.5 mr-1" /> Reassign
                </Button>
                <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium" onClick={() => run(() => dispatchBooking(b.id, persona.name), "Booking dispatched — vehicle is on trip")}>
                  <Truck className="size-3.5 mr-1.5" /> Dispatch Load
                </Button>
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm gap-1.5"
                  onClick={() => run(() => markVehicleDelivered(b.id, persona.name), `Vehicle marked delivered for ${b.ref}`)}
                >
                  <CheckCircle className="size-3.5" /> Mark Vehicle Delivered
                </Button>
              </>
            )}
            {can("dispatch") && ["dispatched", "in_transit"].includes(b.status) && (
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm gap-1.5"
                onClick={() => run(() => markVehicleDelivered(b.id, persona.name), `Vehicle marked delivered for ${b.ref}`)}
              >
                <CheckCircle className="size-3.5" /> Mark Vehicle Delivered
              </Button>
            )}
            {["delivered", "pod_pending"].includes(b.status) && (
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm gap-1.5"
                onClick={() => setPodReviewOpen(true)}
              >
                <FileCheck2 className="size-3.5" /> Review & Approve POD
              </Button>
            )}
            {can("edit_finance") && canInvoiceNow.ok && (
              <Button
                size="sm"
                onClick={() => {
                  const res = run(() => createInvoice(b.id, persona.name), "Invoice draft created");
                  if (res.ok && res.id) navigate({ to: "/app/finance/invoices/$invoiceId", params: { invoiceId: res.id } });
                }}
              >
                Create invoice
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (confirm(`Are you sure you want to delete booking ${b.ref}?`)) {
                  deleteBooking(b.id, persona.name);
                  toast.success(`Booking ${b.ref} deleted`);
                  navigate({ to: "/app/bookings" });
                }
              }}
              className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
            >
              <Trash2 className="size-4" />
              Delete Booking
            </Button>
          </div>
        }
      />

      <Panel title="Lifecycle" description="Guarded state machine — illegal jumps are blocked">
        <ol className="flex flex-wrap gap-1.5">
          {bookingOrder.map((s) => {
            const idx = bookingOrder.indexOf(b.status);
            const here = bookingOrder.indexOf(s);
            const done = idx >= 0 && here <= idx;
            return (
              <li
                key={s}
                className={
                  done
                    ? "rounded-md border border-primary/50 bg-primary/10 px-2.5 py-1 text-[11px] uppercase tracking-wide text-primary"
                    : "rounded-md border border-border px-2.5 py-1 text-[11px] uppercase tracking-wide text-muted-foreground"
                }
              >
                {s.replace(/_/g, " ")}
              </li>
            );
          })}
        </ol>
      </Panel>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4">
          <Panel title="Consignment">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Metric label="Distance" value={`${b.distanceKm} km`} />
              <Metric label="Rate" value={inr(b.rate)} />
              <Metric label="Priority" value={b.priority} />
              <Metric label="Pickup" value={fmtDate(b.pickupISO)} />
            </div>
            <Separator className="my-4" />
            <div className="grid gap-4 sm:grid-cols-2 text-sm">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Pickup</p>
                <p className="mt-1 font-medium">{b.pickup.city}</p>
                <p className="text-muted-foreground">{b.pickup.address}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Destination</p>
                <p className="mt-1 font-medium">{b.drop.city}</p>
                <p className="text-muted-foreground">{b.drop.address}</p>
              </div>
            </div>
          </Panel>

          <Panel
            title="Trip"
            description={trip ? `${trip.ref} · ${Math.round(trip.progress * 100)}% complete` : "Not dispatched yet"}
            actions={
              <div className="flex items-center gap-2">
                {can("dispatch") && (b.status === "assigned" || trip?.status === "driver_assigned") && (
                  <Button size="sm" onClick={() => run(() => dispatchBooking(b.id, persona.name), "Trip dispatched — vehicle is on trip")}>
                    <Truck className="size-3.5 mr-1.5" /> Dispatch Trip
                  </Button>
                )}
                {trip && ["driver_assigned", "driver_accepted", "started", "in_transit", "arrived"].includes(trip.status) && (
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium gap-1.5"
                    onClick={() => run(() => markVehicleDelivered(b.id, persona.name), `Vehicle marked delivered for ${b.ref}`)}
                  >
                    <CheckCircle className="size-3.5" /> Mark Vehicle Delivered
                  </Button>
                )}
                {trip && (
                  <Button asChild size="sm" variant="ghost">
                    <Link to="/app/trips/$tripId" params={{ tripId: trip.id }}>Open trip</Link>
                  </Button>
                )}
              </div>
            }
          >
            {trip ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Metric label="Status" value={<StatusBadge status={trip.status} />} />
                <Metric label="Vehicle" value={db.vehicles.find((v) => v.id === trip.vehicleId)?.regNo ?? "—"} />
                <Metric label="Driver" value={db.drivers.find((d) => d.id === trip.driverId)?.name ?? "—"} />
                <Metric label="ETA" value={fmtDateTime(trip.etaISO)} tone={trip.delayMins > 30 ? "warning" : undefined} />
                <Metric label="Revenue" value={inr(trip.revenue)} />
                <Metric label="Fuel" value={inr(trip.fuelCost)} />
                <Metric label="Tolls + driver" value={inr(trip.tollCost + trip.driverCost)} />
                <Metric label="Contribution" value={inr(tripProfit(trip))} tone="success" />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Confirm the booking, then assign a vehicle and driver from the dispatch board.
              </p>
            )}
          </Panel>

          <Panel
            title="Proof of delivery"
            actions={
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setPodReviewOpen(true)}>
                <FileText className="size-3.5" /> {pod ? "Inspect Signed POD" : "Review / Upload POD"}
              </Button>
            }
          >
            {pod ? (
              <div className="space-y-3">
                <div className="grid gap-4 sm:grid-cols-4 text-sm">
                  <Metric label="Received by" value={pod.receiverName} />
                  <Metric label="Captured" value={fmtDateTime(pod.capturedISO)} />
                  <Metric label="OTP verified" value={pod.verified ? "Yes" : "No"} tone={pod.verified ? "success" : "warning"} />
                  <Metric label="Status" value={pod.status === "approved" || b.status === "pod_received" ? "Verified" : "Pending Review"} tone="success" />
                  <p className="sm:col-span-4 text-muted-foreground">{pod.photoNote}</p>
                </div>
                <div
                  onClick={() => setPodReviewOpen(true)}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30 hover:bg-muted/60 transition-colors cursor-pointer text-xs"
                >
                  <FileText className="size-5 text-primary shrink-0" />
                  <div className="flex-1">
                    <div className="font-semibold text-foreground">Official Lorry Receipt & POD Stamp</div>
                    <div className="text-muted-foreground">LR-{b.ref.replace("MF-", "882")} · Stamped & Signed by {pod.receiverName}</div>
                  </div>
                  <Button size="sm" variant="secondary" className="h-7 text-xs">
                    Open Document View
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm py-1">
                <p className="text-muted-foreground">
                  {["delivered", "pod_pending"].includes(b.status)
                    ? "Consignment delivered. Ready for POD verification and consignee sign-off."
                    : "POD is captured at destination upon vehicle arrival and unloading."}
                </p>
                {["delivered", "pod_pending"].includes(b.status) && (
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 shrink-0"
                    onClick={() => setPodReviewOpen(true)}
                  >
                    <FileCheck2 className="size-3.5" /> Review & Mark Received
                  </Button>
                )}
              </div>
            )}
          </Panel>

          {can("view_finance") && (
            <Panel
              title="Billing"
              actions={
                invoice && (
                  <Button asChild size="sm" variant="ghost">
                    <Link to="/app/finance/invoices/$invoiceId" params={{ invoiceId: invoice.id }}>Open invoice</Link>
                  </Button>
                )
              }
            >
              {invoice ? (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <Metric label="Invoice" value={invoice.ref} />
                  <Metric label="Total" value={inr(invoice.total)} />
                  <Metric label="Paid" value={inr(invoice.paid)} tone="success" />
                  <Metric label="Status" value={<StatusBadge status={invoice.status} />} />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{canInvoiceNow.ok ? "Ready to invoice." : canInvoiceNow.reason}</p>
              )}
            </Panel>
          )}
        </div>

        <div className="space-y-4">
          <Panel title="Client">
            <p className="font-medium">{client.name}</p>
            <p className="text-sm text-muted-foreground">{client.contactName} · {client.phone}</p>
            <p className="text-sm text-muted-foreground">{client.email}</p>
            <Separator className="my-3" />
            <div className="grid grid-cols-2 gap-3">
              <Metric label="Segment" value={client.segment} />
              <Metric label="Credit days" value={String(client.creditDays)} />
            </div>
          </Panel>

          <Panel title="Audit trail" description="Who changed what, and when">
            <ol className="space-y-3">
              {history.slice(0, 12).map((a) => (
                <li key={a.id} className="text-sm">
                  <p>{a.action}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.actor} · {timeAgo(a.atISO)}
                    {a.from && a.to ? ` · ${a.from} → ${a.to}` : ""}
                  </p>
                </li>
              ))}
              {history.length === 0 && <p className="text-sm text-muted-foreground">No changes recorded yet.</p>}
            </ol>
          </Panel>
        </div>
      </div>

      <PodReviewModal
        booking={b}
        trip={trip}
        pod={pod}
        open={podReviewOpen}
        onOpenChange={setPodReviewOpen}
      />
    </>
  );
}
