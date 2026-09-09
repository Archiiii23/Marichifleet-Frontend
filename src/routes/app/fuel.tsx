import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { KpiCard, PageHeader, Panel } from "@/components/mf/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fmtDateTime, inr, inrCompact, useAction, useDb } from "@/domain/hooks";
import { useSession } from "@/domain/session";
import { addFuelLog } from "@/domain/store";

export const Route = createFileRoute("/app/fuel")({
  head: () => ({
    meta: [
      { title: "Fuel — MarichiFleet" },
      { name: "description", content: "Refuel entries, spend and mileage tracking across the fleet." },
    ],
  }),
  component: Fuel,
});

function Fuel() {
  const db = useDb();
  const run = useAction();
  const { persona, can } = useSession();
  const [vehicleId, setVehicleId] = useState(db.vehicles[0]?.id ?? "");
  const [litres, setLitres] = useState("");
  const [cost, setCost] = useState("");
  const [odo, setOdo] = useState("");
  const [station, setStation] = useState("");

  const spend = db.fuelLogs.reduce((s, f) => s + f.cost, 0);
  const litresTotal = db.fuelLogs.reduce((s, f) => s + f.litres, 0);

  return (
    <>
      <PageHeader title="Fuel" subtitle="Refuel entries feed vehicle odometer, trip cost and mileage analysis." />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Fuel spend" value={inrCompact(spend)} hint={`${db.fuelLogs.length} refuels`} />
        <KpiCard label="Litres" value={Math.round(litresTotal).toLocaleString("en-IN")} hint="Total dispensed" />
        <KpiCard label="Avg price" value={`₹${litresTotal ? (spend / litresTotal).toFixed(1) : 0}/L`} hint="Blended rate" />
        <KpiCard label="Low fuel vehicles" value={String(db.vehicles.filter((v) => v.fuelPct < 25).length)} tone="warning" hint="Below 25%" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_360px]">
        <Panel title="Recent refuels">
          <ul className="space-y-2">
            {db.fuelLogs.slice(0, 25).map((f) => (
              <li key={f.id} className="flex flex-wrap items-center gap-3 rounded-md border border-border p-3 text-sm">
                <span className="numeric font-medium">{db.vehicles.find((v) => v.id === f.vehicleId)?.regNo ?? "—"}</span>
                <span className="numeric">{f.litres}L</span>
                <span className="numeric">{inr(f.cost)}</span>
                <span className="text-muted-foreground">{f.station}</span>
                <span className="numeric ml-auto text-xs text-muted-foreground">{f.odometerKm.toLocaleString("en-IN")} km</span>
                <span className="text-xs text-muted-foreground">{fmtDateTime(f.atISO)}</span>
              </li>
            ))}
          </ul>
        </Panel>

        {can("edit_fleet") && (
          <Panel title="Log a refuel" description="Odometer cannot go backwards">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Vehicle</Label>
                <Select value={vehicleId} onValueChange={setVehicleId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {db.vehicles.map((v) => <SelectItem key={v.id} value={v.id}>{v.regNo}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label className="text-xs">Litres</Label><Input value={litres} onChange={(e) => setLitres(e.target.value)} inputMode="decimal" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Amount (₹)</Label><Input value={cost} onChange={(e) => setCost(e.target.value)} inputMode="numeric" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Odometer (km)</Label><Input value={odo} onChange={(e) => setOdo(e.target.value)} inputMode="numeric" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Station</Label><Input value={station} onChange={(e) => setStation(e.target.value)} placeholder="Highway fuel station" /></div>
              <Button
                className="w-full"
                onClick={() => {
                  const res = run(
                    () =>
                      addFuelLog({
                        vehicleId,
                        litres: Number(litres),
                        cost: Number(cost),
                        odometerKm: Number(odo),
                        station,
                        actor: persona.name,
                      }),
                    "Refuel logged",
                  );
                  if (res.ok) {
                    setLitres("");
                    setCost("");
                    setOdo("");
                    setStation("");
                  }
                }}
              >
                Save entry
              </Button>
            </div>
          </Panel>
        )}
      </div>
    </>
  );
}
