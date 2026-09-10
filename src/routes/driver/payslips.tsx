import { createFileRoute } from "@tanstack/react-router";
import { EmptyState, Panel } from "@/components/mf/primitives";
import { getExtras } from "@/domain/extras";
import { money, useDb } from "@/domain/hooks";
import { getPrd } from "@/domain/prd";
import { useSession } from "@/domain/session";

export const Route = createFileRoute("/driver/payslips")({
  head: () => ({
    meta: [
      { title: "My pay — MarichiFleet driver app" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DriverPayslips,
});

function DriverPayslips() {
  useDb();
  const { persona } = useSession();
  const extras = getExtras();
  const prd = getPrd();

  const me = extras.employees.find((e) => e.name === persona.name) ?? extras.employees.find((e) => e.department === "Drivers");
  const slips = me ? prd.payslips.filter((p) => p.employeeId === me.id) : [];
  const incentive = slips.reduce((s, p) => s + p.incentive, 0);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-xl font-semibold">My pay</h1>
        <p className="text-sm text-muted-foreground">Monthly payslips and trip incentives.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Latest net pay</p>
          <p className="numeric mt-1 text-2xl font-semibold">{slips[0] ? money(slips[0].net) : "—"}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Incentives earned</p>
          <p className="numeric mt-1 text-2xl font-semibold">{money(incentive)}</p>
        </div>
      </div>

      <Panel title="Payslips">
        {slips.length === 0 ? (
          <EmptyState title="No payslips yet" message="Your first payslip appears here after the next payroll run." />
        ) : (
          <ul className="divide-y divide-border">
            {slips.map((p) => (
              <li key={p.id} className="py-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{p.month}</p>
                  <p className="numeric font-semibold">{money(p.net)}</p>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Basic {money(p.gross)} · Incentive {money(p.incentive)} · Deductions {money(p.deductions)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
