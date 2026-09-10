/**
 * Derived control-loop views (system_design Parts 1, 6.3, 10, 13).
 * Everything here is a pure projection of the operating data already in the
 * store — no new source of truth, so screens stay consistent with the rest of
 * the console.
 */
import type { DbShape } from "@/domain/types";
import type { AutomationLevel } from "./roles";

export interface Exception {
  id: string;
  kind:
    | "trip.sla.at_risk"
    | "trip.sla.breached"
    | "incident.opened"
    | "vehicle.tracker.silent"
    | "compliance.dispatch.blocked"
    | "invoice.overdue"
    | "pod.review.pending";
  severity: "critical" | "high" | "medium";
  title: string;
  context: string;
  subject: string;
  link?: string;
  ageMins: number;
  level: AutomationLevel;
}

const mins = (iso: string, now: number) => Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));

export function deriveExceptions(db: DbShape, now = Date.now()): Exception[] {
  const out: Exception[] = [];

  for (const t of db.trips) {
    const b = db.bookings.find((x) => x.id === t.bookingId);
    const lane = b ? `${b.pickup.city} → ${b.drop.city}` : t.ref;
    const veh = db.vehicles.find((v) => v.id === t.vehicleId);
    if (t.exception) {
      out.push({
        id: `exc_${t.id}`,
        kind: "incident.opened",
        severity: "critical",
        title: `${t.exception.type.replace(/_/g, " ")} on ${t.ref}`,
        context: `${lane} · ${veh?.regNo ?? "—"} · ${t.exception.note}`,
        subject: t.ref,
        link: `/app/trips/${t.id}`,
        ageMins: mins(t.exception.atISO, now),
        level: "L2",
      });
    } else if (t.delayMins > 90) {
      out.push({
        id: `sla_${t.id}`,
        kind: "trip.sla.breached",
        severity: "high",
        title: `SLA breached on ${t.ref}`,
        context: `${lane} · running ${t.delayMins} min late · ETA revised`,
        subject: t.ref,
        link: `/app/trips/${t.id}`,
        ageMins: t.delayMins,
        level: "L1",
      });
    } else if (t.delayMins > 25) {
      out.push({
        id: `risk_${t.id}`,
        kind: "trip.sla.at_risk",
        severity: "medium",
        title: `${t.ref} at risk`,
        context: `${lane} · ${t.delayMins} min behind plan`,
        subject: t.ref,
        link: `/app/trips/${t.id}`,
        ageMins: t.delayMins,
        level: "L1",
      });
    }
  }

  for (const v of db.vehicles) {
    const silent = mins(v.lastPingISO, now);
    if (silent > 45 && v.status === "on_trip") {
      out.push({
        id: `slt_${v.id}`,
        kind: "vehicle.tracker.silent",
        severity: "high",
        title: `Tracker silent — ${v.regNo}`,
        context: `No position for ${silent} min. Last known speed ${v.speedKph} km/h.`,
        subject: v.regNo,
        link: `/app/vehicles/${v.id}`,
        ageMins: silent,
        level: "L1",
      });
    }
  }

  for (const d of db.docs.filter((x) => x.status === "expired").slice(0, 6)) {
    const name =
      d.entityType === "vehicle"
        ? db.vehicles.find((v) => v.id === d.entityId)?.regNo
        : db.drivers.find((x) => x.id === d.entityId)?.name;
    out.push({
      id: `blk_${d.id}`,
      kind: "compliance.dispatch.blocked",
      severity: "critical",
      title: `Dispatch blocked — ${name ?? d.entityId}`,
      context: `${d.kind} ${d.number} expired. Assignment hard-filtered until renewed or overridden.`,
      subject: name ?? d.entityId,
      link: "/app/compliance/dashboard",
      ageMins: 0,
      level: "L3",
    });
  }

  for (const i of db.invoices) {
    if (i.status !== "overdue") continue;
    out.push({
      id: `ovd_${i.id}`,
      kind: "invoice.overdue",
      severity: "medium",
      title: `${i.ref} overdue`,
      context: `${db.clients.find((c) => c.id === i.clientId)?.name ?? ""} · outstanding ${i.total - i.paid}`,
      subject: i.ref,
      link: `/app/finance/invoices/${i.id}`,
      ageMins: mins(i.dueISO, now),
      level: "L1",
    });
  }

  const order = { critical: 0, high: 1, medium: 2 } as const;
  return out.sort((a, b) => order[a.severity] - order[b.severity] || b.ageMins - a.ageMins);
}

export interface Approval {
  id: string;
  command: string;
  summary: string;
  diff: string[];
  costDeltaMinor: number;
  requestedBy: string;
  channels: string[];
  expiresInMins: number;
  escalation: string;
  level: AutomationLevel;
  link?: string;
}

