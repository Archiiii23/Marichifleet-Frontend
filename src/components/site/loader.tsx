import { useEffect, useState } from "react";

const STEPS = ["ROUTES", "VEHICLES", "TELEMETRY", "DATA"];

/** Branded boot sequence. Never blocks content for more than ~1.9s. */
export function BootSequence() {
  const [pct, setPct] = useState(0);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const e = Math.min(1, (t - start) / 1700);
      setPct(Math.round((1 - Math.pow(1 - e, 2)) * 100));
      if (e < 1) raf = requestAnimationFrame(tick);
      else setTimeout(() => setGone(true), 260);
    };
    raf = requestAnimationFrame(tick);
    document.documentElement.style.overflow = "hidden";
    return () => {
      cancelAnimationFrame(raf);
      document.documentElement.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    if (gone) document.documentElement.style.overflow = "";
  }, [gone]);

  if (gone) return null;

  return (
    <div
      aria-hidden
      className={
        "fixed inset-0 z-[100] flex flex-col justify-between bg-background px-6 py-8 transition-opacity duration-500 sm:px-10 " +
        (pct >= 100 ? "pointer-events-none opacity-0" : "opacity-100")
      }
    >
      <div className="grid-canvas pointer-events-none absolute inset-0 opacity-[0.25]" />
      <div className="relative font-display text-sm font-semibold uppercase tracking-[0.42em]">
        Marichi<span className="text-primary">Fleet</span>
      </div>

      <div className="relative">
        <p className="numeric text-xs uppercase tracking-[0.3em] text-muted-foreground">
          Initializing fleet control…
        </p>
        <div className="mt-5 flex flex-wrap gap-x-8 gap-y-2">
          {STEPS.map((s, i) => (
            <span
              key={s}
              className={
                "numeric text-[11px] uppercase tracking-[0.28em] transition-colors duration-300 " +
                (pct > (i + 1) * 22 ? "text-foreground" : "text-muted-foreground/40")
              }
            >
              {s}
            </span>
          ))}
        </div>
      </div>

      <div className="relative">
        <div className="h-px w-full bg-border">
          <div
            className="h-px bg-primary transition-[width] duration-150 ease-linear"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-3 flex items-end justify-between">
          <span className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
            Every mile. Under control.
          </span>
          <span className="numeric font-display text-4xl font-semibold sm:text-6xl">
            {String(pct).padStart(3, "0")}
          </span>
        </div>
      </div>
    </div>
  );
}
