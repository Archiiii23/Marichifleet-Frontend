import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Sparkles, Truck } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/domain/auth";
import { startDemoSession } from "@/domain/guard";
import { homeRouteFor } from "@/domain/rbac";
import { ThemeToggle } from "@/domain/theme";
import { loginWithGoogle } from "@/domain/googleAuth";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — MarichiFleet" },
      { name: "description", content: "Sign in to the MarichiFleet transport control tower, driver app or client portal." },
      { property: "og:title", content: "Sign in — MarichiFleet" },
      { property: "og:description", content: "Access your MarichiFleet account." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

export function AuthPage() {
  const { session, roles, loading, refresh } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [company, setCompany] = useState("");
  const [busy, setBusy] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  useEffect(() => {
    if (!loading && session) navigate({ to: homeRouteFor(roles), replace: true });
  }, [loading, session, roles, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await loginWithGoogle({
        email: email.trim(),
        name: fullName.trim() || email.split("@")[0],
      });
      await refresh();
      toast.success("Signed in successfully");
      navigate({ to: "/app/dashboard" });
    } catch (error) {
      toast.error("Could not sign in", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    const googleClientId =
      (import.meta.env as Record<string, string | undefined>)["VITE_GOOGLE_CLIENT_ID"] ||
      "116103213980-jbatdnvs5ckpbamneisc4e8g66v0jgba.apps.googleusercontent.com";

    const handleGoogleCallback = async (response: any) => {
      if (response?.credential) {
        try {
          await loginWithGoogle({ credential: response.credential });
          await refresh();
          toast.success("Google Sign-In Successful");
          navigate({ to: "/app/dashboard" });
        } catch {
          // toasted in loginWithGoogle
        }
      }
    };

    const renderGoogleBtn = () => {
      if ((window as any).google?.accounts?.id) {
        try {
          (window as any).google.accounts.id.initialize({
            client_id: googleClientId,
            callback: handleGoogleCallback,
            auto_select: false,
            cancel_on_tap_outside: true,
          });

          const el = document.getElementById("g_id_signin_btn");
          if (el) {
            el.innerHTML = "";
            (window as any).google.accounts.id.renderButton(el, {
              type: "standard",
              theme: "outline",
              size: "large",
              text: "continue_with",
              shape: "rectangular",
              logo_alignment: "left",
              width: 384,
            });
          }
        } catch (err) {
          console.warn("Google Auth initialization:", err);
        }
      }
    };

    renderGoogleBtn();
    const interval = setInterval(() => {
      if ((window as any).google?.accounts?.id) {
        clearInterval(interval);
        renderGoogleBtn();
      }
    }, 250);
    return () => clearInterval(interval);
  }, [navigate, refresh]);

  const demoLogin = (personaId = "u_owner") => {
    startDemoSession();
    if (typeof window !== "undefined") {
      window.localStorage.setItem("marichifleet.persona", personaId);
    }
    toast.success("Demo Mode Activated", {
      description: "Signed in as Director with full system access.",
    });
    navigate({ to: "/app/dashboard" });
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

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 pb-16">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          {mode === "signin" ? "Sign in" : "Create your account"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {mode === "signin"
            ? "Use your work email to reach your control tower."
            : "Set up your company workspace in a few seconds."}
        </p>

        {checkEmail ? (
          <div className="mt-6 border border-border p-4 text-sm">
            We sent a confirmation link to <span className="font-medium">{email}</span>. Open it to activate your
            account, then come back and sign in.
          </div>
        ) : (
          <form className="mt-6 space-y-3" onSubmit={submit}>
            {mode === "signup" && (
              <>
                <div>
                  <Label className="text-xs" htmlFor="name">Your name</Label>
                  <Input id="name" className="mt-1" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                </div>
                <div>
                  <Label className="text-xs" htmlFor="company">Company name</Label>
                  <Input id="company" className="mt-1" value={company} onChange={(e) => setCompany(e.target.value)} required />
                </div>
              </>
            )}
            <div>
              <Label className="text-xs" htmlFor="email">Work email</Label>
              <Input id="email" className="mt-1" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <Label className="text-xs" htmlFor="password">Password</Label>
              <Input
                id="password"
                className="mt-1"
                type="password"
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
            </Button>
          </form>
        )}

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-[10px] font-semibold uppercase tracking-wider">
            <span className="bg-background px-2 text-muted-foreground">Demo / Instant Access</span>
          </div>
        </div>

        <Button
          variant="secondary"
          className="w-full gap-2 border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary font-medium"
          onClick={() => demoLogin("u_owner")}
          type="button"
        >
          <Sparkles className="size-4" />
          Demo Login (Bypass Auth)
        </Button>

        <div className="mt-2 flex items-center justify-between px-0.5 text-xs text-muted-foreground">
          <span>Explore with full seeded data</span>
          <Link to="/login" className="text-primary hover:underline font-medium">
            Switch Demo Role →
          </Link>
        </div>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-[10px] font-semibold uppercase tracking-wider">
            <span className="bg-background px-2 text-muted-foreground">Or</span>
          </div>
        </div>

        <div className="space-y-2">
          {/* Official Google Identity Services One-Tap & Sign-In Button */}
          <div id="g_id_signin_btn" className="w-full flex justify-center min-h-[44px]"></div>
        </div>

        <div className="mt-4 flex items-center justify-center text-xs text-muted-foreground">
          <button
            type="button"
            className="hover:text-foreground"
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setCheckEmail(false);
            }}
          >
            {mode === "signin" ? "New company? Create an account" : "Already have an account? Sign in"}
          </button>
        </div>
      </main>
    </div>
  );
}
