import { useEffect, useRef, useState } from "react";
import { AlertTriangle, FileSpreadsheet, MapPin, MessageSquare, Phone, Radio, ScrollText } from "lucide-react";
import { cn } from "@/lib/utils";
import { clamp01, range, useSectionProgress, usePrefersReducedMotion } from "@/lib/scroll";
import { Counter, Eyebrow, MaskLines, Reveal } from "./type";

/* ──────────────────────────────────────────────────────────── CHAOS → CONTROL */

const FRAGMENTS = [
  { icon: MessageSquare, label: "“Truck kahan hai?”", x: -34, y: -26, r: -7 },
  { icon: FileSpreadsheet, label: "trip_sheet_final_v9.xlsx", x: 28, y: -32, r: 6 },
  { icon: ScrollText, label: "Paper POD · unsigned", x: -30, y: 22, r: 5 },
  { icon: Phone, label: "17 missed calls", x: 32, y: 18, r: -5 },
  { icon: Radio, label: "GPS SMS · 4h stale", x: -8, y: -40, r: 3 },
  { icon: AlertTriangle, label: "Invoice not raised", x: 10, y: 34, r: -4 },
  { icon: MapPin, label: "Last seen: Nashik?", x: 44, y: -4, r: 8 },
];

export function ChaosToControl() {
  const { ref, p } = useSectionProgress<HTMLDivElement>();
  const collapse = range(p, 0.15, 0.62);
  const order = range(p, 0.55, 0.9);

  return (
    <section
      id="journey"
      ref={ref}
      className="relative border-t border-border/60 bg-background"
      style={{ height: "260vh" }}
      aria-label="From chaos to control"
    >
      <div className="sticky top-0 flex h-screen items-center overflow-hidden px-5 sm:px-10">
        <div className="grid-canvas pointer-events-none absolute inset-0 opacity-[0.18]" aria-hidden />

        <div className="relative mx-auto w-full max-w-[1600px]">
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            {FRAGMENTS.map((f) => (
              <div
                key={f.label}
                className="absolute flex items-center gap-2 rounded-md border border-border bg-card/90 px-3 py-2 text-[11px] text-muted-foreground shadow-2xl backdrop-blur"
                style={{
                  transform: `translate3d(${f.x * (1 - collapse)}vw, ${f.y * (1 - collapse) * 0.8}vh, 0) rotate(${f.r * (1 - collapse)}deg) scale(${1 - collapse * 0.55})`,
                  opacity: 1 - collapse * 0.95,
                }}
              >
                <f.icon className="size-3.5 text-primary" aria-hidden />
                {f.label}
              </div>
            ))}
          </div>

          <div className="relative text-center">
            <Eyebrow>The problem</Eyebrow>
            <h2 className="site-display mt-5 text-[13vw] font-semibold leading-[0.86] lg:text-[8.5vw]">
              <span className={cn("block transition-colors duration-700", collapse > 0.6 && "text-muted-foreground/40")}>
                From chaos
              </span>
              <span
                className="block transition-all duration-700"
                style={{ color: order > 0.3 ? "var(--color-primary)" : undefined }}
              >
                to control.
              </span>
            </h2>

            <div
              className="mx-auto mt-10 max-w-3xl rounded-xl border border-border bg-card/80 p-4 backdrop-blur transition-all duration-500"
              style={{ opacity: order, transform: `translateY(${(1 - order) * 28}px) scale(${0.96 + order * 0.04})` }}
            >
              <div className="flex items-center justify-between border-b border-border pb-3">
                <span className="numeric text-[10px] uppercase tracking-[0.3em] text-primary">
                  MarichiFleet · one source of truth
                </span>
                <span className="numeric text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Live</span>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-4 sm:grid-cols-4">
                {[
                  { k: "Bookings", v: "62" },
                  { k: "On road", v: "18" },
                  { k: "PODs today", v: "27" },
                  { k: "Invoices raised", v: "24" },
                ].map((s) => (
                  <div key={s.k} className="text-left">
                    <div className="numeric font-display text-2xl font-semibold">{s.v}</div>
                    <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{s.k}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────────────────────────────────────────── CONTROL TOWER */

export function ControlTower() {
  const reduced = usePrefersReducedMotion();
  const wrap = useRef<HTMLDivElement | null>(null);
  const [m, setM] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (reduced) return;
    const el = wrap.current;
    if (!el) return;
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      setM({ x: ((e.clientX - r.left) / r.width) * 2 - 1, y: ((e.clientY - r.top) / r.height) * 2 - 1 });
    };
    el.addEventListener("pointermove", move);
    return () => el.removeEventListener("pointermove", move);
  }, [reduced]);

  const layer = (depth: number) => ({
    transform: `translate3d(${-m.x * depth * 22}px, ${-m.y * depth * 14}px, 0)`,
    transition: "transform 400ms cubic-bezier(0.22,1,0.36,1)",
  });

  return (
    <section id="control" className="relative border-t border-border/60 px-5 py-28 sm:px-10 sm:py-36">
      <div className="mx-auto max-w-[1600px]">
        <Eyebrow>The platform</Eyebrow>
        <MaskLines
          lines={["One control tower.", "The entire fleet."]}
          className="mt-5 text-[11vw] font-semibold leading-[0.88] lg:text-[6.4vw]"
        />
        <Reveal as="p" className="mt-6 max-w-xl text-sm text-muted-foreground sm:text-base">
          Dispatch, telemetry, compliance and cash sit on one live surface. Every layer below is the real
          product, not a screenshot.
        </Reveal>

        <div
          ref={wrap}
          data-cursor="View"
          className="relative mt-14 rounded-2xl border border-border bg-card/60 p-3 sm:p-6"
          style={{ perspective: "1400px" }}
        >
          <div className="grid-canvas pointer-events-none absolute inset-0 rounded-2xl opacity-[0.22]" aria-hidden />

          <div className="relative grid gap-3 lg:grid-cols-[1.6fr_1fr]">
            <div className="relative overflow-hidden rounded-xl border border-border bg-sidebar" style={layer(1.1)}>
              <MiniMap />
              <div className="absolute left-4 top-4 numeric text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
                Fleet map · live
              </div>
            </div>

            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-3" style={layer(1.7)}>
                {[
                  { k: "Utilisation", v: 88, s: "%" },
                  { k: "On-time", v: 94, s: "%" },
                  { k: "Live trips", v: 64, s: "" },
                  { k: "Exceptions", v: 3, s: "" },
                ].map((x) => (
                  <div key={x.k} className="rounded-xl border border-border bg-card p-4">
                    <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{x.k}</div>
                    <div className="mt-2 font-display text-3xl font-semibold">
                      <Counter to={x.v} suffix={x.s} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-border bg-card p-4" style={layer(2.3)}>
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.24em] text-warning">
                  <AlertTriangle className="size-3.5" aria-hidden /> Exception · detention
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  MH12 AB 4471 held 84 min at Bhiwandi. Consignee notified on WhatsApp; ETA re-cut to 18:40.
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-4" style={layer(2.9)}>
                <div className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Trip timeline</div>
                <ol className="mt-3 space-y-2">
                  {["Dispatched", "Started", "In transit", "Arrived", "Delivered"].map((s, i) => (
                    <li key={s} className="flex items-center gap-3 text-xs">
                      <span
                        className={cn(
                          "size-1.5 rounded-full",
                          i < 3 ? "bg-success" : i === 3 ? "bg-warning" : "bg-muted-foreground/40",
                        )}
                      />
                      <span className={i < 4 ? "text-foreground" : "text-muted-foreground"}>{s}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Stylised control-tower map used across the marketing scenes. */
function MiniMap({ height = 420 }: { height?: number }) {
  const nodes = [
    [140, 260],
    [320, 150],
    [470, 300],
    [640, 180],
    [780, 330],
    [560, 400],
    [260, 380],
  ] as const;

  return (
    <svg viewBox="0 0 900 480" style={{ height, width: "100%" }} role="img" aria-label="Live fleet map">
      <defs>
        <radialGradient id="mm-glow" cx="50%" cy="45%" r="65%">
          <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.14" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>
      <rect width="900" height="480" fill="url(#mm-glow)" />
      {nodes.slice(0, -1).map((n, i) => {
        const m = nodes[i + 1]!;
        const d = `M${n[0]},${n[1]} Q${(n[0] + m[0]) / 2},${Math.min(n[1], m[1]) - 70} ${m[0]},${m[1]}`;
        return (
          <g key={i}>
            <path d={d} fill="none" stroke="var(--color-info)" strokeOpacity="0.35" strokeWidth="1.4" />
            <circle r="4" fill="var(--color-primary)">
              <animateMotion dur={`${6 + i}s`} repeatCount="indefinite" path={d} />
            </circle>
          </g>
        );
      })}
      {nodes.map((n, i) => (
        <g key={i}>
          <circle cx={n[0]} cy={n[1]} r="5" fill="var(--color-success)" />
          <circle cx={n[0]} cy={n[1]} r="12" fill="none" stroke="var(--color-success)" strokeOpacity="0.35">
            <animate attributeName="r" values="7;20" dur="2.8s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.5;0" dur="2.8s" repeatCount="indefinite" />
          </circle>
        </g>
      ))}
    </svg>
  );
}

/* ───────────────────────────────────────────────────────────── LIVE TRACKING */

const TRUCKS = [
  { id: "MH12 AB 4471", route: "Pune → Nagpur", eta: "18:40", speed: 64, left: 412, status: "In transit" },
  { id: "KA01 CJ 8820", route: "Bengaluru → Chennai", eta: "14:05", speed: 71, left: 128, status: "In transit" },
  { id: "DL01 LX 3390", route: "Delhi → Jaipur", eta: "11:20", speed: 0, left: 96, status: "Detained" },
];

export function LiveTracking() {
  const [sel, setSel] = useState(0);
  const t = TRUCKS[sel]!;

  return (
    <section
      id="tracking"
      className="relative min-h-screen border-t border-border/60 bg-sidebar px-5 py-24 sm:px-10"
      aria-label="Live tracking"
    >
      <div className="grid-canvas pointer-events-none absolute inset-0 opacity-25" aria-hidden />
      <div className="relative mx-auto max-w-[1600px]">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <Eyebrow>Mission control</Eyebrow>
            <MaskLines
              lines={["Live", "tracking."]}
              className="mt-4 text-[16vw] font-semibold leading-[0.84] lg:text-[9vw]"
            />
          </div>
          <div className="grid grid-cols-2 gap-x-10 gap-y-4 sm:grid-cols-4">
            {[
              { k: "ETA", v: t.eta },
              { k: "Speed", v: `${t.speed} km/h` },
              { k: "Distance left", v: `${t.left} km` },
              { k: "Status", v: t.status },
            ].map((x) => (
              <div key={x.k} className="hairline pt-3">
                <div className="numeric font-display text-xl font-semibold sm:text-2xl">{x.v}</div>
                <div className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">{x.k}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="overflow-hidden rounded-xl border border-border bg-background">
            <MiniMap height={480} />
          </div>
          <div className="flex flex-col gap-3">
            {TRUCKS.map((tr, i) => (
              <button
                key={tr.id}
                type="button"
                data-cursor="View"
                onClick={() => setSel(i)}
                className={cn(
                  "rounded-xl border p-4 text-left transition-all duration-300",
                  i === sel
                    ? "border-primary bg-card translate-x-0"
                    : "border-border bg-card/50 hover:border-border-strong",
                )}
              >
                <div className="numeric text-sm font-semibold">{tr.id}</div>
                <div className="mt-1 text-xs text-muted-foreground">{tr.route}</div>
                <div className="mt-3 h-px w-full bg-border">
                  <div
                    className={cn("h-px", tr.status === "Detained" ? "bg-warning" : "bg-success")}
                    style={{ width: `${100 - Math.min(90, tr.left / 6)}%` }}
                  />
                </div>
              </button>
            ))}
            <ol className="mt-2 rounded-xl border border-border bg-card p-4">
              {["Dispatched", "Started", "In transit", "Arrived", "Delivered"].map((s, i) => (
                <li key={s} className="flex items-center gap-3 py-1.5 text-xs">
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      i <= 2 ? "bg-success" : "bg-muted-foreground/35",
                    )}
                  />
                  <span className={i <= 2 ? "text-foreground" : "text-muted-foreground"}>{s}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}

export { MiniMap };
export const _clamp = clamp01;
