import { Router, Response } from 'express';
import { z } from 'zod';
import { AppError } from '../../platform/errors.js';
import { AuthenticatedRequest } from '../../platform/types.js';
import { requirePermission } from '../../platform/middleware/authz.js';
import { store } from '../../db/store.js';

export const financeRouter = Router();

const createInvoiceSchema = z.object({
  tripId: z.string().optional(),
  clientName: z.string().min(2),
  clientGstin: z.string().min(15).max(15),
  freightAmount: z.number().positive(),
  detentionAmount: z.number().default(0),
  isInterState: z.boolean().default(false),
});

// List invoices
financeRouter.get('/invoices', requirePermission('read', 'invoices'), (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.auth!.tenantId;
  const status = req.query.status as string | undefined;
  const invoices = store.getInvoices(tenantId, status);
  res.json({ success: true, data: invoices, total: invoices.length });
});

// Invoice detail
financeRouter.get('/invoices/:invoiceId', requirePermission('read', 'invoices'), (req: AuthenticatedRequest, res: Response, next) => {
  const tenantId = req.auth!.tenantId;
  const invoice = store.getInvoiceById(tenantId, req.params.invoiceId);
  if (!invoice) {
    return next(AppError.notFound('Invoice', req.params.invoiceId));
  }
  res.json({ success: true, data: invoice });
});

// Create draft invoice
financeRouter.post('/invoices', requirePermission('write', 'invoices'), (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const tenantId = req.auth!.tenantId;
    const body = createInvoiceSchema.parse(req.body);

    const taxableAmount = body.freightAmount + body.detentionAmount;
    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;

    if (body.isInterState) {
      igstAmount = Number((taxableAmount * 0.05).toFixed(2));
    } else {
      cgstAmount = Number((taxableAmount * 0.025).toFixed(2));
      sgstAmount = Number((taxableAmount * 0.025).toFixed(2));
    }

    const totalAmount = taxableAmount + cgstAmount + sgstAmount + igstAmount;

    const newInvoice = store.createInvoice(tenantId, {
      ...body,
      taxableAmount,
      cgstAmount,
      sgstAmount,
      igstAmount,
      totalAmount,
    });

    res.status(201).json({ success: true, data: newInvoice });
  } catch (err) {
    next(err);
  }
});

// Finalise invoice (generate 64-char IRN & signed QR code per GST mandate)
financeRouter.post('/invoices/:invoiceId/finalise', requirePermission('write', 'invoices'), (req: AuthenticatedRequest, res: Response, next) => {
  const tenantId = req.auth!.tenantId;
  const finalised = store.finaliseInvoice(tenantId, req.params.invoiceId);
  if (!finalised) {
    return next(AppError.notFound('Invoice', req.params.invoiceId));
  }
  res.json({ success: true, data: finalised });
});

// Record invoice payment
financeRouter.post('/invoices/:invoiceId/pay', requirePermission('write', 'invoices'), (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const tenantId = req.auth!.tenantId;
    const { amount, paymentMode, bankReference } = z.object({
      amount: z.number().positive(),
      paymentMode: z.string().default('NEFT'),
      bankReference: z.string().min(3),
    }).parse(req.body);

    const inv = store.getInvoiceById(tenantId, req.params.invoiceId);
    if (!inv) {
      return next(AppError.notFound('Invoice', req.params.invoiceId));
    }

    inv.status = 'PAID';
    inv.paidAt = new Date().toISOString();
    inv.paymentDetails = { amount, paymentMode, bankReference };

    // Record in ledger
    store.appendLedgerEntry(tenantId, {
      referenceId: inv.id,
      referenceType: 'PAYMENT_RECEIVED',
      debitAccount: '1010-HDFC-Bank-Current-A/C',
      creditAccount: '1100-Trade-Receivables',
      amount,
      narration: `Payment received via ${paymentMode} ref: ${bankReference} for invoice ${inv.id}`,
    });

    res.json({ success: true, data: inv });
  } catch (err) {
    next(err);
  }
});

// Receivables DSO ageing
financeRouter.get('/receivables', requirePermission('read', 'invoices'), (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.auth!.tenantId;
  const invoices = store.getInvoices(tenantId);

  const unpaid = invoices.filter((i) => i.status !== 'PAID');
  const summary = {
    totalOutstanding: unpaid.reduce((sum, i) => sum + i.totalAmount, 0),
    buckets: {
      current: 0,
      days_1_30: 0,
      days_31_60: 0,
      days_61_90: 0,
      days_90_plus: 0,
    },
    invoices: unpaid,
  };

  for (const inv of unpaid) {
    const days = inv.dsoDays || 0;
    if (days <= 0) summary.buckets.current += inv.totalAmount;
    else if (days <= 30) summary.buckets.days_1_30 += inv.totalAmount;
    else if (days <= 60) summary.buckets.days_31_60 += inv.totalAmount;
    else if (days <= 90) summary.buckets.days_61_90 += inv.totalAmount;
    else summary.buckets.days_90_plus += inv.totalAmount;
  }

  res.json({ success: true, data: summary });
});
