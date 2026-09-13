import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle, Check, CheckCircle2, ChevronRight, Clock, ExternalLink,
  Eye, Filter, Layers, MapPin, MessageSquare, PhoneCall, RefreshCw, ShieldAlert,
  SlidersHorizontal, Truck, UserCheck, Zap,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FleetMap } from "@/components/mf/fleet-map";
import { FixAge } from "@/components/mf/fix-age";
import { EmptyState, KpiCard, PageHeader, Panel, StatusBadge } from "@/components/mf/primitives";
import { deriveExceptions, type Exception } from "@/domain/os/ops";
import { AUTOMATION_LEVEL } from "@/domain/os/roles";
import { useDb } from "@/domain/hooks";
import { useSession } from "@/domain/session";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/tower")({
  head: () => ({
    meta: [
      { title: "Control Tower — MarichiFleet" },
      { name: "description", content: "Live exception queue and fleet map: every load that needs a decision, ranked." },
      { property: "og:title", content: "Control Tower — MarichiFleet" },
      { property: "og:description", content: "Live exception queue and fleet map for road freight operations." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Tower,
});

const SEVERITIES = ["all", "critical", "high", "medium"] as const;
type ViewLayout = "split" | "map" | "queue";

function Tower() {
  const db = useDb();
  const { persona } = useSession();
  const [severity, setSeverity] = useState<(typeof SEVERITIES)[number]>("all");
  const [layout, setLayout] = useState<ViewLayout>("split");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [acknowledgedIds, setAcknowledgedIds] = useState<Set<string>>(new Set());
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set());

  // Call driver dialog state
  const [callDialog, setCallDialog] = useState<{ open: boolean; driverName: string; phone: string; tripRef: string } | null>(null);

  const rawExceptions = useMemo(() => deriveExceptions(db), [db]);

  // Filter out resolved
  const exceptions = useMemo(
    () => rawExceptions.filter((e) => !resolvedIds.has(e.id)),
    [rawExceptions, resolvedIds],
  );

  const shown = exceptions.filter((e) => severity === "all" || e.severity === severity);
  const active = shown.find((e) => e.id === selectedId) ?? shown[0];

  const moving = db.vehicles.filter((v) => v.status === "on_trip");
  const criticalCount = exceptions.filter((e) => e.severity === "critical").length;
  const slaRiskCount = exceptions.filter((e) => e.kind === "trip.sla.at_risk").length;
  const dispatchBlockedCount = exceptions.filter((e) => e.kind === "compliance.dispatch.blocked").length;

  const handleAcknowledge = (id: string, title: string) => {
    setAcknowledgedIds((prev) => new Set([...prev, id]));
    toast.success("Exception Acknowledged", {
      description: `Logged by ${persona.name} (${persona.title})`,
    });
  };

  const handleResolve = (id: string, title: string) => {
    setResolvedIds((prev) => new Set([...prev, id]));
    toast.success("Exception Resolved", {
      description: `${title} marked resolved by ${persona.name}`,
    });
  };

  const handleCallDriver = (ex: Exception) => {
    // Find associated trip or vehicle if available
    const trip = db.trips.find((t) => ex.link?.includes(t.id));
    const driver = trip ? db.drivers.find((d) => d.id === trip.driverId) : db.drivers[0];
    setCallDialog({
      open: true,
      driverName: driver?.name ?? "Driver",
      phone: driver?.phone ?? "+91 98260 99881",
      tripRef: trip?.ref ?? ex.id,
    });
  };

  const handleNotifyCustomer = (ex: Exception) => {
    toast.success("Customer Alert Dispatched", {
      description: "WhatsApp ETA update broadcasted to receiver's logistics coordinator.",
    });
  };

  return (
    <>
      <PageHeader
        title="Control Tower"
        subtitle="The queue is the product. Every row is a decision waiting, with its consequence and context assembled."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {/* View layout toggles */}
            <div className="flex items-center rounded-md border border-border bg-card p-0.5">
              <Button
                size="sm"
                variant={layout === "split" ? "secondary" : "ghost"}
                className="h-7 px-2.5 text-xs"
                onClick={() => setLayout("split")}
              >
                Split
              </Button>
              <Button
                size="sm"
                variant={layout === "map" ? "secondary" : "ghost"}
                className="h-7 px-2.5 text-xs"
                onClick={() => setLayout("map")}
              >
                Map Focus
              </Button>
              <Button
                size="sm"
                variant={layout === "queue" ? "secondary" : "ghost"}
                className="h-7 px-2.5 text-xs"
                onClick={() => setLayout("queue")}
              >
                Queue Focus
              </Button>
            </div>

            {/* Severity Filter */}
            <div className="flex items-center gap-1 rounded-md border border-border bg-card p-0.5">
              <Filter className="ml-1.5 size-3.5 text-muted-foreground" aria-hidden />
              {SEVERITIES.map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={severity === s ? "secondary" : "ghost"}
                  className="h-7 px-2 text-xs capitalize"
                  onClick={() => setSeverity(s)}
                >
                  {s}
                </Button>
              ))}
            </div>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Open exceptions"
          value={String(exceptions.length)}
          hint={`${criticalCount} critical consequence`}
          tone={criticalCount > 0 ? "danger" : "neutral"}
          icon={AlertTriangle}
        />
        <KpiCard
          label="Vehicles moving"
          value={String(moving.length)}
          hint={`of ${db.vehicles.length} in fleet tracking`}
          icon={Truck}
        />
        <KpiCard
          label="SLA at risk"
          value={String(slaRiskCount)}
          hint="Within 45m of contractual breach"
          tone={slaRiskCount > 0 ? "warning" : "success"}
          icon={Clock}
        />
        <KpiCard
          label="Dispatch blocked"
          value={String(dispatchBlockedCount)}
          hint="Compliance or document freeze"
          tone={dispatchBlockedCount > 0 ? "danger" : "neutral"}
          icon={ShieldAlert}
        />
      </div>

      {/* Main workspace layout */}
      <div className={cn(
        "mt-4 grid gap-4",
        layout === "split" && "lg:grid-cols-[minmax(0,390px)_1fr]",
        layout === "queue" && "grid-cols-1",
        layout === "map" && "grid-cols-1",
      )}>
        {/* Exception Queue Panel */}
        {layout !== "map" && (
          <Panel
            title="Exception Queue"
            description={`${shown.length} ranked by severity & urgency`}
            className="overflow-hidden"
          >
            {shown.length === 0 ? (
              <EmptyState
                title="All clear"
                message="No open exceptions at this severity. All transit corridors are operating to plan."
              />
            ) : (
              <ul className="-m-4 divide-y divide-border">
                {shown.map((e) => {
                  const isAck = acknowledgedIds.has(e.id);
                  const isSelected = active?.id === e.id;
                  // Synthetic fix date based on ageMins
                  const fixIso = new Date(Date.now() - e.ageMins * 60 * 1000).toISOString();

                  return (
                    <li key={e.id}>
                      <button
                        onClick={() => setSelectedId(e.id)}
                        className={cn(
                          "w-full px-4 py-3 text-left transition-colors hover:bg-surface/80",
                          isSelected && "bg-surface border-l-2 border-primary",
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <SeverityDot severity={e.severity} />
                            <span className="truncate text-sm font-medium">{e.title}</span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {isAck && (
                              <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-500">
                                Acked
                              </span>
                            )}
                            <FixAge atISO={fixIso} cadenceSec={60} />
                          </div>
                        </div>
                        <p className="mt-1 line-clamp-2 pl-4 text-xs text-muted-foreground">{e.context}</p>
                        <div className="mt-2 pl-4 flex items-center gap-2 text-[11px] text-muted-foreground">
                          <span className="rounded border border-border px-1 text-[10px] uppercase tracking-wider">
                            {e.level}
                          </span>
                          <span>{e.kind}</span>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        )}

        {/* Right side / Full Map */}
        {layout !== "queue" && (
          <div className="space-y-4">
            <Panel
              title="Live Corridor Map"
              description="Real-time telemetry and geofence tracking across primary freight routes"
              actions={
                <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                  Live GPS Ping
                </span>
              }
            >
              <FleetMap
                items={moving.map((v) => {
                  const trip = db.trips.find((t) => t.id === v.currentTripId);
                  return { vehicle: v, trip, delayed: (trip?.delayMins ?? 0) > 25 };
                })}
                height={layout === "map" ? 520 : 300}
              />
            </Panel>

            {active && layout === "split" && (
              <ExceptionDetail
                exception={active}
                isAcknowledged={acknowledgedIds.has(active.id)}
                onAcknowledge={() => handleAcknowledge(active.id, active.title)}
                onResolve={() => handleResolve(active.id, active.title)}
                onCallDriver={() => handleCallDriver(active)}
                onNotifyCustomer={() => handleNotifyCustomer(active)}
              />
            )}
          </div>
        )}

        {/* Active Exception Detail in Queue layout */}
        {layout === "queue" && active && (
          <div className="mt-2">
            <ExceptionDetail
              exception={active}
              isAcknowledged={acknowledgedIds.has(active.id)}
              onAcknowledge={() => handleAcknowledge(active.id, active.title)}
              onResolve={() => handleResolve(active.id, active.title)}
              onCallDriver={() => handleCallDriver(active)}
              onNotifyCustomer={() => handleNotifyCustomer(active)}
            />
          </div>
        )}
      </div>

      {/* Call Driver Modal */}
      {callDialog && (
        <Dialog open={callDialog.open} onOpenChange={(v) => !v && setCallDialog(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <PhoneCall className="size-5 text-primary" />
                Call Driver Dispatch
              </DialogTitle>
              <DialogDescription>
                Initiate VoIP outbound bridge or direct mobile dialer.
              </DialogDescription>
            </DialogHeader>
            <div className="rounded-lg border border-border bg-surface p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Driver:</span>
                <span className="font-semibold">{callDialog.driverName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Phone:</span>
                <span className="font-mono text-primary font-medium">{callDialog.phone}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Trip / Exception:</span>
                <span className="font-mono text-xs">{callDialog.tripRef}</span>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setCallDialog(null)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  toast.success(`Calling ${callDialog.driverName}`, {
                    description: `Connecting outbound line to ${callDialog.phone}...`,
                  });
                  setCallDialog(null);
                }}
              >
                Connect Call
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

function SeverityDot({ severity }: { severity: Exception["severity"] }) {
  return (
    <span
      className={cn(
        "size-2.5 shrink-0 rounded-full",
        severity === "critical" && "bg-destructive ring-2 ring-destructive/20",
        severity === "high" && "bg-warning ring-2 ring-warning/20",
        severity === "medium" && "bg-info ring-2 ring-info/20",
      )}
      aria-label={severity}
    />
  );
}

function ExceptionDetail({
  exception,
  isAcknowledged,
  onAcknowledge,
  onResolve,
  onCallDriver,
  onNotifyCustomer,
}: {
  exception: Exception;
  isAcknowledged: boolean;
  onAcknowledge: () => void;
  onResolve: () => void;
  onCallDriver: () => void;
  onNotifyCustomer: () => void;
}) {
  const lvl = AUTOMATION_LEVEL[exception.level];
  const fixIso = new Date(Date.now() - exception.ageMins * 60 * 1000).toISOString();

  return (
    <Panel
      title={exception.title}
      description={`${exception.kind} · opened ${exception.ageMins}m ago`}
      actions={
        <div className="flex items-center gap-2">
          <FixAge atISO={fixIso} cadenceSec={60} />
          {exception.link && (
            <Button asChild size="sm" variant="outline" className="gap-1">
              <Link to={exception.link as "/"}>
                <span>Open record</span>
                <ExternalLink className="size-3" />
              </Link>
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-foreground/90">{exception.context}</p>

        {/* Automation Level & Consequence Card */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-md border border-border bg-surface p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Automation Boundary: {lvl.label}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{lvl.blurb}</p>
          </div>
          <div className="rounded-md border border-border bg-surface p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Severity Level: {exception.severity.toUpperCase()}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Consequence evaluated against SLA breach penalty and freight integrity.
            </p>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
          {!isAcknowledged ? (
            <Button size="sm" onClick={onAcknowledge} className="gap-1.5">
              <Check className="size-4" />
              Acknowledge
            </Button>
          ) : (
            <span className="flex items-center gap-1 text-xs text-emerald-500 font-medium px-2 py-1 bg-emerald-500/10 rounded">
              <CheckCircle2 className="size-3.5" />
              Acknowledged
            </span>
          )}

          <Button size="sm" variant="outline" onClick={onCallDriver} className="gap-1.5">
            <PhoneCall className="size-3.5" />
            Call Driver
          </Button>

          <Button size="sm" variant="outline" onClick={onNotifyCustomer} className="gap-1.5">
            <MessageSquare className="size-3.5" />
            Notify Customer
          </Button>

          <Button size="sm" variant="secondary" onClick={onResolve} className="gap-1.5 ml-auto">
            <UserCheck className="size-3.5" />
            Resolve Exception
          </Button>
        </div>
      </div>
    </Panel>
  );
}
