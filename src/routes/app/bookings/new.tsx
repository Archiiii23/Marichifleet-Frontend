import { createFileRoute, useNavigate, useSearch, Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { Navigation, ExternalLink, Sparkles, Plus } from "lucide-react";
import { toast } from "sonner";
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
import type { Vehicle, TransportRoute } from "@/domain/types";

export const Route = createFileRoute("/app/bookings/new")({
  validateSearch: (search: Record<string, unknown>): { routeId?: string } => ({
    routeId: typeof search.routeId === "string" ? search.routeId : undefined,
  }),
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
  const search = Route.useSearch();
  const searchRouteId = search?.routeId;

  const routes = db.routes || [];
  const initialRoute = searchRouteId ? routes.find((r) => r.id === searchRouteId) : undefined;

  const [routeId, setRouteId] = useState<string>(searchRouteId || "");
  const [clientId, setClientId] = useState(db.clients[0]?.id ?? "");
  const [from, setFrom] = useState(initialRoute ? initialRoute.originCity : "Pune");
  const [to, setTo] = useState(initialRoute ? initialRoute.destinationCity : "Hyderabad");
  const [cargo, setCargo] = useState("");
  const [weight, setWeight] = useState("12");
  const [type, setType] = useState<Vehicle["type"]>("Truck");
  const [priority, setPriority] = useState<"standard" | "express" | "critical">("standard");
  const [rate, setRate] = useState(initialRoute ? String(initialRoute.defaultRate) : "48000");
  const [pickup, setPickup] = useState(new Date(Date.now() + 86400_000).toISOString().slice(0, 16));

  const selectedRoute = routes.find((r) => r.id === routeId);

  const availableCities = useMemo(() => {
    const set = new Set<string>(CITIES);
    for (const r of routes) {
      if (r.originCity) set.add(r.originCity);
      if (r.destinationCity) set.add(r.destinationCity);
    }
    if (from) set.add(from);
    if (to) set.add(to);
    return Array.from(set);
  }, [routes, from, to]);

  // Auto-apply route from URL if present
  useEffect(() => {
    if (searchRouteId && routes.length > 0) {
      const found = routes.find((r) => r.id === searchRouteId);
      if (found) {
        setRouteId(found.id);
        setFrom(found.originCity);
        setTo(found.destinationCity);
        setRate(String(found.defaultRate));
      }
    }
  }, [searchRouteId, routes]);

  const handleRouteChange = (val: string) => {
    setRouteId(val);
    if (val === "custom" || !val) return;
    const r = routes.find((x) => x.id === val);
    if (r) {
      setFrom(r.originCity);
      setTo(r.destinationCity);
      setRate(String(r.defaultRate));
      toast.info(`Applied Corridor: ${r.name}`, {
        description: `Origin (${r.originCity}), Destination (${r.destinationCity}) and rate (₹${r.defaultRate.toLocaleString("en-IN")}) populated.`,
      });
    }
  };

  const client = db.clients.find((c) => c.id === clientId);
  const suggested = client ? Math.round(client.ratePerKm * 550) : 0;

  const submit = (submitNow: boolean) => {
    const p = CITY_INDEX[from] || { lat: 18.52, lng: 73.856 };
    const d = CITY_INDEX[to] || { lat: 17.385, lng: 78.486 };
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
          routeId: routeId && routeId !== "custom" ? routeId : undefined,
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
            {/* Standard Corridor / Route Selector Dropdown */}
            <div className="sm:col-span-2 rounded-lg border border-border/80 bg-muted/40 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-foreground">
                  <Navigation className="size-3.5 text-primary" />
                  <span>Freight Corridor / Route</span>
                </div>
                <Link
                  to="/app/routes"
                  className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
                >
                  <span>+ Create / Manage Routes</span>
                  <ExternalLink className="size-3" />
                </Link>
              </div>

              <Select value={routeId || "custom"} onValueChange={handleRouteChange}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="-- Select route from operations --" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">-- Custom Lane (Manual Entry) --</SelectItem>
                  {routes.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name} · {r.originCity} → {r.destinationCity} ({r.distanceKm} km · ₹{r.defaultRate.toLocaleString("en-IN")})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedRoute && (
                <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-muted-foreground bg-background/60 p-2 rounded border border-border/50">
                  <span className="inline-flex items-center gap-1 rounded bg-primary/10 px-2 py-0.5 font-mono font-semibold text-primary text-[11px]">
                    {selectedRoute.code}
                  </span>
                  <span>· Distance: <strong className="text-foreground font-mono">{selectedRoute.distanceKm} km</strong></span>
                  <span>· Transit ETA: <strong className="text-foreground">{selectedRoute.estTransitHours} hrs</strong></span>
                  <span>· Est. Tolls: <strong className="text-foreground font-mono">₹{selectedRoute.tollEstimate.toLocaleString("en-IN")}</strong></span>
                  {selectedRoute.stops && selectedRoute.stops.length > 0 && (
                    <span className="w-full text-[11px] text-muted-foreground/80 mt-1">
                      Stops: {selectedRoute.stops.join(" → ")}
                    </span>
                  )}
                </div>
              )}
            </div>

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
                  {availableCities.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Destination city">
              <Select value={to} onValueChange={setTo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {availableCities.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
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

        <Panel title="Rate & Corridor guidance" description="From corridor master and client contracts">
          <div className="space-y-3 text-sm">
            {selectedRoute && (
              <div className="rounded-md border border-primary/20 bg-primary/5 p-3 space-y-1 text-xs">
                <div className="font-semibold text-primary flex items-center gap-1">
                  <Sparkles className="size-3" />
                  <span>Standard Corridor Active</span>
                </div>
                <p className="text-muted-foreground font-mono">
                  {selectedRoute.name} ({selectedRoute.distanceKm} km)
                </p>
                <p className="text-muted-foreground">
                  Benchmark rate: <span className="font-semibold text-foreground font-mono">₹{selectedRoute.defaultRate.toLocaleString("en-IN")}</span>
                </p>
              </div>
            )}
            {client ? (
              <>
                <p className="text-muted-foreground">
                  {client.name} is billed at <span className="numeric text-foreground">₹{client.ratePerKm}/km</span> with{" "}
                  <span className="numeric text-foreground">{client.creditDays}</span> credit days.
                </p>
                <p className="text-muted-foreground">
                  Indicative for a ~550 km lane: <span className="numeric text-foreground">{inr(suggested)}</span>
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Select a client to see rate guidance.</p>
            )}
            <ul className="space-y-1.5 text-xs text-muted-foreground pt-1">
              <li>· Selecting a corridor pre-fills origin, destination & benchmark rate.</li>
              <li>· Pickup and destination must differ.</li>
              <li>· Load weight must be within vehicle capacity at dispatch.</li>
              <li>· Submitted bookings need confirmation before vehicle assignment.</li>
            </ul>
          </div>
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
