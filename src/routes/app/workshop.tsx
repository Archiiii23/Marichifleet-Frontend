import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { KpiCard, NoAccess, PageHeader, Panel, StatusBadge } from "@/components/mf/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fmtDateTime, inr, inrCompact, useAction, useDb } from "@/domain/hooks";
import { useSession } from "@/domain/session";
import { advanceJobCard } from "@/domain/store";
import type { JobCardStatus } from "@/domain/types";

export const Route = createFileRoute("/app/workshop")({
  head: () => ({
    meta: [
      { title: "Workshop — MarichiFleet" },
      { name: "description", content: "Job cards, downtime and maintenance spend for the fleet." },
      { property: "og:title", content: "Workshop — MarichiFleet" },
      { property: "og:description", content: "Inspect, cost, repair and release fleet vehicles through controlled job cards." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Workshop,
});

function Workshop() {
  const db = useDb();
  const run = useAction();
  const { can, persona } = useSession();
  const [selectedId, setSelectedId] = useState(db.jobCards.find((j) => j.status !== "released")?.id ?? db.jobCards[0]?.id ?? "");
  const selected = db.jobCards.find((j) => j.id === selectedId);
  const [partsCost, setPartsCost] = useState(String(selected?.partsCost ?? 0));
  const [labourCost, setLabourCost] = useState(String(selected?.labourCost ?? 0));

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
  const stages: JobCardStatus[] = ["reported", "inspected", "job_created", "parts_required", "in_progress", "completed", "released"];
  const nextFor = (status: JobCardStatus): JobCardStatus | null => {
    if (status === "reported") return "inspected";
    if (status === "inspected") return "job_created";
    if (status === "job_created") return "parts_required";
    if (status === "parts_required") return "in_progress";
    if (status === "in_progress") return "completed";
    if (status === "completed") return "released";
    return null;
  };

  return (
    <>
      <PageHeader title="Workshop" subtitle="Breakdowns raise job cards automatically from the trip screen." />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Open job cards" value={String(open.length)} tone={open.length ? "warning" : "success"} />
        <KpiCard label="Vehicles down" value={String(db.vehicles.filter((v) => v.status === "maintenance").length)} tone="danger" to="/app/vehicles" />
        <KpiCard label="Maintenance spend" value={inrCompact(spend)} hint="Parts plus labour" />
        <KpiCard label="Completed" value={String(db.jobCards.filter((j) => j.status === "released").length)} tone="success" />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Panel title="Job cards" description="Select a job card to inspect its estimate and move it through the workshop.">
        <ul className="space-y-2">
          {db.jobCards.map((j) => (
            <li key={j.id} className={`flex flex-wrap items-start gap-3 rounded-md border p-3 ${selectedId === j.id ? "border-primary bg-surface" : "border-border"}`}>
              <span className="numeric text-sm font-medium">{j.ref}</span>
              <span className="numeric text-sm">{db.vehicles.find((v) => v.id === j.vehicleId)?.regNo ?? "—"}</span>
              <span className="min-w-40 flex-1 text-sm text-muted-foreground">{j.issue}</span>
              <span className="numeric text-sm">{inr(j.partsCost + j.labourCost)}</span>
              <span className="text-xs text-muted-foreground">{fmtDateTime(j.openedISO)}</span>
              <StatusBadge status={j.status} />
              <Button variant="ghost" size="sm" onClick={() => { setSelectedId(j.id); setPartsCost(String(j.partsCost)); setLabourCost(String(j.labourCost)); }}>
                Open
              </Button>
            </li>
          ))}
          {db.jobCards.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No job cards raised.</p>}
        </ul>
      </Panel>
      <Panel title="Workshop control" description="Inspection, estimate, repair, quality check and release.">
        {!selected ? <p className="text-sm text-muted-foreground">Select a job card to continue.</p> : (
          <div className="space-y-4">
            <div>
              <p className="numeric text-sm font-semibold">{selected.ref}</p>
              <p className="mt-1 text-sm text-muted-foreground">{selected.issue}</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {stages.map((stage) => <StatusBadge key={stage} status={stage} className={stage === selected.status ? "border-primary" : "opacity-50"} />)}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Parts estimate</Label><Input className="mt-1" type="number" min={0} value={partsCost} onChange={(e) => setPartsCost(e.target.value)} /></div>
              <div><Label className="text-xs">Labour estimate</Label><Input className="mt-1" type="number" min={0} value={labourCost} onChange={(e) => setLabourCost(e.target.value)} /></div>
            </div>
            {selected.status === "job_created" && (
              <Select onValueChange={(value) => run(() => advanceJobCard(selected.id, value as JobCardStatus, persona.name, { partsCost: Number(partsCost), labourCost: Number(labourCost) }), "Job card updated") }>
                <SelectTrigger><SelectValue placeholder="Choose parts path" /></SelectTrigger>
                <SelectContent><SelectItem value="parts_required">Parts required</SelectItem><SelectItem value="in_progress">Start without parts hold</SelectItem></SelectContent>
              </Select>
            )}
            {selected.status !== "job_created" && nextFor(selected.status) && (
              <Button className="w-full" onClick={() => run(() => advanceJobCard(selected.id, nextFor(selected.status) as JobCardStatus, persona.name, { partsCost: Number(partsCost), labourCost: Number(labourCost) }), "Job card advanced") }>
                Move to {nextFor(selected.status)?.replaceAll("_", " ")}
              </Button>
            )}
            {selected.status === "parts_required" && <p className="text-xs text-muted-foreground">Issue required stock from Spare Parts before work begins.</p>}
          </div>
        )}
      </Panel>
      </div>
    </>
  );
}
