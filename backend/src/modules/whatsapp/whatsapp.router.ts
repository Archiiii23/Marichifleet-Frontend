import { Router, Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../../platform/types.js';
import { store } from '../../db/store.js';

export const whatsappRouter = Router();

// Get conversation messages
whatsappRouter.get('/messages', (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.auth?.tenantId || 'tenant_delhi_01';
  const phone = req.query.phone as string | undefined;
  const messages = store.getWhatsAppMessages(tenantId, phone);
  res.json({ success: true, data: messages });
});

// Driver sends message to WhatsApp bot
whatsappRouter.post('/send', (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.auth?.tenantId || 'tenant_delhi_01';
  const { phone, content, senderName, mediaUrl } = z.object({
    phone: z.string().default('+91 98110 23456'),
    content: z.string().min(1),
    senderName: z.string().default('Ramesh Kumar'),
    mediaUrl: z.string().optional(),
  }).parse(req.body);

  const newMsg = store.addWhatsAppMessage(tenantId, {
    sender: 'DRIVER',
    senderName,
    senderPhone: phone,
    content,
    mediaUrl,
    type: mediaUrl ? 'IMAGE_BILL' : 'TEXT',
  });

  // Automated keyword intent detection
  const lower = content.toLowerCase();
  if (lower.includes('advance')) {
    // Extract amount if present e.g. "advance 4000"
    const match = content.match(/\d+/);
    const amount = match ? Number(match[0]) : 3000;

    store.createApproval(tenantId, {
      department: 'FINANCE',
      category: 'CASH_ADVANCE',
      title: `Driver Cash Advance Request (INR ${amount.toLocaleString('en-IN')})`,
      requestedBy: `${senderName} (Driver)`,
      driverPhone: phone,
      vehicleRegNumber: 'NL01AC2849',
      tripId: 'TRP-2026-00891',
      amount,
      reason: `Driver requested en-route advance via WhatsApp message: "${content}".`,
    });

    store.addWhatsAppMessage(tenantId, {
      sender: 'SYSTEM',
      recipient: phone,
      content: `Aapka INR ${amount.toLocaleString('en-IN')} ka cash advance request Finance manager ko bhej diya hai. Approve hote hi confirmation mil jayegi.`,
      type: 'TEXT',
    });
  }

  res.json({ success: true, data: newMsg });
});

// Driver updates or shares WhatsApp live location
whatsappRouter.post('/live-location', (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.auth?.tenantId || 'tenant_delhi_01';
  const { vehicleRegNumber, latitude, longitude, speedKmH, driverPhone, driverName } = z.object({
    vehicleRegNumber: z.string().default('NL01AC2849'),
    latitude: z.number(),
    longitude: z.number(),
    speedKmH: z.number().default(55),
    driverPhone: z.string().default('+91 98110 23456'),
    driverName: z.string().default('Ramesh Kumar'),
  }).parse(req.body);

  const loc = store.updateLiveLocation(tenantId, vehicleRegNumber, {
    latitude,
    longitude,
    speedKmH,
    driverPhone,
    driverName,
    isLive: true,
    isDropped: false,
  });

  res.json({ success: true, data: loc, message: 'WhatsApp live location synchronized with fleet.' });
});

// Simulate Live Location Dropout (>15m timeout or driver turns off location)
whatsappRouter.post('/simulate-drop', (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.auth?.tenantId || 'tenant_delhi_01';
  const { vehicleRegNumber } = z.object({
    vehicleRegNumber: z.string().default('NL01AC2849'),
  }).parse(req.body);

  const result = store.simulateLocationDrop(tenantId, vehicleRegNumber);
  res.json({
    success: true,
    data: result,
    message: 'Live location signal dropped. Automated WhatsApp alert dispatched to driver.',
  });
});

// Driver re-shares location after drop alert
whatsappRouter.post('/resend-location', (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.auth?.tenantId || 'tenant_delhi_01';
  const { vehicleRegNumber, latitude, longitude } = z.object({
    vehicleRegNumber: z.string().default('NL01AC2849'),
    latitude: z.number().default(26.9200),
    longitude: z.number().default(75.8000),
  }).parse(req.body);

  const loc = store.updateLiveLocation(tenantId, vehicleRegNumber, {
    latitude,
    longitude,
    speedKmH: 58,
    isLive: true,
    isDropped: false,
  });

  store.addWhatsAppMessage(tenantId, {
    sender: 'SYSTEM',
    recipient: loc.driverPhone,
    content: `✅ Dhanyawad Ramesh bhai! Aapki WhatsApp Live Location dobara connect ho gayi hai. Truck tracking is now ACTIVE.`,
    type: 'LOCATION_RESTORED',
  });

  res.json({ success: true, data: loc, message: 'Live location restored successfully.' });
});
