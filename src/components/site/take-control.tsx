import { useState } from "react";
import { AlertTriangle, FileSignature, FileText, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { Eyebrow, MaskLines, Reveal } from "./type";

type Tab = "route" | "timeline" | "pod" | "invoice";

const VEHICLES = [
  {
    id: "MH12 AB 4471",
    lane: "Pune → Nagpur",
    driver: "Ravi Kadam",
    eta: "18:40",
    left: "412 km",
    speed: "64 km/h",
    status: "In transit",
    alert: "Detention 84 min at Bhiwandi — consignee notified.",
    path: "M60,300 C220,190 360,340 520,220 C640,130 740,240 840,170",
    amount: "₹ 1,84,500",
  },
  {
    id: "KA01 CJ 8820",
    lane: "Bengaluru → Chennai",
    driver: "M. Elangovan",
    eta: "14:05",
    left: "128 km",
    speed: "71 km/h",
    status: "In transit",
    alert: "Clear run. ETA holding 12 min ahead of SLA.",
    path: "M80,380 C240,300 340,150 520,180 C660,205 760,300 850,260",
    amount: "₹ 96,400",
  },
  {
    id: "DL01 LX 3390",
    lane: "Delhi → Jaipur",
    driver: "Harpreet Singh",
    eta: "11:20",
    left: "96 km",
    speed: "0 km/h",
    status: "Detained",
    alert: "Vehicle idle 41 min at Behror. Dispatcher escalation raised.",
    path: "M100,180 C230,260 380,110 540,260 C660,370 760,200 860,300",
    amount: "₹ 74,900",
  },
];

const TABS: { id: Tab; label: string }[] = [
  { id: "route", label: "Route" },
  { id: "timeline", label: "Timeline" },
  { id: "pod", label: "POD" },
  { id: "invoice", label: "Invoice" },
];

export function TakeControl() {
  const [sel, setSel] = useState(0);
  const [tab, setTab] = useState<Tab>("route");
  const v = VEHICLES[sel]!;

  return (
    <section className="relative border-t border-border/60 px-5 py-28 sm:px-10 sm:py-36" aria-label="Interactive demo">
      <div className="mx-auto max-w-[1600px]">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <Eyebrow>Interactive · no login</Eyebrow>
            <MaskLines
              lines={["Take control."]}
              className="mt-5 text-[15vw] font-semibold leading-[0.88] lg:text-[8vw]"
            />
          </div>
          <Reveal as="p" className="max-w-sm text-sm text-muted-foreground">
            Pick a vehicle. Follow its route, inspect the ETA, open the trip timeline, read the proof of delivery
            and the invoice it produced.
          </Reveal>
        </div>

        <div className="mt-12 grid gap-4 lg:grid-cols-[280px_1fr]">
          <div className="flex gap-3 overflow-x-auto lg:flex-col lg:overflow-visible">
            {VEHICLES.map((x, i) => (
              <button
                key={x.id}
                type="button"
                data-cursor="Select"
                aria-pressed={i === sel}
                onClick={() => setSel(i)}
                className={cn(
                  "min-w-[220px] rounded-xl border p-4 text-left transition-all duration-300",
                  i === sel ? "border-primary bg-card" : "border-border bg-card/50 hover:border-border-strong",
                )}
              >
                <div className="numeric text-sm font-semibold">{x.id}</div>
                <div className="mt-1 text-xs text-muted-foreground">{x.lane}</div>
                <div
                  className={cn(
                    "mt-3 inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em]",
                    x.status === "Detained" ? "text-warning" : "text-success",
                  )}
                >
                  <span className="size-1.5 rounded-full bg-current" /> {x.status}
                </div>
              </button>
            ))}
          </div>

          <div className="rounded-2xl border border-border bg-card/60 p-3 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
              <div className="flex gap-1">
                {TABS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTab(t.id)}
                    className={cn(
                      "rounded-full px-4 py-1.5 text-[10px] uppercase tracking-[0.22em] transition-colors",
                      tab === t.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <div className="numeric flex gap-6 text-[11px] text-muted-foreground">
                <span>ETA {v.eta}</span>
                <span>{v.left} left</span>
                <span>{v.speed}</span>
              </div>
            </div>

            <div className="pt-4">
              {tab === "route" && (
                <div className="overflow-hidden rounded-xl border border-border bg-sidebar">
                  <svg viewBox="0 0 900 460" className="h-[300px] w-full sm:h-[420px]" role="img" aria-label={`Route for ${v.id}`}>
                    <path d={v.path} fill="none" stroke="var(--color-border-strong)" strokeWidth="2" />
                    <path
                      key={v.id}
                      d={v.path}
                      fill="none"
                      stroke="var(--color-primary)"
                      strokeWidth="2.6"
                      pathLength={1}
                      strokeDasharray={1}
                      strokeDashoffset={1}
                      style={{ animation: "mf-draw 2.4s cubic-bezier(0.22,1,0.36,1) forwards" }}
                    />
                    <circle r="6" fill="var(--color-primary)">
                      <animateMotion dur="7s" repeatCount="indefinite" path={v.path} />
                    </circle>
                  </svg>
                </div>
              )}

              {tab === "timeline" && (
                <ol className="space-y-3">
                  {["Booked", "Dispatched", "Started", "In transit", "Arrived", "Delivered"].map((s, i) => (
                    <li key={s} className="flex items-center gap-4 rounded-lg border border-border bg-background/60 p-3">
                      <span className={cn("size-2 rounded-full", i <= 3 ? "bg-success" : "bg-muted-foreground/35")} />
                      <span className="text-sm">{s}</span>
                      <span className="numeric ml-auto text-xs text-muted-foreground">
                        {i <= 3 ? ["06:02", "06:08", "06:12", "11:47"][i] : "—"}
                      </span>
                    </li>
                  ))}
                  <li className="flex items-start gap-3 rounded-lg border border-warning/40 bg-warning/5 p-3 text-sm text-muted-foreground">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
                    {v.alert}
                  </li>
                </ol>
              )}

              {tab === "pod" && (
                <div className="rounded-xl border border-border bg-background/60 p-6">
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-primary">
                    <FileSignature className="size-3.5" aria-hidden /> Proof of delivery
                  </div>
                  <div className="mt-4 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                    <span>Vehicle · {v.id}</span>
                    <span>Driver · {v.driver}</span>
                    <span>Lane · {v.lane}</span>
                    <span className="flex items-center gap-1.5">
                      <MapPin className="size-3" aria-hidden /> Geo-stamped at consignee gate
                    </span>
                  </div>
                  <svg viewBox="0 0 300 80" className="mt-6 w-full max-w-xs" role="img" aria-label="Signature">
                    <path
                      d="M10,60 C40,8 58,78 86,44 C110,16 126,70 154,48 C178,30 194,66 224,36 C244,16 264,48 290,28"
                      fill="none"
                      stroke="var(--color-foreground)"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      pathLength={1}
                      strokeDasharray={1}
                      strokeDashoffset={1}
                      style={{ animation: "mf-draw 1.6s ease-out forwards" }}
                    />
                  </svg>
                  <p className="mt-2 text-[10px] uppercase tracking-[0.22em] text-success">
                    OTP verified · 2 photos attached
                  </p>
                </div>
              )}

              {tab === "invoice" && (
                <div className="rounded-xl border border-border bg-background/60 p-6">
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-primary">
                    <FileText className="size-3.5" aria-hidden /> Tax invoice · POD-linked
                  </div>
                  <dl className="mt-5 space-y-2 text-sm">
                    {[
                      ["Freight", v.amount],
                      ["Detention", "₹ 4,200"],
                      ["GST 5%", "₹ 8,400"],
                    ].map(([k, val]) => (
                      <div key={k} className="flex justify-between border-b border-border/60 pb-1.5">
                        <dt className="text-muted-foreground">{k}</dt>
                        <dd className="numeric">{val}</dd>
                      </div>
                    ))}
                  </dl>
                  <div className="mt-4 flex justify-between">
                    <span className="font-display font-semibold uppercase tracking-wide">Total due</span>
                    <span className="numeric font-display text-2xl font-semibold text-primary">{v.amount}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
