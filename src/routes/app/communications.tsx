import { createFileRoute } from "@tanstack/react-router";
import { MessageSquare, Mail, Smartphone, Bell } from "lucide-react";
import { KpiCard, PageHeader, Panel, StatusBadge } from "@/components/mf/primitives";
import { Button } from "@/components/ui/button";
import { fmtDateTime, useAction, useDb } from "@/domain/hooks";
import { retryNotification } from "@/domain/store";
import { useGo } from "@/lib/nav";

export const Route = createFileRoute("/app/communications")({
  head: () => ({
    meta: [
      { title: "Communications — MarichiFleet" },
      { name: "description", content: "Every WhatsApp, SMS, email and in-app message with delivery status and retry." },
    ],
  }),
  component: Communications,
});

const ICON = { whatsapp: MessageSquare, sms: Smartphone, email: Mail, in_app: Bell };

function Communications() {
  const db = useDb();
  const run = useAction();
  const go = useGo();
  const failed = db.notifications.filter((n) => n.status === "failed");

  return (
    <>
      <PageHeader
        title="Communications"
        subtitle="Message log across WhatsApp, SMS, email and in-app. Failed sends can be retried."
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Messages sent" value={String(db.notifications.length)} hint="Across all channels" icon={MessageSquare} />
        <KpiCard label="WhatsApp" value={String(db.notifications.filter((n) => n.channel === "whatsapp").length)} hint="Primary client channel" icon={MessageSquare} />
        <KpiCard label="Failed" value={String(failed.length)} hint="Awaiting retry" tone={failed.length ? "danger" : "success"} icon={Bell} />
        <KpiCard label="Delivered" value={String(db.notifications.filter((n) => n.status === "delivered").length)} hint="Provider confirmed" tone="success" icon={Mail} />
      </div>

      <Panel className="mt-4" title="Message log" description="Newest first">
        <ul className="space-y-2">
          {db.notifications.slice(0, 60).map((n) => {
            const Icon = ICON[n.channel];
            return (
              <li key={n.id} className="flex flex-wrap items-start gap-3 rounded-md border border-border p-3">
                <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{n.event.replace(/_/g, " ")}</span>
                    {n.entityRef && <span className="numeric text-xs">{n.entityRef}</span>}
                    <span className="text-xs text-muted-foreground">to {n.recipient}</span>
                  </div>
                  <p className="mt-1 text-sm">{n.body}</p>
                  <p className="text-xs text-muted-foreground">
                    {fmtDateTime(n.atISO)} · {n.attempts} attempt{n.attempts > 1 ? "s" : ""}
                  </p>
                </div>
                <StatusBadge status={n.status} />
                {n.status === "failed" && (
                  <Button size="sm" variant="outline" onClick={() => run(() => retryNotification(n.id), "Message resent")}>
                    Retry
                  </Button>
                )}
                {n.link && (
                  <Button size="sm" variant="ghost" onClick={() => go(n.link!)}>
                    Open
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      </Panel>
    </>
  );
}
