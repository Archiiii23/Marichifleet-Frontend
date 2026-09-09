import { createFileRoute } from "@tanstack/react-router";
import { EmptyState, KpiCard, NoAccess, PageHeader, Panel, StatusBadge } from "@/components/mf/primitives";
import { Button } from "@/components/ui/button";
import { decideLeave, getExtras, runPayroll } from "@/domain/extras";
import { fmtDate, inr, inrCompact, useAction, useDb } from "@/domain/hooks";
import { useSession } from "@/domain/session";

export const Route = createFileRoute("/app/hr")({
  head: () => ({
    meta: [
      { title: "People & payroll — MarichiFleet" },
      { name: "description", content: "Staff and driver records, attendance, leave approvals and the monthly salary run." },
      { property: "og:title", content: "People & payroll — MarichiFleet" },
      { property: "og:description", content: "Attendance, leave approvals and payroll for the whole fleet team." },
    ],
  }),
  component: Hr,
});

function Hr() {
  useDb();
  const extras = getExtras();
  const run = useAction();
  const { persona, can } = useSession();

  if (!can("view_admin") && !can("view_finance")) return <NoAccess what="people and payroll" />;

  const present = extras.employees.filter((e) => e.present).length;
  const pending = extras.leave.filter((l) => l.status === "pending");
  const monthlyCost = extras.employees.reduce((s, e) => s + e.monthlySalary, 0);
  const canEdit = can("view_admin") || can("edit_finance");

  return (
    <>
      <PageHeader
        title="People & payroll"
        subtitle="Office staff and drivers, today's attendance, leave approvals and the monthly salary run."
        actions={
          canEdit ? (
            <Button size="sm" onClick={() => run(() => runPayroll(persona.name), "Payroll run completed")}>
              Run this month's payroll
            </Button>
          ) : null
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Headcount" value={String(extras.employees.length)} hint="Staff and drivers" />
        <KpiCard label="Present today" value={`${present}/${extras.employees.length}`} tone={present < extras.employees.length ? "warning" : "success"} hint="Attendance" />
        <KpiCard label="Leave pending" value={String(pending.length)} tone={pending.length ? "warning" : "neutral"} hint="Awaiting your decision" />
        <KpiCard label="Monthly salary" value={inrCompact(monthlyCost)} hint="Gross, before allowances" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_360px]">
        <Panel title="Team" description="Attendance is marked against today's roster.">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="py-2 pr-3">Name</th>
                  <th className="py-2 pr-3">Role</th>
                  <th className="py-2 pr-3">Branch</th>
                  <th className="py-2 pr-3">Joined</th>
                  <th className="py-2 pr-3 text-right">Salary</th>
                  <th className="py-2">Today</th>
                </tr>
              </thead>
              <tbody>
                {extras.employees.map((e) => (
                  <tr key={e.id} className="border-b border-border/60 last:border-0">
                    <td className="py-2 pr-3">
                      <span className="block font-medium">{e.name}</span>
                      <span className="numeric text-xs text-muted-foreground">{e.phone}</span>
                    </td>
                    <td className="py-2 pr-3">
                      <span className="block">{e.designation}</span>
                      <span className="text-xs text-muted-foreground">{e.department}</span>
                    </td>
                    <td className="py-2 pr-3 text-xs text-muted-foreground">{e.branch}</td>
                    <td className="py-2 pr-3 text-xs text-muted-foreground">{fmtDate(e.joinedISO)}</td>
                    <td className="numeric py-2 pr-3 text-right">{inr(e.monthlySalary)}</td>
                    <td className="py-2">
                      <StatusBadge status={e.present ? "available" : "leave"} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel title="Leave requests">
            {extras.leave.length === 0 ? (
              <EmptyState title="No requests" message="Leave requests from the team will appear here." />
            ) : (
              <ul className="space-y-2">
                {extras.leave.map((l) => {
                  const emp = extras.employees.find((e) => e.id === l.employeeId);
                  return (
                    <li key={l.id} className="rounded-md border border-border p-3 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">{emp?.name ?? "Team member"}</span>
                        <StatusBadge status={l.status === "approved" ? "valid" : l.status === "rejected" ? "cancelled" : "pod_pending"} />
                      </div>
                      <p className="mt-1 text-muted-foreground">{l.reason}</p>
                      <p className="mt-0.5 text-muted-foreground">
                        {fmtDate(l.fromISO)} → {fmtDate(l.toISO)}
                      </p>
                      {l.status === "pending" && canEdit && (
                        <div className="mt-2 flex gap-2">
                          <Button size="sm" className="h-7 px-2 text-xs" onClick={() => run(() => decideLeave(l.id, "approved", persona.name), "Leave approved")}>
                            Approve
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => run(() => decideLeave(l.id, "rejected", persona.name), "Leave rejected")}>
                            Reject
                          </Button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>

          <Panel title="Payroll history">
            <ul className="space-y-2">
              {extras.payroll.map((p) => (
                <li key={p.id} className="rounded-md border border-border p-3 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{p.month}</span>
                    <span className="numeric text-sm">{inr(p.net)}</span>
                  </div>
                  <p className="mt-1 text-muted-foreground">
                    {p.headcount} people · gross {inr(p.gross)} · allowances {inr(p.allowances)} · deductions {inr(p.deductions)}
                  </p>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </>
  );
}
