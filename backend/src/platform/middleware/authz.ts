import { AuthContext, UserRole } from '../types.js';
import { AppError } from '../errors.js';
import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types.js';

export type Action =
  | 'read'
  | 'write'
  | 'create'
  | 'delete'
  | 'approve'
  | 'override'
  | 'post_ledger'
  | 'assign_asset'
  | 'dispatch'
  | 'finalise_invoice';

export type Resource =
  | 'trips'
  | 'bookings'
  | 'vehicles'
  | 'drivers'
  | 'invoices'
  | 'ledger'
  | 'tower'
  | 'approvals'
  | 'rate_cards'
  | 'claims'
  | 'settings';

export function can(ctx: AuthContext, action: Action, resource: Resource): boolean {
  const { role } = ctx;

  // Super Admin & Fleet Owner have omnipotent read/write/approve access
  if (role === 'SUPER_ADMIN' || role === 'FLEET_OWNER') {
    return true;
  }

  switch (resource) {
    case 'trips':
    case 'tower':
      if (['CONTROL_TOWER_LEAD', 'TRACKING_EXECUTIVE', 'DISPATCHER', 'LOGISTICS_MANAGER', 'BRANCH_MANAGER'].includes(role)) {
        return true;
      }
      if (role === 'DRIVER' && (action === 'read' || action === 'write')) {
        return true; // Drivers can update their assigned trip checkpoints/POD
      }
      if (['CONSIGNOR_ADMIN', 'CONSIGNEE_USER'].includes(role) && action === 'read') {
        return true; // Portal read access
      }
      return action === 'read';

    case 'bookings':
      if (['DISPATCHER', 'LOGISTICS_MANAGER', 'BRANCH_MANAGER'].includes(role)) {
        return true;
      }
      if (['CONSIGNOR_ADMIN'].includes(role) && (action === 'create' || action === 'read')) {
        return true;
      }
      return action === 'read';

    case 'vehicles':
    case 'drivers':
      if (['LOGISTICS_MANAGER', 'BRANCH_MANAGER', 'SAFETY_OFFICER', 'DISPATCHER'].includes(role)) {
        return true;
      }
      return action === 'read';

    case 'invoices':
      if (['FINANCE_CONTROLLER', 'BILLING_EXECUTIVE'].includes(role)) {
        return true;
      }
      if (['ACCOUNTS_PAYABLE', 'AUDITOR', 'CONSIGNOR_ADMIN'].includes(role) && action === 'read') {
        return true;
      }
      return false;

    case 'ledger':
      if (role === 'FINANCE_CONTROLLER') {
        return true;
      }
      if (['AUDITOR', 'BILLING_EXECUTIVE'].includes(role) && action === 'read') {
        return true;
      }
      return false;

    case 'approvals':
      if (action === 'approve' || action === 'override') {
        return ['SUPER_ADMIN', 'FLEET_OWNER', 'FINANCE_CONTROLLER', 'CONTROL_TOWER_LEAD'].includes(role);
      }
      return true;

    case 'rate_cards':
      if (['FINANCE_CONTROLLER', 'LOGISTICS_MANAGER'].includes(role)) {
        return true;
      }
      return action === 'read';

    default:
      return false;
  }
}

export function requirePermission(action: Action, resource: Resource) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    if (!req.auth) {
      return next(AppError.unauthorized('Authentication context missing'));
    }

    if (!can(req.auth, action, resource)) {
      return next(
        AppError.forbidden(
          `Role ${req.auth.role} is not permitted to ${action} on ${resource}`
        )
      );
    }

    next();
  };
}
