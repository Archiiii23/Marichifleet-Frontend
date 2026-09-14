import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Building, Plus, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { DataTable } from "@/components/mf/data-table";
import { PageHeader } from "@/components/mf/primitives";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { inr, useAction, useDb } from "@/domain/hooks";
import { useSession } from "@/domain/session";
import { addClient, invoiceOutstanding } from "@/domain/store";
import type { Client } from "@/domain/types";

export const Route = createFileRoute("/app/clients/")({
  head: () => ({
    meta: [
      { title: "Clients — MarichiFleet" },
      { name: "description", content: "Customer master with rate cards, credit terms and outstanding balances." },
    ],
  }),
  component: Clients,
});

const SEGMENTS = ["Manufacturer", "Distributor", "3PL", "Warehouse", "Retail"] as const;

function Clients() {
  const db = useDb();
  const run = useAction();
  const { persona } = useSession();
  const navigate = useNavigate();

  const [addDialogOpen, setAddDialogOpen] = useState(false);

  // New Client State
  const [name, setName] = useState("");
  const [segment, setSegment] = useState<(typeof SEGMENTS)[number]>("Manufacturer");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [gstin, setGstin] = useState("");
  const [creditDays, setCreditDays] = useState("30");
  const [ratePerKm, setRatePerKm] = useState("48");

  const outstanding = (id: string) =>
    db.invoices.filter((i) => i.clientId === id).reduce((s, i) => s + invoiceOutstanding(i), 0);
  const volume = (id: string) => db.bookings.filter((b) => b.clientId === id).length;

  const handleCreateClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter customer name");
      return;
    }

    const res = run(() =>
      addClient(
        {
          name: name.trim(),
          segment,
          contactName: contactName.trim() || "Logistics Manager",
          phone: phone.trim() || "+91 98000 00000",
          email: email.trim() || `${name.toLowerCase().replace(/[^a-z0-9]/g, "")}@example.com`,
          city: city.trim() || "Mumbai",
          gstin: gstin.trim().toUpperCase() || "27AABCM9481Q1Z8",
          creditDays: parseInt(creditDays) || 30,
          ratePerKm: parseFloat(ratePerKm) || 45,
        },
        persona.name
      )
    );

    if (res.ok) {
      toast.success(`Customer ${name} added successfully`);
      setAddDialogOpen(false);
      setName("");
      setContactName("");
      setPhone("");
      setEmail("");
      setCity("");
      setGstin("");
    }
  };

  return (
    <>
      <PageHeader
        title="Clients & Customers"
        subtitle="Customer master, contract rate cards, credit terms and current financial exposure."
        actions={
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5 font-medium shadow-xs">
                <Plus className="size-4" /> Add Customer
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Building className="size-5 text-primary" />
                  Add New Customer / Client
                </DialogTitle>
                <DialogDescription>
                  Register a corporate client, 3PL partner or manufacturing shipper.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleCreateClient} className="space-y-3 py-2">
                <div>
                  <Label htmlFor="cName" className="text-xs">Company / Client Name</Label>
                  <Input
                    id="cName"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Tata Steel BSL Ltd"
                    className="mt-1"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="cSeg" className="text-xs">Segment</Label>
                    <Select value={segment} onValueChange={(v) => setSegment(v as any)}>
                      <SelectTrigger id="cSeg" className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SEGMENTS.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="cCity" className="text-xs">Headquarters / City</Label>
                    <Input
                      id="cCity"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Pune, MH"
                      className="mt-1"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="cContact" className="text-xs">Contact Person</Label>
                    <Input
                      id="cContact"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="e.g. Ankit Singhania"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cPhone" className="text-xs">Phone Number</Label>
                    <Input
                      id="cPhone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98..."
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="cGstin" className="text-xs">GSTIN (Tax ID)</Label>
                  <Input
                    id="cGstin"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value)}
                    placeholder="e.g. 27AABCT3521Q1Z4"
                    className="mt-1 font-mono uppercase"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="cCredit" className="text-xs">Credit Days</Label>
                    <Input
                      id="cCredit"
                      type="number"
                      value={creditDays}
                      onChange={(e) => setCreditDays(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cRate" className="text-xs">Contract Rate (₹/km)</Label>
                    <Input
                      id="cRate"
                      type="number"
                      value={ratePerKm}
                      onChange={(e) => setRatePerKm(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>

                <DialogFooter className="pt-2">
                  <Button type="button" variant="ghost" onClick={() => setAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Onboard Customer</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <DataTable<Client>
        rows={db.clients}
        searchKeys={(c) => `${c.name} ${c.city} ${c.segment} ${c.contactName}`}
        chips={[
          { id: "due", label: "With balance", test: (c) => outstanding(c.id) > 0 },
          { id: "3pl", label: "3PL", test: (c) => c.segment === "3PL" },
          { id: "mfg", label: "Manufacturers", test: (c) => c.segment === "Manufacturer" },
        ]}
        onRowClick={(c) => navigate({ to: "/app/clients/$clientId", params: { clientId: c.id } })}
        emptyTitle="No clients"
        emptyMessage="Add a client to start raising bookings."
        columns={[
          { key: "name", header: "Client", cell: (c) => <span className="font-medium text-foreground">{c.name}</span>, sortValue: (c) => c.name },
          { key: "segment", header: "Segment", cell: (c) => c.segment, hideOnMobile: true },
          { key: "city", header: "City", cell: (c) => c.city, hideOnMobile: true },
          { key: "rate", header: "Rate/km", cell: (c) => <span className="numeric font-medium">₹{c.ratePerKm}</span>, sortValue: (c) => c.ratePerKm },
          { key: "credit", header: "Credit days", cell: (c) => <span className="numeric">{c.creditDays}d</span>, sortValue: (c) => c.creditDays, hideOnMobile: true },
          { key: "vol", header: "Bookings", cell: (c) => <span className="numeric">{volume(c.id)}</span>, sortValue: (c) => volume(c.id) },
          { key: "out", header: "Outstanding", cell: (c) => <span className="numeric font-semibold">{inr(outstanding(c.id))}</span>, sortValue: (c) => outstanding(c.id), className: "text-right" },
        ]}
      />
    </>
  );
}
