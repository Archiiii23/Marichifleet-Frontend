import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  ArrowRight,
  Truck,
  FileText,
  ShieldCheck,
  Fuel,
  MapPin,
  RefreshCw,
  Camera,
  Coins,
  Send,
  AlertTriangle,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface ConsignmentState {
  consignmentNo: string;
  consignor: string;
  consignee: string;
  origin: string;
  destination: string;
  commodity: string;
  weightTons: number;
  quotedFreight: number;
  vehicleReg: string;
  driverName: string;
  driverPhone: string;
  ewayBill: string;
  advanceAmount: number;
  advanceStatus: 'NOT_REQUESTED' | 'PENDING_APPROVAL' | 'APPROVED';
  stage: 1 | 2 | 3 | 4 | 5 | 6;
  checkpoints: { name: string; time: string; completed: boolean }[];
  fuelLogs: { pump: string; litres: number; amount: number; slip: string; status: 'PENDING' | 'APPROVED' }[];
  pod: { signedBy: string; units: number; shortages: number; photoUploaded: boolean } | null;
  returnTripType: 'NONE' | 'BACKHAUL_LOAD' | 'EMPTY_REPOSITION';
  returnConsignmentNo?: string;
  odometerStart: number;
  odometerEnd: number;
  settlement: {
    totalFreight: number;
    fuelSpent: number;
    advancesPaid: number;
    driverBalanceDue: number;
    irnGenerated?: string;
  } | null;
}

const INITIAL_CONSIGNMENT: ConsignmentState = {
  consignmentNo: 'CN-2026-9901',
  consignor: 'Reliance Retail Ltd',
  consignee: 'Bhiwandi Central Logistics Hub',
  origin: 'Delhi NCR Hub (Okhla)',
  destination: 'Mumbai Logistics Park (Bhiwandi)',
  commodity: 'FMCG Ambient Pallets',
  weightTons: 28.5,
  quotedFreight: 162500,
  vehicleReg: 'NL01AC2849',
  driverName: 'Ramesh Kumar',
  driverPhone: '+91 98110 23456',
  ewayBill: '171092839182',
  advanceAmount: 8000,
  advanceStatus: 'NOT_REQUESTED',
  stage: 1,
  checkpoints: [
    { name: 'Okhla Departure Terminal', time: '10:00 AM', completed: true },
    { name: 'Jaipur Toll Plaza (NH-48)', time: '04:30 PM', completed: false },
    { name: 'Udaipur Border Checkpost', time: '02:00 AM', completed: false },
    { name: 'Vadodara Express Ring', time: '11:00 AM', completed: false },
    { name: 'Bhiwandi Delivery Dock', time: '06:00 PM', completed: false },
  ],
  fuelLogs: [
    {
      pump: 'HPCL Highway Oasis, Kotputli',
      litres: 62.5,
      amount: 5593.75,
      slip: 'HP-771029',
      status: 'APPROVED',
    },
  ],
  pod: null,
  returnTripType: 'NONE',
  odometerStart: 142500,
  odometerEnd: 143920,
  settlement: null,
};

