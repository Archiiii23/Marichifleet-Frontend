import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { KpiCard, NoAccess, PageHeader, Panel, StatusBadge } from "@/components/mf/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getExtras, toggleFlag } from "@/domain/extras";
import { inr, useAction, useDb } from "@/domain/hooks";
import { PERSONAS, roleLabel, useSession } from "@/domain/session";
import { useTheme } from "@/domain/theme";
import { toast } from "sonner";

export const Route = createFileRoute("/app/settings")({
  head: () => ({
    meta: [
      { title: "Settings — MarichiFleet" },
      { name: "description", content: "Company profile, branches, users and roles, rate cards, tax setup, message templates and appearance." },
      { property: "og:title", content: "Settings — MarichiFleet" },
      { property: "og:description", content: "Configure your company, team, rate cards, taxes and notifications." },
    ],
  }),
  component: Settings,
});

const TEMPLATES = [
  ["BOOKING_CONFIRMED", "Hi {client}, your booking {ref} is confirmed for pickup on {date}."],
  ["DRIVER_ASSIGNED", "{driver} ({vehicle}) is assigned to {ref}. Track live: {link}"],
  ["TRIP_DELAYED", "Trip {ref} is running {mins} minutes late. Updated ETA {eta}."],
  ["POD_AVAILABLE", "Delivery of {ref} is complete. Proof of delivery: {link}"],
  ["PAYMENT_REMINDER", "Invoice {ref} of {amount} is due on {date}. Pay here: {link}"],
];

function Settings() {
  const db = useDb();
  const extras = getExtras();
  const run = useAction();
  const { persona, can } = useSession();
  const { theme, setTheme } = useTheme();
  const [company, setCompany] = useState(db.tenant.name);
  const [gstin, setGstin] = useState("27AABCM1234K1Z9");
  const [taxPct, setTaxPct] = useState("18");

  if (!can("view_admin")) return <NoAccess what="company settings" />;

  return (
    <>
      <PageHeader title="Settings" subtitle="Company, branches, people, pricing, tax, messaging and appearance." />

      <Tabs defaultValue="company">
        <TabsList className="flex-wrap">
          <TabsTrigger value="company">Company</TabsTrigger>
          <TabsTrigger value="branches">Branches</TabsTrigger>
          <TabsTrigger value="people">Users & roles</TabsTrigger>
          <TabsTrigger value="pricing">Rate cards & tax</TabsTrigger>
          <TabsTrigger value="messaging">Messaging</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
        </TabsList>

        <TabsContent value="company" className="mt-4 space-y-4">
          <Panel title="Company profile">
            <div className="grid max-w-2xl gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs">Registered name</Label>
                <Input className="mt-1" value={company} onChange={(e) => setCompany(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">GSTIN</Label>
                <Input className="mt-1" value={gstin} onChange={(e) => setGstin(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Country</Label>
                <Input className="mt-1" value={db.tenant.country} readOnly />
              </div>
              <div>
                <Label className="text-xs">Currency</Label>
                <Input className="mt-1" value={db.tenant.currency} readOnly />
              </div>
            </div>
            <Button className="mt-4" size="sm" onClick={() => toast.success("Company profile saved")}>
              Save profile
            </Button>
          </Panel>
        </TabsContent>

        <TabsContent value="branches" className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="Branches" value={String(db.branches.length)} hint="Depots in operation" />
            <KpiCard label="Vehicles" value={String(db.vehicles.length)} hint="Across all depots" />
            <KpiCard label="Drivers" value={String(db.drivers.length)} hint="On the roster" />
            <KpiCard label="Clients" value={String(db.clients.length)} hint="Active accounts" />
          </div>
          <Panel title="Depots">
            <ul className="space-y-2">
              {db.branches.map((b) => (
                <li key={b.id} className="flex flex-wrap items-center gap-3 rounded-md border border-border p-3 text-sm">
                  <span className="font-medium">{b.name}</span>
                  <span className="text-muted-foreground">{b.city}</span>
                  <span className="numeric ml-auto text-xs text-muted-foreground">
                    {db.vehicles.filter((v) => v.branchId === b.id).length} vehicles
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        </TabsContent>

        <TabsContent value="people" className="mt-4">
          <Panel title="Users & roles" description="Roles decide navigation, page access and every action.">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="py-2 pr-3">User</th>
                    <th className="py-2 pr-3">Role</th>
                    <th className="py-2">Signed in as</th>
                  </tr>
                </thead>
                <tbody>
                  {PERSONAS.map((p) => (
                    <tr key={p.id} className="border-b border-border/60 last:border-0">
                      <td className="py-2 pr-3">
                        <span className="block font-medium">{p.name}</span>
                        <span className="text-xs text-muted-foreground">{p.title}</span>
                      </td>
                      <td className="py-2 pr-3">{roleLabel(p.role)}</td>
                      <td className="py-2">{p.id === persona.id ? <StatusBadge status="available" /> : <span className="text-xs text-muted-foreground">—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </TabsContent>

        <TabsContent value="pricing" className="mt-4 space-y-4">
          <Panel title="Tax setup">
            <div className="flex max-w-xs items-end gap-3">
              <div className="flex-1">
                <Label className="text-xs">Default GST %</Label>
                <Input className="mt-1" value={taxPct} inputMode="numeric" onChange={(e) => setTaxPct(e.target.value)} />
              </div>
              <Button size="sm" onClick={() => toast.success(`Default tax set to ${taxPct}%`)}>Save</Button>
            </div>
          </Panel>
          <Panel title="Client rate cards">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="py-2 pr-3">Client</th>
                    <th className="py-2 pr-3">Vehicle type</th>
                    <th className="py-2 pr-3 text-right">Per km</th>
                    <th className="py-2 text-right">Minimum</th>
                  </tr>
                </thead>
                <tbody>
                  {db.rateCards.slice(0, 24).map((rc) => (
                    <tr key={rc.id} className="border-b border-border/60 last:border-0">
                      <td className="py-2 pr-3">{db.clients.find((c) => c.id === rc.clientId)?.name ?? "—"}</td>
                      <td className="py-2 pr-3">{rc.vehicleType}</td>
                      <td className="numeric py-2 pr-3 text-right">{inr(rc.perKm)}</td>
                      <td className="numeric py-2 text-right">{inr(rc.minCharge)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </TabsContent>

        <TabsContent value="messaging" className="mt-4 space-y-4">
          <Panel title="Notification templates" description="Placeholders in braces are filled from the record when the event fires.">
            <ul className="space-y-2">
              {TEMPLATES.map(([event, body]) => (
                <li key={event} className="rounded-md border border-border p-3">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{event}</p>
                  <p className="mt-1 text-sm">{body}</p>
                </li>
              ))}
            </ul>
          </Panel>
          <Panel title="Channels & features">
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
        </TabsContent>

        <TabsContent value="appearance" className="mt-4">
          <Panel title="Appearance" description="Applies to the control tower, driver app and client portal on this device.">
            <div className="flex flex-wrap gap-3">
              {(["dark", "light", "system"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={`rounded-lg border px-4 py-3 text-left text-sm capitalize ${theme === t ? "border-primary bg-surface" : "border-border hover:border-border-strong"
                    }`}
                >
                  <span className="block font-medium">{t} appearance</span>
                  <span className="block text-xs text-muted-foreground">
                    {t === "dark" ? "Night control-tower canvas" : t === "light" ? "Paper-bright daytime canvas" : "Follow this device"}
                  </span>
                </button>
              ))}
            </div>
          </Panel>
        </TabsContent>
      </Tabs>
    </>
  );
}
