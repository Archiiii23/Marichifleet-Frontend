import { Router, Response } from 'express';
import { AppError } from '../../platform/errors.js';
import { AuthenticatedRequest } from '../../platform/types.js';
import { requirePermission } from '../../platform/middleware/authz.js';
import { store } from '../../db/store.js';

export const fleetRouter = Router();

// Vehicles
fleetRouter.get('/vehicles', requirePermission('read', 'vehicles'), (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.auth!.tenantId;
  const status = req.query.status as string | undefined;
  const vehicles = store.getVehicles(tenantId, status);
  res.json({ success: true, data: vehicles, total: vehicles.length });
});

fleetRouter.get('/vehicles/:vehicleId', requirePermission('read', 'vehicles'), (req: AuthenticatedRequest, res: Response, next) => {
  const tenantId = req.auth!.tenantId;
  const vehicle = store.getVehicleById(tenantId, req.params.vehicleId);
  if (!vehicle) {
    return next(AppError.notFound('Vehicle', req.params.vehicleId));
  }
  res.json({ success: true, data: vehicle });
});

fleetRouter.post('/vehicles', requirePermission('create', 'vehicles'), (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const tenantId = req.auth!.tenantId;
    const newVehicle = store.createVehicle(tenantId, req.body);
    res.status(201).json({ success: true, data: newVehicle, message: `Vehicle ${newVehicle.regNumber} registered successfully.` });
  } catch (err) {
    next(err);
  }
});

// Drivers
fleetRouter.get('/drivers', requirePermission('read', 'drivers'), (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.auth!.tenantId;
  const drivers = store.getDrivers(tenantId);
  res.json({ success: true, data: drivers, total: drivers.length });
});

fleetRouter.get('/drivers/:driverId', requirePermission('read', 'drivers'), (req: AuthenticatedRequest, res: Response, next) => {
  const tenantId = req.auth!.tenantId;
  const driver = store.getDriverById(tenantId, req.params.driverId);
  if (!driver) {
    return next(AppError.notFound('Driver', req.params.driverId));
  }
  res.json({ success: true, data: driver });
});

fleetRouter.post('/drivers', requirePermission('create', 'drivers'), (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const tenantId = req.auth!.tenantId;
    const newDriver = store.createDriver(tenantId, req.body);
    res.status(201).json({ success: true, data: newDriver, message: `Driver ${newDriver.name} onboarded successfully.` });
  } catch (err) {
    next(err);
  }
});
