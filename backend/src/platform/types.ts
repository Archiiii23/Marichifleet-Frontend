import { Request } from 'express';

export type UserRole =
  | 'FLEET_OWNER'
  | 'SUPER_ADMIN'
  | 'CONTROL_TOWER_LEAD'
  | 'TRACKING_EXECUTIVE'
  | 'DISPATCHER'
  | 'LOGISTICS_MANAGER'
  | 'BRANCH_MANAGER'
  | 'FINANCE_CONTROLLER'
  | 'BILLING_EXECUTIVE'
  | 'ACCOUNTS_PAYABLE'
  | 'SAFETY_OFFICER'
  | 'DRIVER'
  | 'BROKER'
  | 'VENDOR'
  | 'CONSIGNOR_ADMIN'
  | 'CONSIGNEE_USER'
  | 'AUDITOR';

export interface AuthContext {
  userId: string;
  email: string;
  name: string;
  tenantId: string;
  orgId: string;
  role: UserRole;
  branches: string[];
  permissions: string[];
}

export interface AuthenticatedRequest extends Request {
  auth?: AuthContext;
  requestId?: string;
  idempotencyKey?: string;
}
