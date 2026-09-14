import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types.js';

interface CachedResponse {
  status: number;
  body: unknown;
  headers: Record<string, string>;
}

const idempotencyStore = new Map<string, CachedResponse>();

export function idempotencyMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const idempotencyKey = req.headers['idempotency-key'] as string | undefined;

  if (!idempotencyKey || req.method === 'GET' || req.method === 'HEAD') {
    return next();
  }

  req.idempotencyKey = idempotencyKey;
  const tenantId = req.auth?.tenantId || 'global';
  const cacheKey = `${tenantId}:${req.method}:${req.path}:${idempotencyKey}`;

  const cached = idempotencyStore.get(cacheKey);
  if (cached) {
    res.setHeader('X-Idempotent-Replay', 'true');
    return res.status(cached.status).json(cached.body);
  }

  // Intercept json send to record cache
  const originalJson = res.json.bind(res);
  res.json = (body: unknown) => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      idempotencyStore.set(cacheKey, {
        status: res.statusCode,
        body,
        headers: {},
      });
      // Limit memory map
      if (idempotencyStore.size > 2000) {
        const firstKey = idempotencyStore.keys().next().value;
        if (firstKey) idempotencyStore.delete(firstKey);
      }
    }
    return originalJson(body);
  };

  next();
}
