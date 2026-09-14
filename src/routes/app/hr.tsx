import { createFileRoute } from "@tanstack/react-router";
import { BadgeCheck, Calendar, DollarSign, Plus, UserPlus, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { EmptyState, KpiCard, NoAccess, PageHeader, Panel, StatusBadge } from "@/components/mf/primitives";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addEmployee, decideLeave, getExtras, runPayroll } from "@/domain/extras";
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

const DEPARTMENTS = ["Operations", "Workshop", "Finance", "Drivers", "Admin"] as const;

function Hr() {
  useDb();
  const extras = getExtras();
  const run = useAction();
  const { persona, can } = useSession();

  const [addEmpOpen, setAddEmpOpen] = useState(false);
  const [payrollModalOpen, setPayrollModalOpen] = useState(false);
  const [search, setSearch] = useState("");

  // New Employee Form State
  const [empName, setEmpName] = useState("");
  const [empRole, setEmpRole] = useState("");
  const [empDept, setEmpDept] = useState<(typeof DEPARTMENTS)[number]>("Drivers");
  const [empBranch, setEmpBranch] = useState("Bhiwandi Depot");
  const [empPhone, setEmpPhone] = useState("");
  const [empSalary, setEmpSalary] = useState("32000");

  // Custom Payroll Form State
  const [payrollMonth, setPayrollMonth] = useState(
    new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" })
  );
  const [customAllowances, setCustomAllowances] = useState("12");
  const [customDeductions, setCustomDeductions] = useState("9");

  if (!can("view_admin") && !can("view_finance")) return <NoAccess what="people and payroll" />;

  const present = extras.employees.filter((e) => e.present).length;
  const pending = extras.leave.filter((l) => l.status === "pending");
  const monthlyCost = extras.employees.reduce((s, e) => s + e.monthlySalary, 0);
  const canEdit = can("view_admin") || can("edit_finance");

  const filteredEmployees = extras.employees.filter(
    (e) =>
      `${e.name} ${e.designation} ${e.department} ${e.branch}`.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empName.trim()) {
      toast.error("Please enter employee name");
      return;
    }

    const res = run(() =>
      addEmployee(
        {
          name: empName.trim(),
          designation: empRole.trim() || "Heavy Commercial Vehicle Driver",
          department: empDept,
          branch: empBranch,
          phone: empPhone.trim() || "+91 98000 00000",
          monthlySalary: parseFloat(empSalary) || 30000,
        },
        persona.name
      )
    );

    if (res.ok) {
      toast.success(`Staff member ${empName} onboarded`);
      setAddEmpOpen(false);
      setEmpName("");
      setEmpRole("");
      setEmpPhone("");
      setEmpSalary("32000");
    }
  };

  const handleRunPayroll = (e: React.FormEvent) => {
    e.preventDefault();
    const res = run(() => runPayroll(persona.name), `Payroll processed for ${payrollMonth}`);
    if (res.ok) {
      toast.success(`Payroll for ${payrollMonth} disbursed successfully!`, {
        description: `Direct deposit vouchers generated for ${extras.employees.length} active staff members.`,
      });
      setPayrollModalOpen(false);
    }
  };

  return (
    <>
      <PageHeader
        title="People & payroll"
        subtitle="Office staff and drivers, today's attendance, leave approvals and the monthly salary run."
        actions={
          canEdit ? (
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setAddEmpOpen(true)}>
                <UserPlus className="size-4" /> Add Staff / Driver
              </Button>

              <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium" onClick={() => setPayrollModalOpen(true)}>
                <DollarSign className="size-4" /> Process Payroll
              </Button>
            </div>
          ) : null
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Headcount" value={String(extras.employees.length)} hint="Staff and drivers" />
        <KpiCard
          label="Present today"
          value={`${present}/${extras.employees.length}`}
          tone={present < extras.employees.length ? "warning" : "success"}
          hint="Attendance"
        />
        <KpiCard
          label="Leave pending"
          value={String(pending.length)}
          tone={pending.length ? "warning" : "neutral"}
          hint="Awaiting your decision"
        />
        <KpiCard label="Monthly salary" value={inrCompact(monthlyCost)} hint="Gross, before allowances" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_360px]">
        <Panel
          title="Team & Drivers"
          description="Attendance is marked against today's roster."
          actions={
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search staff by name, role or dept…"
              className="h-8 w-60 text-xs"
            />
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="py-2.5 pr-3">Name</th>
                  <th className="py-2.5 pr-3">Role & Dept</th>
                  <th className="py-2.5 pr-3">Branch</th>
                  <th className="py-2.5 pr-3">Joined</th>
                  <th className="py-2.5 pr-3 text-right">Salary</th>
                  <th className="py-2.5">Today</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredEmployees.map((e) => (
                  <tr key={e.id} className="hover:bg-surface/40 transition-colors">
                    <td className="py-2.5 pr-3">
                      <span className="block font-medium">{e.name}</span>
                      <span className="numeric text-xs text-muted-foreground">{e.phone}</span>
                    </td>
                    <td className="py-2.5 pr-3">
                      <span className="block">{e.designation}</span>
                      <span className="text-xs text-muted-foreground">{e.department}</span>
                    </td>
                    <td className="py-2.5 pr-3 text-xs text-muted-foreground">{e.branch}</td>
                    <td className="py-2.5 pr-3 text-xs text-muted-foreground">{fmtDate(e.joinedISO)}</td>
                    <td className="numeric py-2.5 pr-3 text-right font-medium">{inr(e.monthlySalary)}</td>
                    <td className="py-2.5">
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
                    <span className="text-sm font-semibold">{p.month}</span>
                    <span className="numeric text-sm font-bold text-emerald-600 dark:text-emerald-400">{inr(p.net)}</span>
                  </div>
                  <p className="mt-1 text-muted-foreground">
                    {p.headcount} people · Gross {inr(p.gross)} · Allowances {inr(p.allowances)} · Deductions {inr(p.deductions)}
                  </p>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>

      {/* Add Employee Dialog */}
      <Dialog open={addEmpOpen} onOpenChange={setAddEmpOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="size-5 text-primary" />
              Onboard Staff or Driver
            </DialogTitle>
            <DialogDescription>
              Add a new commercial vehicle driver, technician, or fleet controller to the roster.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddEmployee} className="space-y-3 py-2 text-xs">
            <div>
              <Label htmlFor="empName" className="text-xs">Full Name</Label>
              <Input
                id="empName"
                value={empName}
                onChange={(e) => setEmpName(e.target.value)}
                placeholder="e.g. Ramesh Kumar Patel"
                className="mt-1"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="empDept" className="text-xs">Department</Label>
                <Select value={empDept} onValueChange={(v) => setEmpDept(v as any)}>
                  <SelectTrigger id="empDept" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map((dept) => (
                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="empRole" className="text-xs">Designation / Role</Label>
                <Input
                  id="empRole"
                  value={empRole}
                  onChange={(e) => setEmpRole(e.target.value)}
                  placeholder="e.g. Lead Trailer Driver"
                  className="mt-1"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="empBranch" className="text-xs">Home Branch / Depot</Label>
                <Input
                  id="empBranch"
                  value={empBranch}
                  onChange={(e) => setEmpBranch(e.target.value)}
                  placeholder="e.g. DL-Okhla Hub"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="empPhone" className="text-xs">Phone Number</Label>
                <Input
                  id="empPhone"
                  value={empPhone}
                  onChange={(e) => setEmpPhone(e.target.value)}
                  placeholder="+91 98..."
                  className="mt-1 font-mono"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="empSalary" className="text-xs">Monthly Base Salary (₹)</Label>
              <Input
                id="empSalary"
                type="number"
                value={empSalary}
                onChange={(e) => setEmpSalary(e.target.value)}
                placeholder="e.g. 35000"
                className="mt-1 font-mono"
                required
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" onClick={() => setAddEmpOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Onboard Employee</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Process Payroll Dialog */}
      <Dialog open={payrollModalOpen} onOpenChange={setPayrollModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="size-5 text-emerald-600" />
              Run Monthly Salary & Payroll
            </DialogTitle>
            <DialogDescription>
              Compute net disbursements, travel allowances, and statutory deductions for {extras.employees.length} employees.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRunPayroll} className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-xs">Disbursement Month</Label>
              <Input
                value={payrollMonth}
                onChange={(e) => setPayrollMonth(e.target.value)}
                className="mt-1 font-medium"
              />
            </div>

            <div className="rounded-md border border-border bg-muted/40 p-3 space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Staff Headcount:</span>
                <span className="font-semibold">{extras.employees.length} staff members</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Base Gross Salary:</span>
                <span className="font-semibold numeric">{inr(monthlyCost)}</span>
              </div>
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                <span>Trip Allowances & Night Bata (~{customAllowances}%):</span>
                <span className="font-mono numeric">+{inr(Math.round(monthlyCost * (parseFloat(customAllowances) / 100)))}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Deductions (TDS, PF, Advances ~{customDeductions}%):</span>
                <span className="font-mono numeric">-{inr(Math.round(monthlyCost * (parseFloat(customDeductions) / 100)))}</span>
              </div>
              <div className="border-t border-border pt-1.5 flex justify-between font-bold text-sm text-foreground">
                <span>Estimated Net Payout:</span>
                <span className="numeric text-emerald-600 dark:text-emerald-400">
                  {inr(monthlyCost + Math.round(monthlyCost * 0.12) - Math.round(monthlyCost * 0.09))}
                </span>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" onClick={() => setPayrollModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5">
                <BadgeCheck className="size-4" /> Disburse & Generate Slips
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
