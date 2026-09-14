import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Plus, Truck, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DataTable } from "@/components/mf/data-table";
import { KpiCard, PageHeader, StatusBadge } from "@/components/mf/primitives";
import { timeAgo, useAction, useDb } from "@/domain/hooks";
import { useSession } from "@/domain/session";
import { createVehicle } from "@/domain/store";
import type { Vehicle } from "@/domain/types";
import { apiClient } from "@/services/apiClient";

export const Route = createFileRoute("/app/vehicles/")({
  head: () => ({
    meta: [
      { title: "Vehicles — MarichiFleet" },
      { name: "description", content: "Fleet register with status, utilisation, fuel and service position." },
    ],
  }),
  component: Vehicles,
});

function Vehicles() {
  const db = useDb();
  const navigate = useNavigate();
  const run = useAction();
  const { persona } = useSession();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [regNo, setRegNo] = useState("");
  const [make, setMake] = useState("");
  const [type, setType] = useState<Vehicle["type"]>("Truck");
  const [capacityTons, setCapacityTons] = useState<number>(28);
  const [odometerKm, setOdometerKm] = useState<number>(45000);
  const [fuelPct, setFuelPct] = useState<number>(85);
  const [branchId, setBranchId] = useState(db.branches[0]?.id || "br_01");

  const resetForm = () => {
    setRegNo("");
    setMake("");
    setType("Truck");
    setCapacityTons(28);
    setOdometerKm(45000);
    setFuelPct(85);
  };

  const handleAddVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regNo.trim()) {
      toast.error("Registration number is required");
      return;
    }
    if (!make.trim()) {
      toast.error("Vehicle make & model is required");
      return;
    }

    const cleanReg = regNo.trim().toUpperCase().replace(/\s+/g, "");

    // Also persist directly to backend MongoDB
    apiClient.post("/fleet/vehicles", {
      regNumber: cleanReg,
      model: make.trim(),
      type,
      capacityTons,
      odometerKm,
      fuelLevelPercent: fuelPct,
    }).catch((err) => console.warn("Backend sync vehicle warning:", err));

    const res = run(
      () =>
        createVehicle({
          regNo: cleanReg,
          make,
          type,
          capacityTons,
          odometerKm,
          fuelPct,
          branchId,
          actor: persona.name,
        }),
      `Vehicle ${cleanReg} registered successfully`
    );

    if (res.ok) {
      setIsAddOpen(false);
      resetForm();
      if (res.id) {
        navigate({ to: "/app/vehicles/$vehicleId", params: { vehicleId: res.id } });
      }
    }
  };

  return (
    <>
      <PageHeader
        title="Vehicles"
        subtitle="Registered fleet, live status and service position."
        actions={
          <Button onClick={() => setIsAddOpen(true)} className="gap-1.5" size="sm">
            <Plus className="size-4" />
            Add Vehicle
          </Button>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Fleet size" value={String(db.vehicles.length)} hint="Across all branches" />
        <KpiCard label="On trip" value={String(db.vehicles.filter((v) => v.status === "on_trip").length)} tone="info" />
        <KpiCard label="Available" value={String(db.vehicles.filter((v) => v.status === "available").length)} tone="success" />
        <KpiCard label="In workshop" value={String(db.vehicles.filter((v) => v.status === "maintenance").length)} tone="warning" to="/app/workshop" />
      </div>

      <DataTable<Vehicle>
        rows={db.vehicles}
        searchKeys={(v) => `${v.regNo} ${v.make} ${v.type}`}
        chips={[
          { id: "available", label: "Available", test: (v) => v.status === "available" },
          { id: "trip", label: "On trip", test: (v) => v.status === "on_trip" },
          { id: "workshop", label: "Workshop", test: (v) => v.status === "maintenance" },
          { id: "service", label: "Service due", test: (v) => v.odometerKm >= v.serviceDueKm - 2000 },
        ]}
        onRowClick={(v) => navigate({ to: "/app/vehicles/$vehicleId", params: { vehicleId: v.id } })}
        emptyTitle="No vehicles"
        emptyMessage="Add vehicles to start dispatching loads."
        columns={[
          { key: "reg", header: "Registration", cell: (v) => <span className="numeric font-medium">{v.regNo}</span>, sortValue: (v) => v.regNo },
          { key: "make", header: "Make & type", cell: (v) => `${v.make} · ${v.type}`, hideOnMobile: true },
          { key: "cap", header: "Capacity", cell: (v) => `${v.capacityTons}t`, sortValue: (v) => v.capacityTons },
          { key: "odo", header: "Odometer", cell: (v) => <span className="numeric">{v.odometerKm.toLocaleString("en-IN")} km</span>, sortValue: (v) => v.odometerKm, hideOnMobile: true },
          {
            key: "fuel",
            header: "Fuel",
            cell: (v) => (
              <span className="flex items-center gap-2">
                <span className="h-1.5 w-14 overflow-hidden rounded-full bg-surface">
                  <span className={v.fuelPct < 25 ? "block h-full bg-warning" : "block h-full bg-success"} style={{ width: `${v.fuelPct}%` }} />
                </span>
                <span className="numeric text-xs">{v.fuelPct}%</span>
              </span>
            ),
            sortValue: (v) => v.fuelPct,
          },
          { key: "ping", header: "Last ping", cell: (v) => timeAgo(v.lastPingISO), hideOnMobile: true },
          { key: "status", header: "Status", cell: (v) => <StatusBadge status={v.status} /> },
        ]}
      />

      {/* Add Vehicle Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div
            className="bg-card rounded-xl max-w-lg w-full overflow-hidden border border-border shadow-2xl space-y-4 p-5 animate-in fade-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <Truck className="size-4" />
                </div>
                <div>
                  <h3 className="text-base font-semibold">Add New Vehicle</h3>
                  <p className="text-xs text-muted-foreground">Register vehicle to fleet and allocate to hub</p>
                </div>
              </div>
              <Button size="sm" variant="ghost" className="size-8 p-0" onClick={() => setIsAddOpen(false)}>
                <X className="size-4" />
              </Button>
            </div>

            <form onSubmit={handleAddVehicle} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Registration No. *</Label>
                  <Input
                    placeholder="e.g. DL01AB1234"
                    value={regNo}
                    onChange={(e) => setRegNo(e.target.value.toUpperCase())}
                    required
                    className="font-mono uppercase"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Make & Model *</Label>
                  <Input
                    placeholder="e.g. Tata Prima 5530.S"
                    value={make}
                    onChange={(e) => setMake(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Vehicle Type</Label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as Vehicle["type"])}
                    className="w-full text-xs rounded-md border border-border bg-card px-2.5 py-2 text-foreground"
                  >
                    <option value="Truck">Heavy Truck</option>
                    <option value="Trailer">Multi-Axle Trailer</option>
                    <option value="Container">Closed Container</option>
                    <option value="Tanker">Liquid Tanker</option>
                    <option value="LCV">LCV Express</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Payload Capacity (Tons)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    step="0.5"
                    value={capacityTons}
                    onChange={(e) => setCapacityTons(Number(e.target.value))}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Initial Odometer (Km)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={odometerKm}
                    onChange={(e) => setOdometerKm(Number(e.target.value))}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Current Fuel Level (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={fuelPct}
                    onChange={(e) => setFuelPct(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Home Branch</Label>
                <select
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  className="w-full text-xs rounded-md border border-border bg-card px-2.5 py-2 text-foreground"
                >
                  {db.branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.city})
                    </option>
                  ))}
                </select>
              </div>

              {/* Quick Model Fill Preset Pills */}
              <div className="pt-1">
                <span className="text-[11px] text-muted-foreground block mb-1">Quick Presets:</span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setMake("Tata Prima 5530.S");
                      setType("Trailer");
                      setCapacityTons(55);
                    }}
                    className="text-[10px] rounded border border-border px-2 py-0.5 hover:bg-muted"
                  >
                    Tata Prima 55T
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMake("BharatBenz 2823C");
                      setType("Container");
                      setCapacityTons(28);
                    }}
                    className="text-[10px] rounded border border-border px-2 py-0.5 hover:bg-muted"
                  >
                    BharatBenz 28T
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMake("Eicher Pro 3019");
                      setType("Truck");
                      setCapacityTons(19);
                    }}
                    className="text-[10px] rounded border border-border px-2 py-0.5 hover:bg-muted"
                  >
                    Eicher Pro 19T
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMake("Volvo FH16 Reefer");
                      setType("Container");
                      setCapacityTons(40);
                    }}
                    className="text-[10px] rounded border border-border px-2 py-0.5 hover:bg-muted"
                  >
                    Volvo Reefer 40T
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsAddOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm">
                  Register Vehicle
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
