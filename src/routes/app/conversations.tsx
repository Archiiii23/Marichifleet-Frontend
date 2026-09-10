import { createFileRoute } from "@tanstack/react-router";
import { MessageSquare, UserX } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState, KpiCard, PageHeader, Panel } from "@/components/mf/primitives";
import { deriveConversations } from "@/domain/os/ops";
import { useDb, timeAgo } from "@/domain/hooks";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/conversations")({
  head: () => ({
    meta: [
      { title: "Conversations — MarichiFleet" },
      { name: "description", content: "WhatsApp and SMS threads with drivers, customers and vendors, with session windows and templates." },
      { property: "og:title", content: "Conversations — MarichiFleet" },
      { property: "og:description", content: "Every message the operation sent or received, in one inbox." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Conversations,
});

function Conversations() {
  const db = useDb();
  const threads = useMemo(() => deriveConversations(db), [db]);
  const [selected, setSelected] = useState<string | null>(null);
  const active = threads.find((t) => t.id === selected) ?? threads[0];

  const failed = db.notifications.filter((n) => n.status === "failed").length;

  return (
    <>
      <PageHeader
        title="Conversations"
        subtitle="WhatsApp is where the operation actually talks. Threads, session windows and template health in one place."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard label="Open threads" value={String(threads.length)} hint="Across drivers, customers and vendors" icon={MessageSquare} />
        <KpiCard label="Windows closing soon" value={String(threads.filter((t) => t.windowExpiresInHrs <= 4).length)} hint="Free-form replies expire; templates take over" tone="warning" />
        <KpiCard label="Delivery failures" value={String(failed)} hint="Retried, then escalated to a task" tone="danger" />
      </div>

      {threads.length === 0 ? (
        <div className="mt-4">
          <EmptyState title="No conversations yet" message="Messages appear here as soon as the operation sends or receives one." />
        </div>
      ) : (
        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,320px)_1fr]">
          <Panel title="Inbox" description={`${threads.length} threads`}>
            <ul className="-m-4 divide-y divide-border">
              {threads.map((t) => (
                <li key={t.id}>
                  <button
                    onClick={() => setSelected(t.id)}
                    className={cn("w-full px-4 py-3 text-left transition-colors hover:bg-surface", active?.id === t.id && "bg-surface")}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium">{t.contact}</span>
                      <span className="text-[11px] text-muted-foreground">{timeAgo(t.lastAtISO)}</span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{t.lastMessage}</p>
                    <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                      {t.role} · {t.channel} · window {t.windowExpiresInHrs}h
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          </Panel>

          {active && (
            <Panel
              title={active.contact}
              description={`${active.channel} · session window closes in ${active.windowExpiresInHrs} h`}
            >
              {active.unresolvedIdentity && (
                <p className="mb-3 flex items-start gap-2 rounded-md border border-warning/40 bg-warning/5 p-2 text-xs text-muted-foreground">
                  <UserX className="mt-0.5 size-3.5 shrink-0 text-warning" aria-hidden />
                  This number is not linked to a contact. Nothing is actioned until someone confirms who it is.
                </p>
              )}
              <div className="space-y-3">
                {active.messages.map((m, i) => (
                  <div key={i} className={cn("flex", m.from === "us" ? "justify-end" : "justify-start")}>
                    <div
                      className={cn(
                        "max-w-[80%] rounded-lg border px-3 py-2 text-sm",
                        m.from === "us" ? "border-primary/30 bg-primary/10" : "border-border bg-surface",
                      )}
                    >
                      <p>{m.body}</p>
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {timeAgo(m.atISO)}
                        {m.template ? ` · template ${m.template}` : " · free-form reply"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm">Send approved template</Button>
                <Button size="sm" variant="outline">Assign to dispatcher</Button>
                <Button size="sm" variant="ghost">Open contact</Button>
              </div>
            </Panel>
          )}
        </div>
      )}
    </>
  );
}
