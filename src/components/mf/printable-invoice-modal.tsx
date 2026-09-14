import { useState } from "react";
import { CheckCircle2, FileText, Printer, QrCode, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fmtDate, fmtDateTime, inr } from "@/domain/hooks";
import type { Booking, Client, Invoice, Trip, Vehicle } from "@/domain/types";

// Convert number to Indian currency words
function numberToWords(num: number): string {
  const a = [
    "", "One ", "Two ", "Three ", "Four ", "Five ", "Six ", "Seven ", "Eight ", "Nine ",
    "Ten ", "Eleven ", "Twelve ", "Thirteen ", "Fourteen ", "Fifteen ", "Sixteen ", "Seventeen ", "Eighteen ", "Nineteen "
  ];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const n = ("000000000" + Math.round(num)).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return "";
  let str = "";
  str += n[1] !== "00" ? (a[Number(n[1])] || b[Number(n[1][0])] + " " + a[Number(n[1][1])]) + "Crore " : "";
  str += n[2] !== "00" ? (a[Number(n[2])] || b[Number(n[2][0])] + " " + a[Number(n[2][1])]) + "Lakh " : "";
  str += n[3] !== "00" ? (a[Number(n[3])] || b[Number(n[3][0])] + " " + a[Number(n[3][1])]) + "Thousand " : "";
  str += n[4] !== "0" ? (a[Number(n[4])] || b[Number(n[4][0])] + " " + a[Number(n[4][1])]) + "Hundred " : "";
  str += n[5] !== "00" ? ((str !== "") ? "and " : "") + (a[Number(n[5])] || b[Number(n[5][0])] + " " + a[Number(n[5][1])]) : "";
  return str.trim() + " Rupees Only";
}

