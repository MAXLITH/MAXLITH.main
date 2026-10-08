import { LiveQuote, MarketDataProvider, OHLCV } from '../types';

const SYMBOL_ISIN_MAP: Record<string, string> = {
  RELIANCE: 'NSE_EQ|INE002A01018',
  TCS: 'NSE_EQ|INE467B01029',
  INFY: 'NSE_EQ|INE009A01021',
  HDFCBANK: 'NSE_EQ|INE040A01034',
  ICICIBANK: 'NSE_EQ|INE090A01021',
  SBIN: 'NSE_EQ|INE062A01020',
  BHARTIARTL: 'NSE_EQ|INE397D01024',
  ITC: 'NSE_EQ|INE154A01025',
  LTIM: 'NSE_EQ|INE214T01019',
  LT: 'NSE_EQ|INE018A01030',
  AXISBANK: 'NSE_EQ|INE238A01034',
  KOTAKBANK: 'NSE_EQ|INE237A01028',
  TATAMOTORS: 'NSE_EQ|INE155A01022',
  TATASTEEL: 'NSE_EQ|INE081A01020',
  WIPRO: 'NSE_EQ|INE075A01022',
  HCLTECH: 'NSE_EQ|INE860A01027',
  NIFTY50: 'NSE_INDEX|Nifty 50',
  NIFTY: 'NSE_INDEX|Nifty 50',
  BANKNIFTY: 'NSE_INDEX|Nifty Bank',
  SENSEX: 'BSE_INDEX|SENSEX',
};

export class UpstoxProvider implements MarketDataProvider {
  name = 'upstox';
  private accessToken: string;
  private baseUrl = 'https://api.upstox.com/v2';

  constructor(token?: string) {
    this.accessToken = token || process.env.UPSTOX_ACCESS_TOKEN || process.env.MARKET_DATA_API_KEY || '';
  }

  private toUpstoxKey(symbol: string): string {
    const sym = symbol.toUpperCase().trim();
    if (SYMBOL_ISIN_MAP[sym]) return SYMBOL_ISIN_MAP[sym];
    if (sym.includes('|') || sym.includes(':')) return sym.replace(':', '|');
    return `NSE_EQ|${sym}`;
  }

  async getQuotes(symbols: string[]): Promise<Map<string, LiveQuote>> {
    const results = new Map<string, LiveQuote>();
    if (symbols.length === 0) return results;

    const instrumentKeys = symbols.map((s) => this.toUpstoxKey(s)).join(',');
    const url = `${this.baseUrl}/market-quote/quotes?instrument_key=${encodeURIComponent(instrumentKeys)}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${this.accessToken}`,
        },
      });

      if (res.ok) {
        const json = await res.json();
        const data = json?.data || {};

        for (const [key, q] of Object.entries<any>(data)) {
          const sym = key.includes(':') ? key.split(':')[1] : key.includes('|') ? key.split('|')[1] : key;
          const ltp = q.last_price || 0;
          const prev = q.ohlc?.close || ltp;
          const change = q.net_change ?? (ltp - prev);
          const pctChange = prev > 0 ? (change / prev) * 100 : 0;

          results.set(sym, {
            symbol: sym,
            name: q.company_name || sym,
            exchange: key.startsWith('BSE') ? 'BSE' : 'NSE',
            sector: 'General',
            ltp: Number(ltp.toFixed(2)),
            change: Number(change.toFixed(2)),
            percentChange: Number(pctChange.toFixed(2)),
            open: Number((q.ohlc?.open || ltp).toFixed(2)),
            high: Number((q.ohlc?.high || ltp).toFixed(2)),
            low: Number((q.ohlc?.low || ltp).toFixed(2)),
            close: Number(prev.toFixed(2)),
            volume: q.volume || 0,
            high52w: q['52_week_high'],
            low52w: q['52_week_low'],
            updatedAt: new Date().toISOString(),
            source: 'UPSTOX_LIVE',
            isFallback: false,
            delaySeconds: 0,
          });
        }
      }
    } catch (err) {
      console.error('Upstox quote error:', err);
    } finally {
      clearTimeout(timeout);
    }

    return results;
  }

  async getHistory(symbol: string, timeframe: string): Promise<OHLCV[]> {
    const key = this.toUpstoxKey(symbol);
    let interval = 'day';
    if (timeframe === '1D') interval = '1minute';
    if (timeframe === '1W') interval = '30minute';

    const today = new Date().toISOString().split('T')[0];
    const url = `${this.baseUrl}/historical-candle/${encodeURIComponent(key)}/${interval}/${today}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${this.accessToken}`,
        },
      });

      if (!res.ok) return [];

      const json = await res.json();
      const candlesData = json?.data?.candles || [];
      const candles: OHLCV[] = [];

      for (const c of candlesData) {
        if (!c || c.length < 5) continue;
        candles.push({
          timestamp: String(c[0]).replace('T', ' ').substring(0, 19),
          open: Number(c[1]),
          high: Number(c[2]),
          low: Number(c[3]),
          close: Number(c[4]),
          volume: Number(c[5] || 0),
        });
      }

      return candles.reverse();
    } catch {
      return [];
    } finally {
      clearTimeout(timeout);
    }
  }
}
