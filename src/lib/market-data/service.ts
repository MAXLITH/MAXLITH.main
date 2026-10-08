import db from '../db';
import { cacheGet, cacheSet } from '../cache';
import { config } from '../config';
import { getMarketSessionStatus, MarketSessionStatus } from '../market-hours';
import { LiveQuote, IndexQuote, OHLCV, MarketDataProvider } from './types';
import { YahooFinanceProvider } from './providers/yahoo';
import { SupabaseFallbackProvider } from './providers/database';

export class MarketDataService {
  private providers: MarketDataProvider[];
  private dbFallback: SupabaseFallbackProvider;

  constructor() {
    this.dbFallback = new SupabaseFallbackProvider();
    this.providers = [new YahooFinanceProvider(), this.dbFallback];
  }

  normalizeSymbol(symbol: string): string {
    return symbol.toUpperCase().trim().replace(/\.NS$|\.BO$/, '');
  }

  private getCacheTtl(): number {
    const status = getMarketSessionStatus();
    return status.isOpen ? config.quoteCacheTtlMsOpen : config.quoteCacheTtlMsClosed;
  }

  async getQuote(symbol: string): Promise<LiveQuote | null> {
    const quotes = await this.getQuotes([symbol]);
    return quotes.get(this.normalizeSymbol(symbol)) || null;
  }

  async getQuotes(symbols: string[]): Promise<Map<string, LiveQuote>> {
    const normalized = Array.from(new Set(symbols.map((s) => this.normalizeSymbol(s))));
    const results = new Map<string, LiveQuote>();
    const missing: string[] = [];

    // 1. Try cache first
    for (const sym of normalized) {
      const cached = await cacheGet<LiveQuote>(`quote:${sym}`);
      if (cached) {
        results.set(sym, cached);
      } else {
        missing.push(sym);
      }
    }

    if (missing.length === 0) {
      return results;
    }

    // 2. Fetch missing from providers
    const ttl = this.getCacheTtl();
    const fetched = new Map<string, LiveQuote>();

    for (const provider of this.providers) {
      try {
        const batch = await provider.getQuotes(missing);
        if (batch && batch.size > 0) {
          for (const [k, v] of batch.entries()) {
            if (!fetched.has(k)) {
              fetched.set(k, v);
            }
          }
        }
        // If all found, stop provider loop
        if (missing.every((m) => fetched.has(m))) break;
      } catch {
        // Provider failed, continue to fallback
      }
    }

    // 3. Fallback to DB for any still missing
    const stillMissing = missing.filter((m) => !fetched.has(m));
    if (stillMissing.length > 0) {
      const dbQuotes = await this.dbFallback.getQuotes(stillMissing);
      for (const [k, v] of dbQuotes.entries()) {
        fetched.set(k, v);
      }
    }

    // 4. Save to cache & results, and update DB LTP snapshot
    for (const [sym, quote] of fetched.entries()) {
      await cacheSet(`quote:${sym}`, quote, ttl);
      results.set(sym, quote);

      // Async persist last price to instruments table if non-fallback
      if (!quote.isFallback) {
        try {
          db.prepare(`
            UPDATE instruments 
            SET current_price = ?, change = ?, percent_change = ?, volume = ?, updated_at = CURRENT_TIMESTAMP
            WHERE symbol = ?
          `).run(quote.ltp, quote.change, quote.percentChange, quote.volume, sym);
        } catch {
          /* ignore */
        }
      }
    }

    return results;
  }

