import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/lib/scroll";

/**
 * Premium pointer: a small dot that expands into a contextual label when it
 * enters an element carrying `data-cursor="…"`. Desktop / fine pointers only.
 */
export function Cursor() {
  const reduced = usePrefersReducedMotion();
  const dot = useRef<HTMLDivElement | null>(null);
  const [label, setLabel] = useState<string | null>(null);
  const [on, setOn] = useState(false);

  useEffect(() => {
    if (reduced || !window.matchMedia("(pointer: fine)").matches) return;
    setOn(true);

    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    let tx = x;
    let ty = y;
    let raf = 0;

    const move = (e: PointerEvent) => {
      tx = e.clientX;
      ty = e.clientY;
      const el = (e.target as HTMLElement | null)?.closest?.("[data-cursor]") as HTMLElement | null;
      setLabel(el?.dataset.cursor ?? null);
    };
    const loop = () => {
      x += (tx - x) * 0.22;
      y += (ty - y) * 0.22;
      if (dot.current) dot.current.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
      raf = requestAnimationFrame(loop);
    };
    window.addEventListener("pointermove", move, { passive: true });
    raf = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener("pointermove", move);
      cancelAnimationFrame(raf);
    };
  }, [reduced]);

  if (!on) return null;

  return (
    <div
      ref={dot}
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[90] hidden mix-blend-difference md:block"
    >
      <div
        className={
          "flex items-center justify-center rounded-full border border-foreground/70 text-[10px] font-medium uppercase tracking-[0.18em] text-foreground transition-all duration-300 ease-out " +
          (label ? "size-[86px] bg-foreground/5 backdrop-blur-[1px]" : "size-2 bg-foreground")
        }
      >
        <span className={label ? "opacity-100" : "opacity-0"}>{label}</span>
      </div>
    </div>
  );
}
