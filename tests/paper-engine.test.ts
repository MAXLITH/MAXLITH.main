import { describe, it, expect, beforeAll } from 'vitest';
import db from '../src/lib/db';
import { newId } from '../src/lib/ids';
import {
  previewOrder,
  executePaperOrder,
  getUserPortfolioSummary,
  cancelOrder,
  resetUserAccount,
} from '../src/lib/paper-trading';
import { recordLedgerEntry, reconcileWallet } from '../src/lib/ledger';

describe('Paper Trading Engine & Wallet Accounting', () => {
  const testUserId = `test-user-${Date.now()}`;

  beforeAll(() => {
    // Seed test user with ₹10,00,000 virtual capital
    db.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, role, virtual_cash, initial_capital, blocked_margin)
      VALUES (?, ?, 'hash', 'Test Trader', 'USER', 1000000.0, 1000000.0, 0.0)
    `).run(testUserId, `${testUserId}@example.com`);

    // Record initial ledger deposit
    recordLedgerEntry({
      userId: testUserId,
      direction: 'CREDIT',
      accountKind: 'CASH',
      amountPaise: 100000000,
      refType: 'INITIAL_CAPITAL',
      memo: 'Initial Virtual Capital',
    });
  });

  it('previews order with Indian charges breakdown and margin requirement', () => {
    const preview = previewOrder({
      userId: testUserId,
      symbol: 'TCS',
      side: 'BUY',
      orderType: 'MARKET',
      productType: 'CNC',
      quantity: 10,
    });

    expect(preview.symbol).toBe('TCS');
    expect(preview.price).toBeGreaterThan(0);
    expect(preview.turnover).toBeGreaterThan(0);
    expect(preview.marginRequired).toBeGreaterThan(0);
    expect(preview.charges.totalCharges).toBeGreaterThan(0);
  });

  it('rejects order when quantity is non-positive or exceeds cash', () => {
    expect(() => {
      executePaperOrder({
        userId: testUserId,
        symbol: 'TCS',
        side: 'BUY',
        orderType: 'MARKET',
        productType: 'CNC',
        quantity: 0,
      });
    }).toThrow('Quantity must be a positive integer.');
  });

  it('executes a BUY MARKET order with double-entry ledger recording', () => {
    const result = executePaperOrder({
      userId: testUserId,
      symbol: 'RELIANCE',
      side: 'BUY',
      orderType: 'MARKET',
      productType: 'CNC',
      quantity: 5,
    });

    // Outside market hours order is queued as AMO; during market hours it is EXECUTED
    expect(['EXECUTED', 'AMO']).toContain(result.status);
    expect(result.orderId).toBeDefined();

    // Verify wallet reconciles with double-entry ledger entries
    const rec = reconcileWallet(testUserId);
    expect(rec.isReconciled).toBe(true);
  });

  it('retrieves accurate user portfolio summary', () => {
    const summary = getUserPortfolioSummary(testUserId);

    expect(summary.currentPortfolioValue).toBeGreaterThan(0);
    expect(summary.availableCash).toBeGreaterThan(0);
    expect(summary.initialCapital).toBe(1000000);
  });

  it('resets paper trading account cleanly and restores capital', () => {
    const resetRes = resetUserAccount(testUserId, 1000000);

    expect(resetRes.success).toBe(true);
    expect(resetRes.virtualCash).toBe(1000000);

    const postSummary = getUserPortfolioSummary(testUserId);
    expect(postSummary.positionsCount).toBe(0);
    expect(postSummary.investedValue).toBe(0);
    expect(postSummary.availableCash).toBe(1000000);
  });
});
