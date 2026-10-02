import { LiveQuote, MarketDataProvider, OHLCV } from '../types';

export class YahooFinanceProvider implements MarketDataProvider {
  name = 'yahoo';

  private toYahooTicker(symbol: string): string {
    if (symbol === 'NIFTY50') return '^NSEI';
    if (symbol === 'BANKNIFTY') return '^NSEBANK';
    if (symbol === 'SENSEX') return '^BSESN';
    if (symbol.includes('.')) return symbol;
    return `${symbol}.NS`;
  }

  async getQuotes(symbols: string[]): Promise<Map<string, LiveQuote>> {
    const results = new Map<string, LiveQuote>();
    if (symbols.length === 0) return results;

    const tickerMap = new Map<string, string>();
    for (const sym of symbols) {
      tickerMap.set(this.toYahooTicker(sym), sym);
    }

    const tickerList = Array.from(tickerMap.keys()).join(',');
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(tickerList)}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
          Accept: 'application/json',
        },
      });

      if (!res.ok) {
        throw new Error(`Yahoo Finance responded with status ${res.status}`);
      }

      const json = await res.json();
      const quoteList = json?.quoteResponse?.result || [];

      for (const q of quoteList) {
        const origSymbol = tickerMap.get(q.symbol) || q.symbol.replace(/\.NS$|\.BO$/, '');
        const ltp = q.regularMarketPrice ?? q.regularMarketPreviousClose ?? 0;
        const prev = q.regularMarketPreviousClose ?? ltp;
        const change = q.regularMarketChange ?? (ltp - prev);
        const pctChange = q.regularMarketChangePercent ?? (prev > 0 ? (change / prev) * 100 : 0);

        results.set(origSymbol, {
          symbol: origSymbol,
          name: q.shortName || q.longName || origSymbol,
          exchange: q.symbol.endsWith('.BO') ? 'BSE' : 'NSE',
          sector: 'General',
          ltp: Number(ltp.toFixed(2)),
          change: Number(change.toFixed(2)),
          percentChange: Number(pctChange.toFixed(2)),
          open: Number((q.regularMarketOpen ?? ltp).toFixed(2)),
          high: Number((q.regularMarketDayHigh ?? ltp).toFixed(2)),
          low: Number((q.regularMarketDayLow ?? ltp).toFixed(2)),
          close: Number(prev.toFixed(2)),
          volume: q.regularMarketVolume ?? 0,
          high52w: q.fiftyTwoWeekHigh,
          low52w: q.fiftyTwoWeekLow,
          marketCap: q.marketCap ? Math.round(q.marketCap / 10_000_000) : undefined, // In Crores
          peRatio: q.trailingPE,
          pbRatio: q.priceToBook,
          updatedAt: new Date().toISOString(),
          source: 'YAHOO',
          isFallback: false,
          delaySeconds: 15,
        });
      }
    } finally {
      clearTimeout(timeout);
    }

    return results;
  }

  async getHistory(symbol: string, timeframe: string): Promise<OHLCV[]> {
    const yahooTicker = this.toYahooTicker(symbol);
    let range = '1mo';
    let interval = '1d';

    switch (timeframe) {
      case '1D':
        range = '1d';
        interval = '5m';
        break;
      case '1W':
        range = '5d';
        interval = '15m';
        break;
      case '1M':
        range = '1mo';
        interval = '1d';
        break;
      case '6M':
        range = '6mo';
        interval = '1d';
        break;
      case '1Y':
        range = '1y';
        interval = '1wk';
        break;
      case '5Y':
        range = '5y';
        interval = '1mo';
        break;
      default:
        range = '1mo';
        interval = '1d';
    }

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooTicker)}?range=${range}&interval=${interval}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });

      if (!res.ok) throw new Error('Yahoo history request failed');

      const data = await res.json();
      const chartResult = data?.chart?.result?.[0];
      if (!chartResult) return [];

      const timestamps = chartResult.timestamp || [];
      const quote = chartResult.indicators?.quote?.[0] || {};
      const opens = quote.open || [];
      const highs = quote.high || [];
      const lows = quote.low || [];
      const closes = quote.close || [];
      const volumes = quote.volume || [];

      const candles: OHLCV[] = [];
      for (let i = 0; i < timestamps.length; i++) {
        if (closes[i] == null) continue;
        const d = new Date(timestamps[i] * 1000);
        candles.push({
          timestamp: d.toISOString().replace('T', ' ').substring(0, 19),
          open: Number((opens[i] ?? closes[i]).toFixed(2)),
          high: Number((highs[i] ?? closes[i]).toFixed(2)),
          low: Number((lows[i] ?? closes[i]).toFixed(2)),
          close: Number(closes[i].toFixed(2)),
          volume: Math.round(volumes[i] || 0),
        });
      }
      return candles;
    } finally {
      clearTimeout(timeout);
    }
  }
}
