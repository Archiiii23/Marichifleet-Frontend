import { Router, Response } from 'express';
import { z } from 'zod';
import { AppError } from '../../platform/errors.js';
import { AuthenticatedRequest } from '../../platform/types.js';
import { requirePermission } from '../../platform/middleware/authz.js';
import { store } from '../../db/store.js';

export const approvalsRouter = Router();

const decideSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED']),
  comment: z.string().optional(),
});

approvalsRouter.get('/', requirePermission('read', 'approvals'), (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.auth!.tenantId;
  const status = req.query.status as string | undefined;
  const department = req.query.department as string | undefined;
  const category = req.query.category as string | undefined;
  const items = store.getApprovals(tenantId, { status, department, category });
  res.json({ success: true, data: items, total: items.length });
});

approvalsRouter.post('/:id/decide', requirePermission('approve', 'approvals'), (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const tenantId = req.auth!.tenantId;
    const { decision, comment } = decideSchema.parse(req.body);

    const updated = store.decideApproval(
      tenantId,
      req.params.id,
      decision,
      `${req.auth!.name} (${req.auth!.role})`,
      comment
    );

    if (!updated) {
      return next(AppError.notFound('Approval item', req.params.id));
    }

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});
