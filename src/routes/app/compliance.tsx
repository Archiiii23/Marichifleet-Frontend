import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { DataTable } from "@/components/mf/data-table";
import { KpiCard, PageHeader, StatusBadge } from "@/components/mf/primitives";
import { Button } from "@/components/ui/button";
import { fmtDate, useAction, useDb } from "@/domain/hooks";
import { useSession } from "@/domain/session";
import { advanceDocument } from "@/domain/store";
import type { ComplianceDoc } from "@/domain/types";

export const Route = createFileRoute("/app/compliance")({
  head: () => ({
    meta: [
      { title: "Compliance & renewals — MarichiFleet" },
      { name: "description", content: "Permits, insurance, fitness and licences with expiry alerts and renewal tracking." },
      { property: "og:title", content: "Compliance & renewals — MarichiFleet" },
      { property: "og:description", content: "Never dispatch on an expired permit, licence or insurance again." },
    ],
  }),
  component: Compliance,
});

function Compliance() {
  const db = useDb();
  const navigate = useNavigate();
  const run = useAction();
  const { persona, can } = useSession();
  const canRenew = can("edit_fleet") || can("view_admin");

  const owner = (d: ComplianceDoc) =>
    d.entityType === "vehicle"
      ? db.vehicles.find((v) => v.id === d.entityId)?.regNo ?? "—"
      : db.drivers.find((x) => x.id === d.entityId)?.name ?? "—";

  return (
    <>
      <PageHeader title="Compliance" subtitle="Expired documents block dispatch unless a supervisor overrides with a reason." />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Documents" value={String(db.docs.length)} hint="Vehicles and drivers" />
        <KpiCard label="Expiring soon" value={String(db.docs.filter((d) => d.status === "expiring").length)} tone="warning" />
        <KpiCard label="Expired" value={String(db.docs.filter((d) => d.status === "expired").length)} tone="danger" />
        <KpiCard label="Valid" value={String(db.docs.filter((d) => d.status === "valid").length)} tone="success" />
      </div>
      <DataTable<ComplianceDoc>
        rows={db.docs}
        searchKeys={(d) => `${d.kind} ${d.number} ${owner(d)}`}
        chips={[
          { id: "expired", label: "Expired", test: (d) => d.status === "expired" },
          { id: "expiring", label: "Expiring", test: (d) => d.status === "expiring" },
          { id: "vehicle", label: "Vehicles", test: (d) => d.entityType === "vehicle" },
          { id: "driver", label: "Drivers", test: (d) => d.entityType === "driver" },
        ]}
        onRowClick={(d) =>
          d.entityType === "vehicle"
            ? navigate({ to: "/app/vehicles/$vehicleId", params: { vehicleId: d.entityId } })
            : navigate({ to: "/app/drivers/$driverId", params: { driverId: d.entityId } })
        }
        emptyTitle="No documents"
        emptyMessage="Upload permits, insurance and licences to track expiry."
        columns={[
          { key: "owner", header: "Belongs to", cell: (d) => <span className="font-medium">{owner(d)}</span>, sortValue: owner },
          { key: "kind", header: "Document", cell: (d) => d.kind },
          { key: "number", header: "Number", cell: (d) => <span className="numeric">{d.number}</span>, hideOnMobile: true },
          { key: "expiry", header: "Expiry", cell: (d) => fmtDate(d.expiryISO), sortValue: (d) => d.expiryISO },
          { key: "status", header: "Status", cell: (d) => <StatusBadge status={d.status} /> },
          {
            key: "renewal",
            header: "Renewal",
            cell: (d) =>
              !canRenew ? (
                <span className="text-xs text-muted-foreground">—</span>
              ) : d.status === "renewal_pending" ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    run(() => advanceDocument(d.id, "renewed", persona.name), "Document renewed");
                  }}
                >
                  Mark renewed
                </Button>
              ) : d.status === "expiring" || d.status === "expired" ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    run(() => advanceDocument(d.id, "renewal_pending", persona.name), "Renewal requested");
                  }}
                >
                  Start renewal
                </Button>
              ) : (
                <span className="text-xs text-muted-foreground">Up to date</span>
              ),
          },
        ]}
      />
    </>
  );
}
