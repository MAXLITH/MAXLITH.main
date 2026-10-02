import db from './db';
import { toPaise, fromPaise } from './money';
import { newId } from './ids';

export type LedgerDirection = 'CREDIT' | 'DEBIT';
export type LedgerAccountKind = 'CASH' | 'SECURITIES' | 'CHARGES' | 'BLOCKED_MARGIN';
export type LedgerRefType = 'INITIAL_CAPITAL' | 'TRADE_BUY' | 'TRADE_SELL' | 'CHARGES' | 'MARGIN_BLOCK' | 'MARGIN_RELEASE' | 'ACCOUNT_RESET';

export interface LedgerEntryRecord {
  id: string;
  user_id: string;
  direction: LedgerDirection;
  account_kind: LedgerAccountKind;
  amount_paise: number;
  ref_type?: LedgerRefType;
  ref_id?: string;
  memo?: string;
  created_at?: string;
}

/**
 * Record a ledger entry in the ledger_entries table
 */
export function recordLedgerEntry(entry: {
  userId: string;
  direction: LedgerDirection;
  accountKind: LedgerAccountKind;
  amountPaise: number;
  refType?: LedgerRefType;
  refId?: string;
  memo?: string;
}): LedgerEntryRecord {
  const id = newId('led');
  const record: LedgerEntryRecord = {
    id,
    user_id: entry.userId,
    direction: entry.direction,
    account_kind: entry.accountKind,
    amount_paise: Math.round(entry.amountPaise),
    ref_type: entry.refType,
    ref_id: entry.refId,
    memo: entry.memo,
  };

  db.prepare(`
    INSERT INTO ledger_entries (id, user_id, direction, account_kind, amount_paise, ref_type, ref_id, memo, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `).run(
    record.id,
    record.user_id,
    record.direction,
    record.account_kind,
    record.amount_paise,
    record.ref_type || null,
    record.ref_id || null,
    record.memo || null
  );

  return record;
}

/**
 * Reconcile user's wallet against all CASH ledger entries
 */
export function reconcileWallet(userId: string): {
  storedVirtualCash: number;
  ledgerCalculatedCash: number;
  isReconciled: boolean;
  differencePaise: number;
} {
  const user = db.prepare('SELECT virtual_cash FROM users WHERE id = ?').get(userId) as { virtual_cash: number } | undefined;
  if (!user) {
    throw new Error('User not found');
  }

  const rows = db.prepare(`
    SELECT direction, SUM(amount_paise) as total_paise
    FROM ledger_entries
    WHERE user_id = ? AND account_kind = 'CASH'
    GROUP BY direction
  `).all(userId) as { direction: LedgerDirection; total_paise: number }[];

  let creditsPaise = 0;
  let debitsPaise = 0;

  for (const r of rows) {
    if (r.direction === 'CREDIT') creditsPaise = r.total_paise || 0;
    if (r.direction === 'DEBIT') debitsPaise = r.total_paise || 0;
  }

  const netCashPaise = creditsPaise - debitsPaise;
  const ledgerCalculatedCash = fromPaise(netCashPaise);
  const storedPaise = toPaise(user.virtual_cash);
  const diffPaise = Math.abs(storedPaise - netCashPaise);

  return {
    storedVirtualCash: user.virtual_cash,
    ledgerCalculatedCash,
    isReconciled: diffPaise <= 1, // allow 1 paise rounding tolerance
    differencePaise: diffPaise,
  };
}
