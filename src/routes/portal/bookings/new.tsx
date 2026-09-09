import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Panel } from "@/components/mf/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { inr, useAction, useDb } from "@/domain/hooks";
import { CITY_INDEX } from "@/domain/seed";
import { useSession } from "@/domain/session";
import { createBooking } from "@/domain/store";
import { distanceKm } from "@/domain/seed";
import type { Vehicle } from "@/domain/types";

export const Route = createFileRoute("/portal/bookings/new")({
  head: () => ({
    meta: [
      { title: "Request a pickup — MarichiFleet" },
      { name: "description", content: "Tell us the lane, load and date; we confirm with a rate and vehicle." },
    ],
  }),
  component: PortalNewBooking,
});

const CITIES = Object.keys(CITY_INDEX);
const TYPES: Vehicle["type"][] = ["Truck", "Trailer", "Container", "Tanker", "LCV"];

function PortalNewBooking() {
  const db = useDb();
  const run = useAction();
  const navigate = useNavigate();
  const { persona } = useSession();
  const client = db.clients.find((c) => c.id === (persona.clientId ?? db.clients[0]?.id))!;

  const [from, setFrom] = useState("Pune");
  const [to, setTo] = useState("Nagpur");
  const [cargo, setCargo] = useState("");
  const [weight, setWeight] = useState("10");
  const [type, setType] = useState<Vehicle["type"]>("Truck");
  const [date, setDate] = useState(new Date(Date.now() + 86400_000).toISOString().slice(0, 16));

  const km = distanceKm(CITY_INDEX[from], CITY_INDEX[to]);
  const estimate = Math.round(km * client.ratePerKm);

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-semibold">Request a pickup</h1>
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Panel title="Shipment details">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Pickup city</Label>
              <Select value={from} onValueChange={setFrom}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Destination city</Label>
              <Select value={to} onValueChange={setTo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Vehicle type</Label>
              <Select value={type} onValueChange={(v) => setType(v as Vehicle["type"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Weight (tonnes)</Label><Input value={weight} onChange={(e) => setWeight(e.target.value)} inputMode="decimal" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Pickup date & time</Label><Input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} /></div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs">Cargo</Label>
              <Textarea rows={3} value={cargo} onChange={(e) => setCargo(e.target.value)} placeholder="What are we moving?" />
            </div>
          </div>
          <Button
            className="mt-5"
            onClick={() => {
              const p = CITY_INDEX[from];
              const d = CITY_INDEX[to];
              const res = run(
                () =>
                  createBooking({
                    clientId: client.id,
                    pickup: { city: from, address: `${from} pickup point`, lat: p.lat, lng: p.lng },
                    drop: { city: to, address: `${to} delivery point`, lat: d.lat, lng: d.lng },
                    cargo,
                    weightTons: Number(weight),
                    vehicleType: type,
                    priority: "standard",
                    rate: estimate,
                    pickupISO: new Date(date).toISOString(),
                    actor: persona.name,
                    source: `${client.name} (portal)`,
                    submit: true,
                  }),
                "Request sent — our team will confirm shortly",
              );
              if (res.ok && res.id) navigate({ to: "/portal/bookings/$bookingId", params: { bookingId: res.id } });
            }}
          >
            Send request
          </Button>
        </Panel>

        <Panel title="Indicative price">
          <p className="numeric text-3xl font-semibold">{inr(estimate)}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {km} km at ₹{client.ratePerKm}/km. Final rate is confirmed by our team before dispatch.
          </p>
        </Panel>
      </div>
    </div>
  );
}
