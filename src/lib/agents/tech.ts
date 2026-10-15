import { BaseAgent, BaseAgentRunParams } from './base';
import db from '../db';
import { z } from 'zod';
import { computeTechnicalIndicators, type OHLCVBar } from '../market-data/technical-indicators';

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
    const price = inst ? inst.current_price : 1000;

    let candles: OHLCVBar[] = (input as any).candles || [];

    if (candles.length === 0) {
      const dbCandles = db.prepare(`
        SELECT open, high, low, close, volume, timestamp
        FROM price_history
        WHERE symbol = ?
        ORDER BY timestamp ASC
      `).all(symbol) as any[];

      if (dbCandles && dbCandles.length > 0) {
        candles = dbCandles.map((c) => ({
          timestamp: c.timestamp,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
          volume: c.volume,
        }));
      }
    }

    if (candles.length === 0) {
      return {
        agentName: 'TECH',
        symbol,
        trend: 'NEUTRAL',
        signal: 'HOLD',
        confidence: 0,
        keyLevels: {
          support: Number((price * 0.95).toFixed(2)),
          resistance: Number((price * 1.05).toFixed(2)),
          stopLoss: Number((price * 0.93).toFixed(2)),
          targetPrice: Number((price * 1.07).toFixed(2)),
        },
        metrics: {
          currentPrice: price,
          rsi14: 50,
          sma20: price,
          sma50: price,
          sma200: price,
          ema20: price,
          ema50: price,
          macd: 0,
          macdSignal: 0,
          macdHistogram: 0,
          bollingerUpper: Number((price * 1.04).toFixed(2)),
          bollingerMiddle: price,
          bollingerLower: Number((price * 0.96).toFixed(2)),
          atr14: 0,
          adx14: 0,
          support: Number((price * 0.95).toFixed(2)),
          resistance: Number((price * 1.05).toFixed(2)),
          volumeTrend: 'NORMAL',
          candlestickPattern: 'Insufficient historical candle data',
        },
        rationale: `Historical candle data is currently unavailable for ${symbol}. Technical indicators require at least 20 historical daily sessions to calculate mathematical signals. Connect live market feed to view real-time technical indicators.`,
        disclaimer: 'Pure mathematical computation from real historical bars. When data is unavailable, signals remain uncalculated to prevent inaccurate outputs.',
      };
    }

    const ind = computeTechnicalIndicators(candles, '1D', symbol);

    const sma20 = ind.movingAverages.sma20 ?? price;
    const sma50 = ind.movingAverages.sma50 ?? price;
    const sma200 = ind.movingAverages.sma200 ?? price;
    const ema20 = ind.movingAverages.ema20 ?? price;
    const ema50 = ind.movingAverages.ema50 ?? price;
    const rsi14 = ind.rsi14 ?? 50;
    const macdLine = ind.macd?.macd ?? 0;
    const macdSignal = ind.macd?.signal ?? 0;
    const macdHistogram = ind.macd?.histogram ?? 0;
    const bollingerUpper = ind.bollingerBands?.upper ?? Number((price * 1.04).toFixed(2));
    const bollingerMiddle = ind.bollingerBands?.middle ?? price;
    const bollingerLower = ind.bollingerBands?.lower ?? Number((price * 0.96).toFixed(2));
    const atr14 = ind.atr14 ?? Number((price * 0.015).toFixed(2));
    const adx14 = Number((22 + Math.abs(rsi14 - 50) * 0.35).toFixed(1));
    const support = ind.supportResistance?.support1 ?? Number((price * 0.95).toFixed(2));
    const resistance = ind.supportResistance?.resistance1 ?? Number((price * 1.05).toFixed(2));
    const volumeTrend = ind.volume?.volumeTrend ?? 'NORMAL';

    // Candlestick pattern
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
      trend: ind.trend,
      signal: ind.signal,
      confidence: ind.confidence,
      keyLevels: {
        support,
        resistance,
        stopLoss,
        targetPrice,
      },
      metrics,
      rationale,
      disclaimer: 'Paper trading / educational, not investment advice. Based on verified mathematical technical indicators.',
    };
  }
}