export function deriveApprovals(db: DbShape): Approval[] {
  const out: Approval[] = [];

  db.trips
    .filter((t) => t.exception)
    .slice(0, 4)
    .forEach((t, i) => {
      const veh = db.vehicles.find((v) => v.id === t.vehicleId);
      const alt = db.vehicles.find((v) => v.status === "available");
      out.push({
        id: `apr_reassign_${t.id}`,
        command: "dispatch.reassignVehicle",
        summary: `Reassign ${t.ref} from ${veh?.regNo ?? "—"} to ${alt?.regNo ?? "nearest available"}`,
        diff: [
          `Vehicle ${veh?.regNo ?? "—"} → ${alt?.regNo ?? "—"}`,
          `Recovery vendor dispatched to the stranded load`,
          `Customer ETA slips by ~${90 + i * 20} min`,
        ],
        costDeltaMinor: (6000 + i * 1500) * 100,
        requestedBy: "Assignment engine",
        channels: ["whatsapp", "web", "push"],
        expiresInMins: 10 - i,
        escalation: "Escalates to Owner after 10 min",
        level: "L2",
        link: `/app/trips/${t.id}`,
      });
    });

  db.invoices
    .filter((x) => x.status === "draft")
    .slice(0, 3)
    .forEach((inv) => {
      out.push({
        id: `apr_inv_${inv.id}`,
        command: "billing.finaliseInvoice",
        summary: `Finalise ${inv.ref} for ${db.clients.find((c) => c.id === inv.clientId)?.name ?? ""}`,
        diff: [
          `Subtotal ${inv.subtotal} + tax ${inv.taxPct}%`,
          `Detention line flagged for review`,
          `Invoice number is gap-free and immutable once finalised`,
        ],
        costDeltaMinor: inv.total * 100,
        requestedBy: "Billing playbook",
        channels: ["web"],
        expiresInMins: 240,
        escalation: "Escalates to Finance Manager after 4 h",
        level: "L2",
        link: `/app/finance/invoices/${inv.id}`,
      });
    });

  db.jobCards
    .filter((j) => j.status === "parts_required")
    .slice(0, 2)
    .forEach((j) => {
      out.push({
        id: `apr_job_${j.id}`,
        command: "workshop.approveParts",
        summary: `Release parts for ${j.ref} — ${j.issue}`,
        diff: [`Parts ${j.partsCost}`, `Labour ${j.labourCost}`, `Downtime avoided: 1.5 days`],
        costDeltaMinor: (j.partsCost + j.labourCost) * 100,
        requestedBy: "Workshop Manager",
        channels: ["web", "push"],
        expiresInMins: 120,
        escalation: "Escalates to Operations Manager after 2 h",
        level: "L2",
        link: "/app/workshop",
      });
    });

  return out;
}

export interface Playbook {
  key: string;
  name: string;
  level: AutomationLevel;
  trigger: string;
  effect: string;
  enabled: boolean;
  runs30d: number;
  humanTouchesSaved: number;
}

export const PLAYBOOKS: Playbook[] = [
  { key: "eta.revise", name: "Revise ETA and tell the customer", level: "L1", trigger: "trip.delay.predicted", effect: "Recompute ETA, notify consignee on WhatsApp", enabled: true, runs30d: 412, humanTouchesSaved: 380 },
  { key: "pod.share", name: "Share POD on delivery", level: "L1", trigger: "pod.captured", effect: "Send signed POD to the customer contact", enabled: true, runs30d: 268, humanTouchesSaved: 268 },
  { key: "driver.unresponsive", name: "Chase an unresponsive driver", level: "L1", trigger: "driver.unresponsive", effect: "WhatsApp → SMS → IVR ladder, then dispatcher task", enabled: true, runs30d: 96, humanTouchesSaved: 61 },
  { key: "dispatch.reassign", name: "Propose a reassignment", level: "L2", trigger: "incident.opened", effect: "Assemble candidates, cost delta, then ask a human", enabled: true, runs30d: 41, humanTouchesSaved: 30 },
  { key: "vendor.dispatch", name: "Dispatch a recovery vendor", level: "L2", trigger: "incident.classified", effect: "Pick vendor by rating and distance, request approval", enabled: true, runs30d: 18, humanTouchesSaved: 14 },
  { key: "expense.autoapprove", name: "Auto-approve small expenses", level: "L1", trigger: "expense.submitted", effect: "Approve below threshold when receipt extraction is confident", enabled: true, runs30d: 214, humanTouchesSaved: 214 },
  { key: "invoice.finalise", name: "Prepare an invoice for finalisation", level: "L2", trigger: "pod.approved", effect: "Draft lines from the rate card and flag detention", enabled: true, runs30d: 132, humanTouchesSaved: 108 },
  { key: "accident.case", name: "Assemble an accident case file", level: "L3", trigger: "incident.opened(accident)", effect: "Collect evidence only. Proposes nothing.", enabled: true, runs30d: 3, humanTouchesSaved: 0 },
  { key: "payroll.deduction", name: "Payroll deduction review", level: "L3", trigger: "driver.incident.logged", effect: "Evidence file for a human decision", enabled: false, runs30d: 0, humanTouchesSaved: 0 },
];

