import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CheckCircle2,
  Clock,
  ShieldAlert,
  Fuel,
  Coins,
  Truck,
  Wrench,
  Percent,
  MessageSquare,
  Sparkles,
  MapPin,
  ExternalLink,
  ChevronRight,
  Filter,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState, KpiCard, PageHeader, Panel } from "@/components/mf/primitives";
import { Amount } from "@/components/mf/amount";
import { deriveApprovals } from "@/domain/os/ops";
import { AUTOMATION_LEVEL, canApprove, type OsRole } from "@/domain/os/roles";
import { useDb } from "@/domain/hooks";
import { useSession } from "@/domain/session";
import { normalizeRole } from "@/domain/rbac";
import { ConsignmentLifecycleStudio } from "@/components/mf/consignment-lifecycle-studio";
import { WhatsAppDriverSimulator } from "@/components/mf/whatsapp-driver-simulator";

export const Route = createFileRoute("/app/approvals")({
  head: () => ({
    meta: [
      { title: "Universal Approvals — MarichiFleet" },
      { name: "description", content: "Multi-department approval inbox covering Finance, Logistics Managers, Driver WhatsApp OCR bills, and Consignment Lifecycles." },
      { property: "og:title", content: "Universal Approvals — MarichiFleet" },
      { property: "og:description", content: "One tap commits a prepared decision. Automatic driver confirmation via WhatsApp." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Approvals,
});

interface ApprovalItem {
  id: string;
  department: "FINANCE" | "OPERATIONS";
  category: "FUEL_REFILL" | "CASH_ADVANCE" | "DETENTION_WAIVER" | "MAINTENANCE" | "RATE_OVERRIDE";
  title: string;
  requestedBy: string;
  driverPhone?: string;
  vehicleRegNumber?: string;
  tripId?: string;
  amount: number;
  reason: string;
  createdAt: string;
  fuelDetails?: {
    pumpName: string;
    volumeLitres: number;
    ratePerLitre: number;
    totalAmount: number;
    slipNumber: string;
    odometerKm?: number;
    calculatedMileage?: string;
    receiptUrl?: string;
    geoCheckPassed?: boolean;
  };
}

const INITIAL_APPROVAL_ITEMS: ApprovalItem[] = [
  {
    id: "appr_fuel_01",
    department: "FINANCE",
    category: "FUEL_REFILL",
    title: "Diesel Refill Bill Verification (WhatsApp AI OCR)",
    requestedBy: "Ramesh Kumar (Driver)",
    driverPhone: "+91 98110 23456",
    vehicleRegNumber: "NL01AC2849",
    tripId: "TRP-2026-00891",
    amount: 5593.75,
    fuelDetails: {
      pumpName: "HPCL Highway Oasis, NH-48 Kotputli",
      volumeLitres: 62.5,
      ratePerLitre: 89.5,
      totalAmount: 5593.75,
      slipNumber: "HP-771029",
      odometerKm: 142640,
      calculatedMileage: "3.85 km/L (Normal Range: 3.6 - 4.2)",
      receiptUrl: "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=800&auto=format&fit=crop&q=80",
      geoCheckPassed: true,
    },
    reason: "Driver uploaded fuel receipt via WhatsApp bot. OCR extracted volume, rate and pump location. Mileage verified against GPS dwell.",
    createdAt: "25 mins ago",
  },
  {
    id: "appr_adv_01",
    department: "FINANCE",
    category: "CASH_ADVANCE",
    title: "Emergency En-Route Cash Advance (Toll & Weighbridge)",
    requestedBy: "Ramesh Kumar (Driver)",
    driverPhone: "+91 98110 23456",
    vehicleRegNumber: "NL01AC2849",
    tripId: "TRP-2026-00891",
    amount: 4000,
    reason: "Driver requested en-route advance for NH-48 toll plaza cash lane & weighbridge charges. Remaining trip fuel/cash budget: INR 8,500.",
    createdAt: "45 mins ago",
  },
  {
    id: "appr_det_01",
    department: "OPERATIONS",
    category: "DETENTION_WAIVER",
    title: "Detention Demurrage Partial Waiver Request (Goodwill)",
    requestedBy: "Amit Verma (Logistics Dispatcher)",
    vehicleRegNumber: "MH04JK8921",
    tripId: "TRP-2026-00892",
    amount: 6500,
    reason: "Bhiwandi Hub dock power failure caused 12-hour unload delay. Reliance Logistics requested 50% goodwill demurrage waiver.",
    createdAt: "2 hours ago",
  },
  {
    id: "appr_maint_01",
    department: "OPERATIONS",
    category: "MAINTENANCE",
    title: "Workshop Job Card — Clutch Booster Replacement",
    requestedBy: "Sunil Yadav (Control Tower Lead)",
    vehicleRegNumber: "DL1AA9923",
    amount: 7800,
    reason: "Clutch booster line leakage identified during pre-dispatch checklist. Authorized Eicher workshop estimate.",
    createdAt: "4 hours ago",
  },
  {
    id: "appr_rate_01",
    department: "FINANCE",
    category: "RATE_OVERRIDE",
    title: "Special Sunday Guaranteed Dispatch Rate Card Override",
    requestedBy: "Amit Verma (Dispatcher)",
    amount: 125000,
    reason: "Contract base rate is INR 115,000; Amul agreed to INR 125,000 for guaranteed 24h temperature-controlled express transit.",
    createdAt: "5 hours ago",
  },
];

function Approvals() {
  const db = useDb();
  const { persona } = useSession();
  const role = normalizeRole(persona.role) as OsRole;
  const [activeTab, setActiveTab] = useState<"ALL" | "FINANCE" | "OPERATIONS" | "LIFECYCLE" | "WHATSAPP">("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [items, setItems] = useState<ApprovalItem[]>(INITIAL_APPROVAL_ITEMS);
  const [decided, setDecided] = useState<Record<string, "granted" | "denied">>({});
  const [activeReceiptPreview, setActiveReceiptPreview] = useState<string | null>(null);

  const pendingItems = items.filter((item) => !decided[item.id]);

  const filteredItems = pendingItems.filter((item) => {
    if (activeTab === "FINANCE" && item.department !== "FINANCE") return false;
    if (activeTab === "OPERATIONS" && item.department !== "OPERATIONS") return false;
    if (selectedCategory !== "ALL" && item.category !== selectedCategory) return false;
    return true;
  });

  const totalExposure = pendingItems.reduce((acc, i) => acc + i.amount, 0);
  const financeCount = pendingItems.filter((i) => i.department === "FINANCE").length;
  const opsCount = pendingItems.filter((i) => i.department === "OPERATIONS").length;

  const handleDecision = (item: ApprovalItem, decision: "granted" | "denied") => {
    setDecided((prev) => ({ ...prev, [item.id]: decision }));

    if (decision === "granted") {
      toast.success(`Approved by ${item.department} Department`, {
        description: item.driverPhone
          ? `Dispatched WhatsApp confirmation to driver ${item.requestedBy}: "Approved! INR ${item.amount.toLocaleString("en-IN")} authorized. You are good to go!"`
          : `Decision recorded on audit ledger for ref ${item.id}.`,
      });
    } else {
      toast.error(`Rejected by ${item.department}`, {
        description: `Dispatched rejection update for ${item.title}.`,
      });
    }
  };

  const handleNewFuelBillFromSimulator = (newBill: any) => {
    const newItem: ApprovalItem = {
      id: `appr_fuel_${Date.now()}`,
      department: "FINANCE",
      category: "FUEL_REFILL",
      title: `Diesel Refill Bill: ${newBill.slipNumber} (${newBill.vehicleRegNumber})`,
      requestedBy: `${newBill.driverName} (Driver)`,
      driverPhone: "+91 98110 23456",
      vehicleRegNumber: newBill.vehicleRegNumber,
      tripId: "TRP-2026-00891",
      amount: newBill.totalAmount,
      fuelDetails: {
        pumpName: newBill.pumpName,
        volumeLitres: newBill.volumeLitres,
        ratePerLitre: newBill.ratePerLitre,
        totalAmount: newBill.totalAmount,
        slipNumber: newBill.slipNumber,
        odometerKm: 142640,
        calculatedMileage: "3.85 km/L (Normal)",
        receiptUrl: "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=800&auto=format&fit=crop&q=80",
        geoCheckPassed: true,
      },
      reason: `Driver refilled at ${newBill.pumpName} and uploaded receipt photo via WhatsApp bot. OCR extracted all parameters.`,
      createdAt: "Just now",
    };

    setItems((prev) => [newItem, ...prev]);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Universal Approvals & Driver Workflow Hub"
        subtitle="Finance Department & Operations Manager approvals. Every fuel refill, cash advance, detention waiver, and consignment is verified before ledger commitment."
        actions={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={activeTab === "WHATSAPP" ? "default" : "outline"}
              onClick={() => setActiveTab("WHATSAPP")}
              className="gap-1.5"
            >
              <MessageSquare className="size-3.5" />
              WhatsApp Driver Simulator
            </Button>
            <Button
              size="sm"
              variant={activeTab === "LIFECYCLE" ? "default" : "outline"}
              onClick={() => setActiveTab("LIFECYCLE")}
              className="gap-1.5"
            >
              <Truck className="size-3.5" />
              End-to-End Consignment Flow
            </Button>
          </div>
        }
      />

      {/* KPI Stats Bar */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Total Pending"
          value={String(pendingItems.length)}
          hint={`${financeCount} Finance · ${opsCount} Operations`}
          icon={Clock}
        />
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Exposure</span>
            <span className="size-2 rounded-full bg-warning animate-pulse" aria-hidden />
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight">
            <Amount value={{ minor: Math.round(totalExposure * 100), currency: "INR" }} />
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">Pending disbursement / waivers</p>
        </div>
        <KpiCard
          label="Finance Department"
          value={String(financeCount)}
          hint="Fuel OCR slips, Cash advances, Rate overrides"
          icon={Coins}
        />
        <KpiCard
          label="Operations / Fleet Lead"
          value={String(opsCount)}
          hint="Detention waivers, Maintenance jobcards"
          icon={ShieldAlert}
        />
      </div>

      {/* Main Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant={activeTab === "ALL" ? "default" : "outline"}
            onClick={() => setActiveTab("ALL")}
            className="text-xs"
          >
            All Pending ({pendingItems.length})
          </Button>
          <Button
            size="sm"
            variant={activeTab === "FINANCE" ? "default" : "outline"}
            onClick={() => setActiveTab("FINANCE")}
            className="text-xs gap-1"
          >
            <Coins className="size-3.5" />
            Finance Department ({financeCount})
          </Button>
          <Button
            size="sm"
            variant={activeTab === "OPERATIONS" ? "default" : "outline"}
            onClick={() => setActiveTab("OPERATIONS")}
            className="text-xs gap-1"
          >
            <Truck className="size-3.5" />
            Operations Manager ({opsCount})
          </Button>
          <Button
            size="sm"
            variant={activeTab === "LIFECYCLE" ? "default" : "outline"}
            onClick={() => setActiveTab("LIFECYCLE")}
            className="text-xs gap-1"
          >
            <Sparkles className="size-3.5 text-primary" />
            End-to-End Consignment Journey
          </Button>
          <Button
            size="sm"
            variant={activeTab === "WHATSAPP" ? "default" : "outline"}
            onClick={() => setActiveTab("WHATSAPP")}
            className="text-xs gap-1"
          >
            <MessageSquare className="size-3.5 text-emerald-500" />
            Driver WhatsApp Simulator
          </Button>
        </div>

        {activeTab !== "LIFECYCLE" && activeTab !== "WHATSAPP" && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Filter className="size-3" /> Category:
            </span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-xs rounded-md border border-border bg-card px-2.5 py-1 text-foreground"
            >
              <option value="ALL">All Categories</option>
              <option value="FUEL_REFILL">Diesel Refill (WhatsApp OCR)</option>
              <option value="CASH_ADVANCE">Cash Advance</option>
              <option value="DETENTION_WAIVER">Detention Waiver</option>
              <option value="MAINTENANCE">Maintenance Job Card</option>
              <option value="RATE_OVERRIDE">Rate Override</option>
            </select>
          </div>
        )}
      </div>

      {/* VIEWPORT 1: CONSIGNMENT END-TO-END LIFECYCLE */}
      {activeTab === "LIFECYCLE" && (
        <ConsignmentLifecycleStudio onTriggerFuelModal={() => setActiveTab("ALL")} />
      )}

      {/* VIEWPORT 2: DRIVER WHATSAPP & LOCATION SIMULATOR */}
      {activeTab === "WHATSAPP" && (
        <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          <WhatsAppDriverSimulator
            onFuelBillSubmitted={handleNewFuelBillFromSimulator}
            onLocationStatusChanged={(isLive, isDropped) => {
              if (isDropped) {
                toast.warning("Vehicle NL01AC2849 Live Location Lost", {
                  description: "Control Tower alert raised. Prompt sent to driver.",
                });
              } else {
                toast.success("Vehicle NL01AC2849 Live Location Synchronized", {
                  description: "Control Tower tracking active.",
                });
              }
            }}
          />

          <div className="space-y-4">
            <div className="rounded-xl border border-border p-4 bg-card space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <MapPin className="size-4 text-primary" />
                  Live GPS Tracking Stream
                </h4>
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30 text-xs">
                  Connected
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Driver shares WhatsApp Live Location. The system reads coordinates directly from Meta Cloud API and maps them to Vehicle NL01AC2849.
              </p>

              <div className="p-3 bg-muted/20 rounded-md space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Assigned Truck:</span>
                  <span className="font-mono font-semibold">NL01AC2849 (Tata Prima 55T)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Driver:</span>
                  <span>Ramesh Kumar (+91 98110 23456)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Active Trip:</span>
                  <span className="font-mono text-primary">TRP-2026-00891 (Delhi → Mumbai)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current Coordinates:</span>
                  <span className="font-mono">26.9124° N, 75.7873° E</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current Highway:</span>
                  <span>NH-48 Jaipur Bypass (Speed: 62 km/h)</span>
                </div>
              </div>

              <div className="p-3 rounded-md border border-amber-500/30 bg-amber-500/5 text-xs space-y-1">
                <p className="font-semibold text-amber-600 dark:text-amber-400">⚡ Dropout Recovery Automation (D-Location)</p>
                <p className="text-muted-foreground">
                  If WhatsApp live location drops or driver phone dies for &gt; 15 minutes, the system immediately fires an urgent WhatsApp prompt asking the driver to re-share the location with 1 tap.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-border p-4 bg-card space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Fuel className="size-4 text-warning" />
                Driver WhatsApp Fuel OCR Pipeline
              </h4>
              <p className="text-xs text-muted-foreground">
                Driver sends fuel receipt photo to bot. Vision OCR extracts liters, price, pump name, and total. A pending approval card is generated in the Finance tab.
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setActiveTab("FINANCE")}
                className="w-full text-xs gap-1"
              >
                Go to Finance Approvals Queue <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* VIEWPORT 3: APPROVAL CARDS LIST */}
      {activeTab !== "LIFECYCLE" && activeTab !== "WHATSAPP" && (
        <div className="grid gap-4 lg:grid-cols-2">
          {filteredItems.length === 0 ? (
            <div className="lg:col-span-2">
              <EmptyState
                title="No pending approvals waiting"
                message="All requests for the selected department and category have been processed."
              />
            </div>
          ) : null}

          {filteredItems.map((item) => {
            const isFinance = item.department === "FINANCE";
            return (
              <div
                key={item.id}
                className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4 hover:border-primary/40 transition-colors"
              >
                {/* Top Badge Bar */}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        className={
                          isFinance
                            ? "bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px] font-semibold"
                            : "bg-blue-500/10 text-blue-600 border-blue-500/30 text-[10px] font-semibold"
                        }
                      >
                        {item.department} DEPARTMENT
                      </Badge>
                      <Badge variant="outline" className="text-[10px] text-muted-foreground">
                        {item.category.replace("_", " ")}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{item.createdAt}</span>
                    </div>
                    <h4 className="text-base font-semibold text-foreground leading-snug">{item.title}</h4>
                    <p className="text-xs text-muted-foreground">Requested by: <strong className="text-foreground">{item.requestedBy}</strong></p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs text-muted-foreground uppercase block">Amount</span>
                    <span className="text-lg font-bold font-mono text-foreground">
                      INR {item.amount.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>

                {/* Specific Fuel Details Viewport if Fuel Bill */}
                {item.fuelDetails && (
                  <div className="rounded-lg border border-border bg-muted/20 p-3.5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1.5">
                        <Fuel className="size-3.5 text-warning" />
                        AI Vision OCR Extracted Slip Data
                      </span>
                      {item.fuelDetails.geoCheckPassed && (
                        <Badge variant="outline" className="bg-success/10 text-success border-success/30 text-[10px]">
                          ✓ GPS Dwell Matched
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Pump Name:</span>
                        <p className="font-medium">{item.fuelDetails.pumpName}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Slip Number:</span>
                        <p className="font-mono font-medium">{item.fuelDetails.slipNumber}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Volume & Rate:</span>
                        <p className="font-mono font-medium">
                          {item.fuelDetails.volumeLitres} L @ INR {item.fuelDetails.ratePerLitre}/L
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Calculated Mileage:</span>
                        <p className="font-medium text-success">{item.fuelDetails.calculatedMileage}</p>
                      </div>
                    </div>

                    {item.fuelDetails.receiptUrl && (
                      <div className="flex items-center gap-3 pt-1 border-t border-border/50">
                        <img
                          src={item.fuelDetails.receiptUrl}
                          alt="Receipt slip"
                          className="size-12 rounded object-cover border border-border cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => setActiveReceiptPreview(item.fuelDetails?.receiptUrl || null)}
                        />
                        <div className="text-xs">
                          <p className="font-medium">Original Pump Slip Photo</p>
                          <button
                            type="button"
                            onClick={() => setActiveReceiptPreview(item.fuelDetails?.receiptUrl || null)}
                            className="text-primary hover:underline text-[11px] flex items-center gap-0.5"
                          >
                            Click to view full image <ExternalLink className="size-3" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Reason / Context */}
                <p className="text-xs text-muted-foreground leading-relaxed">
                  <span className="font-medium text-foreground">Operational Context:</span> {item.reason}
                </p>

                {/* Vehicle & Trip Association if present */}
                {(item.vehicleRegNumber || item.tripId) && (
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground border-t border-border/50 pt-2.5">
                    {item.vehicleRegNumber && (
                      <span>Vehicle: <strong className="font-mono text-foreground">{item.vehicleRegNumber}</strong></span>
                    )}
                    {item.tripId && (
                      <span>Trip: <strong className="font-mono text-primary">{item.tripId}</strong></span>
                    )}
                    {item.driverPhone && (
                      <span>Driver Phone: <strong className="text-foreground">{item.driverPhone}</strong></span>
                    )}
                  </div>
                )}

                {/* One-Tap Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border">
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      className="bg-success hover:bg-success/90 text-success-foreground gap-1 text-xs"
                      onClick={() => handleDecision(item, "granted")}
                    >
                      <CheckCircle2 className="size-3.5" />
                      Approve & Notify Driver via WhatsApp
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => handleDecision(item, "denied")}
                    >
                      Reject
                    </Button>
                  </div>

                  <span className="text-[11px] text-muted-foreground">
                    Auto-dispatches WhatsApp feedback
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Receipt Image Preview Modal */}
      {activeReceiptPreview && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={() => setActiveReceiptPreview(null)}
        >
          <div className="bg-card rounded-xl max-w-lg w-full overflow-hidden border border-border shadow-2xl p-4 space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm">Diesel Refill Receipt Slip (AI Vision OCR)</h4>
              <Button size="sm" variant="ghost" onClick={() => setActiveReceiptPreview(null)}>✕</Button>
            </div>
            <img src={activeReceiptPreview} alt="Receipt Full" className="w-full h-80 object-cover rounded-md" />
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setActiveReceiptPreview(null)}>Close Preview</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
