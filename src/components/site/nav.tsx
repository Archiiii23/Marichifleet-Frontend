import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { Magnetic } from "./type";

const LINKS = [
  { label: "Solutions", href: "#journey" },
  { label: "Platform", href: "#control" },
  { label: "Control Tower", href: "#tracking" },
  { label: "Intelligence", href: "#intelligence" },
];

export function SiteNav() {
  const [compact, setCompact] = useState(false);
  const [progress, setProgress] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setCompact(window.scrollY > window.innerHeight * 0.7);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? window.scrollY / max : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-[70] transition-all duration-500",
        compact ? "bg-background/70 backdrop-blur-xl" : "bg-transparent",
      )}
    >
      <nav
        aria-label="Primary"
        className={cn(
          "mx-auto flex max-w-[1600px] items-center justify-between px-5 transition-all duration-500 sm:px-10",
          compact ? "py-3" : "py-6",
        )}
      >
        <a
          href="#top"
          data-cursor="Top"
          className="font-display text-sm font-semibold uppercase tracking-[0.34em] text-foreground"
        >
          Marichi<span className="text-primary">Fleet</span>
        </a>

        <ul className="hidden items-center gap-9 lg:flex">
          {LINKS.map((l) => (
            <li key={l.label}>
              <Magnetic strength={0.18}>
                <a
                  href={l.href}
                  className="text-[11px] uppercase tracking-[0.26em] text-muted-foreground transition-colors hover:text-foreground"
                >
                  {l.label}
                </a>
              </Magnetic>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2 sm:gap-4">
          <Link
            to="/app/dashboard"
            className="hidden text-[11px] uppercase tracking-[0.26em] text-muted-foreground transition-colors hover:text-foreground sm:block"
          >
            Login
          </Link>
          <Magnetic strength={0.2}>
            <Link
              to="/app/dashboard"
              data-cursor="Enter"
              className="inline-flex items-center rounded-full border border-foreground/25 px-4 py-2 text-[11px] uppercase tracking-[0.26em] text-foreground transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground sm:px-5"
            >
              Get started
            </Link>
          </Magnetic>
          <button
            type="button"
            aria-expanded={open}
            aria-label="Toggle menu"
            onClick={() => setOpen((o) => !o)}
            className="ml-1 flex size-9 flex-col items-center justify-center gap-1.5 rounded-full border border-border lg:hidden"
          >
            <span className={cn("h-px w-4 bg-foreground transition-transform", open && "translate-y-[3px] rotate-45")} />
            <span className={cn("h-px w-4 bg-foreground transition-transform", open && "-translate-y-[3px] -rotate-45")} />
          </button>
        </div>
      </nav>

      {open && (
        <ul className="border-t border-border bg-background/95 px-5 py-4 backdrop-blur-xl lg:hidden">
          {LINKS.map((l) => (
            <li key={l.label}>
              <a
                href={l.href}
                onClick={() => setOpen(false)}
                className="block py-3 font-display text-lg uppercase tracking-[0.12em]"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>
      )}

      <div className="h-px w-full bg-border/60">
        <div
          className="h-px origin-left bg-primary"
          style={{ transform: `scaleX(${progress})` }}
          aria-hidden
        />
      </div>
    </header>
  );
}
