import type { MarketBar } from './datafeed';

export type IndicatorPoint = { time: number; value: number | null };

export function sma(values: readonly number[], period: number): (number | null)[] {
  assertPeriod(period);
  const result: (number | null)[] = Array(values.length).fill(null);
  let sum = 0;
  for (let index = 0; index < values.length; index += 1) {
    sum += values[index];
    if (index >= period) sum -= values[index - period];
    if (index >= period - 1) result[index] = sum / period;
  }
  return result;
}

export function ema(values: readonly number[], period: number): (number | null)[] {
  assertPeriod(period);
  const result: (number | null)[] = Array(values.length).fill(null);
  if (values.length < period) return result;
  const seed = values.slice(0, period).reduce((sum, value) => sum + value, 0) / period;
  result[period - 1] = seed;
  const alpha = 2 / (period + 1);
  for (let index = period; index < values.length; index += 1) {
    result[index] = values[index] * alpha + (result[index - 1] as number) * (1 - alpha);
  }
  return result;
}

export function wma(values: readonly number[], period: number): (number | null)[] {
  assertPeriod(period);
  const result: (number | null)[] = Array(values.length).fill(null);
  const denominator = (period * (period + 1)) / 2;
  for (let end = period - 1; end < values.length; end += 1) {
    let total = 0;
    for (let offset = 0; offset < period; offset += 1) total += values[end - period + 1 + offset] * (offset + 1);
    result[end] = total / denominator;
  }
  return result;
}

export function rsi(values: readonly number[], period = 14): (number | null)[] {
  assertPeriod(period);
  const result: (number | null)[] = Array(values.length).fill(null);
  if (values.length <= period) return result;
  let gains = 0;
  let losses = 0;
  for (let index = 1; index <= period; index += 1) {
    const delta = values[index] - values[index - 1];
    gains += Math.max(delta, 0);
    losses += Math.max(-delta, 0);
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;
  result[period] = relativeStrength(avgGain, avgLoss);
  for (let index = period + 1; index < values.length; index += 1) {
    const delta = values[index] - values[index - 1];
    avgGain = (avgGain * (period - 1) + Math.max(delta, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-delta, 0)) / period;
    result[index] = relativeStrength(avgGain, avgLoss);
  }
  return result;
}

export function macd(values: readonly number[], fast = 12, slow = 26, signal = 9) {
  assertPeriod(fast);
  assertPeriod(slow);
  assertPeriod(signal);
  if (fast >= slow) throw new Error('MACD fast period must be less than slow period');
  const fastEma = ema(values, fast);
  const slowEma = ema(values, slow);
  const line: (number | null)[] = values.map((_, index) =>
    fastEma[index] === null || slowEma[index] === null ? null : (fastEma[index] as number) - (slowEma[index] as number)
  );
  const compactLine = line.flatMap((value) => (value === null ? [] : [value]));
  const compactSignal = ema(compactLine, signal);
  let signalIndex = 0;
  const signalLine = line.map((value) => {
    if (value === null) return null;
    return compactSignal[signalIndex++];
  });
  const histogram = line.map((value, index) => value === null || signalLine[index] === null ? null : value - (signalLine[index] as number));
  return { line, signal: signalLine, histogram };
}

export function bollingerBands(values: readonly number[], period = 20, deviations = 2) {
  assertPeriod(period);
  if (!Number.isFinite(deviations) || deviations <= 0) throw new Error('Standard deviations must be positive');
  const middle = sma(values, period);
  const upper: (number | null)[] = Array(values.length).fill(null);
  const lower: (number | null)[] = Array(values.length).fill(null);
  for (let end = period - 1; end < values.length; end += 1) {
    const mean = middle[end] as number;
    const variance = values.slice(end - period + 1, end + 1).reduce((sum, value) => sum + (value - mean) ** 2, 0) / period;
    const width = Math.sqrt(variance) * deviations;
    upper[end] = mean + width;
    lower[end] = mean - width;
  }
  return { upper, middle, lower };
}

export function atr(bars: readonly MarketBar[], period = 14): (number | null)[] {
  assertPeriod(period);
  const result: (number | null)[] = Array(bars.length).fill(null);
  if (bars.length <= period) return result;
  const ranges = bars.map((bar, index) => {
    if (index === 0) return bar.high - bar.low;
    const previousClose = bars[index - 1].close;
    return Math.max(bar.high - bar.low, Math.abs(bar.high - previousClose), Math.abs(bar.low - previousClose));
  });
  let current = ranges.slice(1, period + 1).reduce((sum, value) => sum + value, 0) / period;
  result[period] = current;
  for (let index = period + 1; index < bars.length; index += 1) {
    current = (current * (period - 1) + ranges[index]) / period;
    result[index] = current;
  }
  return result;
}

export function sessionVwap(bars: readonly MarketBar[]): (number | null)[] {
  const result: (number | null)[] = [];
  let session = '';
  let weighted = 0;
  let totalVolume = 0;
  for (const bar of bars) {
    const key = new Date(bar.time * 1000).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    if (key !== session) {
      session = key;
      weighted = 0;
      totalVolume = 0;
    }
    if (bar.volume > 0) {
      weighted += ((bar.high + bar.low + bar.close) / 3) * bar.volume;
      totalVolume += bar.volume;
    }
    result.push(totalVolume > 0 ? weighted / totalVolume : null);
  }
  return result;
}

export function volumeMovingAverage(bars: readonly MarketBar[], period = 20): (number | null)[] {
  return sma(bars.map((bar) => bar.volume), period);
}

function relativeStrength(avgGain: number, avgLoss: number): number {
  if (avgLoss === 0) return avgGain === 0 ? 50 : 100;
  return 100 - 100 / (1 + avgGain / avgLoss);
}

function assertPeriod(period: number) {
  if (!Number.isInteger(period) || period < 1) throw new Error('Indicator period must be a positive integer');
}
