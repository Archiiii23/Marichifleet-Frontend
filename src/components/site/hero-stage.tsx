import { Suspense, lazy, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowDown, ArrowRight } from "lucide-react";
import { clamp01, useSectionProgress, usePrefersReducedMotion } from "@/lib/scroll";
import { useIsMobile } from "@/hooks/use-mobile";

const Scene3D = lazy(() => import("./scene-3d"));

/** Opacity envelope: fades in at `a`, holds, fades out at `b`. */
function band(p: number, a: number, b: number, fade = 0.07) {
  return clamp01(Math.min((p - a) / fade, (b - p) / fade));
}

export function HeroStage() {
  const [mounted, setMounted] = useState(false);
  const reduced = usePrefersReducedMotion();
  const lite = useIsMobile();
  const { ref, p } = useSectionProgress<HTMLDivElement>();

  useEffect(() => setMounted(true), []);

  const heroOn = reduced ? 1 : band(p, -0.02, 0.17, 0.06);
  const principleOn = reduced ? 0 : band(p, 0.38, 0.76, 0.1);

  return (
    <div id="top" ref={ref} className="relative" style={{ height: reduced ? "100svh" : "240svh" }}>
      <div className="sticky top-0 h-[100svh] w-full overflow-hidden bg-background">
        <div className="absolute inset-0">
          {mounted ? (
            <Suspense fallback={null}>
              <Scene3D reduced={reduced} lite={lite} />
            </Suspense>
          ) : null}
        </div>

        <div className="vignette pointer-events-none absolute inset-0" aria-hidden />
        <div className="hero-grid pointer-events-none absolute inset-0" aria-hidden />

        {/* 1 — Hero */}
        <div
          className="pointer-events-none absolute inset-0 flex flex-col justify-end px-5 pb-12 pt-28 sm:px-10 sm:pb-16 lg:px-16"
          style={{ opacity: heroOn, transform: `translateY(${(1 - heroOn) * -30}px)` }}
        >
          <div className="mx-auto w-full max-w-[1600px]">
            <div className="mb-6 flex items-center gap-4 text-[10px] uppercase tracking-[0.16em] text-muted-foreground"><span className="numeric text-primary">01</span><span>Transport operating system</span></div>
            <h1 className="site-display max-w-[13ch] text-[clamp(4rem,10vw,10rem)] font-semibold">
              Move freight.
              <br />
              <span className="text-foreground/65">Own the outcome.</span>
            </h1>
            <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <p className="max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
                 One operating picture for every booking, vehicle, driver, delivery and rupee.
              </p>
              <div className="pointer-events-auto flex flex-wrap items-center gap-3">
                  <a
                    href="#control"
                    className="group inline-flex h-12 items-center gap-2 bg-primary px-6 text-[11px] font-medium uppercase tracking-[0.12em] text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    See the platform
                    <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" aria-hidden />
                  </a>
                  <Link
                    to="/app/dashboard"
                    className="inline-flex h-12 items-center border border-foreground/30 px-6 text-[11px] font-medium uppercase tracking-[0.12em] transition-colors hover:border-foreground"
                  >
                    Enter control tower
                  </Link>
              </div>
            </div>
            <div className="mt-9 flex items-center gap-3 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              <ArrowDown className="size-3 animate-bounce" aria-hidden />
              Scroll to drive the story
            </div>
          </div>
        </div>

        <Overlay opacity={principleOn}>
          <div className="grid gap-8 lg:grid-cols-12 lg:items-end"><h2 className="site-display text-[clamp(4rem,10vw,10rem)] font-semibold lg:col-span-9">Every mile is an operational decision.</h2><p className="max-w-xs border-t border-border pt-5 text-sm leading-7 text-muted-foreground lg:col-span-3">See the journey before the exception becomes a delay.</p></div>
        </Overlay>
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
