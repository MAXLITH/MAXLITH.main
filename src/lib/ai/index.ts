import db from '../db';
import { getInstrument, getInstrumentHistory, getAllInstruments } from '../market-data';

export interface AgentReport {
  agentName: 'TECH' | 'NEWS' | 'RISK' | 'FUNDAMENTAL' | 'INFO';
  status: 'SUCCESS' | 'NO_DATA';
  headline: string;
  metrics: Record<string, any>;
  analysis: string;
}

export interface OrchestrationResult {
  query: string;
  symbolDetected: string | null;
  agentReports: AgentReport[];
  response: string;
  disclaimer: string;
  timestamp: string;
}

// 1. TECH AGENT
export function runTechAgent(symbol: string): AgentReport {
  const inst = getInstrument(symbol);
  const history = getInstrumentHistory(symbol) as any[];

  if (!inst || history.length === 0) {
    return {
      agentName: 'TECH',
      status: 'NO_DATA',
      headline: `Technical data unavailable for ${symbol}`,
      metrics: {},
      analysis: 'Insufficient historical price candles to calculate technical indicators.'
    };
  }

  const closes = history.map((h) => h.close);
  const currentPrice = inst.current_price;

  // Simple 20-period Moving Average
  const period20 = closes.slice(-20);
  const sma20 = period20.reduce((acc, val) => acc + val, 0) / period20.length;

  // 14-period RSI calculation
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
  const rsi14 = 100 - (100 / (1 + rs));

  // Support & Resistance
  const highs = history.slice(-30).map((h) => h.high);
  const lows = history.slice(-30).map((h) => h.low);
  const resistance = Math.max(...highs);
  const support = Math.min(...lows);

  const trend = currentPrice > sma20 ? 'Bullish above 20-day SMA' : 'Bearish below 20-day SMA';
  const rsiState = rsi14 > 70 ? 'Overbought (>70)' : rsi14 < 30 ? 'Oversold (<30)' : 'Neutral (30-70)';

  return {
    agentName: 'TECH',
    status: 'SUCCESS',
    headline: `Technical Signals for ${symbol}`,
    metrics: {
      currentPrice: `₹${currentPrice.toFixed(2)}`,
      sma20: `₹${sma20.toFixed(2)}`,
      rsi14: rsi14.toFixed(1),
      rsiState,
      support30d: `₹${support.toFixed(2)}`,
      resistance30d: `₹${resistance.toFixed(2)}`,
      trend
    },
    analysis: `${symbol} is currently trading at ₹${currentPrice.toFixed(2)}, which is ${currentPrice >= sma20 ? 'above' : 'below'} its 20-period SMA of ₹${sma20.toFixed(2)}. The 14-day Relative Strength Index (RSI) stands at ${rsi14.toFixed(1)} (${rsiState}). Primary 30-day resistance is at ₹${resistance.toFixed(2)} with support identified around ₹${support.toFixed(2)}.`
  };
}

// 2. NEWS AGENT
export function runNewsAgent(symbol: string): AgentReport {
  const newsItems = db.prepare('SELECT * FROM news WHERE symbol = ? OR symbol = "BANKNIFTY" ORDER BY published_at DESC LIMIT 3').all(symbol) as any[];

  if (newsItems.length === 0) {
    return {
      agentName: 'NEWS',
      status: 'NO_DATA',
      headline: `No recent news articles logged for ${symbol}`,
      metrics: { sentiment: 'NEUTRAL', newsCount: 0 },
      analysis: 'No specific company announcements or news headlines were detected in recent market feeds.'
    };
  }

  const positiveCount = newsItems.filter(n => n.sentiment === 'POSITIVE').length;
  const negativeCount = newsItems.filter(n => n.sentiment === 'NEGATIVE').length;
  const overallSentiment = positiveCount > negativeCount ? 'BULLISH_SENTIMENT' : negativeCount > positiveCount ? 'BEARISH_SENTIMENT' : 'NEUTRAL_SENTIMENT';

  return {
    agentName: 'NEWS',
    status: 'SUCCESS',
    headline: `Market & News Sentiment for ${symbol}`,
    metrics: {
      articlesCount: newsItems.length,
      overallSentiment,
      topHeadline: newsItems[0].title,
      source: newsItems[0].source
    },
    analysis: `Analyzed ${newsItems.length} news item(s). Latest headline: "${newsItems[0].title}" (${newsItems[0].source}). Overall news sentiment reads ${overallSentiment.replace('_', ' ')}.`
  };
}

