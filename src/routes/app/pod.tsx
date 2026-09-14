import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { DataTable } from "@/components/mf/data-table";
import { PageHeader, Panel, StatusBadge } from "@/components/mf/primitives";
import { Button } from "@/components/ui/button";
import { fmtDateTime, useAction, useDb } from "@/domain/hooks";
import { useSession } from "@/domain/session";
import { clientName, createInvoice, invoiceEligibility } from "@/domain/store";
import type { Booking } from "@/domain/types";

export const Route = createFileRoute("/app/pod")({
  head: () => ({
    meta: [
      { title: "Proof of delivery — MarichiFleet" },
      { name: "description", content: "Track POD capture and turn signed deliveries into invoices." },
    ],
  }),
  component: PodDesk,
});

import { useState } from "react";
import { Eye, FileCheck2 } from "lucide-react";
import { PodReviewModal } from "@/components/mf/pod-review-modal";

function PodDesk() {
  const db = useDb();
  const run = useAction();
  const navigate = useNavigate();
  const { persona, can } = useSession();

  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);

  const pending = db.bookings.filter((b) => ["delivered", "pod_pending"].includes(b.status));
  const received = db.bookings.filter((b) => b.status === "pod_received");

  const openPodReview = (b: Booking) => {
    setSelectedBooking(b);
    setReviewModalOpen(true);
  };

  const selectedTrip = selectedBooking?.tripId
    ? db.trips.find((t) => t.id === selectedBooking.tripId)
    : null;
  const selectedPod = selectedBooking
    ? db.pods.find((p) => p.bookingId === selectedBooking.id)
    : null;

  return (
    <>
      <PageHeader
        title="Proof of delivery"
        subtitle="Deliveries awaiting signed proof, and signed proofs waiting to be billed."
      />
      <div className="space-y-6">
        <Panel
          title="Awaiting POD Review"
          description={`${pending.length} deliveries awaiting POD review & consignee sign-off`}
        >
          {pending.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Every delivery has a signed POD.</p>
          ) : (
            <ul className="space-y-2">
              {pending.map((b) => (
                <li
                  key={b.id}
                  className="flex flex-wrap items-center gap-3 rounded-md border border-border p-3 hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => openPodReview(b)}
                >
                  <span className="numeric text-sm font-semibold text-primary">{b.ref}</span>
                  <span className="text-sm font-medium">{b.pickup.city} → {b.drop.city}</span>
                  <span className="text-xs text-muted-foreground">{clientName(b.clientId)}</span>
                  <StatusBadge status={b.status} className="ml-auto" />
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      openPodReview(b);
                    }}
                  >
                    <FileCheck2 className="size-3.5 mr-1" />
                    Review POD
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <DataTable<Booking>
          rows={received}
          searchKeys={(b) => `${b.ref} ${clientName(b.clientId)} ${b.drop.city}`}
          onRowClick={(b) => openPodReview(b)}
          emptyTitle="Nothing ready to bill"
          emptyMessage="Signed PODs appear here and can be converted into invoices in one click."
          columns={[
            { key: "ref", header: "Booking", cell: (b) => <span className="numeric font-medium">{b.ref}</span> },
            { key: "client", header: "Client", cell: (b) => clientName(b.clientId) },
            { key: "lane", header: "Lane", cell: (b) => `${b.pickup.city} → ${b.drop.city}` },
            {
              key: "pod",
              header: "Signed & Stamped",
              cell: (b) => {
                const p = db.pods.find((x) => x.bookingId === b.id);
                return p ? `${p.receiverName} · ${fmtDateTime(p.capturedISO)}` : "—";
              },
              hideOnMobile: true,
            },
            {
              key: "view",
              header: "Proof",
              cell: (b) => (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    openPodReview(b);
                  }}
                >
                  <Eye className="size-3" />
                  Inspect POD
                </Button>
              ),
            },
            {
              key: "action",
              header: "",
              className: "text-right",
              cell: (b) =>
                can("edit_finance") && invoiceEligibility(b.id).ok ? (
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      const res = run(() => createInvoice(b.id, persona.name), "Invoice draft created");
                      if (res.ok && res.id) navigate({ to: "/app/finance/invoices/$invoiceId", params: { invoiceId: res.id } });
                    }}
                  >
                    Create invoice
                  </Button>
                ) : (
                  <StatusBadge status={b.status} />
                ),
            },
          ]}
        />
      </div>

      {/* Dedicated POD Review & Approval Modal */}
      <PodReviewModal
        booking={selectedBooking}
        trip={selectedTrip}
        pod={selectedPod}
        open={reviewModalOpen}
        onOpenChange={setReviewModalOpen}
      />
    </>
  );
}
