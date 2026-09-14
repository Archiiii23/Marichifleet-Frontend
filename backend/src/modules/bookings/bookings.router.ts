import { Router, Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../../platform/types.js';
import { requirePermission } from '../../platform/middleware/authz.js';
import { store } from '../../db/store.js';

export const bookingsRouter = Router();

const createBookingSchema = z.object({
  clientName: z.string().min(2),
  pickupLocation: z.string().min(2),
  deliveryLocation: z.string().min(2),
  expectedWeightTons: z.number().positive(),
  vehicleTypeRequired: z.string().default('CONTAINER_CLOSED'),
  quotedRate: z.number().positive(),
});

bookingsRouter.get('/', requirePermission('read', 'bookings'), (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.auth!.tenantId;
  const bookings = store.getBookings(tenantId);
  res.json({ success: true, data: bookings, total: bookings.length });
});

bookingsRouter.post('/', requirePermission('create', 'bookings'), (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const tenantId = req.auth!.tenantId;
    const body = createBookingSchema.parse(req.body);
    const newBooking = store.createBooking(tenantId, body);
    res.status(201).json({ success: true, data: newBooking });
  } catch (err) {
    next(err);
  }
});
