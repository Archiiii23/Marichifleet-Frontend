import { useState } from "react";
import { Check, CheckCircle2, Download, Eye, FileText, Image as ImageIcon, ShieldCheck, Upload, X, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/mf/primitives";
import { fmtDateTime } from "@/domain/hooks";
import { useSession } from "@/domain/session";
import { clientName, createInvoice, invoiceEligibility, reviewAndApprovePod, rejectPod } from "@/domain/store";
import type { Booking, Pod, Trip } from "@/domain/types";
import { useNavigate } from "@tanstack/react-router";

export function PodReviewModal({
  booking,
  trip,
  pod,
  open,
  onOpenChange,
  onSuccess,
}: {
  booking: Booking | null;
  trip?: Trip | null;
  pod?: Pod | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}) {
  const { persona } = useSession();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<"lr" | "photo" | "custom">("lr");
  const [receiverName, setReceiverName] = useState(pod?.receiverName || "Rajesh Sharma (Warehouse In-charge)");
  const [remarks, setRemarks] = useState(pod?.photoNote || "All packages received intact. Zero shortage or visible damage.");
  const [customImage, setCustomImage] = useState<string | null>(pod?.imageUrl || null);
  const [sealCheck, setSealCheck] = useState(true);
  const [stampCheck, setStampCheck] = useState(true);
  const [qtyCheck, setQtyCheck] = useState(true);
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [busy, setBusy] = useState(false);

  if (!booking) return null;

  const isAlreadyReceived = booking.status === "pod_received" || ["invoiced", "partially_paid", "paid", "closed"].includes(booking.status);

  const handleApprove = () => {
    setBusy(true);
    try {
      const res = reviewAndApprovePod({
        bookingId: booking.id,
        actor: persona.name,
        receiverName: receiverName.trim(),
        remarks: remarks.trim(),
        imageUrl: customImage || undefined,
      });

      if (res.ok) {
        toast.success("POD Marked as Reviewed & Received", {
          description: `Consignment ${booking.ref} is verified. Ready for invoice generation.`,
        });
        onSuccess?.();
        onOpenChange(false);
      } else {
        toast.error("Could not approve POD", { description: res.reason });
      }
    } finally {
      setBusy(false);
    }
  };

  const handleReject = () => {
    if (!rejectReason.trim()) {
      toast.error("Please enter a rejection reason");
      return;
    }
    setBusy(true);
    try {
      const res = rejectPod({
        bookingId: booking.id,
        actor: persona.name,
        reason: rejectReason.trim(),
      });
      if (res.ok) {
        toast.warning("POD Flagged / Rejected", {
          description: `Consignment marked as pending re-upload. Operations notified.`,
        });
        onSuccess?.();
        onOpenChange(false);
      } else {
        toast.error("Could not reject POD", { description: res.reason });
      }
    } finally {
      setBusy(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setCustomImage(reader.result as string);
        setActiveTab("custom");
        toast.success("POD Document Uploaded", { description: file.name });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-0 gap-0 border-border bg-background">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-4 bg-muted/30">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-base font-bold text-foreground">{booking.ref}</span>
              <StatusBadge status={booking.status} />
              {isAlreadyReceived && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                  <CheckCircle2 className="size-3" /> Reviewed & Stamped
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {clientName(booking.clientId)} · {booking.pickup.city} → {booking.drop.city} · LR No: LR-{booking.ref.replace("MF-", "882")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground font-mono">
              Trip: {trip?.ref || `TRP-${booking.ref.replace("MF-", "")}`}
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-5">
          {/* Left Column: Proof of Delivery Visual Document (7 cols) */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 bg-muted p-1 rounded-lg border border-border">
                <button
                  type="button"
                  onClick={() => setActiveTab("lr")}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    activeTab === "lr" ? "bg-background text-foreground shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <FileText className="inline size-3.5 mr-1" />
                  ePOD Lorry Receipt
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("photo")}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    activeTab === "photo" ? "bg-background text-foreground shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <ImageIcon className="inline size-3.5 mr-1" />
                  Unloading Photo
                </button>
                {customImage && (
                  <button
                    type="button"
                    onClick={() => setActiveTab("custom")}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                      activeTab === "custom" ? "bg-background text-foreground shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Eye className="inline size-3.5 mr-1" />
                    Uploaded File
                  </button>
                )}
              </div>

              <label className="cursor-pointer text-xs flex items-center gap-1 text-primary hover:underline font-medium">
                <Upload className="size-3.5" />
                <span>Upload New Scan</span>
                <input type="file" accept="image/*,.pdf" className="hidden" onChange={handleFileUpload} />
              </label>
            </div>

            {/* Document Render Area */}
            {activeTab === "lr" && (
              <div className="relative rounded-lg border-2 border-border/80 bg-white text-slate-900 p-5 shadow-md font-sans text-xs select-none">
                {/* Official LR Header */}
                <div className="border-b-2 border-slate-900 pb-3 mb-3 flex items-start justify-between">
                  <div>
                    <div className="text-[10px] font-mono font-bold tracking-widest text-slate-500 uppercase">
                      MARICHI FLEET LOGISTICS ERP · ePOD ACKNOWLEDGEMENT
                    </div>
                    <div className="text-base font-bold tracking-tight text-slate-950">
                      DELIVERY RECEIPT & LORRY ACKNOWLEDGEMENT
                    </div>
                    <div className="text-[11px] text-slate-600">
                      Consignment LR: <span className="font-mono font-bold text-slate-900">LR-{booking.ref.replace("MF-", "882")}</span> · Booking: <span className="font-mono font-bold">{booking.ref}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="inline-block bg-slate-900 text-white font-mono text-[10px] px-2 py-0.5 rounded font-bold">
                      OFFICIAL COPY
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">
                      Delivered: {fmtDateTime(pod?.capturedISO || new Date().toISOString())}
                    </div>
                  </div>
                </div>

                {/* Sender & Receiver Lanes */}
                <div className="grid grid-cols-2 gap-3 border border-slate-300 rounded p-2.5 bg-slate-50 mb-3 text-[11px]">
                  <div>
                    <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Consignor (Origin)</div>
                    <div className="font-semibold text-slate-900">{clientName(booking.clientId)}</div>
                    <div className="text-slate-600">{booking.pickup.city}, Hub Bay 4</div>
                  </div>
                  <div>
                    <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Consignee (Destination)</div>
                    <div className="font-semibold text-slate-900">{receiverName}</div>
                    <div className="text-slate-600">{booking.drop.city}, Central Receiving Dock</div>
                  </div>
                </div>

                {/* Cargo Details Table */}
                <table className="w-full text-left text-[11px] border border-slate-300 mb-3">
                  <thead className="bg-slate-100 text-slate-700 uppercase font-semibold text-[9px]">
                    <tr>
                      <th className="p-1.5 border-b border-slate-300">Description</th>
                      <th className="p-1.5 border-b border-slate-300">Packages</th>
                      <th className="p-1.5 border-b border-slate-300">Weight</th>
                      <th className="p-1.5 border-b border-slate-300">Seal Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    <tr>
                      <td className="p-1.5 font-medium">Commercial Freight / Palletized Cargo</td>
                      <td className="p-1.5 font-mono">42 Units</td>
                      <td className="p-1.5 font-mono">18.5 MT</td>
                      <td className="p-1.5 text-emerald-700 font-semibold">✓ SEAL INTACT (#MF-948)</td>
                    </tr>
                  </tbody>
                </table>

                {/* Verification Stamp & Signature Layer */}
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-300 items-end">
                  {/* Security Verification & OTP */}
                  <div className="space-y-1 text-[10px] text-slate-600">
                    <div className="flex items-center gap-1 text-emerald-700 font-bold">
                      <ShieldCheck className="size-3.5" />
                      <span>OTP Verified: {pod?.otp || "849201"}</span>
                    </div>
                    <div>GPS Coordinates: 19.0760° N, 72.8777° E (Within 45m geofence)</div>
                    <div>Carrier Driver ID: {trip?.driverId || "DRV-102"}</div>
                  </div>

                  {/* Stamp & Receiver Signature */}
                  <div className="relative flex flex-col items-center justify-center p-2 rounded border border-dashed border-slate-400 bg-amber-50/40 min-h-[90px]">
                    {/* Simulated Official Rubber Stamp */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-85 rotate-[-8deg]">
                      <div className="rounded-full border-2 border-emerald-700 p-2 text-center text-emerald-800 font-mono text-[9px] font-bold uppercase tracking-wider leading-tight shadow-xs">
                        <div>★ MARICHI VERIFIED ★</div>
                        <div>RECEIVED IN GOOD CONDITION</div>
                        <div>{new Date().toLocaleDateString("en-IN")}</div>
                      </div>
                    </div>

                    {/* Signature representation */}
                    <svg className="size-20 text-blue-900 pointer-events-none" viewBox="0 0 160 60" fill="none">
                      <path
                        d="M10 40 C 30 10, 45 45, 70 20 C 95 -5, 110 50, 140 30 C 150 25, 130 55, 155 35"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <div className="text-[10px] font-semibold text-slate-800 border-t border-slate-400 w-full text-center mt-1">
                      {receiverName}
                    </div>
                    <div className="text-[8px] text-slate-500 uppercase">Authorized Signature & Seal</div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "photo" && (
              <div className="relative rounded-lg border border-border overflow-hidden bg-slate-950 aspect-video flex flex-col items-center justify-center text-white">
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10" />
                {/* Realistic Unloading Warehouse photo backdrop */}
                <div
                  className="absolute inset-0 bg-cover bg-center opacity-85"
                  style={{
                    backgroundImage: `url('https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80')`,
                  }}
                />
                <div className="relative z-20 text-center p-4">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-black/60 backdrop-blur-md px-3 py-1 text-xs font-mono border border-white/20 mb-2">
                    <span className="size-2 rounded-full bg-emerald-400 animate-ping" />
                    <span>Unloading Bay Geotagged Camera</span>
                  </div>
                  <p className="text-xs text-white/90 max-w-sm mx-auto">
                    Driver captured photo of cargo pallets at destination receiving dock. Seals checked and recorded by facility manager.
                  </p>
                  <p className="text-[11px] text-white/60 font-mono mt-1">
                    Timestamp: {fmtDateTime(pod?.capturedISO || new Date().toISOString())}
                  </p>
                </div>
              </div>
            )}

            {activeTab === "custom" && customImage && (
              <div className="rounded-lg border border-border overflow-hidden bg-muted/20 flex items-center justify-center p-2 max-h-[380px]">
                <img src={customImage} alt="Uploaded Proof of Delivery" className="max-h-[360px] object-contain rounded" />
              </div>
            )}
          </div>

          {/* Right Column: Review Controls & Audit Actions (5 cols) */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-4 border-l border-border pl-0 lg:pl-6">
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-foreground">POD Verification Details</h4>
                <p className="text-xs text-muted-foreground">Verify physical stamp, receiver identity and delivery condition.</p>
              </div>

              {/* Form inputs */}
              <div className="space-y-3 text-xs">
                <div>
                  <Label htmlFor="recName" className="text-xs">Receiver Name / Designation</Label>
                  <Input
                    id="recName"
                    value={receiverName}
                    onChange={(e) => setReceiverName(e.target.value)}
                    placeholder="e.g. Rajesh Sharma (Store Manager)"
                    className="mt-1 h-8 text-xs"
                    disabled={isAlreadyReceived}
                  />
                </div>

                <div>
                  <Label htmlFor="rem" className="text-xs">Unloading Bay Notes & Condition</Label>
                  <Textarea
                    id="rem"
                    rows={2}
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Delivery notes, cargo condition, pallet count..."
                    className="mt-1 text-xs resize-none"
                    disabled={isAlreadyReceived}
                  />
                </div>

                {/* Reviewer Quality Checklist */}
                <div className="space-y-2 rounded-md border border-border bg-muted/40 p-3">
                  <div className="font-semibold text-foreground text-[11px] uppercase tracking-wider">Quality Audit Checklist</div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={stampCheck}
                      onChange={(e) => setStampCheck(e.target.checked)}
                      className="rounded border-border text-primary focus:ring-primary size-3.5"
                    />
                    <span>Receiver signature & company stamp verified</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sealCheck}
                      onChange={(e) => setSealCheck(e.target.checked)}
                      className="rounded border-border text-primary focus:ring-primary size-3.5"
                    />
                    <span>Container / truck seal intact upon arrival</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={qtyCheck}
                      onChange={(e) => setQtyCheck(e.target.checked)}
                      className="rounded border-border text-primary focus:ring-primary size-3.5"
                    />
                    <span>Quantity matched delivery order manifest</span>
                  </label>
                </div>

                {isAlreadyReceived && pod?.reviewedBy && (
                  <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2">
                    <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold">Reviewed & Approved by {pod.reviewedBy}</div>
                      <div className="text-[11px] opacity-80">{fmtDateTime(pod.reviewedISO || pod.capturedISO)}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Rejection Mode Input */}
              {rejectMode && (
                <div className="space-y-2 border border-destructive/40 bg-destructive/10 rounded-md p-3">
                  <Label htmlFor="rej" className="text-xs text-destructive font-semibold">
                    Rejection / Correction Reason
                  </Label>
                  <Input
                    id="rej"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="e.g. Signature missing, wrong stamp, blurry photo"
                    className="h-8 text-xs border-destructive/30"
                  />
                  <div className="flex gap-2 justify-end">
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setRejectMode(false)}>
                      Cancel
                    </Button>
                    <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={handleReject} disabled={busy}>
                      Confirm Rejection
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Actions Toolbar */}
            <div className="pt-3 border-t border-border space-y-2">
              {!isAlreadyReceived ? (
                <>
                  <Button
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-2 shadow-xs"
                    onClick={handleApprove}
                    disabled={busy || !stampCheck || !receiverName.trim()}
                  >
                    <Check className="size-4" />
                    {busy ? "Marking Received..." : "Mark as Reviewed & Received"}
                  </Button>

                  {!rejectMode && (
                    <Button
                      variant="outline"
                      className="w-full text-xs text-destructive hover:bg-destructive/10 border-destructive/30"
                      onClick={() => setRejectMode(true)}
                    >
                      <XCircle className="size-3.5 mr-1" />
                      Flag Issue / Reject POD
                    </Button>
                  )}
                </>
              ) : (
                <div className="space-y-2">
                  {invoiceEligibility(booking.id).ok ? (
                    <Button
                      className="w-full bg-primary font-semibold gap-2"
                      onClick={() => {
                        onOpenChange(false);
                        const res = createInvoice(booking.id, persona.name);
                        if (res.ok && res.id) {
                          toast.success("Invoice Draft Created");
                          navigate({ to: "/app/finance/invoices/$invoiceId", params: { invoiceId: res.id } });
                        }
                      }}
                    >
                      Create Tax Invoice →
                    </Button>
                  ) : (
                    <div className="text-center text-xs text-muted-foreground py-1">
                      POD already verified and moved to Billing.
                    </div>
                  )}
                </div>
              )}

              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs text-muted-foreground hover:text-foreground"
                onClick={() => onOpenChange(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