export function ConsignmentLifecycleStudio({
  onTriggerFuelModal,
}: {
  onTriggerFuelModal?: () => void;
}) {
  const [consignment, setConsignment] = useState<ConsignmentState>(INITIAL_CONSIGNMENT);

  const advanceStage = (next: 1 | 2 | 3 | 4 | 5 | 6) => {
    setConsignment((prev) => ({ ...prev, stage: next }));
  };

  const requestAdvance = () => {
    setConsignment((prev) => ({ ...prev, advanceStatus: 'PENDING_APPROVAL' }));
    toast.info('Fuel & Cash Advance requested (INR 8,000)', {
      description: 'Routed to Finance Department inbox for approval.',
    });
  };

  const approveAdvance = () => {
    setConsignment((prev) => ({ ...prev, advanceStatus: 'APPROVED' }));
    toast.success('Advance Approved by Finance', {
      description: 'WhatsApp confirmation sent to Driver Ramesh Kumar: "INR 8,000 transferred. Good to go!"',
    });
  };

  const completeCheckpoint = (index: number) => {
    setConsignment((prev) => {
      const cps = [...prev.checkpoints];
      cps[index].completed = true;
      return { ...prev, checkpoints: cps };
    });
    toast.success(`Checkpoint ${consignment.checkpoints[index].name} completed`);
  };

  const recordPod = () => {
    setConsignment((prev) => ({
      ...prev,
      pod: {
        signedBy: 'K. S. Narang (Dock Lead)',
        units: 640,
        shortages: 0,
        photoUploaded: true,
      },
    }));
    toast.success('Electronic POD captured with signature and dock slip photo', {
      description: 'Clean delivery recorded. No shortages or damages reported.',
    });
  };

  const startReturnTrip = (type: 'BACKHAUL_LOAD' | 'EMPTY_REPOSITION') => {
    const returnNo = type === 'BACKHAUL_LOAD' ? 'CN-2026-9902 (Return Backhaul)' : 'CN-2026-9902 (Empty Reposition)';
    setConsignment((prev) => ({
      ...prev,
      returnTripType: type,
      returnConsignmentNo: returnNo,
      stage: 5,
    }));
    toast.success(
      type === 'BACKHAUL_LOAD' ? 'Return Backhaul Consignment Locked' : 'Empty Return Reposition Leg Locked',
      {
        description: type === 'BACKHAUL_LOAD'
          ? 'Loaded 24T Auto Parts from Pune to Delhi. Added INR 1,45,000 fresh freight revenue.'
          : 'Repositioning empty trailer back to Delhi NCR Central Depot.',
      }
    );
  };

  const finalizeSettlement = () => {
    const irnChars = '0123456789abcdef';
    let irn = '';
    for (let i = 0; i < 64; i++) irn += irnChars.charAt(Math.floor(Math.random() * irnChars.length));

    const totalFreight = consignment.quotedFreight + (consignment.returnTripType === 'BACKHAUL_LOAD' ? 145000 : 0);
    const fuelSpent = 5593.75 + 6200;
    const advancesPaid = 8000;
    const driverBalanceDue = 14800 - advancesPaid;

    setConsignment((prev) => ({
      ...prev,
      stage: 6,
      settlement: {
        totalFreight,
        fuelSpent,
        advancesPaid,
        driverBalanceDue,
        irnGenerated: irn,
      },
    }));

    toast.success('Round Trip Closed & General Ledger Posted', {
      description: `GST e-Invoice IRN: ${irn.slice(0, 16)}... Driver balance of INR ${driverBalanceDue.toLocaleString('en-IN')} queued for payout.`,
    });
  };

  const steps = [
    { num: 1, title: '1. Initiation', subtitle: 'Booking & Rate Card' },
    { num: 2, title: '2. Dispatch', subtitle: 'Advance & Duty Start' },
    { num: 3, title: '3. In-Transit', subtitle: 'Checkpoints & Fuel OCR' },
    { num: 4, title: '4. Delivery', subtitle: 'Unload & ePOD' },
    { num: 5, title: '5. Round Trip', subtitle: 'Backhaul / Return Leg' },
    { num: 6, title: '6. Settlement', subtitle: 'Ledger & IRN Invoice' },
  ];

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-5 border-b border-border flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-primary/15 text-primary border-primary/30 font-mono">
              {consignment.consignmentNo}
            </Badge>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-sm font-semibold">{consignment.origin} → {consignment.destination}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Vehicle: <span className="font-mono text-foreground font-medium">{consignment.vehicleReg}</span> · Driver:{' '}
            <span className="text-foreground font-medium">{consignment.driverName}</span> ({consignment.driverPhone}) · e-Way Bill:{' '}
            <span className="font-mono text-foreground">{consignment.ewayBill}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setConsignment(INITIAL_CONSIGNMENT)}
            className="text-xs gap-1"
          >
            <RotateCcw className="size-3.5" />
            Reset Demo
          </Button>
          <Badge className={consignment.stage === 6 ? 'bg-success text-success-foreground' : 'bg-primary text-primary-foreground'}>
            {consignment.stage === 6 ? 'Trip Closed & Settled' : `Stage ${consignment.stage} of 6`}
          </Badge>
        </div>
      </div>

      {/* Stepper Navigation */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 border-b border-border bg-muted/20">
        {steps.map((s) => {
          const isActive = consignment.stage === s.num;
          const isDone = consignment.stage > s.num;
          return (
            <button
              key={s.num}
              onClick={() => advanceStage(s.num as any)}
              className={`p-3 text-left transition-colors border-r border-border last:border-r-0 flex flex-col gap-0.5 ${
                isActive
                  ? 'bg-card border-b-2 border-b-primary font-medium'
                  : isDone
                  ? 'bg-success/5 text-muted-foreground hover:bg-muted/40'
                  : 'text-muted-foreground hover:bg-muted/30'
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs">
                {isDone ? (
                  <CheckCircle2 className="size-3.5 text-success" />
                ) : (
                  <span className={`size-3.5 rounded-full flex items-center justify-center text-[10px] ${
                    isActive ? 'bg-primary text-primary-foreground font-bold' : 'bg-muted text-muted-foreground'
                  }`}>
                    {s.num}
                  </span>
                )}
                <span className={isActive ? 'text-foreground font-semibold' : ''}>{s.title}</span>
              </div>
              <span className="text-[11px] text-muted-foreground pl-5">{s.subtitle}</span>
            </button>
          );
        })}
      </div>

      {/* Stage Interactive Viewports */}
      <div className="p-6">
        {/* STAGE 1: INITIATION */}
        {consignment.stage === 1 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-base font-semibold flex items-center gap-2">
                  <FileText className="size-4 text-primary" />
                  Stage 1: Consignment Initiation & Contract Rate Card
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Input customer consignment parameters, contract rate, vehicle allocation, and driver assignment.
                </p>
              </div>
              <Button onClick={() => advanceStage(2)} className="gap-1.5">
                Lock Consignment & Proceed to Dispatch <ArrowRight className="size-4" />
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-lg border border-border p-3.5 bg-muted/10 space-y-1.5">
                <Label className="text-xs text-muted-foreground">Consignor (Client)</Label>
                <p className="text-sm font-semibold">{consignment.consignor}</p>
                <p className="text-xs text-muted-foreground">GSTIN: 27AABCR1234F1Z8 · Contract Rate: Direct B2B</p>
              </div>

              <div className="rounded-lg border border-border p-3.5 bg-muted/10 space-y-1.5">
                <Label className="text-xs text-muted-foreground">Consignee & Route</Label>
                <p className="text-sm font-semibold">{consignment.consignee}</p>
                <p className="text-xs text-muted-foreground">{consignment.origin} → {consignment.destination} (1,420 km)</p>
              </div>

              <div className="rounded-lg border border-border p-3.5 bg-muted/10 space-y-1.5">
                <Label className="text-xs text-muted-foreground">Cargo & Agreed Freight</Label>
                <p className="text-sm font-semibold">
                  INR {consignment.quotedFreight.toLocaleString('en-IN')} + 5% GST
                </p>
                <p className="text-xs text-muted-foreground">{consignment.commodity} ({consignment.weightTons} MT)</p>
              </div>
            </div>

            <div className="rounded-lg border border-border p-4 bg-card flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <Truck className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Assigned Asset: {consignment.vehicleReg} (Tata Prima 5530.S)</p>
                  <p className="text-xs text-muted-foreground">
                    Driver: {consignment.driverName} · RC/Fitness: Valid · e-Way Bill #{consignment.ewayBill} Active
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="bg-success/10 text-success border-success/30 gap-1 text-xs">
                <ShieldCheck className="size-3.5" /> Law 3 Tenant Isolated
              </Badge>
            </div>
          </div>
        )}

        {/* STAGE 2: DISPATCH & ADVANCES */}
        {consignment.stage === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-base font-semibold flex items-center gap-2">
                  <Fuel className="size-4 text-warning" />
                  Stage 2: Duty Start & Finance Fuel Advance Approval
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Driver duty kickoff, pre-departure vehicle checklist, and Finance Department approval for cash/fuel advance.
                </p>
              </div>
              <Button onClick={() => advanceStage(3)} disabled={consignment.advanceStatus !== 'APPROVED'} className="gap-1.5">
                Depart Depot & Start Transit <ArrowRight className="size-4" />
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-border p-4 bg-muted/10 space-y-3">
                <h5 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                  Driver Fuel & Cash Advance Loop
                </h5>
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div>
                    <p className="text-sm font-medium">En-Route Cash Advance</p>
                    <p className="text-xs text-muted-foreground">Tolls, weighbridge fees & incidental expenses</p>
                  </div>
                  <span className="text-base font-bold font-mono">INR {consignment.advanceAmount.toLocaleString('en-IN')}</span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Finance Status:</span>
                    {consignment.advanceStatus === 'NOT_REQUESTED' && <Badge variant="outline">Not Requested</Badge>}
                    {consignment.advanceStatus === 'PENDING_APPROVAL' && (
                      <Badge variant="outline" className="bg-warning/15 text-warning border-warning/30 animate-pulse">
                        Awaiting Finance Approval
                      </Badge>
                    )}
                    {consignment.advanceStatus === 'APPROVED' && (
                      <Badge variant="outline" className="bg-success/15 text-success border-success/30">
                        Approved by Finance
                      </Badge>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {consignment.advanceStatus === 'NOT_REQUESTED' && (
                      <Button size="sm" onClick={requestAdvance}>Request Advance</Button>
                    )}
                    {consignment.advanceStatus === 'PENDING_APPROVAL' && (
                      <Button size="sm" className="bg-success hover:bg-success/90" onClick={approveAdvance}>
                        Approve & Disburse (Finance)
                      </Button>
                    )}
                    {consignment.advanceStatus === 'APPROVED' && (
                      <span className="text-xs text-success font-medium">✓ Disbursed via Bank Transfer</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-border p-4 bg-muted/10 space-y-3">
                <h5 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                  Pre-Dispatch Safety Inspection
                </h5>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between py-1 border-b border-border/50">
                    <span>Tyre Pressure & Tread Depth</span>
                    <Badge variant="outline" className="text-success border-success/30">120 PSI · OK</Badge>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-border/50">
                    <span>Air Brake Pressure Test</span>
                    <Badge variant="outline" className="text-success border-success/30">8.5 Bar · Passed</Badge>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-border/50">
                    <span>WhatsApp Live Location Link</span>
                    <Badge variant="outline" className="text-primary border-primary/30">Active (+91 98110 23456)</Badge>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span>Driver Breathalyzer Zero-Tolerance</span>
                    <Badge variant="outline" className="text-success border-success/30">0.00% BAC · Cleared</Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STAGE 3: IN-TRANSIT & LIVE CHECKPOINTS */}
        {consignment.stage === 3 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-base font-semibold flex items-center gap-2">
                  <MapPin className="size-4 text-primary" />
                  Stage 3: In-Transit Checkpoints & WhatsApp Fuel Bill Upload
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Track journey milestones, complete checkpoints, and handle driver fuel refills with automated OCR.
                </p>
              </div>
              <Button onClick={() => advanceStage(4)} className="gap-1.5">
                Arrive at Destination <ArrowRight className="size-4" />
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-[1.2fr_1fr]">
              <div className="rounded-lg border border-border p-4 bg-card space-y-3">
                <h5 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                  Milestone Checkpoints (NH-48 Corridor)
                </h5>
                <div className="space-y-2.5">
                  {consignment.checkpoints.map((cp, idx) => (
                    <div
                      key={cp.name}
                      className="flex items-center justify-between p-2.5 rounded-md border border-border bg-muted/10 text-sm"
                    >
                      <div className="flex items-center gap-2.5">
                        {cp.completed ? (
                          <CheckCircle2 className="size-4 text-success" />
                        ) : (
                          <Clock className="size-4 text-muted-foreground" />
                        )}
                        <div>
                          <p className={`font-medium ${cp.completed ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {cp.name}
                          </p>
                          <p className="text-xs text-muted-foreground">Expected: {cp.time}</p>
                        </div>
                      </div>

                      {cp.completed ? (
                        <Badge variant="outline" className="text-success border-success/30 text-xs">Cleared</Badge>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => completeCheckpoint(idx)}>
                          Mark Cleared
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div className="rounded-lg border border-border p-4 bg-card space-y-3">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                      Driver Fuel Refill on Highway
                    </h5>
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-xs">
                      WhatsApp OCR
                    </Badge>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Driver refilled fuel at HPCL Kotputli and snapped the slip on WhatsApp (+91 98110 00100).
                  </p>

                  <div className="rounded-md border border-border/70 p-3 bg-muted/20 space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Pump:</span>
                      <span className="font-medium">HPCL Highway Oasis, Kotputli</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Litres Refilled:</span>
                      <span className="font-mono font-medium">62.50 L @ INR 89.50/L</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Bill:</span>
                      <span className="font-mono font-bold text-foreground">INR 5,593.75</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Mileage Calculated:</span>
                      <span className="font-medium text-success">3.85 km/L (Normal)</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full text-xs gap-1.5"
                      onClick={() => onTriggerFuelModal && onTriggerFuelModal()}
                    >
                      <Camera className="size-3.5" />
                      View Fuel Slip & OCR in Approvals
                    </Button>
                  </div>
                </div>

                <div className="rounded-lg border border-border p-4 bg-card">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase text-muted-foreground">Live Telemetry</span>
                    <Badge variant="outline" className="text-success border-success/30 animate-pulse">● Live GPS</Badge>
                  </div>
                  <p className="text-sm font-semibold mt-1">Current Speed: 62 km/h · Bearing: 215° SW</p>
                  <p className="text-xs text-muted-foreground">Near Jaipur Bypass · Next ETA: 14h 20m remaining</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STAGE 4: DELIVERY & ePOD */}
        {consignment.stage === 4 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-base font-semibold flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-success" />
                  Stage 4: Delivery, Unloading & Electronic Proof of Delivery (ePOD)
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Geofence arrival at consignee dock, dock dwell audit, and consignee sign-off.
                </p>
              </div>
              <Button onClick={() => advanceStage(5)} disabled={!consignment.pod} className="gap-1.5">
                Proceed to Round Trip / Backhaul <ArrowRight className="size-4" />
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-border p-4 bg-card space-y-3">
                <h5 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                  Consignee Dock Unloading
                </h5>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-border/50">
                    <span className="text-muted-foreground">Arrival Geofence:</span>
                    <span className="font-medium text-success">Entered Bhiwandi Central Dock (Auto-Detected)</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/50">
                    <span className="text-muted-foreground">Dock Dwell Time:</span>
                    <span className="font-medium">1h 45m (Within 2h Free Time · No Detention)</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/50">
                    <span className="text-muted-foreground">Bags Discharged:</span>
                    <span className="font-mono font-medium">640 Pallets Discharged in Full</span>
                  </div>
                </div>

                {!consignment.pod ? (
                  <Button size="sm" onClick={recordPod} className="w-full gap-1.5">
                    <Camera className="size-3.5" /> Capture Consignee Signature & e-POD
                  </Button>
                ) : (
                  <div className="rounded-md border border-success/30 bg-success/10 p-3 text-xs space-y-1">
                    <p className="font-medium text-success">✓ Clean Electronic POD Captured</p>
                    <p className="text-muted-foreground">
                      Signed by: <span className="font-medium text-foreground">{consignment.pod.signedBy}</span> · Shortages: 0 ·
                      Gate Pass Photo Verified
                    </p>
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-border p-4 bg-muted/10 space-y-3">
                <h5 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                  Customer Notification
                </h5>
                <p className="text-xs text-muted-foreground">
                  Upon POD capture, system automatically dispatches delivery confirmation, gate receipt photo, and signed ePOD to Reliance Retail Ltd via WhatsApp.
                </p>
                <div className="rounded-md border border-border bg-card p-3 text-xs font-mono text-muted-foreground">
                  [WhatsApp to Reliance Logistics Lead]
                  <br />
                  &quot;Consignment CN-2026-9901 delivered in full at Bhiwandi Dock. Signed POD attached. Invoice draft prepared.&quot;
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STAGE 5: ROUND TRIP / RETURN LEG */}
        {consignment.stage === 5 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-base font-semibold flex items-center gap-2">
                  <RotateCcw className="size-4 text-primary" />
                  Stage 5: Round Trip & Backhaul Consignment
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Eliminate empty miles by booking return freight from Mumbai/Pune back to Delhi NCR, or book an empty reposition run.
                </p>
              </div>
              <Button onClick={() => advanceStage(6)} disabled={consignment.returnTripType === 'NONE'} className="gap-1.5">
                Proceed to Final Settlement & Closure <ArrowRight className="size-4" />
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className={`rounded-lg border p-4 space-y-3 transition-colors ${
                consignment.returnTripType === 'BACKHAUL_LOAD' ? 'border-primary bg-primary/5' : 'border-border bg-card'
              }`}>
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="bg-success/15 text-success border-success/30">
                    Recommended (Highest Margin)
                  </Badge>
                  <span className="text-sm font-bold text-success">+ INR 1,45,000 Revenue</span>
                </div>
                <h5 className="text-sm font-semibold">Commercial Backhaul Load (Pune → Delhi)</h5>
                <p className="text-xs text-muted-foreground">
                  Consignor: Tata Motors Component Logistics. Cargo: 22 MT Precision Castings. Pickup: Pune Chakan Phase 2. Drop: Delhi Okhla.
                </p>
                <Button
                  size="sm"
                  variant={consignment.returnTripType === 'BACKHAUL_LOAD' ? 'default' : 'outline'}
                  onClick={() => startReturnTrip('BACKHAUL_LOAD')}
                  className="w-full"
                >
                  {consignment.returnTripType === 'BACKHAUL_LOAD' ? '✓ Backhaul Consignment Active' : 'Select Backhaul Freight'}
                </Button>
              </div>

              <div className={`rounded-lg border p-4 space-y-3 transition-colors ${
                consignment.returnTripType === 'EMPTY_REPOSITION' ? 'border-primary bg-primary/5' : 'border-border bg-card'
              }`}>
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-muted-foreground">Empty Repositioning</Badge>
                  <span className="text-xs text-muted-foreground">Fuel Cost Only</span>
                </div>
                <h5 className="text-sm font-semibold">Reposition Empty Trailer to Delhi Base</h5>
                <p className="text-xs text-muted-foreground">
                  Return trailer immediately without cargo to satisfy high-demand weekend dispatches at Okhla Central Hub.
                </p>
                <Button
                  size="sm"
                  variant={consignment.returnTripType === 'EMPTY_REPOSITION' ? 'default' : 'outline'}
                  onClick={() => startReturnTrip('EMPTY_REPOSITION')}
                  className="w-full"
                >
                  {consignment.returnTripType === 'EMPTY_REPOSITION' ? '✓ Empty Reposition Selected' : 'Select Empty Reposition'}
                </Button>
              </div>
            </div>

            {consignment.returnTripType !== 'NONE' && (
              <div className="p-3.5 rounded-lg border border-success/30 bg-success/5 text-xs flex items-center justify-between">
                <span>
                  Active Round-Trip Leg: <strong className="font-mono text-foreground">{consignment.returnConsignmentNo}</strong>
                </span>
                <span className="text-success font-medium">Round-Trip Cycle Complete</span>
              </div>
            )}
          </div>
        )}

        {/* STAGE 6: FINAL SETTLEMENT & IRN INVOICE */}
        {consignment.stage === 6 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-base font-semibold flex items-center gap-2">
                  <Coins className="size-4 text-success" />
                  Stage 6: Consignment Closure, Double-Entry Ledger & GST e-Invoice
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Final odometer reconciliation, driver settlement calculation, general ledger posting, and government IRN generation.
                </p>
              </div>
              {!consignment.settlement && (
                <Button onClick={finalizeSettlement} className="gap-1.5 bg-success hover:bg-success/90">
                  <Sparkles className="size-4" /> Finalize Settlement & Generate IRN
                </Button>
              )}
            </div>

            {consignment.settlement ? (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-lg border border-border p-3.5 bg-card">
                    <p className="text-xs text-muted-foreground uppercase">Total Round-Trip Freight</p>
                    <p className="text-xl font-bold font-mono mt-1 text-foreground">
                      INR {consignment.settlement.totalFreight.toLocaleString('en-IN')}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Primary leg + Return backhaul</p>
                  </div>

                  <div className="rounded-lg border border-border p-3.5 bg-card">
                    <p className="text-xs text-muted-foreground uppercase">Total Fuel Expended</p>
                    <p className="text-xl font-bold font-mono mt-1 text-foreground">
                      INR {consignment.settlement.fuelSpent.toLocaleString('en-IN')}
                    </p>
                    <p className="text-[11px] text-success mt-0.5">Within 2.8% of planned fuel budget</p>
                  </div>

                  <div className="rounded-lg border border-border p-3.5 bg-card">
                    <p className="text-xs text-muted-foreground uppercase">Driver Cash Advances</p>
                    <p className="text-xl font-bold font-mono mt-1 text-foreground">
                      INR {consignment.settlement.advancesPaid.toLocaleString('en-IN')}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Approved by Finance Dept</p>
                  </div>

                  <div className="rounded-lg border border-border p-3.5 bg-card">
                    <p className="text-xs text-muted-foreground uppercase">Driver Payout Balance</p>
                    <p className="text-xl font-bold font-mono mt-1 text-success">
                      INR {consignment.settlement.driverBalanceDue.toLocaleString('en-IN')}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Ready for instant NEFT payout</p>
                  </div>
                </div>

                <div className="rounded-lg border border-border p-4 bg-muted/10 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase text-muted-foreground">GST e-Invoicing Compliance (SAC 996511)</span>
                    <Badge variant="outline" className="bg-success/15 text-success border-success/30 text-xs">NIC Portal Synchronized</Badge>
                  </div>
                  <div className="p-3 bg-card rounded border border-border font-mono text-xs text-muted-foreground break-all">
                    IRN: {consignment.settlement.irnGenerated}
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                    <span>Double-entry ledger entry posted (Debit Trade Receivables / Credit Freight Revenue & GST Output Liability)</span>
                    <span className="text-success font-medium">✓ Audit Trail Law 5 Verified</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 rounded-lg border border-dashed border-border text-center space-y-2">
                <p className="text-sm font-medium">Trip execution completed. Ready for financial closure.</p>
                <p className="text-xs text-muted-foreground">
                  Click the button above to calculate final driver balances, post to double-entry general ledger, and register the GST e-Invoice.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
