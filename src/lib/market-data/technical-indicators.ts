/**
 * MAXLITH Technical Indicator Engine
 * Pure mathematical calculations for Indian Equities (NSE/BSE)
 * Supported indicators: SMA (20, 50, 200), EMA (12, 20, 26, 50), RSI (14),
 * MACD (12, 26, 9), ATR (14), Bollinger Bands, Volume Profile, and Pivot Support/Resistance.
 */

export interface OHLCVBar {
  timestamp: string | number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface VolumeMetrics {
  currentVolume: number;
  averageVolume20: number;
  volumeRatio: number;
  volumeTrend: 'ABOVE_AVERAGE' | 'BELOW_AVERAGE' | 'NORMAL';
}

export interface SupportResistanceLevels {
  pivot: number;
  resistance1: number;
  support1: number;
  resistance2: number;
  support2: number;
  swingHigh30: number;
  swingLow30: number;
  method: string;
}

export interface MacdResult {
  macd: number;
  signal: number;
  histogram: number;
}

export interface BollingerBands {
  upper: number;
  middle: number;
  lower: number;
  bandwidth: number;
}

export interface TechnicalIndicatorsResult {
  symbol?: string;
  interval: string;
  calculatedAt: string;
  candleCount: number;
  isSufficientData: boolean;
  warnings: string[];
  currentPrice: number;
  movingAverages: {
    sma20: number | null;
    sma50: number | null;
    sma200: number | null;
    ema12: number | null;
    ema20: number | null;
    ema26: number | null;
    ema50: number | null;
  };
  rsi14: number | null;
  macd: MacdResult | null;
  atr14: number | null;
  bollingerBands: BollingerBands | null;
  volume: VolumeMetrics | null;
  supportResistance: SupportResistanceLevels | null;
  trend: 'STRONG_BULLISH' | 'BULLISH' | 'NEUTRAL' | 'BEARISH' | 'STRONG_BEARISH';
  signal: 'BUY' | 'HOLD' | 'SELL';
  confidence: number;
}

/**
 * Validates and normalizes historical OHLCV candles
 */
export function validateAndSortCandles(candles: OHLCVBar[]): {
  valid: boolean;
  error?: string;
  data: OHLCVBar[];
} {
  if (!Array.isArray(candles) || candles.length === 0) {
    return { valid: false, error: 'Candle series is empty or not an array.', data: [] };
  }

  const normalized: OHLCVBar[] = [];

  for (let i = 0; i < candles.length; i++) {
    const bar = candles[i];
    if (
      typeof bar.open !== 'number' ||
      typeof bar.high !== 'number' ||
      typeof bar.low !== 'number' ||
      typeof bar.close !== 'number' ||
      typeof bar.volume !== 'number' ||
      !Number.isFinite(bar.open) ||
      !Number.isFinite(bar.high) ||
      !Number.isFinite(bar.low) ||
      !Number.isFinite(bar.close) ||
      !Number.isFinite(bar.volume)
    ) {
      return { valid: false, error: `Invalid bar values at index ${i}: non-numeric or non-finite OHLCV.`, data: [] };
    }

    if (bar.open <= 0 || bar.high <= 0 || bar.low <= 0 || bar.close <= 0 || bar.volume < 0) {
      return { valid: false, error: `Invalid non-positive price or negative volume at index ${i}.`, data: [] };
    }

    if (bar.high < Math.max(bar.open, bar.close) || bar.low > Math.min(bar.open, bar.close)) {
      return { valid: false, error: `Invalid OHLC bar structure at index ${i}: high must be >= max(open, close) and low <= min(open, close).`, data: [] };
    }

    normalized.push(bar);
  }

  // Ensure chronological order
  const parseTime = (t: string | number): number => {
    if (typeof t === 'number') return t;
    const parsed = new Date(t).getTime();
    return isNaN(parsed) ? 0 : parsed;
  };

  const sorted = [...normalized].sort((a, b) => parseTime(a.timestamp) - parseTime(b.timestamp));

  // Verify timestamps are unique and ascending
  for (let i = 1; i < sorted.length; i++) {
    const prevTime = parseTime(sorted[i - 1].timestamp);
    const currTime = parseTime(sorted[i].timestamp);
    if (currTime <= prevTime && prevTime > 0) {
      return { valid: false, error: `Duplicate or non-ascending timestamp detected at index ${i}.`, data: [] };
    }
  }

  return { valid: true, data: sorted };
}

/**
 * Simple Moving Average (SMA)
 */
export function calculateSMA(data: number[], period: number): number | null {
  if (!data || data.length < period || period <= 0) return null;
  const slice = data.slice(-period);
  const sum = slice.reduce((acc, val) => acc + val, 0);
  return Number((sum / period).toFixed(2));
}

/**
 * Exponential Moving Average (EMA)
 */
export function calculateEMA(data: number[], period: number): number | null {
  if (!data || data.length < period || period <= 0) return null;
  const k = 2 / (period + 1);
  
  // Initialize with SMA of first 'period' elements
  let ema = data.slice(0, period).reduce((acc, val) => acc + val, 0) / period;
  
  // Calculate EMA iteratively
  for (let i = period; i < data.length; i++) {
    ema = data[i] * k + ema * (1 - k);
  }
  
  return Number(ema.toFixed(2));
}

/**
 * Relative Strength Index (RSI - 14 standard using Wilder's smoothing)
 */
export function calculateRSI(closes: number[], period = 14): number | null {
  if (!closes || closes.length < period + 1 || period <= 0) return null;

  const changes: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    changes.push(closes[i] - closes[i - 1]);
  }

