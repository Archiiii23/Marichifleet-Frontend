import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export type Theme = "dark" | "light" | "system";
export type ResolvedTheme = "dark" | "light";

interface ThemeValue {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (t: Theme) => void;
  toggle: () => void;
}

const Ctx = createContext<ThemeValue | null>(null);
const KEY = "marichifleet.theme";

function resolve(theme: Theme): ResolvedTheme {
  if (theme !== "system") return theme;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function apply(theme: Theme) {
  const resolved = resolve(theme);
  const root = document.documentElement;
  root.classList.toggle("light", resolved === "light");
  root.classList.toggle("dark", resolved === "dark");
  root.dataset["theme"] = theme;
  root.style.colorScheme = resolved;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("dark");

  useEffect(() => {
    const saved = window.localStorage.getItem(KEY) as Theme | null;
    const initial: Theme = saved === "light" || saved === "dark" || saved === "system" ? saved : "system";
    setThemeState(initial);
    setResolvedTheme(resolve(initial));
    apply(initial);
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: light)");
    const sync = () => {
      if (theme === "system") {
        setResolvedTheme(resolve("system"));
        apply("system");
      }
    };
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    setResolvedTheme(resolve(t));
    apply(t);
    window.localStorage.setItem(KEY, t);
  }, []);

  const value = useMemo<ThemeValue>(
    () => ({ theme, resolvedTheme, setTheme, toggle: () => setTheme(resolvedTheme === "dark" ? "light" : "dark") }),
    [theme, resolvedTheme, setTheme],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useTheme must be used inside ThemeProvider");
  return v;
}

/** Sun / moon switch used in every product shell top bar. */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme();
  return (
    <Button
      variant="ghost"
      size="icon"
      className={className}
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light appearance" : "Switch to dark appearance"}
      title={theme === "dark" ? "Light appearance" : "Dark appearance"}
    >
      {theme === "dark" ? <Sun className="size-4.5" aria-hidden /> : <Moon className="size-4.5" aria-hidden />}
    </Button>
  );
}
