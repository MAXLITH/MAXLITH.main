import { BaseAgent, BaseAgentRunParams } from './base';
import db from '../db';
import { z } from 'zod';

export interface InfoAgentOutput {
  agentName: 'INFO';
  symbol: string;
  name: string;
  exchange: string;
  sector: string;
  universe: string;
  summary: string;
  keyFacts: {
    marketCap: string;
    weekRange52: string;
    lotSize: number;
    tickSize: number;
  };
  plainLanguageExplanation: string;
  detectedIntent?: string;
  disclaimer: string;
}

export const InfoOutputSchema = z.object({
  agentName: z.literal('INFO'),
  symbol: z.string(),
  name: z.string(),
  exchange: z.string(),
  sector: z.string(),
  universe: z.string(),
  summary: z.string(),
  keyFacts: z.object({
    marketCap: z.string(),
    weekRange52: z.string(),
    lotSize: z.number(),
    tickSize: z.number(),
  }),
  plainLanguageExplanation: z.string(),
  detectedIntent: z.string().optional(),
  disclaimer: z.string(),
});

export class InfoAgent extends BaseAgent<BaseAgentRunParams, InfoAgentOutput> {
  readonly name = 'INFO';
  readonly systemPrompt = 'You are the MAXLITH Corporate Intelligence & Market Q&A Agent. You supply structured corporate facts and translate complex financial concepts into plain language.';
  readonly outputSchema = InfoOutputSchema;

  protected async execute(input: BaseAgentRunParams): Promise<InfoAgentOutput> {
    const symbol = (input.symbol || 'RELIANCE').toUpperCase();
    const inst = db.prepare('SELECT * FROM instruments WHERE symbol = ?').get(symbol) as any;

    if (!inst) {
      return {
        agentName: 'INFO',
        symbol,
        name: symbol,
        exchange: 'NSE',
        sector: 'Equities',
        universe: 'NIFTY500',
        summary: `Overview for ${symbol}. Indian market listed equity security.`,
        keyFacts: {
          marketCap: 'N/A',
          weekRange52: 'N/A',
          lotSize: 1,
          tickSize: 0.05,
        },
        plainLanguageExplanation: 'General market security traded on Indian exchanges.',
        detectedIntent: 'COMPANY_LOOKUP',
        disclaimer: 'Paper trading / educational, not investment advice.',
      };
    }

    const range52 = inst.high_52w && inst.low_52w ? `₹${inst.low_52w.toFixed(2)} - ₹${inst.high_52w.toFixed(2)}` : 'N/A';
    const mcapStr = inst.market_cap ? `₹${inst.market_cap.toLocaleString('en-IN')} Cr` : 'N/A';

    return {
      agentName: 'INFO',
      symbol: inst.symbol,
      name: inst.name,
      exchange: inst.exchange,
      sector: inst.sector || 'General',
      universe: inst.universe || 'NIFTY500',
      summary: `${inst.name} is a premier constituent of the Indian equity market listed on ${inst.exchange}. It operates primarily within the ${inst.sector} domain.`,
      keyFacts: {
        marketCap: mcapStr,
        weekRange52: range52,
        lotSize: inst.lot_size || 1,
        tickSize: inst.tick_size || 0.05,
      },
      plainLanguageExplanation: `${inst.name} (${inst.symbol}) trades at ₹${inst.current_price.toFixed(2)}. In simple terms, buying 1 share means you hold a fractional ownership interest in this ₹${mcapStr} business.`,
      detectedIntent: 'COMPANY_OVERVIEW',
      disclaimer: 'Paper trading / educational, not investment advice.',
    };
  }
}