  async getIndices(): Promise<IndexQuote[]> {
    const indexSymbols = ['NIFTY50', 'BANKNIFTY', 'SENSEX'];
    const quotes = await this.getQuotes(indexSymbols);

    return indexSymbols.map((sym) => {
      const q = quotes.get(sym);
      const name = sym === 'NIFTY50' ? 'NIFTY 50' : sym === 'BANKNIFTY' ? 'BANK NIFTY' : 'S&P BSE SENSEX';
      if (q) {
        return {
          symbol: sym,
          name,
          value: q.ltp,
          change: q.change,
          percentChange: q.percentChange,
          open: q.open,
          high: q.high,
          low: q.low,
          previousClose: q.close,
          updatedAt: q.updatedAt,
        };
      }

      // Hard fallback from db if not in quotes
      const inst = db.prepare("SELECT * FROM instruments WHERE symbol = ?").get(sym) as any;
      if (!inst) return null;
      return {
        symbol: sym,
        name,
        value: inst ? inst.current_price : 0,
        change: inst ? inst.change : 0,
        percentChange: inst ? inst.percent_change : 0,
        open: inst ? inst.open_price : 0,
        high: inst ? inst.high_price : 0,
        low: inst ? inst.low_price : 0,
        previousClose: inst ? inst.previous_close : 0,
        updatedAt: new Date().toISOString(),
      };
    }).filter((quote): quote is IndexQuote => quote !== null);
  }

  async getHistory(symbol: string, timeframe: string = '1D'): Promise<OHLCV[]> {
    const norm = this.normalizeSymbol(symbol);
    const cacheKey = `history:${norm}:${timeframe}`;
    const cached = await cacheGet<OHLCV[]>(cacheKey);
    if (cached) return cached;

    for (const provider of this.providers) {
      try {
        const candles = await provider.getHistory(norm, timeframe);
        if (candles && candles.length > 0) {
          await cacheSet(cacheKey, candles, 60_000); // 1 min cache
          return candles;
        }
      } catch {
        /* try next */
      }
    }

    // Local development/database fallback to price history
    const fallbackCandles = await this.dbFallback.getHistory(norm, timeframe);
    await cacheSet(cacheKey, fallbackCandles, 60_000);
    return fallbackCandles;
  }

  search(query: string, limit: number = 10) {
    if (!query || !query.trim()) {
      return db.prepare('SELECT symbol, name, exchange, sector, current_price, percent_change FROM instruments ORDER BY market_cap DESC LIMIT ?').all(limit);
    }
    const clean = `%${query.trim()}%`;
    return db.prepare(`
      SELECT symbol, name, exchange, sector, current_price, percent_change
      FROM instruments
      WHERE symbol LIKE ? OR name LIKE ? OR sector LIKE ?
      ORDER BY 
        CASE WHEN symbol LIKE ? THEN 1 WHEN name LIKE ? THEN 2 ELSE 3 END,
        market_cap DESC
      LIMIT ?
    `).all(clean, clean, clean, `${query.trim()}%`, `${query.trim()}%`, limit);
  }

  getMarketMovers() {
    const instruments = db.prepare(`
      SELECT symbol, name, exchange, sector, current_price, previous_close, change, percent_change, volume
      FROM instruments
      WHERE asset_type = 'EQUITY'
      ORDER BY market_cap DESC
    `).all() as any[];

    const sortedByPercent = [...instruments].sort((a, b) => b.percent_change - a.percent_change);
    const topGainers = sortedByPercent.slice(0, 5);
    const topLosers = [...sortedByPercent].reverse().slice(0, 5);
    const mostActive = [...instruments].sort((a, b) => (b.volume * b.current_price) - (a.volume * a.current_price)).slice(0, 5);

    return { topGainers, topLosers, mostActive };
  }

  getSectorHeatmap() {
    return db.prepare(`
      SELECT 
        sector, 
        COUNT(*) as stock_count, 
        ROUND(AVG(percent_change), 2) as avg_percent_change,
        ROUND(SUM(volume * current_price) / 10000000, 2) as turnover_cr
      FROM instruments
      WHERE asset_type = 'EQUITY' AND sector IS NOT NULL AND sector != ''
      GROUP BY sector
      ORDER BY avg_percent_change DESC
    `).all();
  }

  getStatus(): MarketSessionStatus {
    return getMarketSessionStatus();
  }
}

export const marketDataService = new MarketDataService();
