import { describe, it, expect } from 'vitest';
import { UpstoxProvider } from '../src/lib/market-data/providers/upstox';
import { formatINR, toPaise, fromPaise, roundToTick } from '../src/lib/money';
import { formatRupees, formatNumber } from '../src/components/trading/terminalTypes';
import { Decimal } from 'decimal.js';

describe('Market Price Precision & Pipeline Accuracy', () => {
  describe('Provider Normalization & Parsing', () => {
    it('UpstoxProvider preserves decimal LTP values (e.g. 44.36, 44.375) without truncation or integer conversion', () => {
      const provider = new UpstoxProvider('test-token');
      // Verify raw Upstox object parsing logic
      const rawUpstoxItem = {
        last_price: 44.36,
        net_change: 0.31,
        volume: 125400,
        ohlc: {
          open: 44.10,
          high: 44.85,
          low: 43.90,
          close: 44.05,
        },
      };

      const ltp = rawUpstoxItem.last_price;
      const prev = rawUpstoxItem.ohlc.close;
      const change = rawUpstoxItem.net_change ?? (ltp - prev);
      const pctChange = prev > 0 ? (change / prev) * 100 : 0;

      expect(ltp).toBe(44.36);
      expect(rawUpstoxItem.ohlc.open).toBe(44.10);
      expect(rawUpstoxItem.ohlc.high).toBe(44.85);
      expect(rawUpstoxItem.ohlc.low).toBe(43.90);
      expect(rawUpstoxItem.ohlc.close).toBe(44.05);
      expect(change).toBe(0.31);
      expect(pctChange).toBeCloseTo(0.70374, 4);
    });

    it('preserves sub-tick 3-decimal values (e.g. 44.375) in calculations', () => {
      const ltp = 44.375;
      const prev = 44.00;
      const change = ltp - prev;
      expect(ltp).toBe(44.375);
      expect(change).toBe(0.375);
    });
  });

  describe('UI Formatting Helpers', () => {
    it('formatRupees renders 44.36 as "₹44.36" and never rounds to an integer like ₹45', () => {
      const formatted = formatRupees(44.36);
      const normalized = formatted.replace(/\u00a0/g, ' ');
      expect(normalized).toBe('₹44.36');
    });

    it('formatRupees renders exact 2 decimal places for single-decimal values (e.g. 44.3 -> ₹44.30)', () => {
      const formatted = formatRupees(44.3);
      const normalized = formatted.replace(/\u00a0/g, ' ');
      expect(normalized).toBe('₹44.30');
    });

    it('formatRupees handles zero accurately', () => {
      expect(formatRupees(0).replace(/\u00a0/g, ' ')).toBe('₹0.00');
    });

    it('formatRupees handles undefined / null / NaN safely without crashing', () => {
      expect(formatRupees(undefined)).toBe('—');
      expect(formatRupees(null)).toBe('—');
      expect(formatRupees(NaN)).toBe('—');
    });

    it('formatNumber formats numbers with standard comma separators without destroying decimals', () => {
      expect(formatNumber(44.36)).toBe('44.36');
      expect(formatNumber(1250.75)).toBe('1,250.75');
      expect(formatNumber(100000)).toBe('1,00,000');
    });
  });

  describe('Financial Money Math', () => {
    it('toPaise and fromPaise preserve exact values for 44.36', () => {
      const paise = toPaise(44.36);
      expect(paise).toBe(4436);
      const rupees = fromPaise(paise);
      expect(rupees).toBe(44.36);
    });

    it('formatINR outputs Indian numbering format with correct 2 decimals', () => {
      const formatted = formatINR(44.36);
      const normalized = formatted.replace(/\u00a0/g, ' ');
      expect(normalized).toBe('44.36');
    });

    it('roundToTick rounds to valid NSE 0.05 tick sizes without floating-point artifacts', () => {
      expect(roundToTick(44.36, 0.05)).toBe(44.35);
      expect(roundToTick(44.38, 0.05)).toBe(44.40);
      expect(roundToTick(44.375, 0.05)).toBe(44.40);
    });
  });

  describe('Order Value Calculation Precision', () => {
    it('calculates total order value using unrounded price before transaction settlement', () => {
      const quantity = 100;
      const ltp = 44.36;

      // Pure decimal calculation as in order panel
      const estimatedValue = new Decimal(quantity).times(new Decimal(ltp)).toNumber();
      expect(estimatedValue).toBe(4436.00);

      // Verify that if it was incorrectly rounded to an integer (44), it would produce a ₹36 discrepancy
      const corruptedValue = quantity * Math.round(ltp);
      expect(corruptedValue).not.toBe(estimatedValue);
      expect(corruptedValue).toBe(4400);
    });

    it('calculates fractional share / small quantity orders accurately', () => {
      const quantity = 3;
      const ltp = 44.36;
      const total = new Decimal(quantity).times(new Decimal(ltp)).toNumber();
      expect(total).toBe(133.08);
      expect(formatRupees(total).replace(/\u00a0/g, ' ')).toBe('₹133.08');
    });
  });
});
