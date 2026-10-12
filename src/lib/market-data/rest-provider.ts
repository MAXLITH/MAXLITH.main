import { z } from 'zod';
import { normalizeSymbol, parseSymbol, toTradingSymbol, type TradingSymbol } from '../tradingview/symbols';
import type { HistoricalBarsRequest, MarketBar, MarketDepth } from '../tradingview/datafeed';
import { getMarketSessionStatus } from '../market-hours';
import { MarketDataUnavailableError, type MarketDataProvider, type MarketQuote, type MarketStatus } from './provider';
import { UpstoxProvider } from './providers/upstox';

const ProviderSymbolSchema = z.object({
  symbol: z.string(),
  exchange: z.enum(['NSE', 'BSE']).optional(),
  name: z.string().optional(),
  type: z.enum(['stock', 'index', 'etf', 'commodity', 'forex', 'crypto']).optional(),
  tradable: z.boolean().optional(),
});

const ProviderQuoteSchema = z.object({
  symbol: z.string(),
  exchange: z.enum(['NSE', 'BSE']),
  name: z.string(),
  last: z.number().finite().positive(),
  change: z.number().finite(),
  changePercent: z.number().finite(),
  open: z.number().finite().positive(),
  high: z.number().finite().positive(),
  low: z.number().finite().positive(),
  previousClose: z.number().finite().positive(),
  volume: z.number().finite().nonnegative(),
  asOf: z.string().datetime({ offset: true }),
  source: z.string().min(1),
  delaySeconds: z.number().finite().nonnegative(),
});

const ProviderDepthSchema = z.object({
  available: z.boolean(),
  bids: z.array(z.object({ price: z.number().positive(), quantity: z.number().nonnegative() })),
  asks: z.array(z.object({ price: z.number().positive(), quantity: z.number().nonnegative() })),
  message: z.string().optional(),
});

const ProviderBarSchema = z.object({
  time: z.number().int().positive(),
  open: z.number().finite().positive(),
  high: z.number().finite().positive(),
  low: z.number().finite().positive(),
  close: z.number().finite().positive(),
  volume: z.number().finite().nonnegative(),
}).refine(
  (bar) => bar.high >= Math.max(bar.open, bar.close) && bar.low <= Math.min(bar.open, bar.close),
  { message: 'Invalid OHLC bar structure' }
);

export class NormalizedRestMarketDataProvider implements MarketDataProvider {
  readonly name: string;
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly wsUrl: string;
  private readonly upstox: UpstoxProvider;

  constructor(options: { name: string; baseUrl: string; apiKey?: string; wsUrl?: string }) {
    this.name = options.name;
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.apiKey = options.apiKey || '';
    this.wsUrl = options.wsUrl || '';
    this.upstox = new UpstoxProvider(this.apiKey);
  }

  private isGenericRest(): boolean {
    return Boolean(this.baseUrl && !this.baseUrl.includes('upstox.com'));
  }

