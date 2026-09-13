import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Clock, ShieldAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState, KpiCard, PageHeader, Panel } from "@/components/mf/primitives";
import { Amount } from "@/components/mf/amount";
import { deriveApprovals } from "@/domain/os/ops";
import { AUTOMATION_LEVEL, canApprove, type OsRole } from "@/domain/os/roles";
import { useDb } from "@/domain/hooks";
import { useSession } from "@/domain/session";
import { normalizeRole } from "@/domain/rbac";

export const Route = createFileRoute("/app/approvals")({
  head: () => ({
    meta: [
      { title: "Approvals — MarichiFleet" },
      { name: "description", content: "Durable approval cards with rendered effect, cost delta, expiry and escalation." },
      { property: "og:title", content: "Approvals — MarichiFleet" },
      { property: "og:description", content: "One tap commits a prepared decision. Self-approval is blocked." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Approvals,
});

function Approvals() {
  const db = useDb();
  const { persona } = useSession();
  const role = normalizeRole(persona.role) as OsRole;
  const all = useMemo(() => deriveApprovals(db), [db]);
  const [decided, setDecided] = useState<Record<string, "granted" | "denied">>({});

  const pending = all.filter((a) => !decided[a.id]);
  const exposureMinor = pending.reduce((s, a) => s + a.costDeltaMinor, 0);

  return (
    <>
      <PageHeader
        title="Approvals"
        subtitle="Each card is a durable object: the same decision on WhatsApp, web and push. Whoever acts first wins."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard label="Pending" value={String(pending.length)} hint="Expiring approvals escalate automatically" icon={Clock} />
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Money at stake</span>
            <span className="size-2 rounded-full bg-warning" aria-hidden />
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight">
            <Amount value={{ minor: exposureMinor, currency: "INR" }} />
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">Sum of proposed cost deltas</p>
        </div>
        <KpiCard label="Decided today" value={String(Object.keys(decided).length)} hint="Idempotent — double taps are safe" icon={CheckCircle2} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {pending.length === 0 ? (
          <div className="lg:col-span-2">
            <EmptyState title="No approvals waiting" message="Automation is running inside its limits. Nothing needs a human right now." />
          </div>
        ) : null}

        {pending.map((a) => {
          const verdict = canApprove(role, a.costDeltaMinor, false);
          const lvl = AUTOMATION_LEVEL[a.level];
          return (
            <Panel
              key={a.id}
              title={a.summary}
              description={`${a.command} · requested by ${a.requestedBy}`}
              actions={<Amount value={{ minor: a.costDeltaMinor, currency: "INR" }} className="text-sm font-semibold" />}
            >
              <ul className="space-y-1.5 text-sm">
                {a.diff.map((d) => (
                  <li key={d} className="flex gap-2 text-muted-foreground">
                    <span aria-hidden>→</span>
                    <span>{d}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                <span className="rounded border border-border px-1.5 py-0.5">{lvl.label}</span>
                <span>Expires in {a.expiresInMins} min</span>
                <span>{a.escalation}</span>
                <span>{a.channels.join(" · ")}</span>
              </div>

              {!verdict.ok && (
                <p className="mt-3 flex items-start gap-2 rounded-md border border-warning/40 bg-warning/5 p-2 text-xs text-muted-foreground">
                  <ShieldAlert className="mt-0.5 size-3.5 shrink-0 text-warning" aria-hidden />
                  {verdict.reason}
                </p>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  disabled={!verdict.ok}
                  onClick={() => {
                    setDecided((d) => ({ ...d, [a.id]: "granted" }));
                    toast.success("Approved", { description: a.summary });
                  }}
                >
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setDecided((d) => ({ ...d, [a.id]: "denied" }));
                    toast("Denied", { description: a.summary });
                  }}
                >
                  Deny
                </Button>
                {a.link && (
                  <Button asChild size="sm" variant="ghost">
                    <Link to={a.link as "/"}>See the record</Link>
                  </Button>
                )}
              </div>
            </Panel>
          );
        })}
      </div>
    </>
  );
}
