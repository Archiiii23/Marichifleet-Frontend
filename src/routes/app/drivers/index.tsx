import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Plus, Trash2, UserPlus, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DataTable } from "@/components/mf/data-table";
import { PageHeader, StatusBadge } from "@/components/mf/primitives";
import { fmtDate, useAction, useDb } from "@/domain/hooks";
import { useSession } from "@/domain/session";
import { createDriver, deleteDriver } from "@/domain/store";
import type { Driver } from "@/domain/types";
import { apiClient } from "@/services/apiClient";

export const Route = createFileRoute("/app/drivers/")({
  head: () => ({
    meta: [
      { title: "Drivers — MarichiFleet" },
      { name: "description", content: "Driver roster with availability, licence validity and performance." },
    ],
  }),
  component: Drivers,
});

function Drivers() {
  const db = useDb();
  const navigate = useNavigate();
  const run = useAction();
  const { persona } = useSession();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("+91 ");
  const [licenceNo, setLicenceNo] = useState("");
  const [licenceExpiryISO, setLicenceExpiryISO] = useState("2030-12-31");
  const [assignedVehicleId, setAssignedVehicleId] = useState<string>("");
  const [branchId, setBranchId] = useState(db.branches[0]?.id || "br_01");

  const resetForm = () => {
    setName("");
    setPhone("+91 ");
    setLicenceNo("");
    setLicenceExpiryISO("2030-12-31");
    setAssignedVehicleId("");
  };

  const handleAddDriver = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Driver full name is required");
      return;
    }
    if (!phone.trim() || phone.trim() === "+91") {
      toast.error("Valid contact phone number is required");
      return;
    }
    if (!licenceNo.trim()) {
      toast.error("Driving licence number is required");
      return;
    }

    // Also persist directly to backend MongoDB
    apiClient.post("/fleet/drivers", {
      name: name.trim(),
      phone: phone.trim(),
      licenseNumber: licenceNo.trim().toUpperCase(),
      licenseValidUntil: licenceExpiryISO,
    }).catch((err) => console.warn("Backend sync driver warning:", err));

    const res = run(
      () =>
        createDriver({
          name,
          phone,
          licenceNo,
          licenceExpiryISO,
          assignedVehicleId: assignedVehicleId || undefined,
          branchId,
          actor: persona.name,
        }),
      `Driver ${name} onboarded successfully`
    );

    if (res.ok) {
      setIsAddOpen(false);
      resetForm();
      if (res.id) {
        navigate({ to: "/app/drivers/$driverId", params: { driverId: res.id } });
      }
    }
  };

  return (
    <>
      <PageHeader
        title="Drivers"
        subtitle="Roster, availability and licence compliance."
        actions={
          <Button onClick={() => setIsAddOpen(true)} className="gap-1.5" size="sm">
            <Plus className="size-4" />
            Add Driver
          </Button>
        }
      />

      <DataTable<Driver>
        rows={db.drivers}
        searchKeys={(d) => `${d.name} ${d.phone} ${d.licenceNo}`}
        chips={[
          { id: "available", label: "Available", test: (d) => d.status === "available" },
          { id: "trip", label: "On trip", test: (d) => d.status === "on_trip" },
          { id: "rest", label: "Rest / leave", test: (d) => d.status === "rest" || d.status === "leave" },
          { id: "licence", label: "Licence expiring", test: (d) => new Date(d.licenceExpiryISO).getTime() < Date.now() + 60 * 86400_000 },
        ]}
        onRowClick={(d) => navigate({ to: "/app/drivers/$driverId", params: { driverId: d.id } })}
        emptyTitle="No drivers"
        emptyMessage="Add drivers before dispatching loads."
        columns={[
          { key: "name", header: "Driver", cell: (d) => <span className="font-medium">{d.name}</span>, sortValue: (d) => d.name },
          { key: "phone", header: "Phone", cell: (d) => <span className="numeric">{d.phone}</span>, hideOnMobile: true },
          { key: "licence", header: "Licence expiry", cell: (d) => fmtDate(d.licenceExpiryISO), sortValue: (d) => d.licenceExpiryISO, hideOnMobile: true },
          { key: "rating", header: "Rating", cell: (d) => <span className="numeric">★ {d.rating.toFixed(1)}</span>, sortValue: (d) => d.rating },
          { key: "trips", header: "Trips", cell: (d) => <span className="numeric">{d.tripsCompleted}</span>, sortValue: (d) => d.tripsCompleted },
          { key: "status", header: "Status", cell: (d) => <StatusBadge status={d.status} /> },
          {
            key: "actions",
            header: "",
            className: "w-10 text-right",
            cell: (d) => (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`Are you sure you want to delete driver ${d.name}?`)) {
                    deleteDriver(d.id, persona.name);
                    toast.success(`Driver ${d.name} deleted`);
                  }
                }}
                title={`Delete driver ${d.name}`}
              >
                <Trash2 className="size-4" />
              </Button>
            ),
          },
        ]}
      />

      {/* Add Driver Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div
            className="bg-card rounded-xl max-w-lg w-full overflow-hidden border border-border shadow-2xl space-y-4 p-5 animate-in fade-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <UserPlus className="size-4" />
                </div>
                <div>
                  <h3 className="text-base font-semibold">Onboard New Driver</h3>
                  <p className="text-xs text-muted-foreground">Add commercial driver with WhatsApp phone & driving licence</p>
                </div>
              </div>
              <Button size="sm" variant="ghost" className="size-8 p-0" onClick={() => setIsAddOpen(false)}>
                <X className="size-4" />
              </Button>
            </div>

            <form onSubmit={handleAddDriver} className="space-y-3.5">
              <div className="space-y-1.5">
                <Label className="text-xs">Full Name *</Label>
                <Input
                  placeholder="e.g. Satnam Singh"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">WhatsApp Mobile Phone *</Label>
                  <Input
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Driving Licence No. *</Label>
                  <Input
                    placeholder="e.g. DL-0420180029381"
                    value={licenceNo}
                    onChange={(e) => setLicenceNo(e.target.value.toUpperCase())}
                    required
                    className="font-mono uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Licence Expiry Date *</Label>
                  <Input
                    type="date"
                    value={licenceExpiryISO}
                    onChange={(e) => setLicenceExpiryISO(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Assigned Vehicle (Optional)</Label>
                  <select
                    value={assignedVehicleId}
                    onChange={(e) => setAssignedVehicleId(e.target.value)}
                    className="w-full text-xs rounded-md border border-border bg-card px-2.5 py-2 text-foreground"
                  >
                    <option value="">None (Floating Driver)</option>
                    {db.vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.regNo} ({v.make})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Home Branch Hub</Label>
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

              <div className="p-3 bg-muted/20 rounded-md border border-border/60 text-xs space-y-1 text-muted-foreground">
                <p className="font-medium text-foreground">📱 WhatsApp Bot Automated Invitation:</p>
                <p>
                  Upon registration, an automated WhatsApp onboarding welcome message will be sent to the driver&apos;s phone with trip offer alerts and live location instructions.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsAddOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm">
                  Onboard Driver
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
