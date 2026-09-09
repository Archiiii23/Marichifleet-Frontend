import { Suspense, lazy, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowDown, ArrowRight } from "lucide-react";
import { clamp01, useSectionProgress, usePrefersReducedMotion } from "@/lib/scroll";
import { useIsMobile } from "@/hooks/use-mobile";
import { Magnetic } from "./type";

const Scene3D = lazy(() => import("./scene-3d"));

/** Opacity envelope: fades in at `a`, holds, fades out at `b`. */
function band(p: number, a: number, b: number, fade = 0.07) {
  return clamp01(Math.min((p - a) / fade, (b - p) / fade));
}

const LIVE_STATS = [
  { k: "Active vehicles", v: "182" },
  { k: "Live trips", v: "64" },
  { k: "Deliveries today", v: "311" },
  { k: "Avg ETA drift", v: "−7 min" },
  { k: "Fuel efficiency", v: "4.1 km/l" },
  { k: "Utilisation", v: "88%" },
];

export function HeroStage() {
  const [mounted, setMounted] = useState(false);
  const reduced = usePrefersReducedMotion();
  const lite = useIsMobile();
  const { ref, p } = useSectionProgress<HTMLDivElement>();

  useEffect(() => setMounted(true), []);

  const heroOn = reduced ? 1 : band(p, -0.02, 0.17, 0.06);
  const mileOn = reduced ? 0 : band(p, 0.22, 0.42);
  const everyOn = reduced ? 0 : band(p, 0.47, 0.66);
  const netOn = reduced ? 0 : band(p, 0.71, 1.05);

  return (
    <div id="top" ref={ref} className="relative" style={{ height: reduced ? "100vh" : "440vh" }}>
      <div className="sticky top-0 h-screen w-full overflow-hidden bg-[#0a0b0d]">
        <div className="absolute inset-0">
          {mounted ? (
            <Suspense fallback={null}>
              <Scene3D reduced={reduced} lite={lite} />
            </Suspense>
          ) : null}
        </div>

        <div className="vignette pointer-events-none absolute inset-0" aria-hidden />
        <div className="noise pointer-events-none absolute inset-0 opacity-[0.35]" aria-hidden />

        {/* 1 — Hero */}
        <div
          className="pointer-events-none absolute inset-0 flex flex-col justify-end px-5 pb-16 sm:px-10 sm:pb-20"
          style={{ opacity: heroOn, transform: `translateY(${(1 - heroOn) * -30}px)` }}
        >
          <div className="mx-auto w-full max-w-[1600px]">
            <p className="numeric text-[11px] uppercase tracking-[0.42em] text-primary">
              Transport operating system
            </p>
            <h1 className="site-display mt-5 max-w-[15ch] text-[13.5vw] font-semibold leading-[0.82] sm:text-[11vw] lg:text-[8.6vw]">
              We move freight.
              <br />
              <span className="text-muted-foreground">We own the outcome.</span>
            </h1>
            <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <p className="max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
                One operating system for every vehicle, trip, driver, delivery and rupee.
              </p>
              <div className="pointer-events-auto flex flex-wrap items-center gap-3">
                <Magnetic>
                  <a
                    href="#journey"
                    data-cursor="Explore"
                    className="group inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-[11px] font-medium uppercase tracking-[0.24em] text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    Explore MarichiFleet
                    <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" aria-hidden />
                  </a>
                </Magnetic>
                <Magnetic>
                  <Link
                    to="/app/dashboard"
                    data-cursor="Enter"
                    className="inline-flex items-center rounded-full border border-foreground/25 px-7 py-3.5 text-[11px] font-medium uppercase tracking-[0.24em] transition-colors hover:border-foreground"
                  >
                    Enter control tower
                  </Link>
                </Magnetic>
              </div>
            </div>
            <div className="mt-10 flex items-center gap-3 text-[10px] uppercase tracking-[0.32em] text-muted-foreground">
              <ArrowDown className="size-3 animate-bounce" aria-hidden />
              Scroll to drive the story
            </div>
          </div>
        </div>

        {/* 2 — Every mile matters */}
        <Overlay opacity={mileOn}>
          <h2 className="site-display text-[16vw] font-semibold leading-[0.84] lg:text-[11vw]">
            Every mile
            <br />
            matters.
          </h2>
        </Overlay>

        {/* 3 — Every vehicle / driver / delivery */}
        <Overlay opacity={everyOn}>
          <h2 className="site-display space-y-1 text-[9vw] font-semibold leading-[0.9] lg:text-[6vw]">
            <span className="block">Every vehicle.</span>
            <span className="block text-muted-foreground">Every driver.</span>
            <span className="block text-primary">Every delivery.</span>
          </h2>
        </Overlay>

        {/* 4 — Live network telemetry */}
        <div
          className="pointer-events-none absolute inset-0 flex items-end px-5 pb-14 sm:px-10"
          style={{ opacity: netOn }}
        >
          <div className="mx-auto grid w-full max-w-[1600px] grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3 lg:grid-cols-6">
            {LIVE_STATS.map((s) => (
              <div key={s.k} className="hairline pt-3">
                <div className="numeric font-display text-2xl font-semibold sm:text-3xl">{s.v}</div>
                <div className="mt-1 text-[10px] uppercase tracking-[0.24em] text-muted-foreground">{s.k}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Overlay({ opacity, children }: { opacity: number; children: React.ReactNode }) {
  return (
    <div
      aria-hidden={opacity < 0.05}
      className="pointer-events-none absolute inset-0 flex items-center px-5 sm:px-10"
      style={{ opacity, transform: `translateY(${(1 - opacity) * 24}px)` }}
    >
      <div className="mx-auto w-full max-w-[1600px]">{children}</div>
    </div>
  );
}
