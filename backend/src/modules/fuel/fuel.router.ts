import { Router, Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../../platform/types.js';
import { store } from '../../db/store.js';

export const fuelRouter = Router();

const ocrParseSchema = z.object({
  imageUrl: z.string().optional(),
  pumpName: z.string().optional(),
  volumeLitres: z.number().optional(),
  ratePerLitre: z.number().optional(),
  slipNumber: z.string().optional(),
});

const submitFuelBillSchema = z.object({
  vehicleRegNumber: z.string().min(4),
  driverPhone: z.string().default('+91 98110 23456'),
  tripId: z.string().optional(),
  pumpName: z.string().min(2),
  volumeLitres: z.number().positive(),
  ratePerLitre: z.number().positive(),
  totalAmount: z.number().positive(),
  slipNumber: z.string().min(2),
  odometerKm: z.number().optional(),
  receiptUrl: z.string().optional(),
});

// Run OCR on fuel receipt photo
fuelRouter.post('/ocr-parse', (req: AuthenticatedRequest, res: Response) => {
  const body = ocrParseSchema.parse(req.body);
  const result = store.parseFuelBillOcr(body.imageUrl, body);
  res.json({ success: true, data: result.extracted, confidence: result.confidence });
});

// Driver submits fuel bill (e.g. from WhatsApp or Driver app)
fuelRouter.post('/submit-bill', (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.auth?.tenantId || 'tenant_delhi_01';
  const data = submitFuelBillSchema.parse(req.body);

  // 1. Create Pending Approval for Finance Department
  const approval = store.createApproval(tenantId, {
    department: 'FINANCE',
    category: 'FUEL_REFILL',
    title: `Diesel Refill Slip: ${data.slipNumber} (${data.vehicleRegNumber})`,
    requestedBy: `Driver (${data.driverPhone})`,
    driverPhone: data.driverPhone,
    vehicleRegNumber: data.vehicleRegNumber,
    tripId: data.tripId || 'TRP-2026-00891',
    amount: data.totalAmount,
    fuelDetails: {
      pumpName: data.pumpName,
      volumeLitres: data.volumeLitres,
      ratePerLitre: data.ratePerLitre,
      totalAmount: data.totalAmount,
      slipNumber: data.slipNumber,
      odometerKm: data.odometerKm || 142640,
      calculatedMileage: '3.85 km/L (Normal)',
      receiptUrl: data.receiptUrl || 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=800&auto=format&fit=crop&q=80',
      geoCheckPassed: true,
    },
    reason: `In-transit fuel refill at ${data.pumpName}. Awaiting Finance approval before ledger posting.`,
  });

  // 2. Add WhatsApp readback message to driver
  store.addWhatsAppMessage(tenantId, {
    sender: 'SYSTEM',
    recipient: data.driverPhone,
    content: `🧾 DIESEL BILL PARSED (OCR):\nPump: ${data.pumpName}\nLitres: ${data.volumeLitres} L @ INR ${data.ratePerLitre}/L\nTotal: INR ${data.totalAmount.toLocaleString('en-IN')}\nSlip No: ${data.slipNumber}\n\nFinance approval ke liye forward kar diya hai. Approve hote hi aapko confirmation aayega.`,
    type: 'BILL_RECEIVED',
    timestamp: new Date().toISOString(),
  });

  res.status(201).json({
    success: true,
    message: 'Fuel bill parsed and routed to Finance Approval Inbox.',
    approval,
  });
});
