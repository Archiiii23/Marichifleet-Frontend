import { useEffect } from "react";
import Lenis from "lenis";
import { startScrollTracking, usePrefersReducedMotion } from "@/lib/scroll";

/** Inertial scrolling. Disabled for reduced-motion and coarse pointers. */
export function SmoothScroll() {
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const stop = startScrollTracking();
    if (reduced || window.matchMedia("(pointer: coarse)").matches) return stop;

    const lenis = new Lenis({
      duration: 1.15,
      easing: (t: number) => 1 - Math.pow(1 - t, 3),
      wheelMultiplier: 1,
      touchMultiplier: 1.4,
    });
    let raf = 0;
    const loop = (time: number) => {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
      stop();
    };
  }, [reduced]);

  return null;
}
