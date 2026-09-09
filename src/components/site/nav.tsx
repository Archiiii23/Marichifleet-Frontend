import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useTheme, type Theme } from "@/domain/theme";

const LINKS = [
  { label: "Platform", href: "#control" },
  { label: "Solutions", href: "#movement" },
  { label: "Control Tower", href: "#tracking" },
];

const THEMES: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "dark", label: "Dark", icon: Moon },
  { value: "light", label: "Light", icon: Sun },
  { value: "system", label: "System", icon: Monitor },
];

export function SiteNav() {
  const [compact, setCompact] = useState(false);
  const [progress, setProgress] = useState(0);
  const [open, setOpen] = useState(false);
  const { theme, setTheme } = useTheme();

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
          className="font-display text-sm font-semibold uppercase tracking-[0.16em] text-foreground"
        >
          Marichi<span className="text-primary">Fleet</span>
        </a>

        <ul className="hidden items-center gap-9 lg:flex">
          {LINKS.map((l) => (
            <li key={l.label}>
              <a href={l.href} className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground">
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2 sm:gap-4">
          <Link
            to="/auth"
            className="hidden text-[11px] uppercase tracking-[0.26em] text-muted-foreground transition-colors hover:text-foreground sm:block"
          >
            Login
          </Link>
          <ThemePicker theme={theme} onChange={setTheme} className="hidden xl:flex" />
          <Link
            to="/auth"
            className="inline-flex h-9 items-center border border-foreground/30 px-4 text-[11px] uppercase tracking-[0.14em] text-foreground transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground sm:px-5"
          >
            Get started
          </Link>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-expanded={open}
            aria-label="Toggle menu"
            onClick={() => setOpen((o) => !o)}
            className="ml-1 flex flex-col gap-1.5 lg:hidden"
          >
            <span className={cn("h-px w-4 bg-foreground transition-transform", open && "translate-y-[3px] rotate-45")} />
            <span className={cn("h-px w-4 bg-foreground transition-transform", open && "-translate-y-[3px] -rotate-45")} />
          </Button>
        </div>
      </nav>

      {open && (
        <div className="border-t border-border bg-background/95 px-5 py-4 backdrop-blur-xl lg:hidden">
          <ul>
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
          <ThemePicker theme={theme} onChange={setTheme} className="mt-4 flex" />
        </div>
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

function ThemePicker({ theme, onChange, className }: { theme: Theme; onChange: (theme: Theme) => void; className?: string }) {
  return (
    <div className={cn("items-center border border-border bg-background/70 p-0.5", className)} aria-label="Appearance">
      {THEMES.map(({ value, label, icon: Icon }) => (
        <Button
          key={value}
          type="button"
          variant="ghost"
          size="icon"
          className={cn("size-7 rounded-none", theme === value && "bg-foreground text-background hover:bg-foreground hover:text-background")}
          onClick={() => onChange(value)}
          aria-label={`${label} appearance`}
          title={label}
        >
          <Icon className="size-3.5" aria-hidden />
        </Button>
      ))}
    </div>
  );
}
