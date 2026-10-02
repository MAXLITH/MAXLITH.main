import { BaseAgent, BaseAgentRunParams } from './base';
import db from '../db';
import { z } from 'zod';

export interface NewsArticleItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  eventType: 'EARNINGS' | 'M&A' | 'REGULATORY' | 'MACRO';
  publishedAt: string;
}

export interface NewsAgentOutput {
  agentName: 'NEWS';
  symbol: string;
  sentimentScore: number; // -1.0 to 1.0
  overallSentiment: 'BULLISH' | 'NEUTRAL' | 'BEARISH';
  topHeadlines: NewsArticleItem[];
  eventClassification: string;
  impactAssessment: string;
  disclaimer: string;
}

export const NewsOutputSchema = z.object({
  agentName: z.literal('NEWS'),
  symbol: z.string(),
  sentimentScore: z.number().min(-1.0).max(1.0),
  overallSentiment: z.enum(['BULLISH', 'NEUTRAL', 'BEARISH']),
  topHeadlines: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      summary: z.string(),
      source: z.string(),
      sentiment: z.enum(['POSITIVE', 'NEUTRAL', 'NEGATIVE']),
      eventType: z.enum(['EARNINGS', 'M&A', 'REGULATORY', 'MACRO']),
      publishedAt: z.string(),
    })
  ),
  eventClassification: z.string(),
  impactAssessment: z.string(),
  disclaimer: z.string(),
});

export class NewsAgent extends BaseAgent<BaseAgentRunParams, NewsAgentOutput> {
  readonly name = 'NEWS';
  readonly systemPrompt = 'You are the MAXLITH News & Sentiment Analysis Agent. You evaluate corporate announcements, earnings releases, and financial media for Indian markets.';
  readonly outputSchema = NewsOutputSchema;

  protected async execute(input: BaseAgentRunParams): Promise<NewsAgentOutput> {
    const symbol = (input.symbol || 'NIFTY50').toUpperCase();

    // Query news matching symbol, or general macro news
    const articles = db.prepare(`
      SELECT * FROM news 
      WHERE symbol = ? OR symbol = 'BANKNIFTY' OR symbol IS NULL
      ORDER BY published_at DESC 
      LIMIT 5
    `).all(symbol) as any[];

    if (articles.length === 0) {
      return {
        agentName: 'NEWS',
        symbol,
        sentimentScore: 0.0,
        overallSentiment: 'NEUTRAL',
        topHeadlines: [],
        eventClassification: 'MACRO',
        impactAssessment: `No specific corporate announcements logged recently for ${symbol}. Macro sentiment remains balanced.`,
        disclaimer: 'Paper trading / educational, not investment advice.',
      };
    }

    let pos = 0;
    let neg = 0;
    const eventsCount: Record<string, number> = {};

    const formattedArticles: NewsArticleItem[] = articles.map((a) => {
      if (a.sentiment === 'POSITIVE') pos++;
      if (a.sentiment === 'NEGATIVE') neg++;
      const ev = (a.event_type || 'MACRO') as any;
      eventsCount[ev] = (eventsCount[ev] || 0) + 1;

      return {
        id: a.id,
        title: a.title,
        summary: a.summary,
        source: a.source,
        sentiment: a.sentiment || 'NEUTRAL',
        eventType: ev,
        publishedAt: a.published_at,
      };
    });

    const total = articles.length;
    const sentimentScore = Number(((pos - neg) / total).toFixed(2));
    const overallSentiment: 'BULLISH' | 'NEUTRAL' | 'BEARISH' =
      sentimentScore > 0.15 ? 'BULLISH' : sentimentScore < -0.15 ? 'BEARISH' : 'NEUTRAL';

    const topEvent = Object.entries(eventsCount).sort((a, b) => b[1] - a[1])[0]?.[0] || 'MACRO';

    const impactAssessment = `Identified ${articles.length} news event(s) for ${symbol}. Predominant corporate narrative: ${topEvent}. Aggregate sentiment score is ${sentimentScore} (${overallSentiment}), indicating ${overallSentiment === 'BULLISH' ? 'constructive media tailwinds' : overallSentiment === 'BEARISH' ? 'headline risk and defensive media tone' : 'neutral news flow without significant near-term headline surprises'}.`;

    return {
      agentName: 'NEWS',
      symbol,
      sentimentScore,
      overallSentiment,
      topHeadlines: formattedArticles,
      eventClassification: topEvent,
      impactAssessment,
      disclaimer: 'Paper trading / educational, not investment advice.',
    };
  }
}
