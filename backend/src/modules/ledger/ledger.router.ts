import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../../platform/types.js';
import { requirePermission } from '../../platform/middleware/authz.js';
import { store } from '../../db/store.js';

export const ledgerRouter = Router();

ledgerRouter.get('/entries', requirePermission('read', 'ledger'), (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.auth!.tenantId;
  const entries = store.getLedgerEntries(tenantId);
  res.json({ success: true, data: entries, total: entries.length });
});

ledgerRouter.get('/trial-balance', requirePermission('read', 'ledger'), (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.auth!.tenantId;
  const entries = store.getLedgerEntries(tenantId);

  const accountBalances: Record<string, { debit: number; credit: number }> = {};

  for (const entry of entries) {
    if (!accountBalances[entry.debitAccount]) {
      accountBalances[entry.debitAccount] = { debit: 0, credit: 0 };
    }
    if (!accountBalances[entry.creditAccount]) {
      accountBalances[entry.creditAccount] = { debit: 0, credit: 0 };
    }

    accountBalances[entry.debitAccount].debit += entry.amount;
    accountBalances[entry.creditAccount].credit += entry.amount;
  }

  let totalDebit = 0;
  let totalCredit = 0;

  const rows = Object.entries(accountBalances).map(([accountName, bal]) => {
    totalDebit += bal.debit;
    totalCredit += bal.credit;
    return {
      account: accountName,
      debit: bal.debit,
      credit: bal.credit,
      net: bal.debit - bal.credit,
    };
  });

  res.json({
    success: true,
    data: {
      rows,
      totals: {
        totalDebit,
        totalCredit,
        isBalanced: Math.abs(totalDebit - totalCredit) < 0.01,
      },
    },
  });
});
