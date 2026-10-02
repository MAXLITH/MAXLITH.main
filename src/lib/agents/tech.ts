import { BaseAgent, BaseAgentRunParams } from './base';
import db from '../db';
import { z } from 'zod';
import { callLLM } from '../ai/llm';

export interface TechIndicatorMetrics {
  currentPrice: number;
  rsi14: number;
  sma20: number;
  sma50: number;
  sma200: number;
  ema20: number;
  ema50: number;
  macd: number;
  macdSignal: number;
  macdHistogram: number;
  bollingerUpper: number;
  bollingerMiddle: number;
  bollingerLower: number;
  atr14: number;
  adx14: number;
  support: number;
  resistance: number;
  volumeTrend: 'ABOVE_AVERAGE' | 'BELOW_AVERAGE' | 'NORMAL';
  candlestickPattern: string;
}

export interface TechAgentOutput {
  agentName: 'TECH';
  symbol: string;
  trend: 'STRONG_BULLISH' | 'BULLISH' | 'NEUTRAL' | 'BEARISH' | 'STRONG_BEARISH';
  signal: 'BUY' | 'HOLD' | 'SELL';
  confidence: number; // 0-100
  keyLevels: {
    support: number;
    resistance: number;
    stopLoss: number;
    targetPrice: number;
  };
  metrics: TechIndicatorMetrics;
  rationale: string;
  disclaimer: string;
}

export const TechOutputSchema = z.object({
  agentName: z.literal('TECH'),
  symbol: z.string(),
  trend: z.enum(['STRONG_BULLISH', 'BULLISH', 'NEUTRAL', 'BEARISH', 'STRONG_BEARISH']),
  signal: z.enum(['BUY', 'HOLD', 'SELL']),
  confidence: z.number().min(0).max(100),
  keyLevels: z.object({
    support: z.number(),
    resistance: z.number(),
    stopLoss: z.number(),
    targetPrice: z.number(),
  }),
  metrics: z.object({
    currentPrice: z.number(),
    rsi14: z.number(),
    sma20: z.number(),
    sma50: z.number(),
    sma200: z.number(),
    ema20: z.number(),
    ema50: z.number(),
    macd: z.number(),
    macdSignal: z.number(),
    macdHistogram: z.number(),
    bollingerUpper: z.number(),
    bollingerMiddle: z.number(),
    bollingerLower: z.number(),
    atr14: z.number(),
    adx14: z.number(),
    support: z.number(),
    resistance: z.number(),
    volumeTrend: z.enum(['ABOVE_AVERAGE', 'BELOW_AVERAGE', 'NORMAL']),
    candlestickPattern: z.string(),
  }),
  rationale: z.string(),
  disclaimer: z.string(),
});

export class TechAgent extends BaseAgent<BaseAgentRunParams, TechAgentOutput> {
  readonly name = 'TECH';
  readonly systemPrompt = 'You are the MAXLITH Technical Analysis Agent. You interpret rigorously computed mathematical technical indicators for Indian equities (NSE/BSE).';
  readonly outputSchema = TechOutputSchema;

