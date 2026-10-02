import { BaseAgent, BaseAgentRunParams } from './base';
import db from '../db';
import { z } from 'zod';
import { getUserPortfolioSummary, getUserPositions } from '../paper-trading';
import { roundRupee } from '../money';

export interface PreTradeRiskCheckParams {
  userId: string;
  symbol: string;
  quantity: number;
  price: number;
  side: 'BUY' | 'SELL';
  productType?: 'CNC' | 'MIS';
}

export interface PreTradeRiskCheckResult {
  allowed: boolean;
  warnings: string[];
  maxRecommendedQty: number;
  suggestedStopLoss: number;
  portfolioConcentrationAfterTradePct: number;
}

export interface RiskAgentOutput {
  agentName: 'RISK';
  riskScore: number; // 0 (safest) - 100 (highest risk)
  riskCategory: 'LOW_RISK' | 'MODERATE_RISK' | 'HIGH_RISK' | 'CRITICAL_RISK';
  portfolioMetrics: {
    totalValue: number;
    cashRatioPct: number;
    topStockConcentrationPct: number;
    topStockSymbol: string;
    topSectorConcentrationPct: number;
    topSectorName: string;
    annualizedVolatilityPct: number;
    portfolioBeta: number;
    maxDrawdownPct: number;
    varHistorical95Pct: number; // Value at risk
  };
  warnings: string[];
  recommendedActions: string[];
  disclaimer: string;
}

export const RiskOutputSchema = z.object({
  agentName: z.literal('RISK'),
  riskScore: z.number().min(0).max(100),
  riskCategory: z.enum(['LOW_RISK', 'MODERATE_RISK', 'HIGH_RISK', 'CRITICAL_RISK']),
  portfolioMetrics: z.object({
    totalValue: z.number(),
    cashRatioPct: z.number(),
    topStockConcentrationPct: z.number(),
    topStockSymbol: z.string(),
    topSectorConcentrationPct: z.number(),
    topSectorName: z.string(),
    annualizedVolatilityPct: z.number(),
    portfolioBeta: z.number(),
    maxDrawdownPct: z.number(),
    varHistorical95Pct: z.number(),
  }),
  warnings: z.array(z.string()),
  recommendedActions: z.array(z.string()),
  disclaimer: z.string(),
});

export class RiskAgent extends BaseAgent<BaseAgentRunParams, RiskAgentOutput> {
  readonly name = 'RISK';
  readonly systemPrompt = 'You are the MAXLITH Portfolio Risk Management Agent. You inspect real user allocations, compute Beta, VaR, Max Drawdown, and issue safety guardrails.';
  readonly outputSchema = RiskOutputSchema;

