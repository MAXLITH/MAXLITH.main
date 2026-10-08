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
  MARUTI: 'NSE_EQ|INE585B01010',
  SUNPHARMA: 'NSE_EQ|INE044A01036',
  TITAN: 'NSE_EQ|INE280A01028',
  BAJFINANCE: 'NSE_EQ|INE296A01024',
  NIFTY50: 'NSE_INDEX|Nifty 50',
  NIFTY: 'NSE_INDEX|Nifty 50',
  BANKNIFTY: 'NSE_INDEX|Nifty Bank',
  FINNIFTY: 'NSE_INDEX|Nifty Fin Service',
  MIDCPNIFTY: 'NSE_INDEX|NIFTY MID SELECT',
  SENSEX: 'BSE_INDEX|SENSEX',
};

export class UpstoxProvider implements MarketDataProvider {
  readonly name = 'upstox';
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

  private mapTimeframeToInterval(timeframe: string): string {
    const tf = timeframe.toUpperCase().trim();
    switch (tf) {
      case '1M':
      case '1':
      case '1MIN':
        return '1minute';
      case '3M':
      case '3':
        return '3minute';
      case '5M':
      case '5':
        return '5minute';
      case '15M':
      case '15':
        return '15minute';
      case '30M':
      case '30':
        return '30minute';
      case '1H':
      case '60':
      case '2H':
      case '4H':
        return '30minute';
      case '1D':
      case 'D':
      case 'DAY':
        return 'day';
      case '1W':
      case 'W':
      case 'WEEK':
        return 'week';
      case 'MON':
      case 'MONTH':
        return 'month';
      default:
        return 'day';
    }
  }

  async getQuotes(symbols: string[]): Promise<Map<string, LiveQuote>> {
    const results = new Map<string, LiveQuote>();
    if (symbols.length === 0) return results;

    const instrumentKeys = symbols.map((s) => this.toUpstoxKey(s)).join(',');
    const url = `${this.baseUrl}/market-quote/quotes?instrument_key=${encodeURIComponent(instrumentKeys)}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

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

          // Strict Quote Invariant Check
          if (typeof ltp !== 'number' || isNaN(ltp) || ltp <= 0) continue;

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
    const interval = this.mapTimeframeToInterval(timeframe);

    const today = new Date().toISOString().split('T')[0];
    const url = `${this.baseUrl}/historical-candle/${encodeURIComponent(key)}/${interval}/${today}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

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

        const timestampStr = String(c[0]).replace('T', ' ').substring(0, 19);
        const open = Number(c[1]);
        const high = Number(c[2]);
        const low = Number(c[3]);
        const close = Number(c[4]);
        const volume = Number(c[5] || 0);

        // Strict Rule 5 Candle Validation: High >= max(Open, Close), Low <= min(Open, Close)
        if (isNaN(open) || isNaN(high) || isNaN(low) || isNaN(close) || open <= 0 || close <= 0) continue;
        if (high < Math.max(open, close) || low > Math.min(open, close) || high < low) continue;

        candles.push({
          timestamp: timestampStr,
          open,
          high,
          low,
          close,
          volume,
        });
      }

      // Upstox returns newest candle first; reverse to chronological order
      return candles.reverse();
    } catch (err) {
      console.error('Upstox history error:', err);
      return [];
    } finally {
      clearTimeout(timeout);
    }
  }
}