export function PrintableInvoiceModal({
  open,
  onOpenChange,
  invoice,
  client,
  booking,
  trip,
  vehicle,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: Invoice | null;
  client: Client | null;
  booking?: Booking | null;
  trip?: Trip | null;
  vehicle?: Vehicle | null;
}) {
  const [billType, setBillType] = useState<"gst" | "non_gst">("gst");

  if (!invoice || !client) return null;

  const isGst = billType === "gst";
  const taxAmount = isGst ? invoice.total - invoice.subtotal : 0;
  const halfTax = taxAmount / 2;
  const finalTotal = isGst ? invoice.total : invoice.subtotal;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[94vh] overflow-y-auto p-0 gap-0 border-border bg-background">
        {/* Header Toolbar (Hidden during print) */}
        <div className="flex flex-wrap items-center justify-between border-b border-border p-4 bg-muted/40 print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">Print Document Preview</span>
            <div className="flex items-center bg-background rounded-lg border border-border p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setBillType("gst")}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  isGst ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                GST Tax Invoice
              </button>
              <button
                type="button"
                onClick={() => setBillType("non_gst")}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  !isGst ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Non-GST Freight Bill
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handlePrint} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-xs">
              <Printer className="size-4" /> Print Document (Light Mode)
            </Button>
          </div>
        </div>

        {/* Printable Paper Canvas — Strictly Forced Light Theme */}
        <div className="p-4 sm:p-6 flex justify-center bg-neutral-100 dark:bg-neutral-900/60 print:p-0 print:bg-white">
          <div
            id="printable-invoice-area"
            className="w-full max-w-[800px] bg-white text-slate-900 border border-slate-300 shadow-lg p-6 sm:p-8 rounded font-sans text-xs print:border-0 print:shadow-none print:m-0 print:p-4 print:max-w-none print:w-full"
            style={{
              backgroundColor: "#ffffff",
              color: "#0f172a",
              colorScheme: "light",
            }}
          >
            {/* Top Header Bar */}
            <div className="border-b-2 border-slate-900 pb-4 mb-4 flex items-start justify-between">
              <div>
                <h1 className="text-xl font-black uppercase tracking-tight text-slate-950">
                  MARICHI FLEET LOGISTICS PVT LTD
                </h1>
                <p className="text-[11px] text-slate-600 font-medium">
                  Leading Road Express, Full Truckload (FTL) & Surface Freight Carriers
                </p>
                <p className="text-[11px] text-slate-600">
                  Registered Office: Plot 42, Transport Nagar, Okhla Phase 3, New Delhi - 110020
                </p>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-800 font-semibold">
                  <span>GSTIN: <span className="font-mono">07AABCM9481Q1Z8</span></span>
                  <span>PAN: <span className="font-mono">AABCM9481Q</span></span>
                  <span>State: Delhi (07)</span>
                </div>
              </div>

              <div className="text-right">
                <div className="inline-block border-2 border-slate-900 px-2.5 py-1 text-xs font-black uppercase tracking-wider bg-slate-100 text-slate-900">
                  {isGst ? "TAX INVOICE" : "FREIGHT BILL"}
                </div>
                <div className="text-[10px] text-slate-500 font-semibold uppercase mt-1">
                  Original for Recipient
                </div>
                {isGst && invoice.irn && (
                  <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-emerald-700 font-bold">
                    <ShieldCheck className="size-3" />
                    <span>IRP e-Invoice Verified</span>
                  </div>
                )}
              </div>
            </div>

            {/* If GST e-Invoice IRN & QR Code Section */}
            {isGst && invoice.irn && (
              <div className="border border-slate-300 rounded p-3 bg-slate-50 mb-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1 text-[11px] min-w-0 flex-1">
                  <div className="font-bold text-[10px] uppercase tracking-wider text-slate-500">
                    Government of India · Invoice Registration Portal (IRP)
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700">IRN: </span>
                    <span className="font-mono text-[10px] break-all font-bold text-slate-900">{invoice.irn}</span>
                  </div>
                  <div className="flex flex-wrap gap-4 text-[10px] text-slate-600">
                    <span>Ack No: <strong className="font-mono text-slate-900">{invoice.ackNo || "11248920192"}</strong></span>
                    <span>Ack Date: <strong className="font-mono text-slate-900">{fmtDateTime(invoice.ackDateISO || invoice.createdISO)}</strong></span>
                    <span>HSN/SAC: <strong className="font-mono text-slate-900">{invoice.sacCode || "996511"}</strong></span>
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center p-1.5 border border-slate-400 bg-white rounded shrink-0">
                  <QrCode className="size-16 text-slate-950" />
                  <span className="text-[8px] font-mono font-bold text-slate-600 mt-0.5">NIC-IRP VALID</span>
                </div>
              </div>
            )}

            {/* Document & Customer Meta Grid */}
            <div className="grid grid-cols-2 gap-4 border border-slate-300 rounded p-3 mb-4 text-[11px]">
              {/* Left Column: Billed To / Client */}
              <div className="space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Billed To (Consignee / Client)
                </div>
                <div className="text-sm font-bold text-slate-950">{client.name}</div>
                <div className="text-slate-600">{client.city}, Hub Logistics Park</div>
                <div className="pt-1">
                  <div>Contact: <span className="font-medium text-slate-900">{client.contactName} ({client.phone})</span></div>
                  <div>GSTIN: <span className="font-mono font-bold text-slate-900">{client.gstin}</span></div>
                  <div>State Code: <span className="font-medium text-slate-900">{client.gstin?.slice(0, 2) || "27"}</span></div>
                </div>
              </div>

              {/* Right Column: Invoice Details */}
              <div className="space-y-1 border-l border-slate-300 pl-4">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Invoice & Movement Details
                </div>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                  <span className="text-slate-500">Invoice No:</span>
                  <span className="font-mono font-bold text-slate-950">{invoice.ref}</span>

                  <span className="text-slate-500">Invoice Date:</span>
                  <span className="font-medium">{fmtDate(invoice.createdISO)}</span>

                  <span className="text-slate-500">Payment Due:</span>
                  <span className="font-medium">{fmtDate(invoice.dueISO)}</span>

                  <span className="text-slate-500">Consignment Ref:</span>
                  <span className="font-mono font-bold text-slate-900">{booking?.ref || "MF-25001"}</span>

                  <span className="text-slate-500">Lorry Receipt (LR):</span>
                  <span className="font-mono font-semibold text-slate-900">LR-{(booking?.ref || "MF-25001").replace("MF-", "882")}</span>

                  <span className="text-slate-500">Vehicle / Truck No:</span>
                  <span className="font-mono font-bold text-slate-900">{vehicle?.regNo || "DL-01-AX-9942"}</span>

                  <span className="text-slate-500">Lane / Route:</span>
                  <span className="font-medium text-slate-900">{booking ? `${booking.pickup.city} → ${booking.drop.city}` : "Intercity Transit"}</span>
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <table className="w-full text-left border border-slate-300 mb-4 text-[11px]">
              <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-[9px] border-b border-slate-300">
                <tr>
                  <th className="p-2 border-r border-slate-300 w-10 text-center">#</th>
                  <th className="p-2 border-r border-slate-300">Description of Service</th>
                  <th className="p-2 border-r border-slate-300 text-center">SAC Code</th>
                  <th className="p-2 border-r border-slate-300 text-right">Qty / Weight</th>
                  <th className="p-2 border-r border-slate-300 text-right">Rate (₹)</th>
                  <th className="p-2 text-right">Taxable Value (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {invoice.lines.map((line, idx) => (
                  <tr key={idx}>
                    <td className="p-2 border-r border-slate-300 text-center font-mono">{idx + 1}</td>
                    <td className="p-2 border-r border-slate-300 font-medium text-slate-900">{line.label}</td>
                    <td className="p-2 border-r border-slate-300 text-center font-mono">996511</td>
                    <td className="p-2 border-r border-slate-300 text-right font-mono">{booking ? `${booking.weightTons} MT` : "1 Trip"}</td>
                    <td className="p-2 border-r border-slate-300 text-right font-mono">{inr(line.amount)}</td>
                    <td className="p-2 text-right font-mono font-semibold">{inr(line.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Financial Totals & Tax Table */}
            <div className="grid grid-cols-2 gap-4 items-start mb-4">
              {/* Bank Details & Terms */}
              <div className="border border-slate-300 rounded p-3 bg-slate-50 space-y-1.5 text-[10px]">
                <div className="font-bold text-slate-900 uppercase tracking-wider text-[9px]">
                  Electronic Remittance (NEFT / RTGS)
                </div>
                <div>Account Name: <strong className="text-slate-900">Marichi Fleet Logistics Pvt Ltd</strong></div>
                <div>Bank Name: <strong className="text-slate-900">HDFC Bank Ltd</strong></div>
                <div>Account Number: <strong className="font-mono text-slate-900">50200084729102</strong></div>
                <div>IFSC Code: <strong className="font-mono text-slate-900">HDFC0000240</strong> (Okhla Phase 3)</div>
                <div className="pt-1 text-[9px] text-slate-500">
                  Please mention Invoice No. {invoice.ref} in payment remarks.
                </div>
              </div>

              {/* Tax Calculations */}
              <div className="border border-slate-300 rounded divide-y divide-slate-200 text-[11px]">
                <div className="p-2 flex justify-between">
                  <span className="text-slate-600">Subtotal (Taxable Freight)</span>
                  <span className="font-mono font-semibold text-slate-950">{inr(invoice.subtotal)}</span>
                </div>

                {isGst ? (
                  <>
                    <div className="p-2 flex justify-between text-slate-600">
                      <span>CGST @ 6% (Road GTA)</span>
                      <span className="font-mono">{inr(halfTax)}</span>
                    </div>
                    <div className="p-2 flex justify-between text-slate-600">
                      <span>SGST @ 6% (Road GTA)</span>
                      <span className="font-mono">{inr(halfTax)}</span>
                    </div>
                  </>
                ) : (
                  <div className="p-2 flex justify-between text-slate-600">
                    <span>Tax (Non-GST Freight Memo)</span>
                    <span className="font-mono">₹0</span>
                  </div>
                )}

                <div className="p-2.5 flex justify-between bg-slate-100 font-bold text-slate-950 text-sm">
                  <span>Total Amount Due</span>
                  <span className="font-mono text-base">{inr(finalTotal)}</span>
                </div>
              </div>
            </div>

            {/* Total In Words */}
            <div className="border border-slate-300 rounded p-2.5 bg-slate-50 mb-4 text-[11px]">
              <span className="text-slate-500 uppercase text-[9px] font-bold block">Amount Chargeable (in words):</span>
              <span className="font-bold text-slate-900">{numberToWords(finalTotal)}</span>
            </div>

            {/* Signatures & Footer */}
            <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-300 mt-6 items-end">
              <div className="text-[9px] text-slate-500 space-y-0.5">
                <div>Declaration:</div>
                <div>1. All disputes subject to Delhi jurisdiction only.</div>
                <div>2. Interest @ 18% p.a. chargeable after due date ({fmtDate(invoice.dueISO)}).</div>
                <div>3. This is a computer generated document under GST Rule 48.</div>
              </div>

              <div className="text-right flex flex-col items-end">
                <div className="text-[10px] font-bold text-slate-900 uppercase">
                  For MARICHI FLEET LOGISTICS PVT LTD
                </div>
                {/* Visual Stamp & Signature representation */}
                <div className="my-2 border border-slate-300 rounded px-4 py-1 text-center bg-slate-50/50">
                  <div className="text-[9px] font-mono text-emerald-800 font-bold">DIGITALLY SIGNED</div>
                  <div className="text-[8px] text-slate-500 font-mono">Auth ID: MFL-FIN-DIR-01</div>
                </div>
                <div className="text-[10px] font-semibold text-slate-800 border-t border-slate-400 pt-1 w-44 text-center">
                  Authorized Signatory
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
