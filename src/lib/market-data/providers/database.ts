import db from '../../db';
import { LiveQuote, MarketDataProvider, OHLCV } from '../types';

export class SupabaseFallbackProvider implements MarketDataProvider {
  name = 'supabase-fallback';

  async getQuotes(symbols: string[]): Promise<Map<string, LiveQuote>> {
    const results = new Map<string, LiveQuote>();
    if (symbols.length === 0) return results;

    const rows = db.prepare('SELECT * FROM instruments').all() as any[];

    for (const r of rows) {
      if (symbols.includes(r.symbol.toUpperCase())) {
        results.set(r.symbol, {
          symbol: r.symbol,
          name: r.name,
          exchange: r.exchange,
          sector: r.sector || 'General',
          ltp: r.current_price,
          change: r.change,
          percentChange: r.percent_change,
          open: r.open_price,
          high: r.high_price,
          low: r.low_price,
          close: r.previous_close,
          volume: r.volume,
          high52w: r.high_52w,
          low52w: r.low_52w,
          marketCap: r.market_cap,
          peRatio: r.pe_ratio,
          pbRatio: r.pb_ratio,
          updatedAt: r.updated_at || new Date().toISOString(),
          source: 'SUPABASE_STORE',
          isFallback: true,
          delaySeconds: 0,
        });
      }
    }

    return results;
  }

  async getHistory(symbol: string, timeframe: string): Promise<OHLCV[]> {
    const rows = db.prepare('SELECT timestamp, open, high, low, close, volume FROM price_history').all() as any[];

    return rows.map((r) => ({
      timestamp: r.timestamp,
      open: r.open,
      high: r.high,
      low: r.low,
      close: r.close,
      volume: r.volume,
    }));
  }
}
