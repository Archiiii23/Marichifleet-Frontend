import { createFileRoute, Link } from "@tanstack/react-router";
import { Clock, Phone, ShieldAlert, TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState, KpiCard, PageHeader, Panel, StatusBadge } from "@/components/mf/primitives";
import { deriveCases, type CaseCategory, type IncidentCase } from "@/domain/os/cases";
import { AUTOMATION_LEVEL } from "@/domain/os/roles";
import { money, useAction, useDb, timeAgo, fmtDateTime } from "@/domain/hooks";
import { useSession } from "@/domain/session";
import { resumeTrip } from "@/domain/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/incidents")({
  head: () => ({
    meta: [
      { title: "Incident Desk — MarichiFleet" },
      { name: "description", content: "Open incident case files with clocks, evidence and the next recommended action." },
      { property: "og:title", content: "Incident Desk — MarichiFleet" },
      { property: "og:description", content: "Breakdowns, accidents, delays and cargo claims worked as case files." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Incidents,
});

const FILTERS: Array<"all" | CaseCategory> = ["all", "breakdown", "accident", "delay", "cargo", "documents", "other"];

function Incidents() {
  const db = useDb();
  const run = useAction();
  const { persona } = useSession();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [selected, setSelected] = useState<string | null>(null);

  const cases = useMemo(() => deriveCases(db), [db]);
  const shown = cases.filter((c) => filter === "all" || c.category === filter);
  const active = shown.find((c) => c.id === selected) ?? shown[0];

  const breached = cases.filter((c) => c.openMins > c.slaTargetMins);
  const exposure = cases.reduce((s, c) => s + c.exposure, 0);

  return (
    <>
      <PageHeader
        title="Incident Desk"
        subtitle="Every open incident is a case file: what happened, what it costs, and the one action worth taking next."
        actions={
          <div className="flex flex-wrap items-center gap-1 rounded-md border border-border p-0.5">
            {FILTERS.map((f) => (
              <Button
                key={f}
                size="sm"
                variant={filter === f ? "secondary" : "ghost"}
                className="h-7 px-2 text-xs capitalize"
                onClick={() => setFilter(f)}
              >
                {f}
              </Button>
            ))}
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <KpiCard label="Open cases" value={String(cases.length)} hint="Across the live fleet" tone={cases.length ? "danger" : undefined} icon={TriangleAlert} />
        <KpiCard label="Past response SLA" value={String(breached.length)} hint="Clock already expired" tone="warning" icon={Clock} />
        <KpiCard label="Accidents" value={String(cases.filter((c) => c.category === "accident").length)} hint="Evidence-only handling" icon={ShieldAlert} />
        <KpiCard label="Revenue exposed" value={money(exposure)} hint="Freight value at risk" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,360px)_1fr]">
        <Panel title="Case queue" description={`${shown.length} open`} className="overflow-hidden">
          {shown.length === 0 ? (
            <EmptyState title="No open incidents" message="Nothing is stuck on the road right now. Cases appear here the moment a driver reports one." />
          ) : (
            <ul className="-m-4 divide-y divide-border">
              {shown.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => setSelected(c.id)}
                    className={cn("w-full px-4 py-3 text-left transition-colors hover:bg-surface", active?.id === c.id && "bg-surface")}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium capitalize">{c.headline}</span>
                      <span
                        className={cn(
                          "numeric shrink-0 text-[11px]",
                          c.openMins > c.slaTargetMins ? "text-danger" : "text-muted-foreground",
                        )}
                      >
                        {c.openMins}m
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {c.lane} · {c.vehicle} · {c.note}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {active ? <CaseFile key={active.id} c={active} onResolve={() => run(() => resumeTrip(active.tripId, persona.name), "Incident closed and the trip resumed")} /> : null}
      </div>
    </>
  );
}

function CaseFile({ c, onResolve }: { c: IncidentCase; onResolve: () => void }) {
  const level = AUTOMATION_LEVEL[c.recommendation.level];
  const overdue = c.openMins > c.slaTargetMins;

  return (
    <div className="space-y-4">
      <Panel
        title={c.headline}
        description={`${c.lane} · ${c.client}`}
        actions={<StatusBadge status={c.severity} />}
      >
        <p className="text-sm">{c.note}</p>

        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <Field label="Vehicle" value={c.vehicle} />
          <Field label="Driver" value={c.driver} />
          <Field label="Opened" value={timeAgo(c.openedISO)} />
          <Field
            label="Response SLA"
            value={<span className={overdue ? "text-danger" : "text-success"}>{overdue ? `${c.openMins - c.slaTargetMins}m over` : `${c.slaTargetMins - c.openMins}m left`}</span>}
          />
        </dl>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" variant="outline" asChild>
            <a href={`tel:${c.driverPhone}`}>
              <Phone className="size-3.5" aria-hidden /> Call {c.driver.split(" ")[0]}
            </a>
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link to="/app/trips/$tripId" params={{ tripId: c.tripId }}>
              Open trip
            </Link>
          </Button>
          <Button size="sm" onClick={onResolve}>
            Close case and resume
          </Button>
        </div>
      </Panel>

      <div className="grid gap-4 md:grid-cols-2">
        <Panel title="Recommended action" description={`${c.recommendation.level} · ${level.label}`}>
          <p className="text-sm font-medium">{c.recommendation.label}</p>
          <p className="mt-1 text-sm text-muted-foreground">{c.recommendation.detail}</p>
          <p className="mt-3 border-l-2 border-border pl-3 text-xs text-muted-foreground">{level.blurb}</p>
          {c.recommendation.level === "L2" ? (
            <Button size="sm" variant="outline" className="mt-3" asChild>
              <Link to="/app/approvals">Review in Approvals</Link>
            </Button>
          ) : null}
        </Panel>

        <Panel title="Evidence" description="Collected automatically when the incident opened">
          <ul className="space-y-2 text-sm text-muted-foreground">
            {c.evidence.map((e) => (
              <li key={e} className="border-l-2 border-border pl-3">
                {e}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">Exposure {money(c.exposure)} of the freight value on this load.</p>
        </Panel>
      </div>

      <Panel title="Timeline">
        <ol className="space-y-3">
          {c.timeline.map((t, i) => (
            <li key={`${t.atISO}_${i}`} className="flex gap-3 text-sm">
              <span className="numeric w-32 shrink-0 text-xs text-muted-foreground">{fmtDateTime(t.atISO)}</span>
              <span>{t.label}</span>
            </li>
          ))}
        </ol>
      </Panel>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
    </div>
  );
}
