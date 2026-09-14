import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Database, Sparkles, Truck, UserCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/domain/auth";
import { startDemoSession } from "@/domain/guard";
import { homeRouteFor } from "@/domain/rbac";
import { ThemeToggle } from "@/domain/theme";
import { loginWithGoogle } from "@/domain/googleAuth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/auth")({
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

function AuthPage() {
  const { session, roles, loading } = useAuth();
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
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName, company_name: company },
          },
        });
        if (error) throw error;
        setCheckEmail(true);
        toast.success("Account created", { description: "Check your email to confirm and finish signing in." });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (error) {
      toast.error(mode === "signup" ? "Could not create the account" : "Could not sign in", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setBusy(false);
    }
  };

  const [googleLoading, setGoogleLoading] = useState(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState("dewarsh.jain@google.com");
  const [customGoogleName, setCustomGoogleName] = useState("Dewarsh Jain");
  const [customDialogOpen, setCustomDialogOpen] = useState(false);

  const google = async (customProfile?: { email: string; name: string }) => {
    try {
      setGoogleLoading(true);
      await loginWithGoogle(customProfile ? {
        email: customProfile.email,
        name: customProfile.name,
        avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(customProfile.name)}&background=0D8ABC&color=fff`,
      } : undefined);
      setCustomDialogOpen(false);
      navigate({ to: "/app/dashboard" });
    } catch {
      // toast is already displayed inside loginWithGoogle
    } finally {
      setGoogleLoading(false);
    }
  };

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
          <Button
            variant="outline"
            className="w-full flex items-center justify-center gap-2 border-border/80 hover:bg-muted font-medium h-10 shadow-xs"
            onClick={() => google()}
            disabled={googleLoading}
            type="button"
          >
            <svg className="size-4 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            <span>{googleLoading ? "Authenticating with Google..." : "Continue with Google"}</span>
          </Button>

          <Dialog open={customDialogOpen} onOpenChange={setCustomDialogOpen}>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
              <span className="flex items-center gap-1">
                <Database className="size-3 text-emerald-500" />
                <span>Syncs to MongoDB</span>
              </span>
              <DialogTrigger asChild>
                <button type="button" className="text-primary hover:underline font-medium">
                  Use custom Google account →
                </button>
              </DialogTrigger>
            </div>

            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <svg className="size-5 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                  Google Sign-In & MongoDB Sync
                </DialogTitle>
                <DialogDescription>
                  Enter any Google email address. It will authenticate via Google Auth and upsert your user profile directly in MongoDB.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 py-2">
                <div>
                  <Label htmlFor="google-name" className="text-xs">Full Name</Label>
                  <Input
                    id="google-name"
                    value={customGoogleName}
                    onChange={(e) => setCustomGoogleName(e.target.value)}
                    placeholder="e.g. Dewarsh Jain"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="google-email" className="text-xs">Google Email</Label>
                  <Input
                    id="google-email"
                    type="email"
                    value={customGoogleEmail}
                    onChange={(e) => setCustomGoogleEmail(e.target.value)}
                    placeholder="e.g. dewarsh.jain@google.com"
                    className="mt-1"
                  />
                </div>
                <div className="rounded-md bg-muted/60 p-2.5 text-xs text-muted-foreground flex items-center gap-2">
                  <Database className="size-4 text-emerald-500 shrink-0" />
                  <span>Your profile will be persisted to the MongoDB <code className="text-foreground">users</code> collection.</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={() => setCustomDialogOpen(false)}>Cancel</Button>
                <Button
                  onClick={() => google({ email: customGoogleEmail, name: customGoogleName })}
                  disabled={googleLoading || !customGoogleEmail}
                  className="gap-2"
                >
                  <UserCheck className="size-4" />
                  {googleLoading ? "Signing in..." : "Sign in & Sync MongoDB"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
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
          <Link to="/" className="hover:text-foreground">Back to website</Link>
        </div>
      </main>
    </div>
  );
}
