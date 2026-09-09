import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useInView } from "@/lib/scroll";

/** Small technical label used above every statement. */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn("numeric text-[11px] uppercase tracking-[0.42em] text-primary", className)}>{children}</p>
  );
}

/** Fade + rise reveal, one shot, honours reduced motion via CSS. */
export function Reveal({
  children,
  delay = 0,
  className,
  as: Tag = "div",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "p" | "li" | "span" | "section";
}) {
  const { ref, seen } = useInView(0.2);
  return (
    <Tag
      ref={ref as never}
      className={cn("site-reveal", seen && "is-in", className)}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </Tag>
  );
}

/** Line-by-line mask reveal for oversized display type. */
export function MaskLines({
  lines,
  className,
  lineClassName,
  as: Tag = "h2",
  stagger = 90,
}: {
  lines: string[];
  className?: string;
  lineClassName?: string;
  as?: "h1" | "h2" | "h3";
  stagger?: number;
}) {
  const { ref, seen } = useInView(0.15);
  return (
    <Tag ref={ref as never} className={cn("site-display", className)}>
      {lines.map((l, i) => (
        <span key={l + i} className="block overflow-hidden">
          <span
            className={cn("site-line block", seen && "is-in", lineClassName)}
            style={{ transitionDelay: `${i * stagger}ms` }}
          >
            {l}
          </span>
        </span>
      ))}
    </Tag>
  );
}

/** Word-by-word reveal for supporting statements. */
export function WordReveal({ text, className }: { text: string; className?: string }) {
  const { ref, seen } = useInView(0.2);
  const words = text.split(" ");
  return (
    <p ref={ref as never} className={className}>
      {words.map((w, i) => (
        <span key={w + i} className="inline-block overflow-hidden align-bottom">
          <span
            className={cn("site-line inline-block", seen && "is-in")}
            style={{ transitionDelay: `${i * 26}ms` }}
          >
            {w}&nbsp;
          </span>
        </span>
      ))}
    </p>
  );
}

/** Smoothly counting number, starts when scrolled into view. */
export function Counter({
  to,
  prefix = "",
  suffix = "",
  decimals = 0,
  className,
  duration = 1500,
}: {
  to: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
  duration?: number;
}) {
  const { ref, seen } = useInView(0.4);
  const [v, setV] = useState(0);
  const done = useRef(false);

  useEffect(() => {
    if (!seen || done.current) return;
    done.current = true;
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const e = Math.min(1, (t - start) / duration);
      setV(to * (1 - Math.pow(1 - e, 3)));
      if (e < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [seen, to, duration]);

  return (
    <span ref={ref as never} className={cn("numeric tabular-nums", className)}>
      {prefix}
      {v.toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
      {suffix}
    </span>
  );
}

/** Cursor-magnetic call to action. */
export function Magnetic({
  children,
  className,
  strength = 0.28,
}: {
  children: ReactNode;
  className?: string;
  strength?: number;
}) {
  const ref = useRef<HTMLSpanElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !window.matchMedia("(pointer: fine)").matches) return;
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      const near = Math.hypot(dx, dy) < Math.max(r.width, r.height);
      el.style.transform = near
        ? `translate3d(${dx * strength}px, ${dy * strength}px, 0)`
        : "translate3d(0,0,0)";
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, [strength]);
  return (
    <span ref={ref} className={cn("inline-block transition-transform duration-300 ease-out", className)}>
      {children}
    </span>
  );
}

/** Full-bleed typography moment used to breathe between dense scenes. */
export function Statement({
  lines,
  note,
  align = "center",
}: {
  lines: string[];
  note?: string;
  align?: "center" | "left";
}) {
  return (
    <section className="relative flex min-h-[85vh] items-center border-t border-border/60 px-5 sm:px-10">
      <div className={cn("mx-auto w-full max-w-7xl", align === "center" && "text-center")}>
        <MaskLines
          lines={lines}
          className="font-display text-[15vw] font-semibold leading-[0.86] tracking-[-0.045em] sm:text-[12vw] lg:text-[10.5vw]"
        />
        {note && (
          <Reveal
            as="p"
            className={cn(
              "mt-8 max-w-xl text-sm text-muted-foreground sm:text-base",
              align === "center" && "mx-auto",
            )}
          >
            {note}
          </Reveal>
        )}
      </div>
    </section>
  );
}
