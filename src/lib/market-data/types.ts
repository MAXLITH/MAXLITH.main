export interface LiveQuote {
  symbol: string;
  name: string;
  exchange: string;
  sector: string;
  ltp: number;
  change: number;
  percentChange: number;
  open: number;
  high: number;
  low: number;
  close: number; // previous close
  volume: number;
  high52w?: number;
  low52w?: number;
  marketCap?: number;
  peRatio?: number;
  pbRatio?: number;
  updatedAt: string;
  source: string;
  isFallback: boolean;
  delaySeconds: number;
}

export interface IndexQuote {
  symbol: string;
  name: string;
  value: number;
  change: number;
  percentChange: number;
  open: number;
  high: number;
  low: number;
  previousClose: number;
  updatedAt: string;
}

export interface OHLCV {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface MarketDataProvider {
  name: string;
  getQuotes(symbols: string[]): Promise<Map<string, LiveQuote>>;
  getHistory(symbol: string, timeframe: string): Promise<OHLCV[]>;
}
