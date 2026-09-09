import { createFileRoute, Link } from "@tanstack/react-router";
import { KpiCard, NoAccess, PageHeader, Panel, StatusBadge } from "@/components/mf/primitives";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { getExtras, setTenantStatus, toggleFlag } from "@/domain/extras";
import { fmtDate, inr, inrCompact, useAction, useDb } from "@/domain/hooks";
import { useSession } from "@/domain/session";
import { ThemeToggle } from "@/domain/theme";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [{ title: "Platform admin — MarichiFleet" }, { name: "robots", content: "noindex" }],
  }),
  component: Admin,
});

function Admin() {
  useDb();
  const extras = getExtras();
  const run = useAction();
  const { persona, can } = useSession();

  const mrr = extras.tenants.filter((t) => t.status === "active").reduce((s, t) => s + t.mrr, 0);

  return (
    <div className="min-h-screen bg-background px-4 pb-16 md:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex h-14 items-center justify-between">
          <Link to="/app/dashboard" className="font-display text-sm font-semibold uppercase tracking-[0.18em]">
            MarichiFleet · Platform
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild size="sm" variant="outline">
              <Link to="/app/dashboard">Back to control tower</Link>
            </Button>
          </div>
        </div>

        {!can("view_admin") ? (
          <NoAccess what="the platform admin console" />
        ) : (
          <>
            <PageHeader title="Platform admin" subtitle="Tenants, plans, usage and feature rollout across every MarichiFleet company." />

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <KpiCard label="Tenants" value={String(extras.tenants.length)} hint="All accounts" />
              <KpiCard label="Active MRR" value={inrCompact(mrr)} hint="Recurring revenue" />
              <KpiCard
                label="Trials"
                value={String(extras.tenants.filter((t) => t.status === "trial").length)}
                tone="warning"
                hint="Converting soon"
              />
              <KpiCard
                label="Suspended"
                value={String(extras.tenants.filter((t) => t.status === "suspended").length)}
                tone="danger"
                hint="Billing on hold"
              />
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_360px]">
              <Panel title="Tenants">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                        <th className="py-2 pr-3">Company</th>
                        <th className="py-2 pr-3">Plan</th>
                        <th className="py-2 pr-3 text-right">Fleet</th>
                        <th className="py-2 pr-3 text-right">MRR</th>
                        <th className="py-2 pr-3">Since</th>
                        <th className="py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {extras.tenants.map((t) => (
                        <tr key={t.id} className="border-b border-border/60 last:border-0">
                          <td className="py-2 pr-3">
                            <span className="block font-medium">{t.name}</span>
                            <span className="text-xs text-muted-foreground">{t.country} · {t.users} users</span>
                          </td>
                          <td className="py-2 pr-3">{t.plan}</td>
                          <td className="numeric py-2 pr-3 text-right">{t.vehicles}</td>
                          <td className="numeric py-2 pr-3 text-right">{inr(t.mrr)}</td>
                          <td className="py-2 pr-3 text-xs text-muted-foreground">{fmtDate(t.sinceISO)}</td>
                          <td className="py-2">
                            <div className="flex items-center gap-2">
                              <StatusBadge status={t.status === "active" ? "available" : t.status === "trial" ? "pod_pending" : "inactive"} />
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-xs"
                                onClick={() =>
                                  run(
                                    () => setTenantStatus(t.id, t.status === "suspended" ? "active" : "suspended", persona.name),
                                    "Tenant updated",
                                  )
                                }
                              >
                                {t.status === "suspended" ? "Reactivate" : "Suspend"}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Panel>

              <Panel title="Feature rollout">
                <ul className="space-y-2">
                  {extras.flags.map((f) => (
                    <li key={f.key} className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
                      <div>
                        <p className="text-sm font-medium">{f.label}</p>
                        <p className="text-xs text-muted-foreground">{f.description}</p>
                      </div>
                      <Switch
                        checked={f.enabled}
                        onCheckedChange={() => run(() => toggleFlag(f.key, persona.name), "Feature updated")}
                        aria-label={f.label}
                      />
                    </li>
                  ))}
                </ul>
              </Panel>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