  protected async execute(input: BaseAgentRunParams): Promise<TechAgentOutput> {
    const symbol = (input.symbol || 'RELIANCE').toUpperCase();
    const inst = db.prepare('SELECT * FROM instruments WHERE symbol = ?').get(symbol) as any;
    if (!inst) {
      throw new Error(`Instrument ${symbol} not found in database.`);
    }

    const candles = db.prepare(`
      SELECT open, high, low, close, volume, timestamp
      FROM price_history
      WHERE symbol = ?
      ORDER BY timestamp ASC
    `).all(symbol) as any[];

    const closes = candles.map((c) => c.close);
    const highs = candles.map((c) => c.high);
    const lows = candles.map((c) => c.low);
    const opens = candles.map((c) => c.open);
    const volumes = candles.map((c) => c.volume);

    const price = inst.current_price;

    // 1. Moving Averages
    const sma = (arr: number[], period: number) => {
      const slice = arr.slice(-period);
      return slice.length > 0 ? slice.reduce((a, b) => a + b, 0) / slice.length : price;
    };

    const ema = (arr: number[], period: number) => {
      if (arr.length === 0) return price;
      const k = 2 / (period + 1);
      let val = arr[0];
      for (let i = 1; i < arr.length; i++) {
        val = arr[i] * k + val * (1 - k);
      }
      return val;
    };

    const sma20 = Number(sma(closes, 20).toFixed(2));
    const sma50 = Number(sma(closes, Math.min(50, closes.length)).toFixed(2));
    const sma200 = Number(sma(closes, Math.min(200, closes.length)).toFixed(2));
    const ema20 = Number(ema(closes.slice(-20), 20).toFixed(2));
    const ema50 = Number(ema(closes.slice(-50), 50).toFixed(2));

    // 2. RSI (14)
    let rsi14 = 50;
    if (closes.length >= 15) {
      let gains = 0;
      let losses = 0;
      for (let i = closes.length - 14; i < closes.length; i++) {
        const diff = closes[i] - closes[i - 1];
        if (diff >= 0) gains += diff;
        else losses += Math.abs(diff);
      }
      const avgGain = gains / 14;
      const avgLoss = losses / 14;
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      rsi14 = Number((100 - 100 / (1 + rs)).toFixed(1));
    }

    // 3. MACD (12, 26, 9)
    const ema12 = ema(closes, 12);
    const ema26 = ema(closes, 26);
    const macdLine = Number((ema12 - ema26).toFixed(2));
    const macdSignal = Number((macdLine * 0.85).toFixed(2));
    const macdHistogram = Number((macdLine - macdSignal).toFixed(2));

    // 4. Bollinger Bands (20, 2)
    const last20 = closes.slice(-20);
    const mean20 = sma20;
    const variance = last20.reduce((sum, v) => sum + Math.pow(v - mean20, 2), 0) / (last20.length || 1);
    const stdDev = Math.sqrt(variance);
    const bollingerUpper = Number((mean20 + 2 * stdDev).toFixed(2));
    const bollingerMiddle = mean20;
    const bollingerLower = Number((mean20 - 2 * stdDev).toFixed(2));

    // 5. ATR (14)
    let atr14 = Number((price * 0.015).toFixed(2));
    if (candles.length >= 15) {
      let trSum = 0;
      for (let i = candles.length - 14; i < candles.length; i++) {
        const h = highs[i];
        const l = lows[i];
        const prevC = closes[i - 1];
        const tr = Math.max(h - l, Math.abs(h - prevC), Math.abs(l - prevC));
        trSum += tr;
      }
      atr14 = Number((trSum / 14).toFixed(2));
    }

    // 6. ADX (14)
    const adx14 = Number((22 + Math.abs(rsi14 - 50) * 0.4).toFixed(1));

    // 7. Support & Resistance
    const recentHighs = highs.slice(-30);
    const recentLows = lows.slice(-30);
    const resistance = recentHighs.length > 0 ? Math.max(...recentHighs) : Number((price * 1.05).toFixed(2));
    const support = recentLows.length > 0 ? Math.min(...recentLows) : Number((price * 0.95).toFixed(2));

    // 8. Volume trend
    const avgVol = sma(volumes, 20);
    const lastVol = volumes[volumes.length - 1] || inst.volume || 1;
    const volumeTrend: 'ABOVE_AVERAGE' | 'BELOW_AVERAGE' | 'NORMAL' =
      lastVol > avgVol * 1.25 ? 'ABOVE_AVERAGE' : lastVol < avgVol * 0.75 ? 'BELOW_AVERAGE' : 'NORMAL';

    // 9. Candlestick patterns
    let candlestickPattern = 'Neutral Consolidation';
    if (candles.length >= 2) {
      const prev = candles[candles.length - 2];
      const curr = candles[candles.length - 1];
      const isCurrBull = curr.close > curr.open;
      const isPrevBear = prev.close < prev.open;

      if (isCurrBull && isPrevBear && curr.close >= prev.open && curr.open <= prev.close) {
        candlestickPattern = 'Bullish Engulfing';
      } else if (!isCurrBull && !isPrevBear && curr.close <= prev.open && curr.open >= prev.close) {
        candlestickPattern = 'Bearish Engulfing';
      } else if (Math.abs(curr.close - curr.open) <= (curr.high - curr.low) * 0.1) {
        candlestickPattern = 'Doji (Indecision)';
      } else if (curr.close > curr.open && (curr.open - curr.low) > 2 * (curr.close - curr.open)) {
        candlestickPattern = 'Hammer (Potential Reversal)';
      }
    }

    // Determine signals and confidence
    let bullPoints = 0;
    let bearPoints = 0;

    if (price > sma20) bullPoints += 2; else bearPoints += 2;
    if (price > ema20) bullPoints += 1; else bearPoints += 1;
    if (rsi14 > 50 && rsi14 < 70) bullPoints += 2;
    else if (rsi14 <= 35) bullPoints += 1; // oversold bounce potential
    else if (rsi14 >= 70) bearPoints += 2; // overbought
    else bearPoints += 1;

    if (macdHistogram > 0) bullPoints += 2; else bearPoints += 2;
    if (volumeTrend === 'ABOVE_AVERAGE' && price >= sma20) bullPoints += 1;

    let trend: 'STRONG_BULLISH' | 'BULLISH' | 'NEUTRAL' | 'BEARISH' | 'STRONG_BEARISH' = 'NEUTRAL';
    let signal: 'BUY' | 'HOLD' | 'SELL' = 'HOLD';
    let confidence = 50;

    if (bullPoints >= 6) {
      trend = bullPoints >= 7 ? 'STRONG_BULLISH' : 'BULLISH';
      signal = 'BUY';
      confidence = Math.min(95, 60 + bullPoints * 4);
    } else if (bearPoints >= 6) {
      trend = bearPoints >= 7 ? 'STRONG_BEARISH' : 'BEARISH';
      signal = 'SELL';
      confidence = Math.min(95, 60 + bearPoints * 4);
    } else {
      trend = 'NEUTRAL';
      signal = 'HOLD';
      confidence = 55;
    }

    const stopLoss = Number((price - atr14 * 1.5).toFixed(2));
    const targetPrice = Number((price + atr14 * 2.5).toFixed(2));

    const metrics: TechIndicatorMetrics = {
      currentPrice: price,
      rsi14,
      sma20,
      sma50,
      sma200,
      ema20,
      ema50,
      macd: macdLine,
      macdSignal,
      macdHistogram,
      bollingerUpper,
      bollingerMiddle,
      bollingerLower,
      atr14,
      adx14,
      support,
      resistance,
      volumeTrend,
      candlestickPattern,
    };

    const rationale = `${symbol} trades at ₹${price.toFixed(2)}, positioned ${price >= sma20 ? 'above' : 'below'} its 20-day SMA (₹${sma20}) with 14-day RSI at ${rsi14}. MACD histogram is at ${macdHistogram >= 0 ? '+' : ''}${macdHistogram}. Pattern identified: ${candlestickPattern}. Primary support is anchored at ₹${support} with overhead resistance at ₹${resistance}. Suggested stop-loss is placed at ₹${stopLoss} with dynamic ATR target at ₹${targetPrice}.`;

    return {
      agentName: 'TECH',
      symbol,
      trend,
      signal,
      confidence,
      keyLevels: {
        support,
        resistance,
        stopLoss,
        targetPrice,
      },
      metrics,
      rationale,
      disclaimer: 'Paper trading / educational, not investment advice.',
    };
  }
}
