import type { MarketBar, HistoricalBarsRequest, MarketDepth } from '../tradingview/datafeed';
import type { TradingSymbol } from '../tradingview/symbols';

export interface MarketQuote {
  symbol: string;
  exchange: 'NSE' | 'BSE';
  name: string;
  currency: 'INR';
  last: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  previousClose: number;
  volume: number;
  asOf: string;
  source: string;
  delaySeconds: number;
}

export interface MarketStatus {
  session: 'PRE_MARKET' | 'OPEN' | 'POST_MARKET' | 'CLOSED' | 'UNKNOWN';
  isOpen: boolean;
  timezone: string;
  asOf: string;
  source: string;
}

export interface MarketDataProvider {
  readonly name: string;
  searchSymbols(query: string, exchange?: string, limit?: number): Promise<TradingSymbol[]>;
  resolveSymbol(symbolId: string): Promise<TradingSymbol | null>;
  getQuote(symbolId: string): Promise<MarketQuote | null>;
  getHistoricalBars(request: HistoricalBarsRequest): Promise<MarketBar[]>;
  subscribeBars(symbolId: string, resolution: string, listener: (bar: MarketBar) => void): () => void;
  getDepth(symbolId: string): Promise<MarketDepth>;
  getMarketStatus(): Promise<MarketStatus>;
}

export class MarketDataUnavailableError extends Error {
  constructor(message = 'A licensed market-data provider is not configured.') {
    super(message);
    this.name = 'MarketDataUnavailableError';
  }
}