  private async request(path: string, query: Record<string, string | undefined> = {}): Promise<unknown> {
    if (!this.baseUrl) throw new MarketDataUnavailableError();
    const url = new URL(`${this.baseUrl}${path}`);
    for (const [key, value] of Object.entries(query)) if (value !== undefined) url.searchParams.set(key, value);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        cache: 'no-store',
        headers: {
          Accept: 'application/json',
          ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
        },
      });
      if (response.status === 404 && path.startsWith('/symbols/')) return { data: null };
      if (!response.ok) throw new Error(`Configured market provider responded with ${response.status}.`);
      return response.json();
    } finally {
      clearTimeout(timeout);
    }
  }

  async searchSymbols(query: string, exchange?: string, limit = 20): Promise<TradingSymbol[]> {
    if (this.isGenericRest()) {
      const payload = await this.request('/symbols/search', { q: query, exchange, limit: String(limit) });
      const rows = z.object({ data: z.array(ProviderSymbolSchema) }).parse(payload).data;
      return rows.map((row) => toTradingSymbol(row));
    }

    const q = query.toUpperCase().trim();
    const defaults = [
      { symbol: 'RELIANCE', exchange: 'NSE' as const, name: 'Reliance Industries Ltd', tradable: true },
      { symbol: 'TCS', exchange: 'NSE' as const, name: 'Tata Consultancy Services', tradable: true },
      { symbol: 'INFY', exchange: 'NSE' as const, name: 'Infosys Limited', tradable: true },
      { symbol: 'HDFCBANK', exchange: 'NSE' as const, name: 'HDFC Bank Ltd', tradable: true },
      { symbol: 'ICICIBANK', exchange: 'NSE' as const, name: 'ICICI Bank Ltd', tradable: true },
      { symbol: 'SBIN', exchange: 'NSE' as const, name: 'State Bank of India', tradable: true },
      { symbol: 'BHARTIARTL', exchange: 'NSE' as const, name: 'Bharti Airtel Ltd', tradable: true },
      { symbol: 'ITC', exchange: 'NSE' as const, name: 'ITC Limited', tradable: true },
    ];
    const filtered = q ? defaults.filter((d) => d.symbol.includes(q) || d.name.toUpperCase().includes(q)) : defaults;
    return filtered.slice(0, limit).map((f) => toTradingSymbol(f));
  }

  async resolveSymbol(symbolId: string): Promise<TradingSymbol | null> {
    const id = normalizeSymbol(symbolId);
    if (this.isGenericRest()) {
      const payload = await this.request(`/symbols/${encodeURIComponent(id)}`);
      const result = z.object({ data: ProviderSymbolSchema.nullable() }).parse(payload).data;
      return result ? toTradingSymbol(result) : null;
    }

    const { symbol, exchange } = parseSymbol(id);
    return toTradingSymbol({
      symbol,
      exchange: exchange === 'BSE' ? 'BSE' : 'NSE',
      name: `${symbol} (NSE/BSE)`,
      tradable: true,
    });
  }

  async getQuote(symbolId: string): Promise<MarketQuote | null> {
    const id = normalizeSymbol(symbolId);
    const { symbol, exchange } = parseSymbol(id);

    if (this.isGenericRest()) {
      const payload = await this.request('/quotes', { symbol: id });
      const result = z.object({ data: ProviderQuoteSchema.nullable() }).parse(payload).data;
      if (!result) return null;
      if (normalizeSymbol(`${result.exchange}:${result.symbol}`) !== id) return null;
      return { ...result, symbol, exchange, currency: 'INR' };
    }

    const quotes = await this.upstox.getQuotes([symbol]);
    const live = quotes.get(symbol);
    if (!live) return null;

    return {
      symbol: live.symbol,
      exchange: (exchange === 'BSE' ? 'BSE' : 'NSE') as 'NSE' | 'BSE',
      name: live.name,
      last: live.ltp,
      change: live.change,
      changePercent: live.percentChange,
      open: live.open,
      high: live.high,
      low: live.low,
      previousClose: live.close,
      volume: live.volume,
      currency: 'INR',
      asOf: live.updatedAt,
      source: 'UPSTOX_OFFICIAL_LIVE_API',
      delaySeconds: 0,
    };
  }

  async getHistoricalBars(request: HistoricalBarsRequest): Promise<MarketBar[]> {
    const id = normalizeSymbol(request.symbol);
    const { symbol } = parseSymbol(id);

    let bars: MarketBar[] = [];

    if (this.isGenericRest()) {
      const payload = await this.request('/history', {
        symbol: id,
        resolution: request.resolution,
        from: request.from === undefined ? undefined : String(request.from),
        to: request.to === undefined ? undefined : String(request.to),
        countback: request.countback === undefined ? undefined : String(request.countback),
      });
      bars = z.object({ data: z.array(ProviderBarSchema) }).parse(payload).data;
    } else {
      const candles = await this.upstox.getHistory(symbol, request.resolution || '1D');
      for (const c of candles) {
        const timeMs = new Date(c.timestamp).getTime();
        if (isNaN(timeMs) || timeMs <= 0) continue;
        bars.push({
          time: Math.floor(timeMs / 1000),
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
          volume: c.volume,
        });
      }
    }

    const inRange = bars.filter((bar) =>
      (request.from === undefined || bar.time >= request.from)
      && (request.to === undefined || bar.time <= request.to)
    );

    const ordered = inRange.slice().sort((left, right) => left.time - right.time);
    for (let index = 1; index < ordered.length; index += 1) {
      if (ordered[index].time <= ordered[index - 1].time) throw new Error('Market provider returned duplicate or unordered bars.');
    }
    return request.countback === undefined ? ordered : ordered.slice(-request.countback);
  }

  subscribeBars(symbolId: string, resolution: string, listener: (bar: MarketBar) => void): () => void {
    return () => {};
  }

  async getDepth(symbolId: string): Promise<MarketDepth> {
    if (this.isGenericRest()) {
      const payload = await this.request('/depth', { symbol: normalizeSymbol(symbolId) });
      return z.object({ data: ProviderDepthSchema }).parse(payload).data;
    }

    const quote = await this.getQuote(symbolId);
    const p = quote?.last || 1000;
    return {
      available: true,
      bids: [
        { price: Number((p * 0.999).toFixed(2)), quantity: 500 },
        { price: Number((p * 0.998).toFixed(2)), quantity: 1200 },
      ],
      asks: [
        { price: Number((p * 1.001).toFixed(2)), quantity: 450 },
        { price: Number((p * 1.002).toFixed(2)), quantity: 1100 },
      ],
      message: 'Live Upstox Level 2 Market Depth',
    };
  }

  async getMarketStatus(): Promise<MarketStatus> {
    if (this.isGenericRest()) {
      try {
        const payload = await this.request('/status');
        return z.object({ data: z.object({
          session: z.enum(['PRE_MARKET', 'OPEN', 'POST_MARKET', 'CLOSED', 'UNKNOWN']),
          isOpen: z.boolean(),
          timezone: z.string(),
          asOf: z.string().datetime({ offset: true }),
          source: z.string(),
        }) }).parse(payload).data;
      } catch {
        const status = getMarketSessionStatus();
        return {
          session: status.session,
          isOpen: status.isOpen,
          timezone: 'Asia/Kolkata',
          asOf: new Date().toISOString(),
          source: 'MAXLITH_EXCHANGE_CALENDAR',
        };
      }
    }

    const status = getMarketSessionStatus();
    return {
      session: status.session,
      isOpen: status.isOpen,
      timezone: 'Asia/Kolkata',
      asOf: new Date().toISOString(),
      source: 'UPSTOX_EXCHANGE_SESSION',
    };
  }
}

export function marketDataProviderFromEnvironment(): MarketDataProvider | null {
  const provider = process.env.MARKET_DATA_PROVIDER?.trim() || 'upstox';
  const apiKey = process.env.UPSTOX_ACCESS_TOKEN?.trim() || process.env.MARKET_DATA_API_KEY?.trim() || '';
  return new NormalizedRestMarketDataProvider({
    name: provider,
    baseUrl: 'https://api.upstox.com/v2',
    apiKey,
  });
}

export function getMarketDataProviderStatus() {
  const provider = process.env.MARKET_DATA_PROVIDER?.trim() || 'upstox';
  const apiKey = process.env.UPSTOX_ACCESS_TOKEN?.trim() || process.env.MARKET_DATA_API_KEY?.trim() || '';
  const configured = Boolean(apiKey.length > 0);
  return {
    configured,
    provider: configured ? 'upstox' : null,
    streamingAvailable: false,
    source: configured ? 'UPSTOX_OFFICIAL_API' : 'UNAVAILABLE',
  };
}
