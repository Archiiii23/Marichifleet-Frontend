import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Panel } from "@/components/mf/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fmtDateTime, inr, useAction, useDb } from "@/domain/hooks";
import { useSession } from "@/domain/session";
import { addFuelLog } from "@/domain/store";

export const Route = createFileRoute("/driver/fuel")({
  head: () => ({
    meta: [
      { title: "Log fuel — MarichiFleet Driver" },
      { name: "description", content: "Record a refuel with litres, amount and odometer reading." },
    ],
  }),
  component: DriverFuel,
});

function DriverFuel() {
  const db = useDb();
  const run = useAction();
  const { persona } = useSession();
  const driver = db.drivers.find((d) => d.id === (persona.driverId ?? db.drivers[0]?.id));
  const trip = db.trips.find((t) => t.driverId === driver?.id && t.status === "in_transit");
  const vehicle = db.vehicles.find((v) => v.id === (driver?.assignedVehicleId ?? trip?.vehicleId));
  const [litres, setLitres] = useState("");
  const [cost, setCost] = useState("");
  const [odo, setOdo] = useState(vehicle ? String(vehicle.odometerKm) : "");
  const [station, setStation] = useState("");

  const recent = db.fuelLogs.filter((f) => f.vehicleId === vehicle?.id).slice(0, 5);

  return (
    <div className="space-y-4">
      <h1 className="font-display text-xl font-semibold">Log fuel</h1>
      <Panel title={vehicle ? vehicle.regNo : "No vehicle assigned"}>
        {vehicle ? (
          <div className="space-y-3">
            <div className="space-y-1.5"><Label className="text-xs">Litres</Label><Input value={litres} onChange={(e) => setLitres(e.target.value)} inputMode="decimal" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Amount (₹)</Label><Input value={cost} onChange={(e) => setCost(e.target.value)} inputMode="numeric" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Odometer (km)</Label><Input value={odo} onChange={(e) => setOdo(e.target.value)} inputMode="numeric" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Station</Label><Input value={station} onChange={(e) => setStation(e.target.value)} /></div>
            <Button
              className="w-full"
              onClick={() => {
                const res = run(
                  () =>
                    addFuelLog({
                      vehicleId: vehicle.id,
                      tripId: trip?.id,
                      litres: Number(litres),
                      cost: Number(cost),
                      odometerKm: Number(odo),
                      station,
                      actor: persona.name,
                    }),
                  "Refuel saved",
                );
                if (res.ok) {
                  setLitres("");
                  setCost("");
                  setStation("");
                }
              }}
            >
              Save refuel
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">A vehicle is assigned when you accept a trip.</p>
        )}
      </Panel>

      <Panel title="Recent refuels">
        <ul className="space-y-2 text-sm">
          {recent.map((f) => (
            <li key={f.id} className="flex items-center justify-between gap-3">
              <span className="numeric">{f.litres}L · {inr(f.cost)}</span>
              <span className="text-xs text-muted-foreground">{fmtDateTime(f.atISO)}</span>
            </li>
          ))}
          {recent.length === 0 && <p className="text-muted-foreground">No refuels logged.</p>}
        </ul>
      </Panel>
    </div>
  );
}
