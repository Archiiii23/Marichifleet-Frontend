import React, { useState, useEffect } from 'react';
import {
  Send,
  Camera,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  Phone,
  MoreVertical,
  RotateCcw,
  RefreshCw,
  Sparkles,
  FileText,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export interface WhatsAppMessage {
  id: string;
  sender: 'DRIVER' | 'SYSTEM';
  senderName?: string;
  content: string;
  timestamp: string;
  type: 'TEXT' | 'IMAGE_BILL' | 'LOCATION' | 'LOCATION_DROP_ALERT' | 'APPROVAL_CONFIRMATION';
  mediaUrl?: string;
  fuelDetails?: {
    pumpName: string;
    volumeLitres: number;
    ratePerLitre: number;
    totalAmount: number;
    slipNumber: string;
  };
}

const INITIAL_MESSAGES: WhatsAppMessage[] = [
  {
    id: 'm1',
    sender: 'SYSTEM',
    content: 'NAYA TRIP - TRP-2026-00891\nDelhi Okhla -> Mumbai Bhiwandi (1,420 km)\nMaal: FMCG Goods 28.5T\nGaadi: NL01AC2849\nAdvance: INR 8,000 diesel\n\n[HAAN, LE LUNGA]  [NAHI LE SAKTA]',
    timestamp: '08:12 AM',
    type: 'TEXT',
  },
  {
    id: 'm2',
    sender: 'DRIVER',
    senderName: 'Ramesh Kumar',
    content: 'HAAN, LE LUNGA',
    timestamp: '08:14 AM',
    type: 'TEXT',
  },
  {
    id: 'm3',
    sender: 'SYSTEM',
    content: 'Theek hai Ramesh bhai. Trip confirm ho gaya. Advance INR 8,000 Finance dwara approve ho gaya hai. Kripya nikalte waqt WhatsApp live location share karein.',
    timestamp: '08:15 AM',
    type: 'APPROVAL_CONFIRMATION',
  },
  {
    id: 'm4',
    sender: 'DRIVER',
    senderName: 'Ramesh Kumar',
    content: '📍 Live location shared (8 hours)',
    timestamp: '08:20 AM',
    type: 'LOCATION',
  },
];

export function WhatsAppDriverSimulator({
  onFuelBillSubmitted,
  onLocationStatusChanged,
}: {
  onFuelBillSubmitted?: (bill: any) => void;
  onLocationStatusChanged?: (isLive: boolean, isDropped: boolean) => void;
}) {
  const [messages, setMessages] = useState<WhatsAppMessage[]>(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState('');
  const [isLocationLive, setIsLocationLive] = useState(true);
  const [isLocationDropped, setIsLocationDropped] = useState(false);
  const [isParsingBill, setIsParsingBill] = useState(false);

  const sendMessage = (text: string) => {
    if (!text.trim()) return;
    const newMsg: WhatsAppMessage = {
      id: `m_${Date.now()}`,
      sender: 'DRIVER',
      senderName: 'Ramesh Kumar',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'TEXT',
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputText('');

    // If driver asks for advance via text e.g. "advance 4000"
    if (text.toLowerCase().includes('advance')) {
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: `sys_${Date.now()}`,
            sender: 'SYSTEM',
            content: 'Aapka cash advance request Finance department ko forward kar diya hai. Approval aate hi notification mil jayegi.',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            type: 'TEXT',
          },
        ]);
      }, 700);
    }
  };

  // Simulate driver snapping and sending fuel receipt photo
  const simulateFuelBillUpload = () => {
    setIsParsingBill(true);
    const slipNumber = `HP-${Math.floor(100000 + Math.random() * 900000)}`;
    const pumpName = 'HPCL Highway Oasis, NH-48 Kotputli';
    const volumeLitres = 65.4;
    const ratePerLitre = 89.5;
    const totalAmount = Number((volumeLitres * ratePerLitre).toFixed(2));

    const driverMsg: WhatsAppMessage = {
      id: `m_fuel_${Date.now()}`,
      sender: 'DRIVER',
      senderName: 'Ramesh Kumar',
      content: 'Bhai Kotputli HPCL se diesel bharwaya hai. Bill ka photo bhej raha hoon.',
      mediaUrl: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=800&auto=format&fit=crop&q=80',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'IMAGE_BILL',
      fuelDetails: { pumpName, volumeLitres, ratePerLitre, totalAmount, slipNumber },
    };

    setMessages((prev) => [...prev, driverMsg]);

    setTimeout(() => {
      setIsParsingBill(false);
      const botResponse: WhatsAppMessage = {
        id: `sys_ocr_${Date.now()}`,
        sender: 'SYSTEM',
        content: `🧾 DIESEL BILL PARSED (AI OCR):\nPump: ${pumpName}\nLitres: ${volumeLitres} L @ INR ${ratePerLitre}/L\nTotal: INR ${totalAmount.toLocaleString('en-IN')}\nSlip No: ${slipNumber}\nMileage: 3.85 km/L (Normal)\n\nFinance Department approval ke liye bhej diya hai. Approve hote hi confirmation aa jayega.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: 'TEXT',
      };
      setMessages((prev) => [...prev, botResponse]);

      toast.success('Fuel Bill Parsed & Forwarded to Finance', {
        description: `INR ${totalAmount.toLocaleString('en-IN')} pending in Finance Approvals Inbox.`,
      });

      if (onFuelBillSubmitted) {
        onFuelBillSubmitted({
          pumpName,
          volumeLitres,
          ratePerLitre,
          totalAmount,
          slipNumber,
          driverName: 'Ramesh Kumar',
          vehicleRegNumber: 'NL01AC2849',
        });
      }
    }, 1200);
  };

  // Simulate location dropping (e.g. driver closed app or signal lost)
  const simulateLocationDrop = () => {
    setIsLocationLive(false);
    setIsLocationDropped(true);

    if (onLocationStatusChanged) {
      onLocationStatusChanged(false, true);
    }

    toast.warning('⚠️ WhatsApp Live Location Lost', {
      description: 'Automated alert message dispatched to Driver Ramesh Kumar.',
    });

    setTimeout(() => {
      const alertMsg: WhatsAppMessage = {
        id: `sys_drop_${Date.now()}`,
        sender: 'SYSTEM',
        content: '⚠️ ALERT: Ramesh bhai, aapki WhatsApp Live Location signal drop ho gayi hai (> 15 min no ping). Kripya chat me "Share Live Location" (8 Hours) par tap karein taaki truck tracking sync rahe.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: 'LOCATION_DROP_ALERT',
      };
      setMessages((prev) => [...prev, alertMsg]);
    }, 500);
  };

  // Driver re-shares location
  const resendLocation = () => {
    setIsLocationLive(true);
    setIsLocationDropped(false);

    if (onLocationStatusChanged) {
      onLocationStatusChanged(true, false);
    }

    const driverMsg: WhatsAppMessage = {
      id: `m_loc_${Date.now()}`,
      sender: 'DRIVER',
      senderName: 'Ramesh Kumar',
      content: '📍 Live location shared again (8 hours)',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'LOCATION',
    };

    const sysConfirm: WhatsAppMessage = {
      id: `sys_loc_${Date.now()}`,
      sender: 'SYSTEM',
      content: '✅ Dhanyawad Ramesh bhai! Live location dobara connect ho gayi hai. Truck tracking is now ACTIVE in Control Tower.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'TEXT',
    };

    setMessages((prev) => [...prev, driverMsg, sysConfirm]);
    toast.success('Live Location Restored', {
      description: 'Vehicle NL01AC2849 GPS stream is now synchronized.',
    });
  };

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden flex flex-col h-[680px]">
      {/* WhatsApp Chat Header */}
      <div className="bg-[#075E54] text-white p-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="size-10 rounded-full bg-[#128C7E] flex items-center justify-center font-bold text-sm">
              RK
            </div>
            <span
              className={`absolute bottom-0 right-0 size-3 rounded-full border-2 border-[#075E54] ${
                isLocationDropped ? 'bg-rose-500' : 'bg-emerald-400'
              }`}
            />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-sm">Ramesh Kumar (Driver · NL01AC2849)</h4>
              <Badge variant="outline" className="bg-emerald-500/20 text-emerald-200 border-emerald-400/30 text-[10px] py-0">
                +91 98110 23456
              </Badge>
            </div>
            <p className="text-[11px] text-emerald-100/80">
              {isLocationDropped
                ? '⚠️ Live location signal lost'
                : isLocationLive
                ? '🟢 WhatsApp Live Location Active (8h)'
                : 'Online'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-emerald-100">
          <ShieldCheck className="size-4 text-emerald-300" />
          <span className="hidden sm:inline">Verified Driver Channel</span>
        </div>
      </div>

      {/* Simulator Action Toolbar */}
      <div className="bg-muted/40 border-b border-border p-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="font-medium text-muted-foreground">Driver Simulation Triggers:</span>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1 border-primary/40 bg-primary/5 hover:bg-primary/10 text-primary"
            onClick={simulateFuelBillUpload}
            disabled={isParsingBill}
          >
            <Camera className="size-3.5" />
            {isParsingBill ? 'Parsing Slip...' : '📸 Snap & Send Fuel Bill'}
          </Button>

          {isLocationDropped ? (
            <Button
              size="sm"
              className="h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={resendLocation}
            >
              <RefreshCw className="size-3.5" />
              Re-share Live Location
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1 border-amber-500/40 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20"
              onClick={simulateLocationDrop}
            >
              <AlertTriangle className="size-3.5" />
              Simulate Signal Drop
            </Button>
          )}

          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs text-muted-foreground gap-1"
            onClick={() => setMessages(INITIAL_MESSAGES)}
          >
            <RotateCcw className="size-3" />
            Reset
          </Button>
        </div>
      </div>

      {/* Chat Messages List (Styled like WhatsApp wallpaper) */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#EFEAE2] dark:bg-zinc-950/70">
        {messages.map((m) => {
          const isDriver = m.sender === 'DRIVER';
          return (
            <div key={m.id} className={`flex ${isDriver ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] sm:max-w-[70%] rounded-lg p-3 text-xs shadow-sm space-y-1.5 ${
                  isDriver
                    ? 'bg-[#E7FFDB] text-zinc-900 dark:bg-emerald-950/70 dark:text-emerald-50 rounded-tr-none'
                    : m.type === 'LOCATION_DROP_ALERT'
                    ? 'bg-rose-50 border border-rose-300 text-rose-950 dark:bg-rose-950/60 dark:text-rose-100 dark:border-rose-800'
                    : 'bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100 rounded-tl-none'
                }`}
              >
                {/* Media preview if bill photo */}
                {m.mediaUrl && (
                  <div className="rounded overflow-hidden border border-border/40 mb-1">
                    <img src={m.mediaUrl} alt="Fuel Receipt" className="w-full h-36 object-cover" />
                  </div>
                )}

                {/* Message Content */}
                <p className="whitespace-pre-line leading-relaxed">{m.content}</p>

                {/* If location drop alert, show quick action button */}
                {m.type === 'LOCATION_DROP_ALERT' && (
                  <div className="pt-1.5">
                    <Button
                      size="sm"
                      onClick={resendLocation}
                      className="w-full h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                    >
                      <MapPin className="size-3.5" />
                      Re-share Live Location (8h)
                    </Button>
                  </div>
                )}

                <div className="flex items-center justify-end gap-1 text-[10px] text-zinc-500 dark:text-zinc-400">
                  <span>{m.timestamp}</span>
                  {isDriver && <span className="text-blue-500 font-bold">✓✓</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input Bar */}
      <div className="p-3 bg-muted/30 border-t border-border flex items-center gap-2">
        <Input
          placeholder="Type message in Hindi or English (e.g., 'advance 4000')..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') sendMessage(inputText);
          }}
          className="h-9 text-xs"
        />
        <Button size="sm" onClick={() => sendMessage(inputText)} className="h-9 gap-1">
          <Send className="size-3.5" />
          Send
        </Button>
      </div>
    </div>
  );
}