  // Initial average gain and loss
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 0; i < period; i++) {
    if (changes[i] >= 0) avgGain += changes[i];
    else avgLoss += Math.abs(changes[i]);
  }
  avgGain /= period;
  avgLoss /= period;

  // Wilder's smoothing for subsequent periods
  for (let i = period; i < changes.length; i++) {
    const change = changes[i];
    const gain = change >= 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }

  if (avgLoss === 0) return 100;
  if (avgGain === 0) return 0;

  const rs = avgGain / avgLoss;
  const rsi = 100 - (100 / (1 + rs));
  return Number(rsi.toFixed(2));
}

/**
 * MACD (Moving Average Convergence Divergence)
 * Default: 12-period fast EMA, 26-period slow EMA, 9-period signal EMA
 */
export function calculateMACD(
  closes: number[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9
): MacdResult | null {
  if (!closes || closes.length < slowPeriod + signalPeriod) return null;

  const kFast = 2 / (fastPeriod + 1);
  const kSlow = 2 / (slowPeriod + 1);
  const kSignal = 2 / (signalPeriod + 1);

  // Compute fast & slow EMAs along the series
  const fastEmaSeries: number[] = [];
  const slowEmaSeries: number[] = [];

  let fastEma = closes.slice(0, fastPeriod).reduce((a, b) => a + b, 0) / fastPeriod;
  fastEmaSeries.push(fastEma);
  for (let i = fastPeriod; i < closes.length; i++) {
    fastEma = closes[i] * kFast + fastEma * (1 - kFast);
    fastEmaSeries.push(fastEma);
  }

  let slowEma = closes.slice(0, slowPeriod).reduce((a, b) => a + b, 0) / slowPeriod;
  slowEmaSeries.push(slowEma);
  for (let i = slowPeriod; i < closes.length; i++) {
    slowEma = closes[i] * kSlow + slowEma * (1 - kSlow);
    slowEmaSeries.push(slowEma);
  }

  // Align MACD series: MACD = Fast EMA - Slow EMA
  // Fast EMA has closes.length - fastPeriod + 1 items
  // Slow EMA has closes.length - slowPeriod + 1 items
  const macdSeries: number[] = [];
  const offset = slowPeriod - fastPeriod;
  for (let i = 0; i < slowEmaSeries.length; i++) {
    const fEma = fastEmaSeries[i + offset];
    const sEma = slowEmaSeries[i];
    macdSeries.push(fEma - sEma);
  }

  if (macdSeries.length < signalPeriod) return null;

  // Compute signal line = EMA of MACD series
  let signal = macdSeries.slice(0, signalPeriod).reduce((a, b) => a + b, 0) / signalPeriod;
  for (let i = signalPeriod; i < macdSeries.length; i++) {
    signal = macdSeries[i] * kSignal + signal * (1 - kSignal);
  }

  const latestMacd = macdSeries[macdSeries.length - 1];
  const histogram = latestMacd - signal;

  return {
    macd: Number(latestMacd.toFixed(2)),
    signal: Number(signal.toFixed(2)),
    histogram: Number(histogram.toFixed(2)),
  };
}

/**
 * Average True Range (ATR 14)
 */
export function calculateATR(candles: OHLCVBar[], period = 14): number | null {
  if (!candles || candles.length < period + 1) return null;

  const trs: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const h = candles[i].high;
    const l = candles[i].low;
    const prevC = candles[i - 1].close;
    const tr = Math.max(h - l, Math.abs(h - prevC), Math.abs(l - prevC));
    trs.push(tr);
  }

  // Initial ATR = simple average of first 'period' TRs
  let atr = trs.slice(0, period).reduce((a, b) => a + b, 0) / period;

  // Wilder's smoothing
  for (let i = period; i < trs.length; i++) {
    atr = (atr * (period - 1) + trs[i]) / period;
  }

  return Number(atr.toFixed(2));
}

