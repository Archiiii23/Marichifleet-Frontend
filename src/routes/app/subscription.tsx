import { createFileRoute } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { KpiCard, PageHeader, Panel } from "@/components/mf/primitives";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { getExtras } from "@/domain/extras";
import { money, moneyCompact, fmtDate, useAction, useDb } from "@/domain/hooks";
import { PLANS, changePlan, getPrd, planFor, subscriptionCost, toggleAddOn } from "@/domain/prd";
import { useSession } from "@/domain/session";

export const Route = createFileRoute("/app/subscription")({
  head: () => ({
    meta: [
      { title: "Subscription & billing — MarichiFleet" },
      { name: "description", content: "Your MarichiFleet plan, fleet usage against plan limits, add-on modules and monthly cost." },
      { property: "og:title", content: "Subscription & billing — MarichiFleet" },
      { property: "og:description", content: "Plan tier, usage and add-on modules for your fleet." },
    ],
  }),
  component: SubscriptionScreen,
});

function SubscriptionScreen() {
  const db = useDb();
  const prd = getPrd();
  const extras = getExtras();
  const run = useAction();
  const { persona } = useSession();

  const current = planFor(prd.subscription.tier);
  const cost = subscriptionCost();
  const usedPct = Math.min(100, Math.round((db.vehicles.length / current.fleetTo) * 100));

  return (
    <>
      <PageHeader
        title="Subscription & billing"
        subtitle="Plan tier, fleet usage against your limit, and the add-on modules switched on for this tenant."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Current plan" value={prd.subscription.tier} hint={`${current.fleetFrom}–${current.fleetTo} vehicles`} />
        <KpiCard label="Fleet usage" value={`${db.vehicles.length} / ${current.fleetTo}`} hint={`${usedPct}% of plan limit`} tone={usedPct > 85 ? "warning" : "neutral"} />
        <KpiCard label="Monthly cost" value={moneyCompact(cost.total)} hint={`${money(cost.base)} platform + ${money(cost.addOns)} add-ons`} />
        <KpiCard label="Renews" value={fmtDate(prd.subscription.renewsISO)} hint="Auto-renewal enabled" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {PLANS.map((p) => {
          const active = p.tier === prd.subscription.tier;
          const tooSmall = db.vehicles.length > p.fleetTo;
          return (
            <section
              key={p.tier}
              className={`rounded-lg border bg-card p-4 ${active ? "border-primary" : "border-border"}`}
            >
              <div className="flex items-center justify-between">
                <h2 className="font-display text-base font-semibold">{p.tier}</h2>
                {active && <span className="text-[10px] uppercase tracking-wider text-primary">Current</span>}
              </div>
              <p className="numeric mt-2 text-2xl font-semibold">{money(p.pricePerVehicle)}</p>
              <p className="text-xs text-muted-foreground">per vehicle / month · {p.fleetFrom}–{p.fleetTo} vehicles</p>
              <ul className="mt-3 space-y-1.5 text-sm">
                {p.includes.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-success" aria-hidden />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Button
                className="mt-4 w-full"
                size="sm"
                variant={active ? "outline" : "default"}
                disabled={active || tooSmall}
                onClick={() => run(() => changePlan(p.tier, persona.name), `Moved to the ${p.tier} plan.`)}
              >
                {active ? "Current plan" : tooSmall ? "Fleet too large" : `Switch to ${p.tier}`}
              </Button>
            </section>
          );
        })}
      </div>

      <Panel className="mt-4" title="Add-on modules" description="Metered modules billed on top of the platform fee.">
        <ul className="divide-y divide-border">
          {prd.subscription.addOns.map((a) => {
            const units = a.basis === "per vehicle" ? db.vehicles.length : a.basis === "per employee" ? extras.employees.length : 1;
            return (
              <li key={a.key} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{a.label}</p>
                  <p className="text-xs text-muted-foreground">{a.description}</p>
                </div>
                <p className="numeric text-sm">
                  {money(a.unitPrice)} <span className="text-xs text-muted-foreground">{a.basis}</span>
                </p>
                <p className="numeric w-24 text-right text-sm text-muted-foreground">
                  {a.enabled ? money(a.unitPrice * units) : "—"}
                </p>
                <Switch
                  checked={a.enabled}
                  aria-label={`Toggle ${a.label}`}
                  onCheckedChange={() =>
                    run(() => toggleAddOn(a.key, persona.name), `${a.label} updated.`)
                  }
                />
              </li>
            );
          })}
        </ul>
      </Panel>
    </>
  );
}
