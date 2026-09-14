import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Navigation, ArrowRight, Trash2, MapPin, Clock, IndianRupee, Layers, ExternalLink, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DataTable } from "@/components/mf/data-table";
import { KpiCard, PageHeader, StatusBadge } from "@/components/mf/primitives";
import { CityAutocomplete } from "@/components/mf/city-autocomplete";
import { inr, useDb } from "@/domain/hooks";
import { CITY_INDEX, distanceKm } from "@/domain/seed";
import { createRoute, deleteRoute } from "@/domain/store";
import { useSession } from "@/domain/session";
import { getMapboxDrivingRoute, geocodeCity } from "@/services/mapbox";
import type { TransportRoute } from "@/domain/types";

export const Route = createFileRoute("/app/routes")({
  head: () => ({
    meta: [
      { title: "Routes & Corridors — MarichiFleet" },
      { name: "description", content: "Master register of freight corridors, distances, standard rates and transit schedules." },
    ],
  }),
  component: RoutesPage,
});

const CITIES = Object.keys(CITY_INDEX);

function RoutesPage() {
  const db = useDb();
  const navigate = useNavigate();
  const { persona } = useSession();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [originCity, setOriginCity] = useState("");
  const [destinationCity, setDestinationCity] = useState("");
  const [originCoords, setOriginCoords] = useState<[number, number] | null>(null);
  const [destCoords, setDestCoords] = useState<[number, number] | null>(null);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [mapboxSummary, setMapboxSummary] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [distance, setDistance] = useState("");
  const [transitHours, setTransitHours] = useState("");
  const [defaultRate, setDefaultRate] = useState("");
  const [tollEstimate, setTollEstimate] = useState("");
  const [stops, setStops] = useState("");

  const routes = db.routes || [];

  const calculateMapboxRoute = async (
    origName: string,
    destName: string,
    oCoords?: [number, number] | null,
    dCoords?: [number, number] | null
  ) => {
    if (!origName || !destName || origName.trim().length < 2 || destName.trim().length < 2) {
      setMapboxSummary(null);
      return;
    }

    setIsCalculatingRoute(true);
    try {
      const start = oCoords || (await geocodeCity(origName));
      const end = dCoords || (await geocodeCity(destName));

      if (!start || !end) {
        setIsCalculatingRoute(false);
        return;
      }

      const res = await getMapboxDrivingRoute([start, end]);
      if (res && res.distanceKm > 0) {
        setDistance(String(Math.round(res.distanceKm)));
        setTransitHours(String(res.durationHours));
        setDefaultRate((prev) => (!prev || Number(prev) <= 0 ? String(Math.round(res.distanceKm * 52)) : prev));
        setTollEstimate((prev) => (!prev || Number(prev) <= 0 ? String(Math.round(res.distanceKm * 3.8)) : prev));
        const roadsText = res.summaryRoads && res.summaryRoads.length > 0 ? ` (via ${res.summaryRoads.slice(0, 3).join(", ")})` : "";
        setMapboxSummary(`${res.distanceKm} km · ${res.durationHours} hrs${roadsText}`);
      }
    } catch (e) {
      console.warn("Could not calculate Mapbox route:", e);
    } finally {
      setIsCalculatingRoute(false);
    }
  };

  const handleOriginChange = (orig: string, coords?: [number, number]) => {
    setOriginCity(orig);
    if (coords) setOriginCoords(coords);
    if (!name || name.includes("→")) {
      setName(orig && destinationCity ? `${orig} → ${destinationCity} Corridor` : "");
    }
    if (!code || code.startsWith("RT-")) {
      const o = orig.slice(0, 3).toUpperCase();
      const d = destinationCity.slice(0, 3).toUpperCase();
      setCode(o && d ? `RT-${o}-${d}` : "");
    }
    if (orig && destinationCity) {
      calculateMapboxRoute(orig, destinationCity, coords || originCoords, destCoords);
    }
  };

  const handleDestinationChange = (dest: string, coords?: [number, number]) => {
    setDestinationCity(dest);
    if (coords) setDestCoords(coords);
    if (!name || name.includes("→")) {
      setName(originCity && dest ? `${originCity} → ${dest} Corridor` : "");
    }
    if (!code || code.startsWith("RT-")) {
      const o = originCity.slice(0, 3).toUpperCase();
      const d = dest.slice(0, 3).toUpperCase();
      setCode(o && d ? `RT-${o}-${d}` : "");
    }
    if (originCity && dest) {
      calculateMapboxRoute(originCity, dest, originCoords, coords || destCoords);
    }
  };

  const handleDistanceChange = (distVal: string) => {
    setDistance(distVal);
    const d = Number(distVal);
    if (d > 0) {
      if (!transitHours) setTransitHours(String(Math.round((d / 40) * 10) / 10));
      if (!defaultRate) setDefaultRate(String(Math.round(d * 48)));
      if (!tollEstimate) setTollEstimate(String(Math.round(d * 3)));
    }
  };

  const handleCreateRoute = (e: React.FormEvent) => {
    e.preventDefault();
    const orig = originCity.trim();
    const dest = destinationCity.trim();

    if (!orig || !dest) {
      toast.error("Origin City and Destination City are required");
      return;
    }
    if (orig.toLowerCase() === dest.toLowerCase()) {
      toast.error("Origin and Destination must be different cities");
      return;
    }

    const distNum = Number(distance);
    if (!distNum || distNum <= 0) {
      toast.error("Please enter a valid distance in km");
      return;
    }

    const stopList = stops
      ? stops.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

    const res = createRoute({
      name: name.trim() || `${orig} → ${dest} Corridor`,
      code: code.trim().toUpperCase() || `RT-${orig.slice(0, 3).toUpperCase()}-${dest.slice(0, 3).toUpperCase()}`,
      originCity: orig,
      destinationCity: dest,
      distanceKm: distNum,
      estTransitHours: Number(transitHours) || Math.round((distNum / 40) * 10) / 10,
      defaultRate: Number(defaultRate) || Math.round(distNum * 48),
      tollEstimate: Number(tollEstimate) || Math.round(distNum * 3),
      stops: stopList,
      actor: persona.name,
    });

    if (res.ok) {
      toast.success("Route Created Successfully", {
        description: `Corridor ${orig} → ${dest} (${distNum} km) is now saved and immediately available in booking dropdowns.`,
      });
      setDialogOpen(false);
      setOriginCity("");
      setDestinationCity("");
      setName("");
      setCode("");
      setDistance("");
      setTransitHours("");
      setDefaultRate("");
      setTollEstimate("");
      setStops("");
    } else {
      toast.error("Could not create route", { description: res.reason });
    }
  };

  const handleDelete = (r: TransportRoute) => {
    if (confirm(`Are you sure you want to delete corridor ${r.code}?`)) {
      deleteRoute(r.id, persona.name);
      toast.success(`Deleted corridor ${r.code}`);
    }
  };

  // KPIs
  const totalCount = routes.length;
  const activeCount = routes.filter((r) => r.status === "active").length;
  const avgDistance =
    totalCount > 0
      ? Math.round(routes.reduce((acc, r) => acc + (r.distanceKm || 0), 0) / totalCount)
      : 0;
  const uniqueHubs = new Set([
    ...routes.map((r) => r.originCity),
    ...routes.map((r) => r.destinationCity),
  ]).size;

  return (
    <>
      <PageHeader
        title="Routes & Corridors"
        subtitle="Standard transport corridors with pre-calculated distances, transit schedules, and benchmark pricing."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/app/bookings/new">
                <Plus className="size-4 mr-1.5" />
                <span>Create Booking</span>
              </Link>
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2">
                  <Plus className="size-4" />
                  <span>Create Route</span>
                </Button>
              </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <form onSubmit={handleCreateRoute}>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Navigation className="size-5 text-primary" />
                    <span>Create Freight Corridor</span>
                  </DialogTitle>
                  <DialogDescription>
                    Manually enter corridor parameters. This route will be immediately visible in the booking creation dropdown.
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4 sm:grid-cols-2">
                  <div>
                    <Label className="text-xs">Origin City / Hub</Label>
                    <div className="mt-1">
                      <CityAutocomplete
                        placeholder="Type city (e.g. Gwalior)"
                        value={originCity}
                        onChange={(val, coords) => handleOriginChange(val, coords)}
                        required
                        autoFocus
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs">Destination City / Hub</Label>
                    <div className="mt-1">
                      <CityAutocomplete
                        placeholder="Type city (e.g. Bhopal)"
                        value={destinationCity}
                        onChange={(val, coords) => handleDestinationChange(val, coords)}
                        required
                      />
                    </div>
                  </div>

                  {/* Mapbox Route Calculation Status Ribbon */}
                  <div className="sm:col-span-2">
                    {isCalculatingRoute ? (
                      <div className="flex items-center gap-2 text-xs text-primary bg-primary/10 border border-primary/20 px-3 py-2 rounded-md animate-pulse">
                        <Loader2 className="size-3.5 animate-spin" />
                        <span>Calculating accurate highway distance & transit time via Mapbox Directions API...</span>
                      </div>
                    ) : mapboxSummary ? (
                      <div className="flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-2 rounded-md">
                        <div className="flex items-center gap-2">
                          <Navigation className="size-3.5 text-emerald-500 shrink-0" />
                          <span className="font-semibold">Mapbox Highway Route:</span>
                          <span>{mapboxSummary}</span>
                        </div>
                        <span className="text-[10px] font-mono uppercase tracking-wider bg-emerald-500/20 px-1.5 py-0.5 rounded text-emerald-600 dark:text-emerald-300 shrink-0">
                          Auto-Calculated
                        </span>
                      </div>
                    ) : null}
                  </div>

                  <div className="sm:col-span-2">
                    <Label className="text-xs">Corridor Name</Label>
                    <Input
                      className="mt-1 font-medium"
                      placeholder="e.g. Delhi NCR → Mumbai Super Corridor"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label className="text-xs">Corridor Code</Label>
                    <Input
                      className="mt-1 font-mono uppercase"
                      placeholder="e.g. RT-DEL-MUM"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label className="text-xs">Standard Distance (km)</Label>
                    <Input
                      className="mt-1"
                      type="number"
                      value={distance}
                      onChange={(e) => setDistance(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <Label className="text-xs">Est. Transit Time (Hours)</Label>
                    <Input
                      className="mt-1"
                      type="number"
                      step="0.5"
                      value={transitHours}
                      onChange={(e) => setTransitHours(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label className="text-xs">Default Rate (₹)</Label>
                    <Input
                      className="mt-1 font-mono"
                      type="number"
                      value={defaultRate}
                      onChange={(e) => setDefaultRate(e.target.value)}
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <Label className="text-xs">Est. Toll Charges (₹)</Label>
                    <Input
                      className="mt-1 font-mono"
                      type="number"
                      value={tollEstimate}
                      onChange={(e) => setTollEstimate(e.target.value)}
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <Label className="text-xs">Intermediate Stops / Checkpoints (Comma-separated)</Label>
                    <Input
                      className="mt-1"
                      placeholder="e.g. Solapur, Omerga, Humnabad, Zaheerabad"
                      value={stops}
                      onChange={(e) => setStops(e.target.value)}
                    />
                  </div>
                </div>

                <DialogFooter className="gap-2">
                  <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Save Route</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      }
    />

      {/* KPI Ribbon */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-4">
        <KpiCard title="Active Corridors" value={activeCount} hint="Standard freight lanes" />
        <KpiCard title="Avg Lane Distance" value={`${avgDistance} km`} hint="Across all standard corridors" />
        <KpiCard title="Hub Coverage" value={uniqueHubs} hint="Major origin & delivery cities" />
        <KpiCard
          title="Booking Integration"
          value="Enabled"
          status="good"
          hint="Directly selectable in booking form"
        />
      </div>

      {/* Data Table */}
      <DataTable<TransportRoute>
        rows={routes}
        searchKeys={(r) => `${r.name} ${r.code} ${r.originCity} ${r.destinationCity} ${(r.stops || []).join(" ")}`}
        chips={[
          { id: "all", label: "All Corridors", test: () => true },
          { id: "short", label: "< 500 km", test: (r) => r.distanceKm < 500 },
          { id: "medium", label: "500 - 1000 km", test: (r) => r.distanceKm >= 500 && r.distanceKm <= 1000 },
          { id: "long", label: "> 1000 km", test: (r) => r.distanceKm > 1000 },
        ]}
        emptyTitle="No corridors configured"
        emptyMessage="Create standard freight corridors to standardize dispatch schedules, pricing and automated booking entries."
        emptyAction={{ label: "Create Route", onAction: () => setDialogOpen(true) }}
        onRowClick={(r) => navigate({ to: "/app/bookings/new", search: { routeId: r.id } })}
        columns={[
          {
            key: "code",
            header: "Corridor Code",
            cell: (r) => (
              <div>
                <span className="font-mono font-semibold text-foreground text-xs">{r.code}</span>
                <div className="text-[11px] text-muted-foreground line-clamp-1">{r.name}</div>
              </div>
            ),
            sortValue: (r) => r.code,
          },
          {
            key: "lane",
            header: "Origin → Destination",
            cell: (r) => (
              <div className="flex items-center gap-1.5 whitespace-nowrap text-sm font-medium">
                <span>{r.originCity}</span>
                <ArrowRight className="size-3.5 text-primary shrink-0" />
                <span>{r.destinationCity}</span>
              </div>
            ),
            sortValue: (r) => `${r.originCity} ${r.destinationCity}`,
          },
          {
            key: "distance",
            header: "Distance",
            cell: (r) => <span className="font-mono text-sm">{r.distanceKm.toLocaleString("en-IN")} km</span>,
            sortValue: (r) => r.distanceKm,
            className: "text-right",
          },
          {
            key: "transit",
            header: "Transit Time",
            cell: (r) => <span className="text-xs text-muted-foreground">{r.estTransitHours} hrs</span>,
            sortValue: (r) => r.estTransitHours,
            className: "text-right",
          },
          {
            key: "defaultRate",
            header: "Benchmark Rate",
            cell: (r) => <span className="font-mono font-medium">{inr(r.defaultRate)}</span>,
            sortValue: (r) => r.defaultRate,
            className: "text-right",
          },
          {
            key: "tolls",
            header: "Toll Est.",
            cell: (r) => <span className="font-mono text-xs text-muted-foreground">{inr(r.tollEstimate)}</span>,
            sortValue: (r) => r.tollEstimate,
            className: "text-right",
          },
          {
            key: "status",
            header: "Status",
            cell: (r) => <StatusBadge status={r.status === "active" ? "confirmed" : "draft"} />,
          },
          {
            key: "actions",
            header: "",
            cell: (r) => (
              <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1 border-primary/40 text-primary hover:bg-primary/10"
                  asChild
                >
                  <Link to="/app/bookings/new" search={{ routeId: r.id }}>
                    <span>Create Booking</span>
                    <ExternalLink className="size-3" />
                  </Link>
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7 text-muted-foreground hover:text-destructive"
                  onClick={() => handleDelete(r)}
                  title="Delete Route"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ),
          },
        ]}
      />
    </>
  );
}
