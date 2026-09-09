import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { Check, Truck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CITIES } from "@/domain/seed";
import { ThemeToggle } from "@/domain/theme";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/onboarding")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Set up your fleet — MarichiFleet" },
      { name: "description", content: "Guided first-run setup: company, depot, first vehicle, first driver and first client." },
      { property: "og:title", content: "Set up your fleet — MarichiFleet" },
      { property: "og:description", content: "Five short steps and your control tower is live." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Onboarding,
});

const STEPS = ["Company", "Depot", "First vehicle", "First driver", "First client"];

function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    company: "",
    gstin: "",
    depot: "",
    city: CITIES[0].city,
    regNo: "",
    vehicleType: "Truck",
    driver: "",
    licence: "",
    client: "",
    clientCity: CITIES[0].city,
  });

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const required: Record<number, Array<keyof typeof form>> = {
    0: ["company"],
    1: ["depot"],
    2: ["regNo"],
    3: ["driver"],
    4: ["client"],
  };

  const next = () => {
    const missing = required[step].filter((k) => !form[k].trim());
    if (missing.length) {
      toast.error("Please complete this step", { description: "Fill the highlighted field to continue." });
      return;
    }
    if (step < STEPS.length - 1) {
      setStep(step + 1);
      return;
    }
    toast.success("Setup complete", { description: `${form.company} is ready — opening your control tower.` });
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

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-16">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Set up your fleet</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Five short steps. You can change any of this later in settings.
        </p>

        <ol className="mt-6 flex flex-wrap gap-2">
          {STEPS.map((s, i) => (
            <li
              key={s}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs",
                i < step
                  ? "border-success/40 bg-success/10 text-success"
                  : i === step
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border text-muted-foreground",
              )}
            >
              {i < step ? <Check className="size-3" aria-hidden /> : <span className="numeric">{i + 1}</span>}
              {s}
            </li>
          ))}
        </ol>

        <section className="mt-6 space-y-3 rounded-lg border border-border bg-card p-5">
          {step === 0 && (
            <>
              <Field label="Company name" value={form.company} onChange={(v) => set("company", v)} placeholder="Marichi Logistics Pvt Ltd" />
              <Field label="GSTIN (optional)" value={form.gstin} onChange={(v) => set("gstin", v)} placeholder="27AABCM1234K1Z9" />
            </>
          )}
          {step === 1 && (
            <>
              <Field label="Depot name" value={form.depot} onChange={(v) => set("depot", v)} placeholder="Bhiwandi Depot" />
              <CityField label="City" value={form.city} onChange={(v) => set("city", v)} />
            </>
          )}
          {step === 2 && (
            <>
              <Field label="Registration number" value={form.regNo} onChange={(v) => set("regNo", v)} placeholder="MH 04 AB 1234" />
              <div>
                <Label className="text-xs">Vehicle type</Label>
                <Select value={form.vehicleType} onValueChange={(v) => set("vehicleType", v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Truck", "Trailer", "Container", "Tanker", "LCV"].map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
          {step === 3 && (
            <>
              <Field label="Driver name" value={form.driver} onChange={(v) => set("driver", v)} placeholder="Ramesh Yadav" />
              <Field label="Licence number" value={form.licence} onChange={(v) => set("licence", v)} placeholder="MH0320110012345" />
            </>
          )}
          {step === 4 && (
            <>
              <Field label="Client name" value={form.client} onChange={(v) => set("client", v)} placeholder="Adarsh Steel Works" />
              <CityField label="Client city" value={form.clientCity} onChange={(v) => set("clientCity", v)} />
            </>
          )}
        </section>

        <div className="mt-4 flex items-center justify-between">
          <Button variant="ghost" size="sm" disabled={step === 0} onClick={() => setStep(step - 1)}>
            Back
          </Button>
          <Button size="sm" onClick={next}>
            {step === STEPS.length - 1 ? "Finish and open control tower" : "Continue"}
          </Button>
        </div>
      </main>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input className="mt-1" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function CityField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
        <SelectContent>
          {CITIES.map((c) => (
            <SelectItem key={c.city} value={c.city}>{c.city}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
