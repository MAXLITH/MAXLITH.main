import { describe, it, expect } from 'vitest';
import {
  validateAndSortCandles,
  calculateSMA,
  calculateEMA,
  calculateRSI,
  calculateMACD,
  calculateATR,
  calculateBollingerBands,
  calculateVolumeMetrics,
  calculateSupportResistance,
  computeTechnicalIndicators,
  type OHLCVBar,
} from '../src/lib/market-data/technical-indicators';

describe('Technical Indicator Engine', () => {
  const generateMockBars = (count: number, startPrice = 1000): OHLCVBar[] => {
    const bars: OHLCVBar[] = [];
    let price = startPrice;
    const baseTime = 1700000000000;

    for (let i = 0; i < count; i++) {
      const open = price;
      const change = (Math.sin(i / 3) * 10) + (i % 2 === 0 ? 3 : -2);
      const close = Math.max(10, open + change);
      const high = Math.max(open, close) + 5;
      const low = Math.min(open, close) - 5;
      const volume = 100000 + (i * 1000);
      bars.push({
        timestamp: baseTime + i * 86400000,
        open: Number(open.toFixed(2)),
        high: Number(high.toFixed(2)),
        low: Number(low.toFixed(2)),
        close: Number(close.toFixed(2)),
        volume,
      });
      price = close;
    }
    return bars;
  };

  describe('Candle Validation and Normalization', () => {
    it('validates and preserves correctly ordered bars', () => {
      const bars = generateMockBars(10);
      const res = validateAndSortCandles(bars);
      expect(res.valid).toBe(true);
      expect(res.data.length).toBe(10);
    });

    it('sorts bars in chronological order if unordered', () => {
      const bars = generateMockBars(5);
      const reversed = [...bars].reverse();
      const res = validateAndSortCandles(reversed);
      expect(res.valid).toBe(true);
      expect(Number(res.data[0].timestamp)).toBeLessThan(Number(res.data[4].timestamp));
    });

    it('rejects bars with invalid OHLC geometry (e.g. high < low)', () => {
      const invalidBars: OHLCVBar[] = [
        { timestamp: 1000, open: 100, high: 90, low: 110, close: 95, volume: 1000 },
      ];
      const res = validateAndSortCandles(invalidBars);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('Invalid OHLC bar structure');
    });

    it('rejects non-numeric or non-finite values', () => {
      const invalidBars = [
        { timestamp: 1000, open: NaN, high: 120, low: 90, close: 100, volume: 1000 } as any,
      ];
      const res = validateAndSortCandles(invalidBars);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('non-numeric or non-finite');
    });
  });

  describe('Moving Averages (SMA & EMA)', () => {
    const closes = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

    it('calculates SMA accurately', () => {
      const sma5 = calculateSMA(closes, 5); // (16 + 17 + 18 + 19 + 20) / 5 = 18
      expect(sma5).toBe(18);
    });

    it('returns null for SMA when data length is less than period', () => {
      expect(calculateSMA(closes, 20)).toBeNull();
    });

    it('calculates EMA with initial SMA seeding', () => {
      const ema5 = calculateEMA(closes, 5);
      expect(ema5).toBeDefined();
      expect(ema5).toBeGreaterThan(17);
      expect(ema5).toBeLessThanOrEqual(20);
    });

    it('returns null for EMA when data length is less than period', () => {
      expect(calculateEMA(closes, 50)).toBeNull();
    });
  });

  describe('RSI (14-Period Wilder Smoothing)', () => {
    it('returns null if closes length < 15', () => {
      const shortCloses = [100, 102, 104, 103, 105];
      expect(calculateRSI(shortCloses, 14)).toBeNull();
    });

    it('returns 100 for strictly monotonic gain series', () => {
      const bullCloses = Array.from({ length: 25 }, (_, i) => 100 + i * 2);
      expect(calculateRSI(bullCloses, 14)).toBe(100);
    });

    it('returns 0 for strictly monotonic loss series', () => {
      const bearCloses = Array.from({ length: 25 }, (_, i) => 100 - i * 2);
      expect(calculateRSI(bearCloses, 14)).toBe(0);
    });

    it('computes expected balanced RSI within 0-100 bounds', () => {
      const bars = generateMockBars(30);
      const closes = bars.map((b) => b.close);
      const rsi = calculateRSI(closes, 14);
      expect(rsi).not.toBeNull();
      expect(rsi!).toBeGreaterThanOrEqual(0);
      expect(rsi!).toBeLessThanOrEqual(100);
    });
  });

  describe('MACD (12, 26, 9)', () => {
    it('returns null if closes history is insufficient', () => {
      const bars = generateMockBars(20);
      expect(calculateMACD(bars.map((b) => b.close))).toBeNull();
    });

    it('computes MACD, signal line, and histogram when sufficient data is provided', () => {
      const bars = generateMockBars(60);
      const macd = calculateMACD(bars.map((b) => b.close));
      expect(macd).not.toBeNull();
      expect(macd).toHaveProperty('macd');
      expect(macd).toHaveProperty('signal');
      expect(macd).toHaveProperty('histogram');
      expect(Number.isFinite(macd!.macd)).toBe(true);
      expect(Number.isFinite(macd!.histogram)).toBe(true);
      // histogram is approximately macd - signal
      expect(Math.abs(macd!.histogram - (macd!.macd - macd!.signal))).toBeLessThanOrEqual(0.02);
    });
  });

  describe('ATR (Average True Range)', () => {
    it('returns null if bars < 15', () => {
      const bars = generateMockBars(10);
      expect(calculateATR(bars, 14)).toBeNull();
    });

    it('computes positive ATR value for 30 bars', () => {
      const bars = generateMockBars(30);
      const atr = calculateATR(bars, 14);
      expect(atr).not.toBeNull();
      expect(atr!).toBeGreaterThan(0);
    });
  });

  describe('Bollinger Bands and Volume Metrics', () => {
    it('calculates upper, middle, and lower Bollinger bands', () => {
      const bars = generateMockBars(30);
      const bb = calculateBollingerBands(bars.map((b) => b.close), 20);
      expect(bb).not.toBeNull();
      expect(bb!.upper).toBeGreaterThanOrEqual(bb!.middle);
      expect(bb!.middle).toBeGreaterThanOrEqual(bb!.lower);
      expect(bb!.bandwidth).toBeGreaterThan(0);
    });

    it('calculates 20-period volume metrics and categorizes trend', () => {
      const bars = generateMockBars(25);
      const vol = calculateVolumeMetrics(bars, 20);
      expect(vol).not.toBeNull();
      expect(vol!.currentVolume).toBeGreaterThan(0);
      expect(vol!.averageVolume20).toBeGreaterThan(0);
      expect(['ABOVE_AVERAGE', 'BELOW_AVERAGE', 'NORMAL']).toContain(vol!.volumeTrend);
    });
  });

  describe('Pivot Support and Resistance', () => {
    it('calculates Classical Floor Pivot Points and 30-period channel', () => {
      const bars = generateMockBars(35);
      const sr = calculateSupportResistance(bars);
      expect(sr).not.toBeNull();
      expect(sr!.resistance1).toBeGreaterThanOrEqual(sr!.pivot);
      expect(sr!.pivot).toBeGreaterThanOrEqual(sr!.support1);
      expect(sr!.swingHigh30).toBeGreaterThanOrEqual(sr!.swingLow30);
      expect(sr!.method).toContain('Classical Floor Pivot Points');
    });
  });

  describe('Full computeTechnicalIndicators Integration', () => {
    it('returns complete validated indicators payload for 60 bars', () => {
      const bars = generateMockBars(60);
      const result = computeTechnicalIndicators(bars, '1D', 'RELIANCE');

      expect(result.symbol).toBe('RELIANCE');
      expect(result.interval).toBe('1D');
      expect(result.candleCount).toBe(60);
      expect(result.isSufficientData).toBe(true);
      expect(result.currentPrice).toBe(bars[bars.length - 1].close);
      expect(result.movingAverages.sma20).not.toBeNull();
      expect(result.movingAverages.sma50).not.toBeNull();
      expect(result.rsi14).not.toBeNull();
      expect(result.macd).not.toBeNull();
      expect(result.atr14).not.toBeNull();
      expect(result.bollingerBands).not.toBeNull();
      expect(result.supportResistance).not.toBeNull();
      expect(['STRONG_BULLISH', 'BULLISH', 'NEUTRAL', 'BEARISH', 'STRONG_BEARISH']).toContain(result.trend);
      expect(['BUY', 'HOLD', 'SELL']).toContain(result.signal);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(100);
    });

    it('handles empty or malformed candles gracefully with explicit warnings', () => {
      const emptyResult = computeTechnicalIndicators([], '1D', 'INFY');
      expect(emptyResult.isSufficientData).toBe(false);
      expect(emptyResult.warnings.length).toBeGreaterThan(0);
      expect(emptyResult.movingAverages.sma20).toBeNull();
      expect(emptyResult.signal).toBe('HOLD');
    });
  });
});

