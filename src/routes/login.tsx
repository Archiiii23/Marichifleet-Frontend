import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { Database, Truck } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { startDemoSession } from "@/domain/guard";
import { PERSONAS, roleLabel, useSession } from "@/domain/session";
import { roleLandingRoute } from "@/domain/rbac";
import { loginWithGoogle } from "@/domain/googleAuth";

import { ThemeToggle } from "@/domain/theme";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/login")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — MarichiFleet" },
      { name: "description", content: "Sign in to the MarichiFleet control tower, driver app or client portal." },
      { property: "og:title", content: "Sign in — MarichiFleet" },
      { property: "og:description", content: "Access your transport control tower." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Login,
});



function Login() {
  const { persona, setPersona } = useSession();
  const navigate = useNavigate();
  const [selected, setSelected] = useState(persona.id);
  const [googleLoading, setGoogleLoading] = useState(false);

  const signIn = () => {
    const p = PERSONAS.find((x) => x.id === selected) ?? PERSONAS[2];
    startDemoSession();
    setPersona(p.id);
    const route = roleLandingRoute(p.role);
    navigate({ to: route as any });
  };

  const handleGoogleLogin = async () => {
    try {
      setGoogleLoading(true);
      await loginWithGoogle();
      navigate({ to: "/app/dashboard" });
    } catch {
      // toast is already displayed inside loginWithGoogle
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex h-14 items-center justify-between px-4 md:px-8">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded bg-primary">
            <Truck className="size-4 text-primary-foreground" aria-hidden />
          </span>
          <span className="font-display text-sm font-semibold uppercase tracking-[0.18em]">MarichiFleet</span>
        </Link>
        <ThemeToggle />
      </header>

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 pb-16">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Sign in</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This demo signs you in as one of the seeded team members. Pick who you want to be — the whole product changes
          around your role.
        </p>

        <div className="mt-6 space-y-3">
          <div>
            <Label className="text-xs">Work email</Label>
            <Input className="mt-1" defaultValue="ops@marichifleet.in" readOnly />
          </div>
          <div>
            <Label className="text-xs">Password</Label>
            <Input className="mt-1" type="password" defaultValue="demo-mode" readOnly />
          </div>
        </div>

        <div className="mt-5 space-y-2">
          <Button
            variant="outline"
            className="w-full flex items-center justify-center gap-2 border-border/80 hover:bg-muted font-medium h-10 shadow-xs"
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            type="button"
          >
            <svg className="size-4 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            <span>{googleLoading ? "Authenticating with Google..." : "Continue with Google (MongoDB)"}</span>
          </Button>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
            <span className="flex items-center gap-1">
              <Database className="size-3 text-emerald-500" />
              <span>Saves & syncs directly to MongoDB database</span>
            </span>
            <Link to="/auth" className="text-primary hover:underline font-medium">
              More sign-in options →
            </Link>
          </div>
        </div>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-[10px] font-semibold uppercase tracking-wider">
            <span className="bg-background px-2 text-muted-foreground">Or switch demo persona</span>
          </div>
        </div>

        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Continue as
        </p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {PERSONAS.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelected(p.id)}
              className={cn(
                "rounded-lg border p-3 text-left transition-colors",
                selected === p.id ? "border-primary bg-surface" : "border-border hover:border-border-strong",
              )}
            >
              <span className="block text-sm font-medium">{p.name}</span>
              <span className="block text-xs text-muted-foreground">{roleLabel(p.role)}</span>
            </button>
          ))}
        </div>

        <Button className="mt-6" onClick={signIn}>
          Sign in
        </Button>
        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <Link to="/onboarding" className="hover:text-foreground">
            New company? Start setup
          </Link>
          <Link to="/" className="hover:text-foreground">
            Back to website
          </Link>
        </div>
      </main>
    </div>
  );
}
