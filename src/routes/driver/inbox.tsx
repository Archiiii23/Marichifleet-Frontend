import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, CloudOff, Inbox } from "lucide-react";
import { EmptyState, Panel, StatusBadge } from "@/components/mf/primitives";
import { Button } from "@/components/ui/button";
import { timeAgo, useDb } from "@/domain/hooks";
import { useSession } from "@/domain/session";

export const Route = createFileRoute("/driver/inbox")({
  head: () => ({
    meta: [
      { title: "Driver inbox — MarichiFleet" },
      { name: "description", content: "Tasks waiting on you and every message the office has sent, on one screen." },
    ],
  }),
  component: DriverInbox,
});

function DriverInbox() {
  const db = useDb();
  const { persona, online } = useSession();
  const driverId = persona.driverId ?? db.drivers[0]?.id;
  const driver = db.drivers.find((d) => d.id === driverId);
  const trips = db.trips.filter((t) => t.driverId === driverId);

  const tasks = [
    ...trips
      .filter((t) => t.status === "assigned")
      .map((t) => ({ id: `acc_${t.id}`, label: `Accept ${t.ref}`, detail: "Dispatch is holding the load for you", to: `/driver/trips/${t.id}` })),
    ...trips
      .filter((t) => t.status === "exception")
      .map((t) => ({ id: `exc_${t.id}`, label: `Update the office on ${t.ref}`, detail: t.exception?.note ?? "Incident open", to: `/driver/trips/${t.id}` })),
    ...trips
      .filter((t) => t.status === "delivered" && !t.podId)
      .map((t) => ({ id: `pod_${t.id}`, label: `Capture proof for ${t.ref}`, detail: "Signature, photo and OTP still missing", to: `/driver/trips/${t.id}` })),
  ];

  const messages = db.notifications
    .filter((n) => n.recipientRole === "driver" || n.recipient === driver?.phone || n.recipient === driver?.name)
    .slice(0, 25);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-semibold">Inbox</h1>
        <p className="text-sm text-muted-foreground">{tasks.length ? `${tasks.length} task${tasks.length > 1 ? "s" : ""} waiting on you` : "Nothing waiting on you"}</p>
      </div>

      {!online && (
        <div className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-warning">
          <CloudOff className="mt-0.5 size-4 shrink-0" aria-hidden />
          Offline. You can still read this list; anything you do is queued and sent when signal returns.
        </div>
      )}

      <Panel title="Tasks">
        {tasks.length === 0 ? (
          <EmptyState title="All clear" message="No acceptances, incident updates or proofs are pending." />
        ) : (
          <ul className="-m-4 divide-y divide-border">
            {tasks.map((t) => (
              <li key={t.id} className="flex items-center gap-3 px-4 py-3">
                <CheckCircle2 className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{t.label}</p>
                  <p className="truncate text-xs text-muted-foreground">{t.detail}</p>
                </div>
                <Button size="sm" variant="outline" asChild>
                  <Link to={t.to as "/"}>Open</Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Messages" description="What the office and the system have sent you">
        {messages.length === 0 ? (
          <EmptyState title="No messages" message="Trip updates and office instructions will appear here." icon={Inbox} />
        ) : (
          <ul className="-m-4 divide-y divide-border">
            {messages.map((m) => (
              <li key={m.id} className="px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-xs uppercase tracking-wide text-muted-foreground">
                    {m.channel} · {m.entityRef ?? "general"}
                  </span>
                  <StatusBadge status={m.status} />
                </div>
                <p className="mt-1 text-sm">{m.body}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{timeAgo(m.atISO)}</p>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