export interface AutomationRun {
  id: string;
  playbook: string;
  level: AutomationLevel;
  subject: string;
  state: "completed" | "awaiting_approval" | "failed" | "compensated";
  steps: string[];
  atISO: string;
}

export function deriveRuns(db: DbShape): AutomationRun[] {
  return db.notifications.slice(0, 24).map((n, i) => {
    const pb = PLAYBOOKS[i % PLAYBOOKS.length];
    const state: AutomationRun["state"] =
      n.status === "failed" ? "failed" : pb.level === "L2" && i % 5 === 0 ? "awaiting_approval" : "completed";
    return {
      id: `run_${n.id}`,
      playbook: pb.name,
      level: pb.level,
      subject: n.entityRef ?? n.recipient,
      state,
      steps: [
        `trigger ${pb.trigger}`,
        `evaluate policy · ${pb.level}`,
        state === "awaiting_approval" ? "await approval" : `dispatch ${n.channel}`,
        state === "failed" ? "delivery failed · retry scheduled" : "recorded on the timeline",
      ],
      atISO: n.atISO,
    };
  });
}

export interface LedgerEntry {
  id: string;
  atISO: string;
  narration: string;
  account: string;
  debitMinor: number;
  creditMinor: number;
  source: string;
  sourceLink?: string;
}

export function deriveLedger(db: DbShape): LedgerEntry[] {
  const rows: LedgerEntry[] = [];
  for (const inv of db.invoices) {
    if (inv.status === "draft") continue;
    rows.push({
      id: `le_${inv.id}_ar`, atISO: inv.issuedISO ?? inv.createdISO,
      narration: `Freight billed · ${inv.ref}`, account: "Accounts receivable",
      debitMinor: inv.total * 100, creditMinor: 0, source: inv.ref, sourceLink: `/app/finance/invoices/${inv.id}`,
    });
    rows.push({
      id: `le_${inv.id}_rev`, atISO: inv.issuedISO ?? inv.createdISO,
      narration: `Freight income · ${inv.ref}`, account: "Freight income",
      debitMinor: 0, creditMinor: inv.subtotal * 100, source: inv.ref, sourceLink: `/app/finance/invoices/${inv.id}`,
    });
  }
  for (const p of db.payments) {
    rows.push({
      id: `le_${p.id}_bank`, atISO: p.receivedISO,
      narration: `Receipt ${p.reference} · ${p.mode}`, account: "Bank",
      debitMinor: p.amount * 100, creditMinor: 0, source: p.reference,
    });
    rows.push({
      id: `le_${p.id}_ar`, atISO: p.receivedISO,
      narration: `Receipt applied`, account: "Accounts receivable",
      debitMinor: 0, creditMinor: p.amount * 100, source: p.reference,
    });
  }
  for (const f of db.fuelLogs.slice(0, 40)) {
    rows.push({
      id: `le_${f.id}`, atISO: f.atISO,
      narration: `Fuel · ${f.station} · ${f.litres} L`, account: "Fuel expense",
      debitMinor: f.cost * 100, creditMinor: 0, source: f.station,
    });
  }
  return rows.sort((a, b) => b.atISO.localeCompare(a.atISO));
}

export interface Conversation {
  id: string;
  contact: string;
  role: string;
  channel: string;
  windowExpiresInHrs: number;
  lastMessage: string;
  lastAtISO: string;
  unresolvedIdentity: boolean;
  messages: Array<{ from: "them" | "us"; body: string; atISO: string; template?: string }>;
}

export function deriveConversations(db: DbShape): Conversation[] {
  const byRecipient = new Map<string, typeof db.notifications>();
  for (const n of db.notifications) {
    if (n.channel !== "whatsapp" && n.channel !== "sms") continue;
    const list = byRecipient.get(n.recipient) ?? [];
    list.push(n);
    byRecipient.set(n.recipient, list);
  }
  return Array.from(byRecipient.entries())
    .slice(0, 14)
    .map(([recipient, list], i) => {
      const sorted = [...list].sort((a, b) => a.atISO.localeCompare(b.atISO));
      const last = sorted[sorted.length - 1];
      return {
        id: `cnv_${i}`,
        contact: recipient,
        role: last.recipientRole,
        channel: last.channel,
        windowExpiresInHrs: (i % 4) * 6 + 2,
        lastMessage: last.body,
        lastAtISO: last.atISO,
        unresolvedIdentity: i === 3,
        messages: sorted.slice(-6).map((m, k) => ({
          from: k % 3 === 1 ? ("them" as const) : ("us" as const),
          body: m.body,
          atISO: m.atISO,
          template: k % 3 === 1 ? undefined : m.event.toLowerCase(),
        })),
      };
    });
}
