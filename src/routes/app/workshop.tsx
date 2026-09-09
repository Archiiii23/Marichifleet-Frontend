import { createFileRoute } from "@tanstack/react-router";
import { KpiCard, NoAccess, PageHeader, Panel, StatusBadge } from "@/components/mf/primitives";
import { fmtDateTime, inr, inrCompact, useDb } from "@/domain/hooks";
import { useSession } from "@/domain/session";

export const Route = createFileRoute("/app/workshop")({
  head: () => ({
    meta: [
      { title: "Workshop — MarichiFleet" },
      { name: "description", content: "Job cards, downtime and maintenance spend for the fleet." },
    ],
  }),
  component: Workshop,
});

function Workshop() {
  const db = useDb();
  const { can } = useSession();

  if (!can("view_workshop")) {
    return (
      <>
        <PageHeader title="Workshop" />
        <NoAccess what="workshop records" />
      </>
    );
  }

  const open = db.jobCards.filter((j) => j.status !== "released" && j.status !== "completed");
  const spend = db.jobCards.reduce((s, j) => s + j.partsCost + j.labourCost, 0);

  return (
    <>
      <PageHeader title="Workshop" subtitle="Breakdowns raise job cards automatically from the trip screen." />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Open job cards" value={String(open.length)} tone={open.length ? "warning" : "success"} />
        <KpiCard label="Vehicles down" value={String(db.vehicles.filter((v) => v.status === "maintenance").length)} tone="danger" to="/app/vehicles" />
        <KpiCard label="Maintenance spend" value={inrCompact(spend)} hint="Parts plus labour" />
        <KpiCard label="Completed" value={String(db.jobCards.filter((j) => j.status === "released").length)} tone="success" />
      </div>

      <Panel className="mt-4" title="Job cards">
        <ul className="space-y-2">
          {db.jobCards.map((j) => (
            <li key={j.id} className="flex flex-wrap items-start gap-3 rounded-md border border-border p-3">
              <span className="numeric text-sm font-medium">{j.ref}</span>
              <span className="numeric text-sm">{db.vehicles.find((v) => v.id === j.vehicleId)?.regNo ?? "—"}</span>
              <span className="min-w-40 flex-1 text-sm text-muted-foreground">{j.issue}</span>
              <span className="numeric text-sm">{inr(j.partsCost + j.labourCost)}</span>
              <span className="text-xs text-muted-foreground">{fmtDateTime(j.openedISO)}</span>
              <StatusBadge status={j.status} />
            </li>
          ))}
          {db.jobCards.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No job cards raised.</p>}
        </ul>
      </Panel>
    </>
  );
}
