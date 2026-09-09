import { useEffect, useRef, useState } from "react";

/**
 * Global, render-free scroll + pointer state.
 * 3D and canvas layers read this inside animation frames so that scrolling
 * never triggers React re-renders.
 */
export const scrollState = {
  y: 0,
  progress: 0,
  vh: 1,
  vw: 1,
  mx: 0,
  my: 0,
  reduced: false,
};

let started = false;

export function startScrollTracking() {
  if (started || typeof window === "undefined") return () => {};
  started = true;

  const measure = () => {
    scrollState.y = window.scrollY;
    scrollState.vh = window.innerHeight || 1;
    scrollState.vw = window.innerWidth || 1;
    const max = document.documentElement.scrollHeight - scrollState.vh;
    scrollState.progress = max > 0 ? Math.min(1, Math.max(0, scrollState.y / max)) : 0;
  };
  const onMove = (e: PointerEvent) => {
    scrollState.mx = (e.clientX / scrollState.vw) * 2 - 1;
    scrollState.my = (e.clientY / scrollState.vh) * 2 - 1;
  };

  scrollState.reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  measure();
  window.addEventListener("scroll", measure, { passive: true });
  window.addEventListener("resize", measure);
  window.addEventListener("pointermove", onMove, { passive: true });

  return () => {
    window.removeEventListener("scroll", measure);
    window.removeEventListener("resize", measure);
    window.removeEventListener("pointermove", onMove);
    started = false;
  };
}

export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => {
      setReduced(mq.matches);
      scrollState.reduced = mq.matches;
    };
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced;
}

/** Progress (0→1) of an element travelling through the viewport. */
export function useSectionProgress<T extends HTMLElement>(opts?: { grain?: number }) {
  const ref = useRef<T | null>(null);
  const [p, setP] = useState(0);
  const grain = opts?.grain ?? 0.004;

  useEffect(() => {
    let raf = 0;
    let last = -1;
    const tick = () => {
      const el = ref.current;
      if (el) {
        const r = el.getBoundingClientRect();
        const total = r.height - window.innerHeight;
        const next = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : r.top < 0 ? 1 : 0;
        if (Math.abs(next - last) > grain) {
          last = next;
          setP(next);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [grain]);

  return { ref, p };
}

/** Adds `is-in` once the element enters the viewport (one-shot reveal). */
export function useInView<T extends HTMLElement>(threshold = 0.25) {
  const ref = useRef<T | null>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setSeen(true);
      },
      { threshold, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return { ref, seen };
}

export const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * clamp01(t);
/** Maps v from [a,b] into 0→1. */
export const range = (v: number, a: number, b: number) => clamp01((v - a) / (b - a || 1));
