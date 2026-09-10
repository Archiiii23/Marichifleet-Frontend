import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { KpiCard, PageHeader, Panel } from "@/components/mf/primitives";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { labelize } from "@/domain/machines";
import { useAction, useDb } from "@/domain/hooks";
import { PERMISSIONS, deleteRole, getPrd, saveRole, type Permission } from "@/domain/prd";
import { useSession } from "@/domain/session";

export const Route = createFileRoute("/app/roles")({
  head: () => ({
    meta: [
      { title: "Users & roles — MarichiFleet" },
      { name: "description", content: "Define custom roles, choose their permissions and scope each role to specific branches." },
      { property: "og:title", content: "Users & roles — MarichiFleet" },
      { property: "og:description", content: "Custom roles with permission sets and branch scoping." },
    ],
  }),
  component: Roles,
});

function Roles() {
  const db = useDb();
  const prd = getPrd();
  const run = useAction();
  const { persona } = useSession();
  const branches = db.branches.map((b) => b.name);

  const [name, setName] = useState("");
  const [perms, setPerms] = useState<Permission[]>(["view_operations"]);
  const [scope, setScope] = useState<string[]>(branches);

  const toggle = <T,>(list: T[], value: T) =>
    list.includes(value) ? list.filter((x) => x !== value) : [...list, value];

  return (
    <>
      <PageHeader
        title="Users & roles"
        subtitle="Built-in roles cover the standard fleet team. Add custom roles when a desk needs a narrower slice of the system."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Roles" value={String(prd.roles.length)} hint={`${prd.roles.filter((r) => !r.system).length} custom`} />
        <KpiCard label="Permissions" value={String(PERMISSIONS.length)} hint="Assignable capabilities" />
        <KpiCard label="Branches" value={String(branches.length)} hint="Available for scoping" />
        <KpiCard label="Branch-limited roles" value={String(prd.roles.filter((r) => r.branchScope.length < branches.length).length)} hint="Restricted access" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_360px]">
        <Panel title="Role register">
          <ul className="divide-y divide-border">
            {prd.roles.map((r) => (
              <li key={r.id} className="py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{r.name}</p>
                  <span className="rounded border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                    {r.system ? "Built-in" : "Custom"}
                  </span>
                  {!r.system && (
                    <Button
                      className="ml-auto"
                      size="sm"
                      variant="ghost"
                      onClick={() => run(() => deleteRole(r.id, persona.name), `${r.name} deleted.`)}
                    >
                      Delete
                    </Button>
                  )}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {r.permissions.map((p) => labelize(p)).join(" · ")}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Branches: {r.branchScope.length === branches.length ? "All branches" : r.branchScope.join(", ")}
                </p>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="New custom role">
          <label className="block text-sm">
            <span className="mb-1 block text-xs text-muted-foreground">Role name</span>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Night dispatch desk" />
          </label>

          <p className="mt-4 text-xs uppercase tracking-wider text-muted-foreground">Permissions</p>
          <div className="mt-2 space-y-2">
            {PERMISSIONS.map((p) => (
              <label key={p} className="flex items-center gap-2 text-sm">
                <Checkbox checked={perms.includes(p)} onCheckedChange={() => setPerms((l) => toggle(l, p))} />
                {labelize(p)}
              </label>
            ))}
          </div>

          <p className="mt-4 text-xs uppercase tracking-wider text-muted-foreground">Branch scope</p>
          <div className="mt-2 space-y-2">
            {branches.map((b) => (
              <label key={b} className="flex items-center gap-2 text-sm">
                <Checkbox checked={scope.includes(b)} onCheckedChange={() => setScope((l) => toggle(l, b))} />
                {b}
              </label>
            ))}
          </div>

          <Button
            className="mt-4 w-full"
            size="sm"
            onClick={() => {
              const res = run(
                () => saveRole({ name, basedOn: "dispatcher", permissions: perms, branchScope: scope }, null, persona.name),
                "Custom role created.",
              );
              if (res.ok) { setName(""); setPerms(["view_operations"]); setScope(branches); }
            }}
          >
            Create role
          </Button>
        </Panel>
      </div>
    </>
  );
}
