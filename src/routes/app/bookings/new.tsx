import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader, Panel } from "@/components/mf/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAction, useDb, inr } from "@/domain/hooks";
import { useSession } from "@/domain/session";
import { CITY_INDEX } from "@/domain/seed";
import { createBooking } from "@/domain/store";
import type { Vehicle } from "@/domain/types";

export const Route = createFileRoute("/app/bookings/new")({
  head: () => ({
    meta: [
      { title: "New booking — MarichiFleet" },
      { name: "description", content: "Capture a freight order with lane, cargo, vehicle type and rate." },
    ],
  }),
  component: NewBooking,
});

const CITIES = Object.keys(CITY_INDEX);
const TYPES: Vehicle["type"][] = ["Truck", "Trailer", "Container", "Tanker", "LCV"];

function NewBooking() {
  const db = useDb();
  const run = useAction();
  const navigate = useNavigate();
  const { persona } = useSession();

  const [clientId, setClientId] = useState(db.clients[0]?.id ?? "");
  const [from, setFrom] = useState("Pune");
  const [to, setTo] = useState("Hyderabad");
  const [cargo, setCargo] = useState("");
  const [weight, setWeight] = useState("12");
  const [type, setType] = useState<Vehicle["type"]>("Truck");
  const [priority, setPriority] = useState<"standard" | "express" | "critical">("standard");
  const [rate, setRate] = useState("48000");
  const [pickup, setPickup] = useState(new Date(Date.now() + 86400_000).toISOString().slice(0, 16));

  const client = db.clients.find((c) => c.id === clientId);
  const suggested = client ? Math.round(client.ratePerKm * 550) : 0;

  const submit = (submitNow: boolean) => {
    const p = CITY_INDEX[from];
    const d = CITY_INDEX[to];
    const res = run(
      () =>
        createBooking({
          clientId,
          pickup: { city: from, address: `${from} despatch yard`, lat: p.lat, lng: p.lng },
          drop: { city: to, address: `${to} consignee warehouse`, lat: d.lat, lng: d.lng },
          cargo,
          weightTons: Number(weight),
          vehicleType: type,
          priority,
          rate: Number(rate),
          pickupISO: new Date(pickup).toISOString(),
          actor: persona.name,
          source: persona.name,
          submit: submitNow,
        }),
      submitNow ? "Booking submitted for confirmation" : "Draft booking saved",
    );
    if (res.ok && res.id) navigate({ to: "/app/bookings/$bookingId", params: { bookingId: res.id } });
  };

  return (
    <>
      <PageHeader
        title="New booking"
        breadcrumb={[{ label: "Bookings", to: "/app/bookings" }, { label: "New" }]}
        subtitle="Validated against client, lane, load and rate before it can be dispatched."
      />
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Panel title="Order details">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Client">
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {db.clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Priority">
              <Select value={priority} onValueChange={(v) => setPriority(v as typeof priority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="express">Express</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Pickup city">
              <Select value={from} onValueChange={setFrom}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Destination city">
              <Select value={to} onValueChange={setTo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Vehicle type">
              <Select value={type} onValueChange={(v) => setType(v as Vehicle["type"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Load weight (tonnes)">
              <Input value={weight} onChange={(e) => setWeight(e.target.value)} inputMode="decimal" />
            </Field>
            <Field label="Pickup date & time">
              <Input type="datetime-local" value={pickup} onChange={(e) => setPickup(e.target.value)} />
            </Field>
            <Field label="Freight rate (₹)">
              <Input value={rate} onChange={(e) => setRate(e.target.value)} inputMode="numeric" />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Cargo description">
                <Textarea value={cargo} onChange={(e) => setCargo(e.target.value)} placeholder="e.g. TMT steel bars, 40 bundles" rows={3} />
              </Field>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button onClick={() => submit(true)}>Submit booking</Button>
            <Button variant="outline" onClick={() => submit(false)}>Save as draft</Button>
            <Button variant="ghost" onClick={() => navigate({ to: "/app/bookings" })}>Cancel</Button>
          </div>
        </Panel>

        <Panel title="Rate guidance" description="From the client rate card">
          {client ? (
            <div className="space-y-3 text-sm">
              <p className="text-muted-foreground">
                {client.name} is billed at <span className="numeric text-foreground">₹{client.ratePerKm}/km</span> with{" "}
                <span className="numeric text-foreground">{client.creditDays}</span> credit days.
              </p>
              <p className="text-muted-foreground">
                Indicative for a ~550 km lane: <span className="numeric text-foreground">{inr(suggested)}</span>
              </p>
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                <li>· Pickup and destination must differ.</li>
                <li>· Load weight must be above zero and within vehicle capacity at dispatch.</li>
                <li>· Submitted bookings need confirmation before a vehicle can be assigned.</li>
              </ul>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Select a client to see rate guidance.</p>
          )}
        </Panel>
      </div>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
