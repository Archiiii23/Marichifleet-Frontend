import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Building2, Edit2, ExternalLink, Handshake, Phone, Plus, Star, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { EmptyState, KpiCard, PageHeader, Panel } from "@/components/mf/primitives";
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
import { addVendor, deleteVendor, getExtras, updateVendor, type Vendor } from "@/domain/extras";
import { inr, inrCompact, useAction, useDb } from "@/domain/hooks";
import { useSession } from "@/domain/session";

export const Route = createFileRoute("/app/vendors")({
  head: () => ({
    meta: [
      { title: "Vendors & partners — MarichiFleet" },
      { name: "description", content: "Garages, fuel stations, tyre and parts suppliers with spend, ratings and payables." },
      { property: "og:title", content: "Vendors & partners — MarichiFleet" },
      { property: "og:description", content: "Vendor spend, ratings and outstanding payables in one register." },
    ],
  }),
  component: Vendors,
});

const VENDOR_KINDS = [
  "Garage",
  "Fuel station",
  "Tyres",
  "Parts",
  "Transporter",
  "Insurance",
] as const;

function Vendors() {
  useDb();
  const run = useAction();
  const { persona } = useSession();
  const navigate = useNavigate();
  const extras = getExtras();

  const [query, setQuery] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);

  // New Vendor Form State
  const [name, setName] = useState("");
  const [kind, setKind] = useState<(typeof VENDOR_KINDS)[number]>("Garage");
  const [contact, setContact] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [payable, setPayable] = useState("0");
  const [rating, setRating] = useState("4.5");

  // Edit Vendor State
  const [editMode, setEditMode] = useState(false);
  const [editContact, setEditContact] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editPayable, setEditPayable] = useState("");

  const list = extras.vendors.filter((v) =>
    `${v.name} ${v.kind} ${v.city}`.toLowerCase().includes(query.toLowerCase()),
  );
  const spend = extras.vendors.reduce((s, v) => s + v.spendYtd, 0);
  const payableTotal = extras.vendors.reduce((s, v) => s + v.payable, 0);

  const handleCreateVendor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter vendor company name");
      return;
    }

    const res = run(() =>
      addVendor(
        {
          name: name.trim(),
          kind,
          contact: contact.trim() || "Operations In-charge",
          phone: phone.trim() || "+91 98000 00000",
          city: city.trim() || "Mumbai",
          payable: parseFloat(payable) || 0,
          rating: parseFloat(rating) || 4.5,
        },
        persona.name
      )
    );

    if (res.ok) {
      toast.success(`Vendor ${name} created successfully`);
      setAddDialogOpen(false);
      setName("");
      setContact("");
      setPhone("");
      setCity("");
      setPayable("0");
    }
  };

  const openVendorDetail = (v: Vendor) => {
    setSelectedVendor(v);
    setEditContact(v.contact);
    setEditPhone(v.phone);
    setEditPayable(String(v.payable));
    setEditMode(false);
  };

  const handleUpdateVendor = () => {
    if (!selectedVendor) return;
    run(() =>
      updateVendor(
        selectedVendor.id,
        {
          contact: editContact.trim(),
          phone: editPhone.trim(),
          payable: parseFloat(editPayable) || 0,
        },
        persona.name
      )
    );
    toast.success(`Vendor ${selectedVendor.name} updated`);
    setSelectedVendor((prev) =>
      prev
        ? {
            ...prev,
            contact: editContact.trim(),
            phone: editPhone.trim(),
            payable: parseFloat(editPayable) || 0,
          }
        : null
    );
    setEditMode(false);
  };

  const handleDeleteVendor = (id: string, vendorName: string) => {
    if (confirm(`Are you sure you want to delete vendor "${vendorName}"?`)) {
      run(() => deleteVendor(id, persona.name));
      toast.success(`Vendor ${vendorName} deleted`);
      setSelectedVendor(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Vendors & partners"
        subtitle="Garages, fuel points, tyre and parts suppliers, partner transporters and insurers."
        actions={
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5 font-medium shadow-xs">
                <Plus className="size-4" /> Add Vendor
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Handshake className="size-5 text-primary" />
                  Add New Partner / Vendor
                </DialogTitle>
                <DialogDescription>
                  Register a workshop, fuel vendor, spare parts supplier, or partner transporter.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleCreateVendor} className="space-y-3 py-2">
                <div>
                  <Label htmlFor="vName" className="text-xs">Company / Vendor Name</Label>
                  <Input
                    id="vName"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Apex Fleet Workshops Ltd"
                    className="mt-1"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="vKind" className="text-xs">Category</Label>
                    <Select value={kind} onValueChange={(v) => setKind(v as any)}>
                      <SelectTrigger id="vKind" className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {VENDOR_KINDS.map((k) => (
                          <SelectItem key={k} value={k}>{k}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="vCity" className="text-xs">City / Hub</Label>
                    <Input
                      id="vCity"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Bhiwandi, MH"
                      className="mt-1"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="vContact" className="text-xs">Contact Person</Label>
                    <Input
                      id="vContact"
                      value={contact}
                      onChange={(e) => setContact(e.target.value)}
                      placeholder="e.g. Vikram Joshi"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="vPhone" className="text-xs">Phone Number</Label>
                    <Input
                      id="vPhone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98..."
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="vPayable" className="text-xs">Initial Payable (₹)</Label>
                    <Input
                      id="vPayable"
                      type="number"
                      value={payable}
                      onChange={(e) => setPayable(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="vRating" className="text-xs">Initial Rating (1-5)</Label>
                    <Input
                      id="vRating"
                      type="number"
                      step="0.1"
                      min="1"
                      max="5"
                      value={rating}
                      onChange={(e) => setRating(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>

                <DialogFooter className="pt-2">
                  <Button type="button" variant="ghost" onClick={() => setAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Create Vendor</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Vendors" value={String(extras.vendors.length)} hint="Active relationships" />
        <KpiCard label="Spend YTD" value={inrCompact(spend)} hint="All categories" />
        <KpiCard
          label="Payables"
          value={inrCompact(payableTotal)}
          tone={payableTotal > 0 ? "warning" : "neutral"}
          hint="Awaiting settlement"
        />
        <KpiCard
          label="Avg rating"
          value={(extras.vendors.reduce((s, v) => s + v.rating, 0) / (extras.vendors.length || 1)).toFixed(1)}
          hint="Out of 5"
        />
      </div>

      <Panel
        className="mt-4"
        title="Vendor register"
        actions={
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search vendor, category or city…"
            className="h-8 w-56"
            aria-label="Search vendors"
          />
        }
      >
        {list.length === 0 ? (
          <EmptyState title="No vendors match" message="Try another name, category or city, or add a new vendor." />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {list.map((v) => (
              <article
                key={v.id}
                onClick={() => openVendorDetail(v)}
                className="rounded-lg border border-border bg-card p-4 hover:border-primary/50 hover:shadow-xs transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-display text-sm font-semibold group-hover:text-primary transition-colors">
                      {v.name}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {v.kind} · {v.city}
                    </p>
                  </div>
                  <span className="flex items-center gap-1 text-xs text-warning font-semibold">
                    <Star className="size-3.5 fill-warning text-warning" aria-hidden /> {v.rating.toFixed(1)}
                  </span>
                </div>

                <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <dt className="text-muted-foreground">Contact</dt>
                    <dd className="truncate font-medium">{v.contact}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Phone</dt>
                    <dd className="numeric text-muted-foreground">{v.phone}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Spend YTD</dt>
                    <dd className="numeric font-medium">{inr(v.spendYtd)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Payable</dt>
                    <dd className={v.payable > 0 ? "numeric text-warning font-semibold" : "numeric"}>
                      {inr(v.payable)}
                    </dd>
                  </div>
                </dl>

                <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-border/60">
                  <span className="text-[11px] text-primary font-medium group-hover:underline flex items-center gap-1">
                    Open Vendor Details →
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs px-2 text-muted-foreground"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate({ to: "/app/vendors/$vendorId", params: { vendorId: v.id } });
                    }}
                  >
                    <ExternalLink className="size-3 mr-1" />
                    Full View
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </Panel>

      {/* Interactive Vendor Detail Modal */}
      {selectedVendor && (
        <Dialog open={!!selectedVendor} onOpenChange={(open) => !open && setSelectedVendor(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <div className="flex items-center justify-between pr-4">
                <DialogTitle className="flex items-center gap-2">
                  <Building2 className="size-5 text-primary" />
                  {selectedVendor.name}
                </DialogTitle>
                <span className="flex items-center gap-1 text-xs font-semibold text-warning">
                  <Star className="size-3.5 fill-warning text-warning" /> {selectedVendor.rating.toFixed(1)}
                </span>
              </div>
              <DialogDescription>
                {selectedVendor.kind} · Located in {selectedVendor.city}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-sm">
              {!editMode ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 rounded-md border border-border bg-muted/30 p-3 text-xs">
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Spend YTD</span>
                      <span className="text-base font-bold numeric text-foreground">{inr(selectedVendor.spendYtd)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Current Payable</span>
                      <span className="text-base font-bold numeric text-warning">{inr(selectedVendor.payable)}</span>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs border rounded-md border-border p-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Contact Person:</span>
                      <span className="font-semibold">{selectedVendor.contact}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Phone Number:</span>
                      <span className="font-mono">{selectedVendor.phone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">City Hub:</span>
                      <span>{selectedVendor.city}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Category:</span>
                      <span className="font-medium">{selectedVendor.kind}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">Contact Person</Label>
                    <Input
                      value={editContact}
                      onChange={(e) => setEditContact(e.target.value)}
                      className="mt-1 h-8 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Phone Number</Label>
                    <Input
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="mt-1 h-8 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Payable Balance (₹)</Label>
                    <Input
                      type="number"
                      value={editPayable}
                      onChange={(e) => setEditPayable(e.target.value)}
                      className="mt-1 h-8 text-xs"
                    />
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 sm:justify-between">
              <Button
                variant="destructive"
                size="sm"
                className="gap-1 text-xs"
                onClick={() => handleDeleteVendor(selectedVendor.id, selectedVendor.name)}
              >
                <Trash2 className="size-3.5" /> Delete
              </Button>

              <div className="flex items-center gap-2">
                {!editMode ? (
                  <>
                    <Button variant="outline" size="sm" onClick={() => setEditMode(true)}>
                      <Edit2 className="size-3.5 mr-1" /> Edit
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        const id = selectedVendor.id;
                        setSelectedVendor(null);
                        navigate({ to: "/app/vendors/$vendorId", params: { vendorId: id } });
                      }}
                    >
                      Open Full Page →
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="ghost" size="sm" onClick={() => setEditMode(false)}>
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleUpdateVendor}>
                      Save Changes
                    </Button>
                  </>
                )}
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
