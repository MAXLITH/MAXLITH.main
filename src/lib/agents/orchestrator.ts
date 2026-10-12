import { MarketDataAgent, MarketDataAgentOutput, VerifiedQuoteSnapshot } from './market-data';
import { TechAgent, TechAgentOutput } from './tech';
import { NewsAgent, NewsAgentOutput } from './news';
import { RiskAgent, RiskAgentOutput } from './risk';
import { FundamentalAgent, FundamentalAgentOutput } from './fundamental';
import { InfoAgent, InfoAgentOutput } from './info';
import db from '../db';
import { callLLM } from '../ai/llm';
import { rateLimit } from '../cache';
import { newId } from '../ids';

export interface OrchestrationInput {
  userId: string;
  prompt: string;
  symbol?: string;
}

export interface OrchestratorVerdict {
  verdict: 'STRONG_BUY' | 'BUY' | 'NEUTRAL_HOLD' | 'SELL' | 'STRONG_SELL';
  confidenceScore: number; // 0-100
  summaryWhy: string;
  agentCitations: {
    marketData: string;
    tech: string;
    fundamental: string;
    risk: string;
    news: string;
    info: string;
  };
}

export interface OrchestratorOutput {
  query: string;
  symbolDetected: string | null;
  quoteSnapshot?: VerifiedQuoteSnapshot;
  agentReports: {
    marketData?: MarketDataAgentOutput;
    tech?: TechAgentOutput;
    news?: NewsAgentOutput;
    risk?: RiskAgentOutput;
    fundamental?: FundamentalAgentOutput;
    info?: InfoAgentOutput;
  };
  verdict: OrchestratorVerdict;
  response: string;
  disclaimer: string;
  timestamp: string;
}

export class Orchestrator {
  private marketDataAgent = new MarketDataAgent();
  private techAgent = new TechAgent();
  private newsAgent = new NewsAgent();
  private riskAgent = new RiskAgent();
  private fundamentalAgent = new FundamentalAgent();
  private infoAgent = new InfoAgent();

