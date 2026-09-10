/**
 * Incident case files (system_design Part 6.3 / 10).
 * A case is a projection over an open trip exception: the same source of truth
 * as the tower, but assembled as a case file — clock, evidence, cost exposure,
 * recommended next action and its automation grade.
 */
import type { DbShape } from "@/domain/types";
import type { AutomationLevel } from "./roles";

export type CaseCategory = "breakdown" | "accident" | "delay" | "cargo" | "documents" | "other";

export interface IncidentCase {
  id: string;
  tripId: string;
  tripRef: string;
  category: CaseCategory;
  severity: "critical" | "high" | "medium";
  headline: string;
  note: string;
  lane: string;
  vehicle: string;
  driver: string;
  driverPhone: string;
  client: string;
  openedISO: string;
  openMins: number;
  slaTargetMins: number;
  exposure: number;
  evidence: string[];
  recommendation: { label: string; detail: string; level: AutomationLevel };
  timeline: Array<{ atISO: string; label: string }>;
}

const CATEGORY: Array<[RegExp, CaseCategory]> = [
  [/break|mechanical|tyre|engine|puncture/i, "breakdown"],
  [/accident|collision|crash/i, "accident"],
  [/delay|traffic|jam|wait|detention/i, "delay"],
  [/cargo|damage|short|theft|load/i, "cargo"],
  [/document|permit|challan|check ?post/i, "documents"],
];

function classify(text: string): CaseCategory {
  for (const [re, cat] of CATEGORY) if (re.test(text)) return cat;
  return "other";
}

const SLA: Record<CaseCategory, number> = {
  accident: 15,
  breakdown: 45,
  cargo: 60,
  documents: 90,
  delay: 120,
  other: 120,
};

const RECOMMENDATION: Record<CaseCategory, IncidentCase["recommendation"]> = {
  accident: {
    label: "Assemble the case file",
    detail: "Evidence only. Insurance, liability and payroll consequences stay with a human.",
    level: "L3",
  },
  breakdown: {
    label: "Propose recovery + reassignment",
    detail: "Nearest rated vendor and the best replacement vehicle, priced, for one approval.",
    level: "L2",
  },
  cargo: {
    label: "Hold POD and open a claim",
    detail: "Photographs are attached to the case; the claim needs a human decision.",
    level: "L2",
  },
  documents: {
    label: "Send the document pack",
    detail: "System pushes permits and e-way bill to the driver and informs the checkpoint desk.",
    level: "L1",
  },
  delay: {
    label: "Revise ETA and inform the consignee",
    detail: "System recomputes the ETA and messages the customer, then reports what it did.",
    level: "L1",
  },
  other: {
    label: "Route to the dispatcher",
    detail: "Not enough signal to act. A human classifies it first.",
    level: "L3",
  },
};

const mins = (iso: string, now: number) => Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));

export function deriveCases(db: DbShape, now = Date.now()): IncidentCase[] {
  const cases: IncidentCase[] = [];

  for (const t of db.trips) {
    if (!t.exception) continue;
    const b = db.bookings.find((x) => x.id === t.bookingId);
    const veh = db.vehicles.find((v) => v.id === t.vehicleId);
    const drv = db.drivers.find((d) => d.id === t.driverId);
    const client = db.clients.find((c) => c.id === b?.clientId);
    const category = classify(`${t.exception.type} ${t.exception.note}`);
    const openMins = mins(t.exception.atISO, now);
    const slaTargetMins = SLA[category];

    cases.push({
      id: `case_${t.id}`,
      tripId: t.id,
      tripRef: t.ref,
      category,
      severity: category === "accident" ? "critical" : openMins > slaTargetMins ? "critical" : openMins > slaTargetMins / 2 ? "high" : "medium",
      headline: `${t.exception.type.replace(/_/g, " ")} · ${t.ref}`,
      note: t.exception.note,
      lane: b ? `${b.pickup.city} → ${b.drop.city}` : "—",
      vehicle: veh?.regNo ?? "—",
      driver: drv?.name ?? "—",
      driverPhone: drv?.phone ?? "—",
      client: client?.name ?? "—",
      openedISO: t.exception.atISO,
      openMins,
      slaTargetMins,
      exposure: Math.round((b?.rate ?? t.revenue) * (category === "cargo" ? 1 : 0.35)),
      evidence: [
        `Last position ${veh ? `${veh.lat.toFixed(3)}, ${veh.lng.toFixed(3)} at ${veh.speedKph} km/h` : "unavailable"}`,
        `Driver reported at ${new Date(t.exception.atISO).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`,
        `${t.checkpoints.filter((c) => c.doneISO).length} of ${t.checkpoints.length} checkpoints cleared`,
        `Trip running ${t.delayMins} min behind plan`,
      ],
      recommendation: RECOMMENDATION[category],
      timeline: [
        { atISO: t.startedISO ?? t.exception.atISO, label: "Trip started" },
        ...t.checkpoints
          .filter((c) => c.doneISO)
          .slice(-2)
          .map((c) => ({ atISO: c.doneISO!, label: `Checkpoint cleared · ${c.label}` })),
        { atISO: t.exception.atISO, label: `Incident reported by ${drv?.name ?? "driver"}` },
      ].sort((a, z) => a.atISO.localeCompare(z.atISO)),
    });
  }

  const order = { critical: 0, high: 1, medium: 2 } as const;
  return cases.sort((a, b) => order[a.severity] - order[b.severity] || b.openMins - a.openMins);
}
