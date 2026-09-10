import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Bot, Gauge } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { KpiCard, PageHeader, Panel, StatusBadge } from "@/components/mf/primitives";
import { Button } from "@/components/ui/button";
import { PLAYBOOKS, deriveRuns } from "@/domain/os/ops";
import { AUTOMATION_LEVEL } from "@/domain/os/roles";
import { useDb, timeAgo } from "@/domain/hooks";

export const Route = createFileRoute("/app/automation")({
  head: () => ({
    meta: [
      { title: "Automation — MarichiFleet" },
      { name: "description", content: "Playbooks graded L1 to L3, their run history and how much human effort they saved." },
      { property: "og:title", content: "Automation — MarichiFleet" },
      { property: "og:description", content: "What the system does on its own, what it proposes, and what it never decides." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Automation,
});

function Automation() {
  const db = useDb();
  const runs = useMemo(() => deriveRuns(db), [db]);
  const [tab, setTab] = useState<"playbooks" | "runs">("playbooks");
  const [enabled, setEnabled] = useState<Record<string, boolean>>(
    Object.fromEntries(PLAYBOOKS.map((p) => [p.key, p.enabled])),
  );

  const saved = PLAYBOOKS.reduce((s, p) => s + p.humanTouchesSaved, 0);
  const awaiting = runs.filter((r) => r.state === "awaiting_approval").length;

  return (
    <>
      <PageHeader
        title="Automation"
        subtitle="Every playbook carries a consequence grade. L1 acts and tells you, L2 asks first, L3 never decides."
        actions={
          <div className="flex items-center gap-1 rounded-md border border-border p-0.5">
            {(["playbooks", "runs"] as const).map((t) => (
              <Button key={t} size="sm" variant={tab === t ? "secondary" : "ghost"} className="h-7 px-3 text-xs capitalize" onClick={() => setTab(t)}>
                {t}
              </Button>
            ))}
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard label="Active playbooks" value={String(Object.values(enabled).filter(Boolean).length)} hint={`of ${PLAYBOOKS.length} defined`} icon={Bot} />
        <KpiCard label="Human touches saved" value={`${saved.toLocaleString()} (est.)`} hint="Last 30 days" icon={Gauge} />
        <KpiCard label="Runs awaiting approval" value={String(awaiting)} hint="Paused until a person taps" tone="warning" to="/app/approvals" />
      </div>

      {tab === "playbooks" ? (
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {PLAYBOOKS.map((p) => {
            const lvl = AUTOMATION_LEVEL[p.level];
            return (
              <div key={p.key} className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{p.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{p.effect}</p>
                  </div>
                  <Switch
                    checked={enabled[p.key]}
                    onCheckedChange={(v) => setEnabled((e) => ({ ...e, [p.key]: v }))}
                    aria-label={`Enable ${p.name}`}
                  />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                  <span className="rounded border border-border px-1.5 py-0.5">{lvl.label}</span>
                  <span className="numeric">{p.trigger}</span>
                  <span>{p.runs30d} runs / 30d</span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{lvl.blurb}</p>
              </div>
            );
          })}
        </div>
      ) : (
        <Panel className="mt-4" title="Recent runs" description="Every step is recorded, including the ones that failed">
          <ul className="divide-y divide-border">
            {runs.map((r) => (
              <li key={r.id} className="flex flex-wrap items-start gap-3 py-3">
                <StatusBadge status={r.state} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{r.playbook}</p>
                  <p className="text-xs text-muted-foreground">{r.subject} · {r.steps.join(" → ")}</p>
                </div>
                <span className="text-[11px] text-muted-foreground">{timeAgo(r.atISO)}</span>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </>
  );
}