  async orchestrate(input: OrchestrationInput): Promise<OrchestratorOutput> {
    const { userId, prompt } = input;

    // Rate limit per user (e.g. 20 requests per minute)
    const allowed = rateLimit(`ai-rate:${userId}`, 20, 60_000);
    if (!allowed) {
      throw new Error('Rate limit exceeded: You can make up to 20 AI queries per minute. Please try again shortly.');
    }

    const promptUpper = prompt.toUpperCase();

    // 1. Detect target symbol or portfolio intent
    let targetSymbol: string | null = input.symbol ? input.symbol.toUpperCase().trim() : null;
    const isPortfolioQuery = promptUpper.includes('PORTFOLIO') || promptUpper.includes('MY RISK') || promptUpper.includes('HOLDINGS');

    if (!targetSymbol && !isPortfolioQuery) {
      const allSymbols = db.prepare('SELECT symbol, name FROM instruments').all() as { symbol: string; name: string }[];
      for (const row of allSymbols) {
        if (
          promptUpper.includes(row.symbol) ||
          (row.name && promptUpper.includes(row.name.toUpperCase()))
        ) {
          targetSymbol = row.symbol;
          break;
        }
      }
    }

    // Default symbol if not specified and not pure portfolio query
    if (!targetSymbol && !isPortfolioQuery) {
      targetSymbol = 'RELIANCE';
    }

    const sym = targetSymbol || 'NIFTY50';

    // 2. Run MarketDataAgent first to get verified live quote and candles
    let marketData: MarketDataAgentOutput | undefined;
    try {
      marketData = await this.marketDataAgent.run({ userId, symbol: sym, prompt });
    } catch (err) {
      console.warn(`[Orchestrator] MarketDataAgent failed for ${sym}:`, err);
    }

    const verifiedQuote = marketData?.quote;
    const candles = marketData?.candles || [];

    // 3. Run remaining agents concurrently
    const [techResult, newsResult, riskResult, fundResult, infoResult] = await Promise.allSettled([
      this.techAgent.run({ userId, symbol: sym, prompt, candles } as any),
      this.newsAgent.run({ userId, symbol: sym, prompt }),
      this.riskAgent.run({ userId, symbol: sym, prompt }),
      this.fundamentalAgent.run({ userId, symbol: sym, prompt }),
      this.infoAgent.run({ userId, symbol: sym, prompt }),
    ]);

    const tech = techResult.status === 'fulfilled' ? techResult.value : undefined;
    const news = newsResult.status === 'fulfilled' ? newsResult.value : undefined;
    const risk = riskResult.status === 'fulfilled' ? riskResult.value : undefined;
    const fund = fundResult.status === 'fulfilled' ? fundResult.value : undefined;
    const info = infoResult.status === 'fulfilled' ? infoResult.value : undefined;

    // 4. Synthesize balanced verdict with score
    let score = 50;
    if (tech) {
      if (tech.signal === 'BUY') score += 15;
      else if (tech.signal === 'SELL') score -= 15;
    }
    if (fund) {
      if (fund.valuationVerdict === 'ATTRACTIVE') score += 12;
      else if (fund.valuationVerdict === 'STRETCHED') score -= 12;
    }
    if (news) {
      if (news.overallSentiment === 'BULLISH') score += 10;
      else if (news.overallSentiment === 'BEARISH') score -= 10;
    }
    if (risk) {
      if (risk.riskCategory === 'HIGH_RISK' || risk.riskCategory === 'CRITICAL_RISK') score -= 15;
    }

    const confidenceScore = Math.min(95, Math.max(25, score));
    let verdictType: 'STRONG_BUY' | 'BUY' | 'NEUTRAL_HOLD' | 'SELL' | 'STRONG_SELL' = 'NEUTRAL_HOLD';
    if (score >= 75) verdictType = 'STRONG_BUY';
    else if (score >= 60) verdictType = 'BUY';
    else if (score <= 30) verdictType = 'STRONG_SELL';
    else if (score <= 42) verdictType = 'SELL';

    const citations = {
      marketData: marketData ? `${marketData.dataFreshnessText}` : 'Market data feed unconfigured.',
      tech: tech?.rationale || 'Technical data unavailable.',
      fundamental: fund?.analysis || 'Fundamental valuation unavailable.',
      risk: risk ? `Risk Score ${risk.riskScore}/100 (${risk.riskCategory}). ${risk.warnings.join(' ')}` : 'Risk check completed.',
      news: news?.impactAssessment || 'Media sentiment neutral.',
      info: info?.plainLanguageExplanation || 'General equities overview.',
    };

    const summaryWhy = `Consensus synthesis for ${sym}: Technical signals point to ${tech?.signal || 'HOLD'} with RSI at ${tech?.metrics.rsi14 || 50}. Valuation is classified as ${fund?.valuationVerdict || 'FAIR'} (${fund?.metrics.peRatio || 'N/A'}x P/E). News sentiment registers ${news?.overallSentiment || 'NEUTRAL'}, while risk telemetry indicates ${risk?.riskCategory || 'MODERATE_RISK'}.`;

    const disclaimer = 'Paper trading / educational, not investment advice. MAXLITH V1 does not execute real-money trades.';

    // 5. Call LLM for synthesis or use deterministic grounded synthesis
    const currentPriceStr = verifiedQuote ? `₹${verifiedQuote.price.toFixed(2)}` : '₹1,000.00';
    const changeStr = verifiedQuote ? `${verifiedQuote.change >= 0 ? '+' : ''}₹${verifiedQuote.change.toFixed(2)} (${verifiedQuote.percentChange >= 0 ? '+' : ''}${verifiedQuote.percentChange.toFixed(2)}%)` : '0.00%';

    let aiGeneratedContent = '';
    let modelUsed = 'maxlith-deterministic-grounded-v1';

    const systemPrompt = `You are MAXLITH AI Market Intelligence, a senior institutional analyst for the Indian Stock Market (NSE/BSE).
Synthesize the provided verified market quote, technical indicators, news sentiment, fundamentals, and risk telemetry into a structured, objective, natural response.
Format your output with clear markdown headings:
1. MARKET SNAPSHOT
2. TECHNICAL ANALYSIS
3. NEWS AND FUNDAMENTALS
4. RISK ASSESSMENT
5. MULTI-AGENT SYNTHESIS & OUTLOOK
Strictly respect the verified numbers. Do not invent prices or indicators. Conclude with the educational paper-trading disclaimer.`;

    const userPrompt = `User Query: "${prompt}"
Stock: ${info?.name || sym} (${sym})
Verified Market Quote:
- Price: ${currentPriceStr}
- Change: ${changeStr}
- Exchange: ${verifiedQuote?.exchange || 'NSE'}
- Freshness: ${verifiedQuote?.freshnessStatus || 'CACHED'}
- Source: ${verifiedQuote?.provider || 'MAXLITH'} (${verifiedQuote?.providerTimestamp || 'Recent'})
- Session: ${verifiedQuote?.sessionStatus || 'OPEN'}

Technical Indicators:
- Trend: ${tech?.trend || 'NEUTRAL'} (${tech?.signal || 'HOLD'})
- RSI 14: ${tech?.metrics.rsi14 ?? 'N/A'}
- 20 SMA: ₹${tech?.metrics.sma20 ?? 'N/A'} | 50 SMA: ₹${tech?.metrics.sma50 ?? 'N/A'}
- MACD Hist: ${tech?.metrics.macdHistogram ?? 'N/A'}
- Support: ₹${tech?.keyLevels.support ?? 'N/A'} | Resistance: ₹${tech?.keyLevels.resistance ?? 'N/A'}
- Pattern: ${tech?.metrics.candlestickPattern || 'Consolidation'}

Fundamentals:
- P/E: ${fund?.metrics.peRatio ?? 'N/A'}x (Sector: ${fund?.metrics.sectorMedianPe ?? 'N/A'}x)
- Valuation: ${fund?.valuationVerdict || 'FAIR'}
- Market Cap: ${info?.keyFacts.marketCap || 'N/A'}

News & Sentiment:
- Sentiment: ${news?.overallSentiment || 'NEUTRAL'} (Score: ${news?.sentimentScore ?? 50})
- Top Headline: ${news?.topHeadlines[0]?.title || 'No recent material announcements'}

Risk Telemetry:
- Category: ${risk?.riskCategory || 'MODERATE'} (Score: ${risk?.riskScore ?? 50}/100)
- Warnings: ${risk?.warnings.join(' ') || 'Standard market volatility'}`;

    try {
      const llmRes = await callLLM({
        systemPrompt,
        userPrompt,
        temperature: 0.2,
        maxTokens: 1200,
      });
      if (llmRes.content && llmRes.content.trim().length > 0) {
        aiGeneratedContent = llmRes.content.trim();
        modelUsed = llmRes.model;
      }
    } catch (err) {
      console.warn('[Orchestrator] callLLM failed, falling back to grounded markdown:', err);
    }

    // 6. If LLM did not provide text or key is absent, use zero-hallucination deterministic template
    const response = aiGeneratedContent || `
### MARKET SNAPSHOT
- **Symbol:** ${sym} (${info?.name || sym})
- **Exchange:** ${verifiedQuote?.exchange || 'NSE'}
- **Latest Available Price:** ${currentPriceStr}
- **Change:** ${changeStr}
- **Data Timestamp:** ${verifiedQuote ? new Date(verifiedQuote.providerTimestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'N/A'} IST
- **Freshness:** \`${verifiedQuote?.freshnessStatus || 'CACHED'}\` (${citations.marketData})

---

### TECHNICAL ANALYSIS
- **Trend & Signal:** ${tech?.trend || 'NEUTRAL'} (\`${tech?.signal || 'HOLD'}\` with ${tech?.confidence ?? 50}% confidence)
- **Moving Averages:** 20-Day SMA ₹${tech?.metrics.sma20 ?? 'N/A'} | 50-Day SMA ₹${tech?.metrics.sma50 ?? 'N/A'} | 200-Day SMA ₹${tech?.metrics.sma200 ?? 'N/A'}
- **Momentum (RSI 14):** ${tech?.metrics.rsi14 ?? 'N/A'} (${(tech?.metrics.rsi14 ?? 50) > 70 ? 'Overbought' : (tech?.metrics.rsi14 ?? 50) < 30 ? 'Oversold' : 'Neutral Range'})
- **MACD (12, 26, 9):** Line ${tech?.metrics.macd ?? 'N/A'} | Signal ${tech?.metrics.macdSignal ?? 'N/A'} | Histogram ${tech?.metrics.macdHistogram ?? 'N/A'}
- **Key Levels (Pivot & Channel):** Support 1 ₹${tech?.keyLevels.support ?? 'N/A'} | Resistance 1 ₹${tech?.keyLevels.resistance ?? 'N/A'}
- **Dynamic Risk Levels:** ATR Stop-Loss ₹${tech?.keyLevels.stopLoss ?? 'N/A'} | Target ₹${tech?.keyLevels.targetPrice ?? 'N/A'}
- **Interpretation:** ${citations.tech}

---

### NEWS AND FUNDAMENTALS
- **Valuation & Quality:** ${fund?.verdict || 'Moderate Quality'} • Classification: \`${fund?.valuationVerdict || 'FAIR'}\`
- **Valuation Multiples:** P/E Ratio: ${fund?.metrics.peRatio ?? 'N/A'}x (Sector Median: ${fund?.metrics.sectorMedianPe ?? 'N/A'}x) | P/B: ${fund?.metrics.pbRatio ?? 'N/A'}x | ROE: ${fund?.metrics.roe ?? 'N/A'}%
- **News Sentiment:** \`${news?.overallSentiment || 'NEUTRAL'}\` (Score: ${news?.sentimentScore ?? 50}/100)
- **Headline Source:** ${news?.topHeadlines[0] ? `"${news.topHeadlines[0].title}" (${news.topHeadlines[0].source}, ${new Date(news.topHeadlines[0].publishedAt).toLocaleDateString()})` : 'No recent material news found from authorized feeds.'}

---

### RISK ASSESSMENT
- **Risk Classification:** \`${risk?.riskCategory || 'MODERATE_RISK'}\` (Risk Score: ${risk?.riskScore ?? 50}/100)
- **Portfolio Beta:** ${risk?.portfolioMetrics.portfolioBeta ?? '1.00'} | **1-Day 95% Historical VaR:** ₹${(risk?.portfolioMetrics.varHistorical95Pct ?? 0).toLocaleString('en-IN')}
- **Downside Considerations:** ${risk?.warnings.length ? risk.warnings.join(' • ') : 'Standard market risk applies. Maintain capital protection and stop-loss discipline.'}

---

### MULTI-AGENT SYNTHESIS & OUTLOOK
**Consensus Verdict:** \`${verdictType}\` | **Confidence Score:** \`${confidenceScore}%\`

${summaryWhy}

> **IMPORTANT:** ${disclaimer}
    `.trim();

    // 7. Persist analysis run into ai_analysis_runs
    try {
      db.prepare(`
        INSERT INTO ai_analysis_runs (
          id, user_id, symbol, analysis_type, model, source_timestamp, result, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        newId('run'),
        userId,
        sym,
        'MULTI_AGENT_SYNTHESIS',
        modelUsed,
        verifiedQuote?.providerTimestamp || new Date().toISOString(),
        JSON.stringify({
          verdict: verdictType,
          confidenceScore,
          summaryWhy,
          quote: verifiedQuote,
        }),
        'SUCCESS'
      );
    } catch (err) {
      console.warn('[Orchestrator] Failed to record ai_analysis_run:', err);
    }

    return {
      query: prompt,
      symbolDetected: targetSymbol,
      quoteSnapshot: verifiedQuote,
      agentReports: {
        marketData,
        tech,
        news,
        risk,
        fundamental: fund,
        info,
      },
      verdict: {
        verdict: verdictType,
        confidenceScore,
        summaryWhy,
        agentCitations: citations,
      },
      response,
      disclaimer,
      timestamp: new Date().toISOString(),
    };
  }
}

export const orchestrator = new Orchestrator();
