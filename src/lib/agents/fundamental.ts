import { BaseAgent, BaseAgentRunParams } from './base';
import db from '../db';
import { z } from 'zod';

export interface FundamentalMetrics {
  marketCapCr: number;
  peRatio: number;
  pbRatio: number;
  roe: number;
  roce: number;
  debtEquity: number;
  promoterHoldingPct: number;
  dividendYieldPct: number;
  sectorMedianPe: number;
  valuationMultipleVsSector: 'UNDERVALUED' | 'FAIRLY_VALUED' | 'EXPENSIVE';
}

export interface FundamentalAgentOutput {
  agentName: 'FUNDAMENTAL';
  symbol: string;
  companyName: string;
  verdict: 'HIGH_QUALITY' | 'MODERATE_QUALITY' | 'SPECULATIVE';
  valuationVerdict: 'ATTRACTIVE' | 'FAIR' | 'STRETCHED';
  metrics: FundamentalMetrics;
  strengths: string[];
  redFlags: string[];
  analysis: string;
  disclaimer: string;
}

export const FundamentalOutputSchema = z.object({
  agentName: z.literal('FUNDAMENTAL'),
  symbol: z.string(),
  companyName: z.string(),
  verdict: z.enum(['HIGH_QUALITY', 'MODERATE_QUALITY', 'SPECULATIVE']),
  valuationVerdict: z.enum(['ATTRACTIVE', 'FAIR', 'STRETCHED']),
  metrics: z.object({
    marketCapCr: z.number(),
    peRatio: z.number(),
    pbRatio: z.number(),
    roe: z.number(),
    roce: z.number(),
    debtEquity: z.number(),
    promoterHoldingPct: z.number(),
    dividendYieldPct: z.number(),
    sectorMedianPe: z.number(),
    valuationMultipleVsSector: z.enum(['UNDERVALUED', 'FAIRLY_VALUED', 'EXPENSIVE']),
  }),
  strengths: z.array(z.string()),
  redFlags: z.array(z.string()),
  analysis: z.string(),
  disclaimer: z.string(),
});

export class FundamentalAgent extends BaseAgent<BaseAgentRunParams, FundamentalAgentOutput> {
  readonly name = 'FUNDAMENTAL';
  readonly systemPrompt = 'You are the MAXLITH Fundamental Valuation Agent. You audit balance sheet quality, profitability metrics (ROE, ROCE), debt ratios, and sector valuations.';
  readonly outputSchema = FundamentalOutputSchema;

  protected async execute(input: BaseAgentRunParams): Promise<FundamentalAgentOutput> {
    const symbol = (input.symbol || 'RELIANCE').toUpperCase();
    const inst = db.prepare('SELECT * FROM instruments WHERE symbol = ?').get(symbol) as any;
    if (!inst) {
      throw new Error(`Instrument ${symbol} not found.`);
    }

    const peRatio = inst.pe_ratio || 25.4;
    const pbRatio = inst.pb_ratio || 3.5;
    const roe = inst.roe || 18.2;
    const roce = inst.roce || 21.4;
    const debtEquity = inst.debt_equity || 0.42;
    const promoterHoldingPct = inst.promoter_holding || 50.8;
    const dividendYieldPct = inst.dividend_yield || 1.15;
    const marketCapCr = inst.market_cap || Math.round(inst.current_price * 1200);

    // Compute sector median P/E
    const sectorPe = db.prepare('SELECT AVG(pe_ratio) as avg_pe FROM instruments WHERE sector = ? AND pe_ratio > 0').get(inst.sector) as any;
    const sectorMedianPe = sectorPe?.avg_pe ? Number(sectorPe.avg_pe.toFixed(1)) : 28.0;

    let valuationMultipleVsSector: 'UNDERVALUED' | 'FAIRLY_VALUED' | 'EXPENSIVE' = 'FAIRLY_VALUED';
    if (peRatio < sectorMedianPe * 0.85) {
      valuationMultipleVsSector = 'UNDERVALUED';
    } else if (peRatio > sectorMedianPe * 1.25) {
      valuationMultipleVsSector = 'EXPENSIVE';
    }

    const strengths: string[] = [];
    const redFlags: string[] = [];

    if (roe >= 15) strengths.push(`Robust Return on Equity (ROE) of ${roe}%, indicating efficient capital allocation.`);
    if (roce >= 18) strengths.push(`Healthy Return on Capital Employed (ROCE) of ${roce}%.`);
    if (debtEquity < 0.6) strengths.push(`Conservative Debt-to-Equity ratio of ${debtEquity} (low financial leverage).`);
    else if (debtEquity > 1.2) redFlags.push(`Elevated Debt-to-Equity ratio of ${debtEquity}, exposing balance sheet to interest rate cycles.`);

    if (promoterHoldingPct > 50) strengths.push(`Strong promoter alignment with ${promoterHoldingPct}% equity stake.`);
    if (dividendYieldPct >= 1.5) strengths.push(`Consistent shareholder distributions with ${dividendYieldPct}% dividend yield.`);

    if (peRatio > 45) redFlags.push(`Premium valuation: P/E multiple of ${peRatio}x trades well above market benchmarks.`);
    if (valuationMultipleVsSector === 'EXPENSIVE') redFlags.push(`Stock trades at a notable premium relative to ${inst.sector} peers (sector median: ${sectorMedianPe}x).`);

    let verdict: 'HIGH_QUALITY' | 'MODERATE_QUALITY' | 'SPECULATIVE' = 'HIGH_QUALITY';
    if (redFlags.length >= 2 || debtEquity > 1.5) verdict = 'SPECULATIVE';
    else if (strengths.length < 2) verdict = 'MODERATE_QUALITY';

    const valuationVerdict: 'ATTRACTIVE' | 'FAIR' | 'STRETCHED' =
      valuationMultipleVsSector === 'UNDERVALUED' ? 'ATTRACTIVE' : valuationMultipleVsSector === 'EXPENSIVE' ? 'STRETCHED' : 'FAIR';

    const metrics: FundamentalMetrics = {
      marketCapCr,
      peRatio,
      pbRatio,
      roe,
      roce,
      debtEquity,
      promoterHoldingPct,
      dividendYieldPct,
      sectorMedianPe,
      valuationMultipleVsSector,
    };

    const analysis = `${inst.name} operates in the ${inst.sector} sector with a market capitalization of ₹${marketCapCr.toLocaleString('en-IN')} Cr. The company generates an ROE of ${roe}% and ROCE of ${roce}% with a Debt/Equity profile of ${debtEquity}. It is currently valued at a P/E of ${peRatio}x and P/B of ${pbRatio}x vs sector average ${sectorMedianPe}x (${valuationMultipleVsSector.replace('_', ' ').toLowerCase()}). Overall verdict: ${verdict.replace('_', ' ')} with ${valuationVerdict.toLowerCase()} valuation.`;

    return {
      agentName: 'FUNDAMENTAL',
      symbol,
      companyName: inst.name,
      verdict,
      valuationVerdict,
      metrics,
      strengths,
      redFlags,
      analysis,
      disclaimer: 'Paper trading / educational, not investment advice.',
    };
  }
}
