import { z } from 'zod';
import { normalizeSymbol, parseSymbol, toTradingSymbol, type TradingSymbol } from '../tradingview/symbols';
import type { HistoricalBarsRequest, MarketBar, MarketDepth } from '../tradingview/datafeed';
import { getMarketSessionStatus } from '../market-hours';
import { MarketDataUnavailableError, type MarketDataProvider, type MarketQuote, type MarketStatus } from './provider';

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

const ProviderBarSchema = z.object({
  time: z.number().int().positive(),
  open: z.number().finite().positive(),
  high: z.number().finite().positive(),
  low: z.number().finite().positive(),
  close: z.number().finite().positive(),
  volume: z.number().finite().nonnegative(),
}).refine((bar) => bar.high >= Math.max(bar.open, bar.close) && bar.low <= Math.min(bar.open, bar.close) && bar.high >= bar.low, {
  message: 'Provider candle high/low do not contain its open and close.',
});

const ProviderDepthSchema = z.object({
  available: z.boolean(),
  bids: z.array(z.object({ price: z.number().positive(), quantity: z.number().nonnegative() })),
  asks: z.array(z.object({ price: z.number().positive(), quantity: z.number().nonnegative() })),
  message: z.string().optional(),
});

export class NormalizedRestMarketDataProvider implements MarketDataProvider {
  readonly name: string;
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly wsUrl: string;
  private activeSockets = new Map<string, { socket: WebSocket; listeners: Set<(bar: MarketBar) => void> }>();

  constructor(options: { name: string; baseUrl: string; apiKey?: string; wsUrl?: string }) {
    this.name = options.name;
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.apiKey = options.apiKey || '';
    this.wsUrl = options.wsUrl || '';
  }

  async searchSymbols(query: string, exchange?: string, limit = 20): Promise<TradingSymbol[]> {
    const payload = await this.request('/symbols/search', { q: query, exchange, limit: String(limit) });
    const rows = z.object({ data: z.array(ProviderSymbolSchema) }).parse(payload).data;
    return rows.map((row) => toTradingSymbol(row));
  }

  async resolveSymbol(symbolId: string): Promise<TradingSymbol | null> {
    const id = normalizeSymbol(symbolId);
    const payload = await this.request(`/symbols/${encodeURIComponent(id)}`);
    const result = z.object({ data: ProviderSymbolSchema.nullable() }).parse(payload).data;
    return result ? toTradingSymbol(result) : null;
  }

  async getQuote(symbolId: string): Promise<MarketQuote | null> {
    const id = normalizeSymbol(symbolId);
    const payload = await this.request('/quotes', { symbol: id });
    const result = z.object({ data: ProviderQuoteSchema.nullable() }).parse(payload).data;
    if (!result) return null;
    const { symbol, exchange } = parseSymbol(id);
    if (normalizeSymbol(`${result.exchange}:${result.symbol}`) !== id) return null;
    return { ...result, symbol, exchange, currency: 'INR' };
  }

  async getHistoricalBars(request: HistoricalBarsRequest): Promise<MarketBar[]> {
    const id = normalizeSymbol(request.symbol);
    const payload = await this.request('/history', {
      symbol: id,
      resolution: request.resolution,
      from: request.from === undefined ? undefined : String(request.from),
      to: request.to === undefined ? undefined : String(request.to),
      countback: request.countback === undefined ? undefined : String(request.countback),
    });
    const bars = z.object({ data: z.array(ProviderBarSchema) }).parse(payload).data;
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
    if (!this.wsUrl) throw new MarketDataUnavailableError('The configured provider does not have a streaming URL.');
    const id = normalizeSymbol(symbolId);
    const key = `${id}:${resolution}`;
    let subscription = this.activeSockets.get(key);
    if (!subscription) {
      const socket = new WebSocket(this.wsUrl);
      const listeners = new Set<(bar: MarketBar) => void>();
      subscription = { socket, listeners };
      this.activeSockets.set(key, subscription);
      socket.addEventListener('open', () => socket.send(JSON.stringify({ action: 'subscribe', symbol: id, resolution })));
      socket.addEventListener('message', (event) => {
        try {
          const message = z.object({ type: z.literal('bar_update'), symbol: z.string(), data: ProviderBarSchema }).parse(JSON.parse(String(event.data)));
          if (normalizeSymbol(message.symbol) !== id) return;
          for (const onBar of listeners) onBar(message.data);
        } catch {
          // Ignore malformed frames; the public route reports the stream's connection state separately.
        }
      });
      socket.addEventListener('close', () => this.activeSockets.delete(key));
    }
    subscription.listeners.add(listener);

    return () => {
      const current = this.activeSockets.get(key);
      if (!current) return;
      current.listeners.delete(listener);
      if (current.listeners.size === 0) {
        try {
          if (current.socket.readyState === WebSocket.OPEN) current.socket.send(JSON.stringify({ action: 'unsubscribe', symbol: id, resolution }));
          current.socket.close();
        } finally {
          this.activeSockets.delete(key);
        }
      }
    };
  }

  async getDepth(symbolId: string): Promise<MarketDepth> {
    const payload = await this.request('/depth', { symbol: normalizeSymbol(symbolId) });
    return z.object({ data: ProviderDepthSchema }).parse(payload).data;
  }

  async getMarketStatus(): Promise<MarketStatus> {
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
}

export function marketDataProviderFromEnvironment(): MarketDataProvider | null {
  const provider = process.env.MARKET_DATA_PROVIDER?.trim();
  const baseUrl = process.env.MARKET_DATA_BASE_URL?.trim();
  if (!provider || !baseUrl) return null;
  return new NormalizedRestMarketDataProvider({
    name: provider,
    baseUrl,
    apiKey: process.env.MARKET_DATA_API_KEY,
    wsUrl: process.env.MARKET_DATA_WS_URL,
  });
}

export function getMarketDataProviderStatus() {
  const provider = process.env.MARKET_DATA_PROVIDER?.trim();
  const configured = Boolean(provider && process.env.MARKET_DATA_BASE_URL?.trim());
  return {
    configured,
    provider: configured ? provider : null,
    streamingAvailable: Boolean(
      configured
      && process.env.MARKET_DATA_WS_URL?.trim()
      && process.env.NEXT_PUBLIC_MARKET_WS_URL?.trim()
      && process.env.MARKET_STREAM_JWT_SECRET?.trim(),
    ),
    source: configured ? 'CONFIGURED_PROVIDER' : 'UNAVAILABLE',
  };
}
