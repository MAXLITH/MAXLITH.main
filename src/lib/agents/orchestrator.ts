import { TechAgent, TechAgentOutput } from './tech';
import { NewsAgent, NewsAgentOutput } from './news';
import { RiskAgent, RiskAgentOutput } from './risk';
import { FundamentalAgent, FundamentalAgentOutput } from './fundamental';
import { InfoAgent, InfoAgentOutput } from './info';
import db from '../db';
import { callLLM } from '../ai/llm';
import { rateLimit } from '../cache';

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
  agentReports: {
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
    let targetSymbol: string | null = input.symbol || null;
    const isPortfolioQuery = promptUpper.includes('PORTFOLIO') || promptUpper.includes('MY RISK') || promptUpper.includes('HOLDINGS');

    if (!targetSymbol && !isPortfolioQuery) {
      const allSymbols = db.prepare('SELECT symbol, name FROM instruments').all() as { symbol: string; name: string }[];
      for (const row of allSymbols) {
        if (promptUpper.includes(row.symbol) || promptUpper.includes(row.name.toUpperCase())) {
          targetSymbol = row.symbol;
          break;
        }
      }
    }

    // Default symbol if not specified and not pure portfolio query
    if (!targetSymbol && !isPortfolioQuery) {
      targetSymbol = 'RELIANCE';
    }

    // 2. Decide which agents to call in parallel
    const sym = targetSymbol || 'NIFTY50';

    const [techResult, newsResult, riskResult, fundResult, infoResult] = await Promise.allSettled([
      this.techAgent.run({ userId, symbol: sym, prompt }),
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

    // 3. Synthesize balanced verdict with score
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
      tech: tech?.rationale || 'Technical data unavailable.',
      fundamental: fund?.analysis || 'Fundamental valuation unavailable.',
      risk: risk ? `Risk Score ${risk.riskScore}/100 (${risk.riskCategory}). ${risk.warnings.join(' ')}` : 'Risk check completed.',
      news: news?.impactAssessment || 'Media sentiment neutral.',
      info: info?.plainLanguageExplanation || 'General equities overview.',
    };

    const summaryWhy = `Consensus synthesis for ${sym}: Technical signals point to ${tech?.signal || 'HOLD'} with RSI at ${tech?.metrics.rsi14 || 50}. Valuation is classified as ${fund?.valuationVerdict || 'FAIR'} (${fund?.metrics.peRatio || 'N/A'}x P/E). News sentiment registers ${news?.overallSentiment || 'NEUTRAL'}, while risk telemetry indicates ${risk?.riskCategory || 'MODERATE_RISK'}.`;

    const disclaimer = 'Paper trading / educational, not investment advice. MAXLITH V1 does not execute real-money trades.';

    // 4. Generate structured Markdown presentation
    const response = `
### MAXLITH AI Multi-Agent Intelligence: **${info?.name || sym}** (${sym})

**Multi-Agent Verdict:** \`${verdictType}\` | **Confidence Score:** \`${confidenceScore}%\`

---

#### 1. Technical Agent Citation
- **Trend & Signal:** ${tech?.trend} (${tech?.signal})
- **RSI (14-Period):** ${tech?.metrics.rsi14} | **20-Day SMA:** ₹${tech?.metrics.sma20} | **MACD Hist:** ${tech?.metrics.macdHistogram}
- **Key Levels:** Support ₹${tech?.keyLevels.support} | Resistance ₹${tech?.keyLevels.resistance} | Target ₹${tech?.keyLevels.targetPrice} | Stop-Loss ₹${tech?.keyLevels.stopLoss}
- *Agent Citation:* "${citations.tech}"

#### 2. Fundamental Agent Citation
- **Quality & Valuation:** ${fund?.verdict} • Valuation: ${fund?.valuationVerdict}
- **Multiples:** P/E: ${fund?.metrics.peRatio}x (Sector Median: ${fund?.metrics.sectorMedianPe}x) | P/B: ${fund?.metrics.pbRatio}x | ROE: ${fund?.metrics.roe}% | D/E: ${fund?.metrics.debtEquity}
- *Agent Citation:* "${citations.fundamental}"

#### 3. Risk Agent Citation
- **Risk Assessment:** Score ${risk?.riskScore}/100 (${risk?.riskCategory}) | Portfolio Beta: ${risk?.portfolioMetrics.portfolioBeta}
- **Value-at-Risk (95% 1-Day):** ₹${risk?.portfolioMetrics.varHistorical95Pct.toLocaleString('en-IN')}
- *Agent Citation:* "${citations.risk}"

#### 4. News & Sentiment Agent Citation
- **Sentiment Score:** ${news?.sentimentScore} (${news?.overallSentiment}) | Narrative: ${news?.eventClassification}
- **Top Headline:** ${news?.topHeadlines[0] ? `"${news.topHeadlines[0].title}" (${news.topHeadlines[0].source})` : 'No recent headlines'}
- *Agent Citation:* "${citations.news}"

---

#### Synthesis & Rationale
${summaryWhy}
    `.trim();

    return {
      query: prompt,
      symbolDetected: targetSymbol,
      agentReports: {
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
