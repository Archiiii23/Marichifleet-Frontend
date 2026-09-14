import { Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AuthenticatedRequest } from '../types.js';

export function requestIdMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const reqId = (req.headers['x-request-id'] as string) || uuidv4();
  req.requestId = reqId;
  res.setHeader('X-Request-Id', reqId);
  next();
}
