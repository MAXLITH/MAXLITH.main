import { normalizeSymbol, parseSymbol, type TradingSymbol } from './symbols';
import type { Resolution } from './resolutions';
import type { MarketRealtimeClient, RealtimeMessage } from './realtime';

export interface MarketBar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface HistoricalBarsRequest {
  symbol: string;
  resolution: Resolution;
  from?: number;
  to?: number;
  countback?: number;
}

export interface SearchSymbolsRequest {
  query: string;
  exchange?: string;
  limit?: number;
}

export interface MarketDepth {
  available: boolean;
  bids: { price: number; quantity: number }[];
  asks: { price: number; quantity: number }[];
  message?: string;
}

export interface MarketDataFeed {
  searchSymbols(request: SearchSymbolsRequest): Promise<TradingSymbol[]>;
  resolveSymbol(symbol: string): Promise<TradingSymbol>;
  getQuote(symbol: string): Promise<Record<string, unknown> | null>;
  getHistoricalBars(request: HistoricalBarsRequest): Promise<MarketBar[]>;
  subscribeBars(symbol: string, listener: (message: RealtimeMessage) => void): () => void;
  getDepth(symbol: string): Promise<MarketDepth>;
  getMarketStatus(): Promise<Record<string, unknown>>;
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, cache: 'no-store' });
  if (!response.ok) throw new Error(`Market data request failed (${response.status})`);
  return response.json() as Promise<T>;
}

function barTime(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.floor(value > 10_000_000_000 ? value / 1000 : value);
  if (typeof value !== 'string') return null;
  const parsed = Date.parse(value.includes('T') ? value : value.replace(' ', 'T') + 'Z');
  return Number.isFinite(parsed) ? Math.floor(parsed / 1000) : null;
}

export class HttpMarketDataFeed implements MarketDataFeed {
  constructor(private readonly realtime: MarketRealtimeClient, private readonly baseUrl = '') {}

  async searchSymbols({ query, exchange, limit = 20 }: SearchSymbolsRequest): Promise<TradingSymbol[]> {
    const params = new URLSearchParams({ q: query, limit: String(Math.min(Math.max(limit, 1), 50)) });
    if (exchange) params.set('exchange', exchange);
    const result = await fetchJson<{ data?: TradingSymbol[] }>(`${this.baseUrl}/api/market/search?${params}`);
    return result.data || [];
  }

  async resolveSymbol(symbol: string): Promise<TradingSymbol> {
    const id = normalizeSymbol(symbol);
    const result = await fetchJson<{ data?: TradingSymbol }>(`${this.baseUrl}/api/market/symbol/${encodeURIComponent(id)}`);
    if (!result.data) throw new Error(`Instrument ${id} is unavailable`);
    return result.data;
  }

  async getQuote(symbol: string): Promise<Record<string, unknown> | null> {
    const id = normalizeSymbol(symbol);
    const result = await fetchJson<{ data?: Record<string, unknown> | null }>(`${this.baseUrl}/api/market/quote?symbol=${encodeURIComponent(id)}`);
    return result.data || null;
  }

  async getHistoricalBars(request: HistoricalBarsRequest): Promise<MarketBar[]> {
    const id = normalizeSymbol(request.symbol);
    const params = new URLSearchParams({ symbol: id, resolution: request.resolution });
    if (request.from !== undefined) params.set('from', String(request.from));
    if (request.to !== undefined) params.set('to', String(request.to));
    if (request.countback !== undefined) params.set('countback', String(request.countback));
    const result = await fetchJson<{ data?: Record<string, unknown>[] }>(`${this.baseUrl}/api/market/history?${params}`);

    const bars = (result.data || []).flatMap((row): MarketBar[] => {
      const time = barTime(row.time ?? row.timestamp);
      const open = Number(row.open);
      const high = Number(row.high);
      const low = Number(row.low);
      const close = Number(row.close);
      const volume = Number(row.volume ?? 0);
      if (!time || ![open, high, low, close, volume].every(Number.isFinite)) return [];
      if (low > Math.min(open, close) || high < Math.max(open, close) || high < low || volume < 0) return [];
      return [{ time, open, high, low, close, volume }];
    });

    return bars.sort((a, b) => a.time - b.time);
  }

  subscribeBars(symbol: string, listener: (message: RealtimeMessage) => void): () => void {
    return this.realtime.subscribe(normalizeSymbol(symbol), listener);
  }

  async getDepth(symbol: string): Promise<MarketDepth> {
    const id = normalizeSymbol(symbol);
    return fetchJson<MarketDepth>(`${this.baseUrl}/api/market/depth?symbol=${encodeURIComponent(id)}`);
  }

  async getMarketStatus(): Promise<Record<string, unknown>> {
    const result = await fetchJson<{ data?: Record<string, unknown> }>(`${this.baseUrl}/api/market/config`);
    return result.data || {};
  }
}

export function resolveLocalSymbol(symbol: string, details: { name?: string; type?: TradingSymbol['type'] } = {}): TradingSymbol {
  const { exchange, symbol: ticker, id } = parseSymbol(symbol);
  return {
    id,
    symbol: ticker,
    exchange,
    name: details.name || ticker,
    description: details.name || ticker,
    type: details.type || 'stock',
    currency: 'INR',
    timezone: 'Asia/Kolkata',
    tradable: details.type !== 'index',
  };
}