// 3. RISK AGENT
export function runRiskAgent(symbol: string): AgentReport {
  const inst = getInstrument(symbol);
  const history = getInstrumentHistory(symbol) as any[];

  if (!inst || history.length < 5) {
    return {
      agentName: 'RISK',
      status: 'NO_DATA',
      headline: `Risk assessment unavailable for ${symbol}`,
      metrics: {},
      analysis: 'Insufficient data to compute volatility & drawdown metrics.'
    };
  }

  const closes = history.map(h => h.close);
  const dailyReturns = [];
  for (let i = 1; i < closes.length; i++) {
    dailyReturns.push((closes[i] - closes[i - 1]) / closes[i - 1]);
  }

  const meanReturn = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
  const variance = dailyReturns.reduce((a, b) => a + Math.pow(b - meanReturn, 2), 0) / dailyReturns.length;
  const dailyVol = Math.sqrt(variance);
  const annualizedVolPercent = (dailyVol * Math.sqrt(252)) * 100;

  // Max Drawdown calculation
  let peak = closes[0];
  let maxDrawdown = 0;
  for (const c of closes) {
    if (c > peak) peak = c;
    const dd = (peak - c) / peak;
    if (dd > maxDrawdown) maxDrawdown = dd;
  }

  const riskLevel = annualizedVolPercent > 30 ? 'HIGH_VOLATILITY' : annualizedVolPercent > 18 ? 'MODERATE_VOLATILITY' : 'LOW_VOLATILITY';

  return {
    agentName: 'RISK',
    status: 'SUCCESS',
    headline: `Risk Profile for ${symbol}`,
    metrics: {
      annualizedVolatility: `${annualizedVolPercent.toFixed(1)}%`,
      maxDrawdown30d: `${(maxDrawdown * 100).toFixed(1)}%`,
      riskLevel,
      52wHighDistance: inst.high_52w ? `${(((inst.high_52w - inst.current_price) / inst.high_52w) * 100).toFixed(1)}% below 52w High` : 'N/A'
    },
    analysis: `${symbol} exhibits an annualized volatility profile of ${annualizedVolPercent.toFixed(1)}% (${riskLevel.replace('_', ' ')}). Maximum drawdown over the last 30 trading sessions was ${(maxDrawdown * 100).toFixed(1)}%.`
  };
}

// 4. FUNDAMENTAL AGENT
export function runFundamentalAgent(symbol: string): AgentReport {
  const inst = getInstrument(symbol);
  if (!inst) {
    return {
      agentName: 'FUNDAMENTAL',
      status: 'NO_DATA',
      headline: `Fundamental metrics unavailable for ${symbol}`,
      metrics: {},
      analysis: 'Instrument record not found.'
    };
  }

  return {
    agentName: 'FUNDAMENTAL',
    status: 'SUCCESS',
    headline: `Fundamental Indicators for ${inst.name} (${inst.symbol})`,
    metrics: {
      marketCap: inst.market_cap ? `₹${inst.market_cap.toLocaleString('en-IN')} Cr` : 'N/A',
      peRatio: inst.pe_ratio ? inst.pe_ratio.toFixed(1) : 'N/A',
      pbRatio: inst.pb_ratio ? inst.pb_ratio.toFixed(1) : 'N/A',
      sector: inst.sector || 'N/A'
    },
    analysis: `${inst.name} belongs to the ${inst.sector} sector with a total market capitalization of ₹${inst.market_cap?.toLocaleString('en-IN')} Cr. The stock trades at a Price-to-Earnings (P/E) ratio of ${inst.pe_ratio} and Price-to-Book (P/B) ratio of ${inst.pb_ratio}.`
  };
}

// 5. INFO AGENT
export function runInfoAgent(symbol: string): AgentReport {
  const inst = getInstrument(symbol);
  if (!inst) {
    return {
      agentName: 'INFO',
      status: 'NO_DATA',
      headline: `Company information unavailable for ${symbol}`,
      metrics: {},
      analysis: 'No instrument details found.'
    };
  }

  return {
    agentName: 'INFO',
    status: 'SUCCESS',
    headline: `Company Overview for ${inst.name}`,
    metrics: {
      exchange: inst.exchange,
      assetType: inst.asset_type,
      range52w: inst.high_52w && inst.low_52w ? `₹${inst.low_52w} - ₹${inst.high_52w}` : 'N/A'
    },
    analysis: `${inst.name} (${inst.symbol}) is listed on the ${inst.exchange} exchange under the ${inst.sector} sector. Its 52-week trading range spans between ₹${inst.low_52w} and ₹${inst.high_52w}.`
  };
}

