import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { Truck } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { startDemoSession } from "@/domain/guard";
import { PERSONAS, roleLabel, useSession } from "@/domain/session";

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

  const signIn = () => {
    const p = PERSONAS.find((x) => x.id === selected) ?? PERSONAS[2];
    startDemoSession();
    setPersona(p.id);

    if (p.role === "driver") navigate({ to: "/driver/home" });
    else if (p.role === "client") navigate({ to: "/portal/dashboard" });
    else navigate({ to: "/app/dashboard" });
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

        <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
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
