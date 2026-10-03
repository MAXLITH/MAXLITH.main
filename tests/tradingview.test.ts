import { describe, expect, it } from 'vitest';
import { normalizeSymbol, parseSymbol, toLegacyTicker } from '../src/lib/tradingview/symbols';
import { atr, bollingerBands, ema, rsi, sessionVwap, sma, wma } from '../src/lib/tradingview/indicators';
import { parseDrawings, serializeDrawings, validateDrawing, type ChartDrawing } from '../src/lib/tradingview/drawings';

describe('canonical market symbols', () => {
  it('normalizes exchange-qualified symbols and vendor suffixes', () => {
    expect(normalizeSymbol('reliance.ns')).toBe('NSE:RELIANCE');
    expect(normalizeSymbol('BSE:reliance')).toBe('BSE:RELIANCE');
    expect(parseSymbol('BSE:RELIANCE')).toEqual({ id: 'BSE:RELIANCE', exchange: 'BSE', symbol: 'RELIANCE' });
    expect(toLegacyTicker('BSE:RELIANCE')).toBe('RELIANCE.BO');
  });

  it('rejects unsupported exchanges and malformed symbols', () => {
    expect(() => normalizeSymbol('NASDAQ:MSFT')).toThrow();
    expect(() => normalizeSymbol('NSE:')).toThrow();
    expect(() => normalizeSymbol('NSE:RELIANCE/../X')).toThrow();
  });
});

describe('chart calculations', () => {
  it('calculates simple, exponential, and weighted moving averages', () => {
    expect(sma([1, 2, 3, 4], 3)).toEqual([null, null, 2, 3]);
    expect(ema([1, 2, 3, 4], 3)).toEqual([null, null, 2, 3]);
    expect(wma([1, 2, 3, 4], 3)).toEqual([null, null, 14 / 6, 20 / 6]);
  });

  it('calculates RSI and Bollinger bands with warm-up gaps', () => {
    expect(rsi([10, 11, 12, 13], 2)).toEqual([null, null, 100, 100]);
    const bands = bollingerBands([1, 2, 3], 3, 2);
    expect(bands.middle).toEqual([null, null, 2]);
    expect(bands.upper[2]).toBeCloseTo(2 + Math.sqrt(2 / 3) * 2);
  });

  it('calculates ATR and session VWAP from supplied bars', () => {
    const bars = [
      { time: Date.parse('2026-10-05T03:45:00Z') / 1000, open: 10, high: 12, low: 9, close: 11, volume: 100 },
      { time: Date.parse('2026-10-05T03:46:00Z') / 1000, open: 11, high: 14, low: 10, close: 13, volume: 100 },
      { time: Date.parse('2026-10-06T03:45:00Z') / 1000, open: 13, high: 15, low: 12, close: 14, volume: 100 },
    ];
    expect(atr(bars, 1)).toEqual([null, 4, 3]);
    const vwap = sessionVwap(bars);
    expect(vwap[0]).toBeCloseTo(32 / 3);
    expect(vwap[1]).toBeCloseTo((32 / 3 + 37 / 3) / 2);
    expect(vwap[2]).toBeCloseTo(41 / 3);
  });
});

describe('drawing serialization', () => {
  it('validates and round-trips drawings without execution or eval', () => {
    const drawing: ChartDrawing = {
      id: 'd1', userId: 'u1', layoutId: 'l1', symbolId: 'NSE:RELIANCE', tool: 'trend-line',
      anchors: [{ time: 1, price: 100 }, { time: 2, price: 110 }], color: '#38bdf8', lineWidth: 2,
      createdAt: '2026-10-03T10:00:00.000Z', updatedAt: '2026-10-03T10:00:00.000Z',
    };
    expect(validateDrawing(drawing)).toBe(true);
    expect(parseDrawings(serializeDrawings([drawing]))).toEqual([drawing]);
    expect(validateDrawing({ ...drawing, anchors: [{ time: Number.NaN, price: 1 }] })).toBe(false);
  });
});
