import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, Filter } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { FleetMap } from "@/components/mf/fleet-map";
import { EmptyState, KpiCard, PageHeader, Panel } from "@/components/mf/primitives";
import { deriveExceptions, type Exception } from "@/domain/os/ops";
import { AUTOMATION_LEVEL } from "@/domain/os/roles";
import { useDb } from "@/domain/hooks";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/tower")({
  head: () => ({
    meta: [
      { title: "Control Tower — MarichiFleet" },
      { name: "description", content: "Live exception queue and fleet map: every load that needs a decision, ranked." },
      { property: "og:title", content: "Control Tower — MarichiFleet" },
      { property: "og:description", content: "Live exception queue and fleet map for road freight operations." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Tower,
});

const SEVERITIES = ["all", "critical", "high", "medium"] as const;

function Tower() {
  const db = useDb();
  const [severity, setSeverity] = useState<(typeof SEVERITIES)[number]>("all");
  const [selected, setSelected] = useState<string | null>(null);

  const exceptions = useMemo(() => deriveExceptions(db), [db]);
  const shown = exceptions.filter((e) => severity === "all" || e.severity === severity);
  const active = shown.find((e) => e.id === selected) ?? shown[0];

  const moving = db.vehicles.filter((v) => v.status === "on_trip");

  return (
    <>
      <PageHeader
        title="Control Tower"
        subtitle="The queue is the product. Every row is a decision waiting, with its context already assembled."
        actions={
          <div className="flex items-center gap-1 rounded-md border border-border p-0.5">
            <Filter className="ml-1.5 size-3.5 text-muted-foreground" aria-hidden />
            {SEVERITIES.map((s) => (
              <Button
                key={s}
                size="sm"
                variant={severity === s ? "secondary" : "ghost"}
                className="h-7 px-2 text-xs capitalize"
                onClick={() => setSeverity(s)}
              >
                {s}
              </Button>
            ))}
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <KpiCard label="Open exceptions" value={String(exceptions.length)} hint="Ranked by consequence" tone="danger" icon={AlertTriangle} />
        <KpiCard label="Vehicles moving" value={String(moving.length)} hint={`of ${db.vehicles.length} in fleet`} />
        <KpiCard label="SLA at risk" value={String(exceptions.filter((e) => e.kind === "trip.sla.at_risk").length)} hint="Recoverable with one call" tone="warning" />
        <KpiCard label="Dispatch blocked" value={String(exceptions.filter((e) => e.kind === "compliance.dispatch.blocked").length)} hint="Compliance hard-filter" tone="danger" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,380px)_1fr]">
        <Panel title="Exception queue" description={`${shown.length} needing a decision`} className="overflow-hidden">
          {shown.length === 0 ? (
            <EmptyState title="Nothing to decide" message="No open exceptions at this severity. The fleet is running to plan." />
          ) : (
            <ul className="-m-4 divide-y divide-border">
              {shown.map((e) => (
                <li key={e.id}>
                  <button
                    onClick={() => setSelected(e.id)}
                    className={cn(
                      "w-full px-4 py-3 text-left transition-colors hover:bg-surface",
                      active?.id === e.id && "bg-surface",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <SeverityDot severity={e.severity} />
                      <span className="flex-1 truncate text-sm font-medium">{e.title}</span>
                      <span className="numeric text-[11px] text-muted-foreground">{e.ageMins}m</span>
                    </div>
                    <p className="mt-1 line-clamp-2 pl-4 text-xs text-muted-foreground">{e.context}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <div className="space-y-4">
          <Panel title="Live fleet" description="Map does not re-render when the queue updates">
            <FleetMap
              vehicles={moving.map((v) => ({
                id: v.id,
                regNo: v.regNo,
                lat: v.lat,
                lng: v.lng,
                status: v.status,
                speedKph: v.speedKph,
              }))}
              height={280}
            />
          </Panel>

          {active ? <ExceptionDetail exception={active} /> : null}
        </div>
      </div>
    </>
  );
}

function SeverityDot({ severity }: { severity: Exception["severity"] }) {
  return (
    <span
      className={cn(
        "size-2 shrink-0 rounded-full",
        severity === "critical" ? "bg-destructive" : severity === "high" ? "bg-warning" : "bg-info",
      )}
      aria-label={severity}
    />
  );
}

function ExceptionDetail({ exception }: { exception: Exception }) {
  const lvl = AUTOMATION_LEVEL[exception.level];
  return (
    <Panel
      title={exception.title}
      description={`${exception.kind} · ${exception.ageMins} min old`}
      actions={
        exception.link ? (
          <Button asChild size="sm" variant="outline">
            <Link to={exception.link as "/"}>Open record</Link>
          </Button>
        ) : null
      }
    >
      <p className="text-sm text-muted-foreground">{exception.context}</p>
      <div className="mt-4 rounded-md border border-border bg-surface p-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{lvl.label}</p>
        <p className="mt-1 text-xs text-muted-foreground">{lvl.blurb}</p>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {exception.level === "L3" ? (
          <p className="text-xs text-muted-foreground">
            Evidence has been assembled for a person to decide. The system deliberately offers no action here.
          </p>
        ) : (
          <>
            <Button size="sm">Acknowledge</Button>
            <Button size="sm" variant="outline">Call driver</Button>
            <Button size="sm" variant="outline">Notify customer</Button>
          </>
        )}
      </div>
    </Panel>
  );
}
