import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel } from "@/components/mf/primitives";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { labelize } from "@/domain/machines";
import { useAction, useDb } from "@/domain/hooks";
import { getPrd, setEscalation, toggleAlertChannel, type Channel } from "@/domain/prd";
import { roleLabel, useSession } from "@/domain/session";
import type { Role } from "@/domain/types";

const CHANNELS: Channel[] = ["in_app", "whatsapp", "sms", "email"];
const ESCALATION_ROLES: Role[] = ["owner", "manager", "dispatcher", "workshop", "accountant"];

export const Route = createFileRoute("/app/alerts")({
  head: () => ({
    meta: [
      { title: "Alert preferences — MarichiFleet" },
      { name: "description", content: "Choose which channels each operational alert uses and how unactioned critical alerts escalate." },
      { property: "og:title", content: "Alert preferences — MarichiFleet" },
      { property: "og:description", content: "Per-event, per-role notification channels and escalation rules." },
    ],
  }),
  component: AlertPreferences,
});

function AlertPreferences() {
  useDb();
  const prd = getPrd();
  const run = useAction();
  const { persona } = useSession();

  return (
    <>
      <PageHeader
        title="Alert preferences"
        subtitle="Every alert can be delivered in-app, on WhatsApp, by SMS or email. Critical alerts escalate when nobody acts."
      />

      <Panel title="Notification matrix" description="Changes apply immediately to the notification engine.">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="py-2 pr-3">Alert</th>
                <th className="py-2 pr-3">Primary recipient</th>
                {CHANNELS.map((c) => (
                  <th key={c} className="py-2 pr-3">{labelize(c)}</th>
                ))}
                <th className="py-2 pr-3">Escalate after</th>
                <th className="py-2">Escalate to</th>
              </tr>
            </thead>
            <tbody>
              {prd.alertPrefs.map((p) => (
                <tr key={p.event} className="border-b border-border/60">
                  <td className="py-2.5 pr-3">
                    <span className="font-medium">{labelize(p.event)}</span>
                    {p.critical && (
                      <span className="ml-2 rounded border border-destructive/40 px-1.5 py-0.5 text-[10px] uppercase text-destructive">
                        Critical
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 pr-3 text-muted-foreground">{roleLabel(p.role)}</td>
                  {CHANNELS.map((c) => (
                    <td key={c} className="py-2.5 pr-3">
                      <Switch
                        checked={p.channels.includes(c)}
                        aria-label={`${labelize(p.event)} via ${labelize(c)}`}
                        onCheckedChange={() =>
                          run(() => toggleAlertChannel(p.event, c, persona.name), "Alert channels updated.")
                        }
                      />
                    </td>
                  ))}
                  <td className="py-2.5 pr-3">
                    <Input
                      type="number"
                      min={0}
                      max={720}
                      defaultValue={p.escalateAfterMins}
                      className="h-8 w-20"
                      aria-label={`Escalation delay for ${labelize(p.event)}`}
                      onBlur={(e) =>
                        run(
                          () => setEscalation(p.event, Number(e.target.value), p.escalateTo, persona.name),
                          "Escalation rule saved.",
                        )
                      }
                    />
                  </td>
                  <td className="py-2.5">
                    <Select
                      value={p.escalateTo}
                      onValueChange={(v) =>
                        run(
                          () => setEscalation(p.event, p.escalateAfterMins, v as Role, persona.name),
                          "Escalation rule saved.",
                        )
                      }
                    >
                      <SelectTrigger className="h-8 w-36" aria-label={`Escalation role for ${labelize(p.event)}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ESCALATION_ROLES.map((r) => (
                          <SelectItem key={r} value={r}>{roleLabel(r)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
