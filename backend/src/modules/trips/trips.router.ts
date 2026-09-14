import { Router, Response } from 'express';
import { z } from 'zod';
import { AppError } from '../../platform/errors.js';
import { AuthenticatedRequest } from '../../platform/types.js';
import { requirePermission } from '../../platform/middleware/authz.js';
import { store } from '../../db/store.js';

export const tripsRouter = Router();

const createTripSchema = z.object({
  bookingId: z.string().optional(),
  clientName: z.string().min(2),
  origin: z.string().min(2),
  destination: z.string().min(2),
  vehicleRegNumber: z.string().min(4),
  driverId: z.string().optional(),
  driverName: z.string().min(2),
  driverPhone: z.string().min(8),
  cargoDescription: z.string().default('General Cargo'),
  weightTons: z.number().positive(),
  totalDistanceKm: z.number().positive(),
  freightAmount: z.number().positive(),
  advancePaid: z.number().default(0),
});

const updateTripStatusSchema = z.object({
  status: z.enum(['PLANNED', 'DISPATCHED', 'AT_LOADING', 'IN_TRANSIT', 'DELIVERED', 'POD_SUBMITTED', 'CLOSED']),
  note: z.string().optional(),
  checkpointName: z.string().optional(),
});

const podSubmitSchema = z.object({
  signedByName: z.string().min(2),
  podPhotoUrl: z.string().optional(),
  receiverSignature: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  receivedUnits: z.number().optional(),
  shortageUnits: z.number().default(0),
  damageUnits: z.number().default(0),
});

// List trips
tripsRouter.get('/', requirePermission('read', 'trips'), (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.auth!.tenantId;
  const status = req.query.status as string | undefined;
  const vehicleRegNumber = req.query.vehicleRegNumber as string | undefined;

  const trips = store.getTrips(tenantId, { status, vehicleRegNumber });
  res.json({ success: true, data: trips, total: trips.length });
});

// Get trip detail
tripsRouter.get('/:tripId', requirePermission('read', 'trips'), (req: AuthenticatedRequest, res: Response, next) => {
  const tenantId = req.auth!.tenantId;
  const trip = store.getTripById(tenantId, req.params.tripId);
  if (!trip) {
    return next(AppError.notFound('Trip', req.params.tripId));
  }
  res.json({ success: true, data: trip });
});

// Create trip
tripsRouter.post('/', requirePermission('create', 'trips'), (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const tenantId = req.auth!.tenantId;
    const body = createTripSchema.parse(req.body);
    const newTrip = store.createTrip(tenantId, body);
    res.status(201).json({ success: true, data: newTrip });
  } catch (err) {
    next(err);
  }
});

// Update trip status
tripsRouter.patch('/:tripId/status', requirePermission('write', 'trips'), (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const tenantId = req.auth!.tenantId;
    const { status, checkpointName } = updateTripStatusSchema.parse(req.body);
    
    const patch: any = { status };
    if (status === 'IN_TRANSIT' && !patch.dispatchedAt) {
      patch.dispatchedAt = new Date().toISOString();
    }
    if (status === 'DELIVERED') {
      patch.deliveredAt = new Date().toISOString();
    }

    const updated = store.updateTrip(tenantId, req.params.tripId, patch);
    if (!updated) {
      return next(AppError.notFound('Trip', req.params.tripId));
    }

    if (checkpointName) {
      updated.checkpoints = updated.checkpoints || [];
      updated.checkpoints.push({
        name: checkpointName,
        timestamp: new Date().toISOString(),
        status: 'COMPLETED',
      });
    }

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// Submit ePOD
tripsRouter.post('/:tripId/pod', requirePermission('write', 'trips'), (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const tenantId = req.auth!.tenantId;
    const podData = podSubmitSchema.parse(req.body);

    const trip = store.getTripById(tenantId, req.params.tripId);
    if (!trip) {
      return next(AppError.notFound('Trip', req.params.tripId));
    }

    const podRecord = {
      ...podData,
      submittedAt: new Date().toISOString(),
      submittedByRole: req.auth!.role,
      submittedByUserId: req.auth!.userId,
      isCleanPOD: (podData.shortageUnits || 0) === 0 && (podData.damageUnits || 0) === 0,
    };

    const updated = store.updateTrip(tenantId, req.params.tripId, {
      status: 'POD_SUBMITTED',
      pod: podRecord,
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// Trip events timeline
tripsRouter.get('/:tripId/events', requirePermission('read', 'trips'), (req: AuthenticatedRequest, res: Response, next) => {
  const tenantId = req.auth!.tenantId;
  const trip = store.getTripById(tenantId, req.params.tripId);
  if (!trip) {
    return next(AppError.notFound('Trip', req.params.tripId));
  }

  const events = [
    { type: 'TRIP_CREATED', timestamp: trip.createdAt || trip.dispatchedAt, details: 'Trip order booked and route optimized.' },
    { type: 'ASSET_ASSIGNED', timestamp: trip.dispatchedAt, details: `Vehicle ${trip.vehicleRegNumber} and Driver ${trip.driverName} locked.` },
    ...(trip.checkpoints || []).map((cp: any) => ({
      type: 'CHECKPOINT_CROSS',
      timestamp: cp.timestamp,
      details: `Crossed checkpoint: ${cp.name}`,
    })),
    ...(trip.pod ? [{ type: 'POD_SUBMITTED', timestamp: trip.pod.submittedAt, details: `e-POD captured by ${trip.pod.signedByName}. Clean POD: ${trip.pod.isCleanPOD}` }] : []),
  ];

  res.json({ success: true, data: events });
});
