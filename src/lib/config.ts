export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'maxlith_dev_jwt_secret_998877665544332211',
  adminEmail: process.env.ADMIN_EMAIL || 'admin@maxlith.com',
  adminPassword: process.env.ADMIN_PASSWORD || 'AdminSecurePass2026!',
  initialCapital: Number(process.env.INITIAL_VIRTUAL_CAPITAL || 1_000_000),
  slippageBps: Number(process.env.SLIPPAGE_BPS || 5), // 0.05%
  misMarginMultiplier: Number(process.env.MIS_MARGIN_MULTIPLIER || 5),
  quoteCacheTtlMsOpen: Number(process.env.QUOTE_CACHE_TTL_OPEN_MS || 3000),
  quoteCacheTtlMsClosed: Number(process.env.QUOTE_CACHE_TTL_CLOSED_MS || 60_000),
  redisUrl: process.env.REDIS_URL || '',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  anthropicModel: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  alphaVantageKey: process.env.ALPHA_VANTAGE_API_KEY || '',
  finnhubKey: process.env.FINNHUB_API_KEY || '',
  twelveDataKey: process.env.TWELVE_DATA_API_KEY || '',
  dataProviders: (process.env.MARKET_DATA_PROVIDERS || 'yahoo,nse,cache').split(',').map((s) => s.trim()),
};

export const PAPER_DISCLAIMER =
  'Paper trading / educational, not investment advice. MAXLITH V1 does not execute real-money trades.';
