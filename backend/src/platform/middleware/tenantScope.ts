import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types.js';
import { AppError } from '../errors.js';

export function tenantScopeMiddleware(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  if (!req.auth || !req.auth.tenantId) {
    return next(AppError.unauthorized('Tenant context missing'));
  }
  next();
}
