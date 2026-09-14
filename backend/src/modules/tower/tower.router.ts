import { Router, Response } from 'express';
import { z } from 'zod';
import { AppError } from '../../platform/errors.js';
import { AuthenticatedRequest } from '../../platform/types.js';
import { requirePermission } from '../../platform/middleware/authz.js';
import { store } from '../../db/store.js';

export const towerRouter = Router();

// Live telemetry vehicles
towerRouter.get('/vehicles', requirePermission('read', 'tower'), (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.auth!.tenantId;
  const vehicles = store.getVehicles(tenantId);
  res.json({
    success: true,
    data: vehicles,
    timestamp: new Date().toISOString(),
  });
});

// Operational exceptions / alarms
towerRouter.get('/exceptions', requirePermission('read', 'tower'), (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.auth!.tenantId;
  const status = req.query.status as string | undefined;
  const exceptions = store.getExceptions(tenantId, status);
  res.json({ success: true, data: exceptions, total: exceptions.length });
});

// Resolve exception
towerRouter.post('/exceptions/:id/resolve', requirePermission('write', 'tower'), (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const tenantId = req.auth!.tenantId;
    const { resolutionNote } = z.object({ resolutionNote: z.string().min(3) }).parse(req.body);
    const resolved = store.resolveException(tenantId, req.params.id, resolutionNote);
    if (!resolved) {
      return next(AppError.notFound('Exception', req.params.id));
    }
    res.json({ success: true, data: resolved });
  } catch (err) {
    next(err);
  }
});

// Server-Sent Events (SSE) Realtime Stream (Decision #7 in backend.md)
towerRouter.get('/stream', (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.auth?.tenantId || 'tenant_delhi_01';

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  // Send initial frame
  const initialFrame = {
    type: 'CONNECTED',
    tenantId,
    timestamp: new Date().toISOString(),
    vehicles: store.getVehicles(tenantId),
  };
  res.write(`data: ${JSON.stringify(initialFrame)}\n\n`);

  // Emits slight vehicle jitter to simulate live moving trucks
  const interval = setInterval(() => {
    const vehicles = store.getVehicles(tenantId);
    if (vehicles.length > 0) {
      // Pick first vehicle and simulate minor movement
      const v = vehicles[0];
      if (v.status === 'IN_TRANSIT') {
        const jitterLat = (Math.random() - 0.5) * 0.005;
        const jitterLng = (Math.random() - 0.5) * 0.005;
        v.currentLocation.latitude += jitterLat;
        v.currentLocation.longitude += jitterLng;
        v.currentLocation.speedKmH = Math.floor(55 + Math.random() * 20);
        v.currentLocation.updatedAt = new Date().toISOString();

        const pingFrame = {
          type: 'POSITION_UPDATE',
          vehicleId: v.id,
          regNumber: v.regNumber,
          location: v.currentLocation,
          timestamp: new Date().toISOString(),
        };

        res.write(`data: ${JSON.stringify(pingFrame)}\n\n`);
      }
    }
  }, 4000);

  req.on('close', () => {
    clearInterval(interval);
  });
});