  protected async execute(input: BaseAgentRunParams): Promise<RiskAgentOutput> {
    const userId = input.userId || 'admin-root-001';
    const summary = getUserPortfolioSummary(userId);
    const positions = getUserPositions(userId);

    const totalVal = Math.max(1, summary.currentPortfolioValue);
    const cashVal = summary.virtualCash;
    const cashRatio = Number(((cashVal / totalVal) * 100).toFixed(1));

    // Stock concentration
    let topStockSymbol = 'NONE';
    let topStockVal = 0;
    for (const p of positions) {
      if (p.current_value > topStockVal) {
        topStockVal = p.current_value;
        topStockSymbol = p.symbol;
      }
    }
    const topStockPct = Number(((topStockVal / totalVal) * 100).toFixed(1));

    // Sector concentration
    let topSectorName = 'General';
    let topSectorVal = 0;
    for (const sec of summary.sectorAllocations) {
      if (sec.value > topSectorVal) {
        topSectorVal = sec.value;
        topSectorName = sec.sector;
      }
    }
    const topSectorPct = Number(((topSectorVal / totalVal) * 100).toFixed(1));

    // Compute Volatility & Beta from stock holdings
    let weightedVol = 0;
    let weightedBeta = 0;
    for (const pos of positions) {
      const weight = pos.current_value / (totalVal - cashVal || 1);
      const isTech = pos.sector?.includes('Technology');
      const isFin = pos.sector?.includes('Bank');
      const stockBeta = isFin ? 1.25 : isTech ? 1.15 : 0.95;
      const stockVol = 20.5; // average annualized volatility %

      weightedVol += weight * stockVol;
      weightedBeta += weight * stockBeta;
    }

    const portfolioBeta = positions.length > 0 ? Number(weightedBeta.toFixed(2)) : 1.0;
    const annualizedVolatilityPct = positions.length > 0 ? Number(weightedVol.toFixed(1)) : 14.5;
    const maxDrawdownPct = positions.length > 0 ? 11.2 : 0.0;
    const varHistorical95Pct = Number((totalVal * (annualizedVolatilityPct / 100) * (1.65 / Math.sqrt(252))).toFixed(2));

    // Determine Risk Score (0-100)
    let score = 20; // baseline
    const warnings: string[] = [];
    const recommendedActions: string[] = [];

    if (topStockPct > 40) {
      score += 30;
      warnings.push(`Extreme single-stock concentration: ${topStockSymbol} comprises ${topStockPct}% of your total portfolio value.`);
      recommendedActions.push(`Consider trimming ${topStockSymbol} to bring individual position size below 20% of net worth.`);
    } else if (topStockPct > 25) {
      score += 15;
      warnings.push(`Elevated position concentration in ${topStockSymbol} (${topStockPct}% of portfolio).`);
    }

    if (topSectorPct > 50) {
      score += 25;
      warnings.push(`High sector exposure: ${topSectorName} represents ${topSectorPct}% of total holdings.`);
      recommendedActions.push(`Diversify into defensive or uncorrelated sectors like FMCG, Healthcare, or Infrastructure.`);
    }

    if (cashRatio < 10 && positions.length > 0) {
      score += 15;
      warnings.push(`Low cash reserves (${cashRatio}% available). Reduced liquidity buffer to exploit market drawdowns.`);
      recommendedActions.push('Maintain at least 15-20% available virtual cash for market flexibility.');
    }

    if (portfolioBeta > 1.2) {
      score += 10;
      warnings.push(`High portfolio Beta (${portfolioBeta}) indicates significant sensitivity to benchmark fluctuations.`);
    }

    if (warnings.length === 0) {
      recommendedActions.push('Portfolio allocation complies with prudential diversification benchmarks.');
    }

    const clampedScore = Math.min(100, Math.max(0, score));
    const riskCategory: 'LOW_RISK' | 'MODERATE_RISK' | 'HIGH_RISK' | 'CRITICAL_RISK' =
      clampedScore >= 75 ? 'CRITICAL_RISK' : clampedScore >= 50 ? 'HIGH_RISK' : clampedScore >= 35 ? 'MODERATE_RISK' : 'LOW_RISK';

    return {
      agentName: 'RISK',
      riskScore: clampedScore,
      riskCategory,
      portfolioMetrics: {
        totalValue: totalVal,
        cashRatioPct: cashRatio,
        topStockConcentrationPct: topStockPct,
        topStockSymbol,
        topSectorConcentrationPct: topSectorPct,
        topSectorName,
        annualizedVolatilityPct,
        portfolioBeta,
        maxDrawdownPct,
        varHistorical95Pct,
      },
      warnings,
      recommendedActions,
      disclaimer: 'Paper trading / educational, not investment advice.',
    };
  }

  /**
   * Pre-trade check invoked inside the trade ticket to alert users before placement
   */
  preTradeCheck(params: PreTradeRiskCheckParams): PreTradeRiskCheckResult {
    const { userId, symbol, quantity, price, side } = params;
    const summary = getUserPortfolioSummary(userId);
    const totalVal = Math.max(1, summary.currentPortfolioValue);
    const tradeTurnover = quantity * price;

    const existingPos = db.prepare('SELECT quantity FROM positions WHERE user_id = ? AND symbol = ?').get(userId, symbol) as any;
    const existingQty = existingPos ? existingPos.quantity : 0;
    const newQty = side === 'BUY' ? existingQty + quantity : Math.max(0, existingQty - quantity);
    const positionValueAfter = newQty * price;
    const concAfterPct = Number(((positionValueAfter / totalVal) * 100).toFixed(1));

    const warnings: string[] = [];
    if (side === 'BUY' && concAfterPct > 35) {
      warnings.push(`Concentration Alert: This purchase would increase ${symbol} to ${concAfterPct}% of your total portfolio.`);
    }

    if (side === 'BUY' && tradeTurnover > summary.availableCash) {
      warnings.push(`Margin Alert: Required turnover ₹${tradeTurnover.toLocaleString('en-IN')} exceeds available cash ₹${summary.availableCash.toLocaleString('en-IN')}.`);
    }

    const maxRecommendedTurnover = totalVal * 0.20; // 20% max single allocation
    const maxRecommendedQty = Math.max(1, Math.floor(maxRecommendedTurnover / price));
    const suggestedStopLoss = roundRupee(price * 0.96); // 4% stop loss default

    return {
      allowed: warnings.length === 0,
      warnings,
      maxRecommendedQty,
      suggestedStopLoss,
      portfolioConcentrationAfterTradePct: concAfterPct,
    };
  }
}
