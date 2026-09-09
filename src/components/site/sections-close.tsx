import { Link } from "@tanstack/react-router";
import { ArrowRight, Droplets, Gauge, ShieldCheck, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import { range, useSectionProgress } from "@/lib/scroll";
import { Counter, Eyebrow, Magnetic, MaskLines, Reveal } from "./type";

/* ──────────────────────────────────────────────────────── FLEET INTELLIGENCE */

const FLEET = Array.from({ length: 60 }, (_, i) => {
  const r = (i * 7919) % 100;
  return r > 78 ? "idle" : r > 66 ? "maintenance" : r > 58 ? "delayed" : r > 50 ? "available" : "active";
});

const TONE: Record<string, string> = {
  active: "bg-success",
  available: "bg-info",
  idle: "bg-muted-foreground/35",
  delayed: "bg-warning",
  maintenance: "bg-destructive",
};

export function FleetIntelligence() {
  return (
    <section id="intelligence" className="relative border-t border-border/60 px-5 py-28 sm:px-10 sm:py-36">
      <div className="mx-auto max-w-[1600px]">
        <div className="grid gap-14 lg:grid-cols-[1fr_1fr] lg:items-end">
          <div>
            <Eyebrow>Fleet intelligence</Eyebrow>
            <MaskLines
              lines={["Data should", "move the fleet."]}
              className="mt-5 text-[11.5vw] font-semibold leading-[0.88] lg:text-[6.2vw]"
            />
          </div>
          <Reveal as="p" className="max-w-md text-sm text-muted-foreground sm:text-base">
            Every vehicle reports its own state. Utilisation, fuel burn, on-time performance and per-trip margin
            are computed from the same operational record — never re-keyed.
          </Reveal>
        </div>

        <Reveal className="mt-14 grid grid-cols-10 gap-1.5 sm:gap-2.5">
          {FLEET.map((s, i) => (
            <span
              key={i}
              title={s}
              className={cn("aspect-[3/2] rounded-sm transition-transform duration-300 hover:scale-110", TONE[s])}
              style={{ animation: `mf-rise 0.6s cubic-bezier(0.22,1,0.36,1) both`, animationDelay: `${i * 12}ms` }}
            />
          ))}
        </Reveal>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { k: "Fleet utilisation", v: 88, s: "%" },
            { k: "Fuel efficiency", v: 4.1, s: " km/l", d: 1 },
            { k: "On-time delivery", v: 94, s: "%" },
            { k: "Revenue this month", v: 42.6, s: " Cr", p: "₹ ", d: 1 },
            { k: "Avg trip profitability", v: 34, s: "%" },
            { k: "Maintenance cost / km", v: 3.8, s: "", p: "₹ ", d: 1 },
          ].map((x) => (
            <Reveal key={x.k} className="hairline pt-4">
              <div className="font-display text-4xl font-semibold sm:text-5xl">
                <Counter to={x.v} prefix={x.p ?? ""} suffix={x.s} decimals={x.d ?? 0} />
              </div>
              <div className="mt-2 text-[10px] uppercase tracking-[0.24em] text-muted-foreground">{x.k}</div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────────────────────────────── FUEL / MAINTENANCE / DOCS */

export function LifecycleSystems() {
  const { ref, p } = useSectionProgress<HTMLDivElement>();
  const zoom = range(p, 0.1, 0.55);
  const out = range(p, 0.75, 1);

  const cards = [
    { icon: Droplets, k: "Fuel", d: "Litres, rate, odometer and station captured at the pump. Theft shows up as a curve, not a rumour." },
    { icon: Wrench, k: "Maintenance", d: "Service intervals, job cards and downtime cost tracked per vehicle." },
    { icon: ShieldCheck, k: "Compliance", d: "Permit, insurance, fitness and licence expiry block dispatch before they block you." },
  ];

  return (
    <section
      ref={ref}
      className="relative border-t border-border/60 bg-sidebar"
      style={{ height: "220vh" }}
      aria-label="Fleet lifecycle systems"
    >
      <div className="sticky top-0 flex h-screen items-center overflow-hidden px-5 sm:px-10">
        <div
          className="grid-canvas pointer-events-none absolute inset-0"
          style={{ opacity: 0.1 + zoom * 0.3, transform: `scale(${1 + zoom * 0.5})` }}
          aria-hidden
        />
        <div className="relative mx-auto w-full max-w-[1600px]" style={{ opacity: 1 - out * 0.6 }}>
          <Eyebrow>Beyond the trip</Eyebrow>
          <MaskLines
            lines={["The whole", "vehicle life."]}
            className="mt-5 text-[11vw] font-semibold leading-[0.88] lg:text-[6vw]"
          />
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {cards.map((c, i) => (
              <div
                key={c.k}
                className="rounded-xl border border-border bg-card/80 p-6 backdrop-blur transition-all duration-700"
                style={{
                  opacity: range(zoom, i * 0.18, i * 0.18 + 0.4),
                  transform: `translateY(${(1 - range(zoom, i * 0.18, i * 0.18 + 0.4)) * 34}px)`,
                }}
              >
                <c.icon className="size-5 text-primary" aria-hidden />
                <h3 className="mt-4 font-display text-2xl font-semibold uppercase tracking-tight">{c.k}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{c.d}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 flex items-center gap-3 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            <Gauge className="size-3.5 text-primary" aria-hidden /> Back on the road
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────── PORT SCENE */

export function PortScene() {
  const { ref, p } = useSectionProgress<HTMLDivElement>();
  const layers = [
    { d: 0.12, h: 34, o: 0.25 },
    { d: 0.3, h: 26, o: 0.4 },
    { d: 0.55, h: 20, o: 0.6 },
    { d: 0.9, h: 14, o: 0.9 },
  ];

  return (
    <section
      ref={ref}
      className="relative overflow-hidden border-t border-border/60"
      style={{ height: "180vh" }}
      aria-label="Logistics infrastructure"
    >
      <div className="sticky top-0 h-screen overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,var(--color-background),var(--color-sidebar))]" />
        {layers.map((l, li) => (
          <div
            key={li}
            className="absolute inset-x-0 flex items-end gap-2"
            style={{
              bottom: `${8 + li * 6}%`,
              transform: `translateX(${(0.5 - p) * l.d * 140}%) scale(${1 + l.d * 0.1})`,
              opacity: l.o,
            }}
            aria-hidden
          >
            {Array.from({ length: 26 }).map((_, i) => (
              <span
                key={i}
                className={cn(
                  "shrink-0 rounded-[2px]",
                  (i + li) % 5 === 0 ? "bg-primary/70" : (i + li) % 3 === 0 ? "bg-border-strong" : "bg-card",
                )}
                style={{ width: `${l.h * 2.2}px`, height: `${l.h * (0.6 + ((i * 7) % 5) * 0.2)}px` }}
              />
            ))}
          </div>
        ))}
        <div className="relative flex h-full items-center px-5 sm:px-10">
          <div className="mx-auto w-full max-w-[1600px]">
            <MaskLines
              lines={["Built for", "industrial scale."]}
              className="text-[11vw] font-semibold leading-[0.88] lg:text-[6vw]"
            />
            <Reveal as="p" className="mt-6 max-w-md text-sm text-muted-foreground">
              Ports, plants, warehouses and 3PL yards — multi-branch, multi-client, multi-currency ready.
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────── FINAL BRAND MOMENT */

export function FinalMoment() {
  return (
    <section className="relative flex min-h-screen flex-col justify-between border-t border-border/60 bg-[#08090b] px-5 py-16 sm:px-10">
      <div className="noise pointer-events-none absolute inset-0 opacity-30" aria-hidden />
      <div className="relative font-display text-sm font-semibold uppercase tracking-[0.42em]">
        Marichi<span className="text-primary">Fleet</span>
      </div>

      <div className="relative mx-auto w-full max-w-[1600px] text-center">
        <MaskLines
          lines={["Every mile.", "Under control."]}
          as="h2"
          className="text-[14vw] font-semibold leading-[0.86] lg:text-[9vw]"
        />
        <Reveal as="p" className="mx-auto mt-8 max-w-sm text-sm text-muted-foreground">
          Transport operations, connected.
        </Reveal>
        <Reveal className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Magnetic>
            <Link
              to="/app/dashboard"
              data-cursor="Enter"
              className="group inline-flex items-center gap-2 rounded-full bg-primary px-8 py-4 text-[11px] font-medium uppercase tracking-[0.24em] text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Enter MarichiFleet
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" aria-hidden />
            </Link>
          </Magnetic>
          <Magnetic>
            <Link
              to="/portal/dashboard"
              data-cursor="Demo"
              className="inline-flex items-center rounded-full border border-foreground/25 px-8 py-4 text-[11px] font-medium uppercase tracking-[0.24em] transition-colors hover:border-foreground"
            >
              Book a demo
            </Link>
          </Magnetic>
        </Reveal>
      </div>

      <footer className="relative mx-auto flex w-full max-w-[1600px] flex-wrap items-center justify-between gap-4 border-t border-border pt-6 text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
        <span>MarichiFleet · demo environment</span>
        <div className="flex gap-6">
          <Link to="/driver/home" className="transition-colors hover:text-foreground">
            Driver app
          </Link>
          <Link to="/portal/dashboard" className="transition-colors hover:text-foreground">
            Client portal
          </Link>
          <Link to="/app/dashboard" className="transition-colors hover:text-foreground">
            Login
          </Link>
        </div>
      </footer>
    </section>
  );
}