/**
 * Bollinger Bands (20 period, 2 standard deviations)
 */
export function calculateBollingerBands(closes: number[], period = 20, multiplier = 2): BollingerBands | null {
  if (!closes || closes.length < period) return null;
  const sma = calculateSMA(closes, period);
  if (sma === null) return null;

  const slice = closes.slice(-period);
  const variance = slice.reduce((acc, v) => acc + Math.pow(v - sma, 2), 0) / period;
  const stdDev = Math.sqrt(variance);

  const upper = Number((sma + multiplier * stdDev).toFixed(2));
  const lower = Number((sma - multiplier * stdDev).toFixed(2));
  const bandwidth = Number((((upper - lower) / sma) * 100).toFixed(2));

  return {
    middle: sma,
    upper,
    lower,
    bandwidth,
  };
}

/**
 * Volume profile and trend comparisons
 */
export function calculateVolumeMetrics(candles: OHLCVBar[], period = 20): VolumeMetrics | null {
  if (!candles || candles.length === 0) return null;
  const volumes = candles.map((c) => c.volume);
  const currentVolume = volumes[volumes.length - 1];
  const slice = volumes.slice(-period);
  const averageVolume20 = Math.round(slice.reduce((a, b) => a + b, 0) / slice.length);
  const volumeRatio = averageVolume20 > 0 ? Number((currentVolume / averageVolume20).toFixed(2)) : 1;

  let volumeTrend: 'ABOVE_AVERAGE' | 'BELOW_AVERAGE' | 'NORMAL' = 'NORMAL';
  if (volumeRatio >= 1.25) volumeTrend = 'ABOVE_AVERAGE';
  else if (volumeRatio <= 0.75) volumeTrend = 'BELOW_AVERAGE';

  return {
    currentVolume,
    averageVolume20,
    volumeRatio,
    volumeTrend,
  };
}

/**
 * Classical Floor Pivot Points & 30-period channel
 */
export function calculateSupportResistance(candles: OHLCVBar[]): SupportResistanceLevels | null {
  if (!candles || candles.length === 0) return null;
  const lastBar = candles[candles.length - 1];
  const { high, low, close } = lastBar;

  const pivot = (high + low + close) / 3;
  const r1 = 2 * pivot - low;
  const s1 = 2 * pivot - high;
  const r2 = pivot + (high - low);
  const s2 = pivot - (high - low);

  const lookbackBars = candles.slice(-30);
  const swingHigh30 = Math.max(...lookbackBars.map((b) => b.high));
  const swingLow30 = Math.min(...lookbackBars.map((b) => b.low));

  return {
    pivot: Number(pivot.toFixed(2)),
    resistance1: Number(r1.toFixed(2)),
    support1: Number(s1.toFixed(2)),
    resistance2: Number(r2.toFixed(2)),
    support2: Number(s2.toFixed(2)),
    swingHigh30: Number(swingHigh30.toFixed(2)),
    swingLow30: Number(swingLow30.toFixed(2)),
    method: 'Classical Floor Pivot Points (1D) & 30-Period Rolling Price Channel',
  };
}

/**
 * Consolidated Technical Analysis computation
 */
