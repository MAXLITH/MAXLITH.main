import { describe, it, expect } from 'vitest';
import { TechAgent, TechOutputSchema } from '../src/lib/agents/tech';

describe('Technical Analysis Agent & Indicator Logic', () => {
  it('validates a correct technical output against TechOutputSchema', () => {
    const validData = {
      agentName: 'TECH' as const,
      symbol: 'RELIANCE',
      trend: 'BULLISH' as const,
      signal: 'BUY' as const,
      confidence: 78,
      keyLevels: {
        support: 2900,
        resistance: 3050,
        stopLoss: 2880,
        targetPrice: 3120,
      },
      metrics: {
        currentPrice: 2980,
        rsi14: 62.5,
        sma20: 2940,
        sma50: 2910,
        sma200: 2820,
        ema20: 2950,
        ema50: 2920,
        macd: 14.5,
        macdSignal: 12.0,
        macdHistogram: 2.5,
        bollingerUpper: 3050,
        bollingerMiddle: 2940,
        bollingerLower: 2830,
        atr14: 35.4,
        adx14: 26.8,
        support: 2900,
        resistance: 3050,
        volumeTrend: 'ABOVE_AVERAGE' as const,
        candlestickPattern: 'BULLISH_ENGULFING',
      },
      rationale: 'RSI in healthy bullish territory above 60 with upward MACD histogram expansion.',
      disclaimer: 'Paper trading / educational, not investment advice.',
    };

    const parsed = TechOutputSchema.safeParse(validData);
    expect(parsed.success).toBe(true);
  });

  it('runs TechAgent on seeded database instrument RELIANCE', async () => {
    const agent = new TechAgent();
    const result = await agent.run({ userId: 'test-user', symbol: 'RELIANCE' });

    expect(result.agentName).toBe('TECH');
    expect(result.symbol).toBe('RELIANCE');
    expect(['STRONG_BULLISH', 'BULLISH', 'NEUTRAL', 'BEARISH', 'STRONG_BEARISH']).toContain(result.trend);
    expect(['BUY', 'HOLD', 'SELL']).toContain(result.signal);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(100);

    // Verify indicator computations
    expect(result.metrics.rsi14).toBeGreaterThanOrEqual(0);
    expect(result.metrics.rsi14).toBeLessThanOrEqual(100);
    expect(result.metrics.sma20).toBeGreaterThan(0);
    expect(result.metrics.bollingerUpper).toBeGreaterThanOrEqual(result.metrics.bollingerLower);
    expect(result.metrics.resistance).toBeGreaterThanOrEqual(result.metrics.support);

    // Verify required AI disclaimer
    expect(result.disclaimer).toContain('Paper trading / educational');
  });
});
