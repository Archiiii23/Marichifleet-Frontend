import { createFileRoute } from "@tanstack/react-router";
import { DataTable } from "@/components/mf/data-table";
import { NoAccess, PageHeader } from "@/components/mf/primitives";
import { fmtDateTime, useDb } from "@/domain/hooks";
import { useSession } from "@/domain/session";
import type { AuditEntry } from "@/domain/types";

export const Route = createFileRoute("/app/audit")({
  head: () => ({
    meta: [
      { title: "Audit log — MarichiFleet" },
      { name: "description", content: "Immutable record of every operational and financial state change." },
    ],
  }),
  component: Audit,
});

function Audit() {
  const db = useDb();
  const { can } = useSession();

  if (!can("view_admin")) {
    return (
      <>
        <PageHeader title="Audit log" />
        <NoAccess what="the audit log" />
      </>
    );
  }

  return (
    <>
      <PageHeader title="Audit log" subtitle="Who did what, to which record, and when." />
      <DataTable<AuditEntry>
        rows={db.audit}
        searchKeys={(a) => `${a.actor} ${a.action} ${a.entity} ${a.entityId}`}
        chips={[
          { id: "booking", label: "Bookings", test: (a) => a.entity === "booking" },
          { id: "trip", label: "Trips", test: (a) => a.entity === "trip" },
          { id: "invoice", label: "Invoices", test: (a) => a.entity === "invoice" },
          { id: "vehicle", label: "Fleet", test: (a) => a.entity === "vehicle" },
        ]}
        emptyTitle="No activity recorded"
        emptyMessage="Actions taken in the app appear here immediately."
        columns={[
          { key: "at", header: "When", cell: (a) => fmtDateTime(a.atISO), sortValue: (a) => a.atISO },
          { key: "actor", header: "Actor", cell: (a) => a.actor },
          { key: "action", header: "Action", cell: (a) => a.action },
          { key: "entity", header: "Entity", cell: (a) => a.entity, hideOnMobile: true },
          { key: "change", header: "Change", cell: (a) => (a.from && a.to ? `${a.from} → ${a.to}` : "—"), hideOnMobile: true },
        ]}
      />
    </>
  );
}
