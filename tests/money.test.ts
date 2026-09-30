import { describe, it, expect } from 'vitest';
import {
  toPaise,
  fromPaise,
  roundRupee,
  roundToTick,
  applySlippage,
  formatINR,
  paiseBigIntToRupees,
  rupeesToPaiseBigInt,
} from '../src/lib/money';

describe('Financial Math & Money Handling', () => {
  it('converts rupees to integer paise accurately', () => {
    expect(toPaise(100.5)).toBe(10050);
    expect(toPaise(0.05)).toBe(5);
    expect(toPaise(1234.56)).toBe(123456);
    expect(toPaise(1000000)).toBe(100000000);
  });

  it('converts paise to rupees accurately', () => {
    expect(fromPaise(10050)).toBe(100.5);
    expect(fromPaise(5)).toBe(0.05);
    expect(fromPaise(123456)).toBe(1234.56);
  });

  it('converts BigInt paise to rupees and back', () => {
    const bi = BigInt(12500050);
    expect(paiseBigIntToRupees(bi)).toBe(125000.5);
    expect(rupeesToPaiseBigInt(125000.5)).toBe(bi);
  });

  it('rounds to NSE/BSE tick size (0.05)', () => {
    expect(roundToTick(100.02, 0.05)).toBe(100.0);
    expect(roundToTick(100.03, 0.05)).toBe(100.05);
    expect(roundToTick(100.08, 0.05)).toBe(100.1);
    expect(roundToTick(1500.44, 0.05)).toBe(1500.45);
  });

  it('applies slippage correctly for BUY and SELL sides', () => {
    // BUY: price increases slightly due to slippage (10 bps = 0.1%)
    const buyPrice = applySlippage(1000, 'BUY', 10);
    expect(buyPrice).toBeGreaterThan(1000);
    expect(buyPrice).toBe(1001.0);

    // SELL: price decreases slightly due to slippage (10 bps = 0.1%)
    const sellPrice = applySlippage(1000, 'SELL', 10);
    expect(sellPrice).toBeLessThan(1000);
    expect(sellPrice).toBe(999.0);
  });

  it('formats currency in Indian numbering system', () => {
    const formatted = formatINR(1234567.89);
    expect(formatted).toContain('12,34,567.89');
  });
});