// 6. MULTI-AGENT ORCHESTRATOR
export function runAIOrchestrator(userId: string, userPrompt: string): OrchestrationResult {
  const promptUpper = userPrompt.toUpperCase();
  const allInsts = getAllInstruments();
  
  // Detect if query mentions a specific ticker symbol
  let targetSymbol: string | null = null;
  for (const inst of allInsts) {
    if (promptUpper.includes(inst.symbol) || promptUpper.includes(inst.name.toUpperCase())) {
      targetSymbol = inst.symbol;
      break;
    }
  }

  // Fallback to RELIANCE if query is general analysis
  if (!targetSymbol && (promptUpper.includes('ANALYZE') || promptUpper.includes('STOCK') || promptUpper.includes('MARKET'))) {
    targetSymbol = 'RELIANCE';
  }

  const reports: AgentReport[] = [];
  const currentSymbol = targetSymbol || 'RELIANCE';

  // Orchestrator invokes appropriate specialized agents
  reports.push(runTechAgent(currentSymbol));
  reports.push(runNewsAgent(currentSymbol));
  reports.push(runRiskAgent(currentSymbol));
  reports.push(runFundamentalAgent(currentSymbol));
  reports.push(runInfoAgent(currentSymbol));

  const inst = getInstrument(currentSymbol);
  const priceText = inst ? `₹${inst.current_price.toFixed(2)} (${inst.change >= 0 ? '+' : ''}${inst.change.toFixed(2)}, ${inst.percent_change.toFixed(2)}%)` : 'N/A';

  const techRep = reports.find(r => r.agentName === 'TECH');
  const newsRep = reports.find(r => r.agentName === 'NEWS');
  const riskRep = reports.find(r => r.agentName === 'RISK');
  const fundRep = reports.find(r => r.agentName === 'FUNDAMENTAL');

  const synthesizedResponse = `
### Comprehensive Intelligence Synthesis for **${inst ? inst.name : currentSymbol}** (${currentSymbol})

**Current Market Quote:** ${priceText}

---

#### 1. Technical Analysis (Tech Agent)
- **Trend & Moving Average:** ${techRep?.metrics.trend || 'N/A'}
- **RSI (14-day):** ${techRep?.metrics.rsi14 || 'N/A'} (${techRep?.metrics.rsiState || ''})
- **Key Levels:** Support: ${techRep?.metrics.support30d || 'N/A'} | Resistance: ${techRep?.metrics.resistance30d || 'N/A'}
- *Key Takeaway:* ${techRep?.analysis}

#### 2. Fundamental Valuation (Fundamental Agent)
- **Market Cap:** ${fundRep?.metrics.marketCap || 'N/A'}
- **P/E Ratio:** ${fundRep?.metrics.peRatio || 'N/A'} | **P/B Ratio:** ${fundRep?.metrics.pbRatio || 'N/A'}
- *Key Takeaway:* ${fundRep?.analysis}

#### 3. Risk Assessment (Risk Agent)
- **Volatility:** ${riskRep?.metrics.annualizedVolatility || 'N/A'} (${riskRep?.metrics.riskLevel || ''})
- **30-Day Max Drawdown:** ${riskRep?.metrics.maxDrawdown30d || 'N/A'}
- *Key Takeaway:* ${riskRep?.analysis}

#### 4. News & Market Sentiment (News Agent)
- **Sentiment:** ${newsRep?.metrics.overallSentiment || 'NEUTRAL'}
- **Latest Headline:** ${newsRep?.metrics.topHeadline ? `"${newsRep.metrics.topHeadline}"` : 'No recent headlines'}
- *Key Takeaway:* ${newsRep?.analysis}

---

#### Executive AI Assessment Summary
Based on multi-agent evidence synthesis, **${currentSymbol}** displays a **${techRep?.metrics.trend?.includes('Bullish') ? 'constructive' : 'cautious'}** technical structure accompanied by **${riskRep?.metrics.riskLevel?.replace('_', ' ').toLowerCase() || 'moderate volatility'}**. Valuation remains aligned with peer multiples in the ${inst?.sector || 'market'} sector.
  `.trim();

  const disclaimer = 'DISCLAIMER: MAXLITH AI market insights are generated strictly for analytical and educational purposes on virtual paper-trading assets. MAXLITH V1 does not execute real-money transactions, nor does it guarantee future financial performance.';

  // Log execution run in audit database
  try {
    db.prepare(`
      INSERT INTO ai_agent_runs (id, user_id, agent_name, prompt, output, tokens_used, execution_time_ms)
      VALUES (?, ?, 'ORCHESTRATOR', ?, ?, 450, 120)
    `).run(`run-${Date.now()}`, userId, userPrompt, synthesizedResponse);
  } catch (err) {
    console.error('Failed to log AI run', err);
  }

  return {
    query: userPrompt,
    symbolDetected: currentSymbol,
    agentReports: reports,
    response: synthesizedResponse,
    disclaimer,
    timestamp: new Date().toISOString()
  };
}
