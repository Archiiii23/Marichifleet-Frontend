import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { AuthContext, AuthenticatedRequest, UserRole } from '../types.js';

const DEFAULT_DEMO_CONTEXT: AuthContext = {
  userId: 'usr_owner_01',
  email: 'owner@marichifleet.com',
  name: 'Rajesh Sharma',
  tenantId: 'tenant_delhi_01',
  orgId: 'org_marichi_logistics',
  role: 'FLEET_OWNER',
  branches: ['DL-Okhla', 'MH-Bhiwandi', 'KA-Peenya'],
  permissions: ['*'],
};

export function authMiddleware(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const demoRoleHeader = req.headers['x-demo-role'] as UserRole | undefined;
  const tenantIdHeader = req.headers['x-tenant-id'] as string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as AuthContext;
      req.auth = {
        ...decoded,
        tenantId: tenantIdHeader || decoded.tenantId || DEFAULT_DEMO_CONTEXT.tenantId,
      };
      return next();
    } catch {
      // If token invalid, allow demo fallback in development
      if (env.NODE_ENV === 'production') {
        return next();
      }
    }
  }

  // Development/demo mode fallback with dynamic persona simulation
  const role: UserRole = demoRoleHeader || 'FLEET_OWNER';
  req.auth = {
    ...DEFAULT_DEMO_CONTEXT,
    role,
    tenantId: tenantIdHeader || DEFAULT_DEMO_CONTEXT.tenantId,
  };

  next();
}