export function computeTechnicalIndicators(
  rawCandles: OHLCVBar[],
  interval = '1D',
  symbol?: string
): TechnicalIndicatorsResult {
  const calculatedAt = new Date().toISOString();
  const warnings: string[] = [];

  const { valid, error, data: candles } = validateAndSortCandles(rawCandles);

  if (!valid) {
    return {
      symbol,
      interval,
      calculatedAt,
      candleCount: 0,
      isSufficientData: false,
      warnings: [error || 'Invalid or malformed candles.'],
      currentPrice: 0,
      movingAverages: {
        sma20: null,
        sma50: null,
        sma200: null,
        ema12: null,
        ema20: null,
        ema26: null,
        ema50: null,
      },
      rsi14: null,
      macd: null,
      atr14: null,
      bollingerBands: null,
      volume: null,
      supportResistance: null,
      trend: 'NEUTRAL',
      signal: 'HOLD',
      confidence: 0,
    };
  }

  const closes = candles.map((c) => c.close);
  const currentPrice = closes[closes.length - 1];
  const candleCount = candles.length;

  if (candleCount < 20) {
    warnings.push(`Limited candle history (${candleCount} bars). Minimum 20 bars recommended for standard indicators.`);
  }
  if (candleCount < 50) {
    warnings.push(`Fewer than 50 bars available; 50-day and 200-day moving averages cannot be computed.`);
  }

  // Moving Averages
  const sma20 = calculateSMA(closes, 20);
  const sma50 = calculateSMA(closes, 50);
  const sma200 = calculateSMA(closes, 200);
  const ema12 = calculateEMA(closes, 12);
  const ema20 = calculateEMA(closes, 20);
  const ema26 = calculateEMA(closes, 26);
  const ema50 = calculateEMA(closes, 50);

  // Oscillators & Indicators
  const rsi14 = calculateRSI(closes, 14);
  const macd = calculateMACD(closes, 12, 26, 9);
  const atr14 = calculateATR(candles, 14);
  const bollingerBands = calculateBollingerBands(closes, 20, 2);
  const volume = calculateVolumeMetrics(candles, 20);
  const supportResistance = calculateSupportResistance(candles);

  // Derive Trend
  let trendScore = 0;
  if (sma20 !== null) {
    if (currentPrice > sma20) trendScore += 1;
    else trendScore -= 1;
  }
  if (sma50 !== null) {
    if (currentPrice > sma50) trendScore += 1;
    else trendScore -= 1;
  }
  if (sma20 !== null && sma50 !== null) {
    if (sma20 > sma50) trendScore += 1;
    else trendScore -= 1;
  }

  let trend: 'STRONG_BULLISH' | 'BULLISH' | 'NEUTRAL' | 'BEARISH' | 'STRONG_BEARISH' = 'NEUTRAL';
  if (trendScore >= 3) trend = 'STRONG_BULLISH';
  else if (trendScore >= 1) trend = 'BULLISH';
  else if (trendScore <= -3) trend = 'STRONG_BEARISH';
  else if (trendScore <= -1) trend = 'BEARISH';

  // Derive Signal & Confidence
  let buySignals = 0;
  let sellSignals = 0;

  if (rsi14 !== null) {
    if (rsi14 < 30) buySignals += 2; // Oversold
    else if (rsi14 > 70) sellSignals += 2; // Overbought
    else if (rsi14 > 50) buySignals += 1;
    else sellSignals += 1;
  }

  if (macd !== null) {
    if (macd.histogram > 0) buySignals += 1.5;
    else if (macd.histogram < 0) sellSignals += 1.5;
  }

  if (trend === 'STRONG_BULLISH' || trend === 'BULLISH') buySignals += 1;
  if (trend === 'STRONG_BEARISH' || trend === 'BEARISH') sellSignals += 1;

  let signal: 'BUY' | 'HOLD' | 'SELL' = 'HOLD';
  let confidence = 50;

  if (buySignals > sellSignals + 1) {
    signal = 'BUY';
    confidence = Math.min(92, Math.round(55 + (buySignals - sellSignals) * 10));
  } else if (sellSignals > buySignals + 1) {
    signal = 'SELL';
    confidence = Math.min(92, Math.round(55 + (sellSignals - buySignals) * 10));
  } else {
    signal = 'HOLD';
    confidence = 50;
  }

  return {
    symbol,
    interval,
    calculatedAt,
    candleCount,
    isSufficientData: candleCount >= 20,
    warnings,
    currentPrice,
    movingAverages: {
      sma20,
      sma50,
      sma200,
      ema12,
      ema20,
      ema26,
      ema50,
    },
    rsi14,
    macd,
    atr14,
    bollingerBands,
    volume,
    supportResistance,
    trend,
    signal,
    confidence,
  };
}

