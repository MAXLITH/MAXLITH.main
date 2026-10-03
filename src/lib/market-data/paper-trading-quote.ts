import db from '@/lib/db';
import { marketDataProviderFromEnvironment } from './rest-provider';
import { MarketDataUnavailableError, type MarketQuote } from './provider';
import type { TradingSymbol } from '@/lib/tradingview/symbols';
import { normalizeSymbol, parseSymbol } from '@/lib/tradingview/symbols';

const MAX_QUOTE_AGE_MS = 60_000;

export class PaperMarketQuoteError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'PaperMarketQuoteError';
  }
}

/**
 * Resolve and persist a fresh, server-side quote before invoking the legacy
 * paper engine, whose ledger and order tables are keyed by the NSE ticker.
 */
export async function getVerifiedPaperQuote(rawSymbol: string) {
  const id = normalizeSymbol(rawSymbol);
  const parsed = parseSymbol(id);
  if (parsed.exchange !== 'NSE') {
    throw new PaperMarketQuoteError('Paper trading currently supports NSE symbols only. BSE chart data remains available.', 422);
  }

  const provider = marketDataProviderFromEnvironment();
  if (!provider) throw new MarketDataUnavailableError('Paper trading is disabled until a licensed market-data provider is configured.');

  let instrument: TradingSymbol | null;
  let quote: MarketQuote | null;
  try {
    instrument = await provider.resolveSymbol(id);
    quote = await provider.getQuote(id);
  } catch {
    throw new PaperMarketQuoteError('Configured market-data provider is temporarily unavailable.', 502);
  }
  if (!instrument || !instrument.tradable) throw new PaperMarketQuoteError(`Tradable instrument ${id} is unavailable from the configured provider.`, 404);
  if (!quote || quote.symbol !== parsed.symbol || quote.exchange !== parsed.exchange) {
    throw new PaperMarketQuoteError(`A verified quote for ${id} is currently unavailable.`, 503);
  }

  const quoteAge = Date.now() - Date.parse(quote.asOf);
  if (!Number.isFinite(quoteAge) || quoteAge < -5_000 || quoteAge > MAX_QUOTE_AGE_MS || quote.delaySeconds > 0) {
    throw new PaperMarketQuoteError('The provider quote is stale or delayed; paper order execution is disabled.', 409);
  }

  db.prepare(`
    INSERT INTO instruments (
      symbol, name, exchange, asset_type, tick_size, lot_size,
      current_price, previous_close, open_price, high_price, low_price,
      change, percent_change, volume, stale, source, updated_at
    ) VALUES (?, ?, ?, 'EQUITY', 0.05, 1, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(symbol) DO UPDATE SET
      name = excluded.name,
      exchange = excluded.exchange,
      current_price = excluded.current_price,
      previous_close = excluded.previous_close,
      open_price = excluded.open_price,
      high_price = excluded.high_price,
      low_price = excluded.low_price,
      change = excluded.change,
      percent_change = excluded.percent_change,
      volume = excluded.volume,
      stale = 0,
      source = excluded.source,
      updated_at = CURRENT_TIMESTAMP
  `).run(
    quote.symbol,
    instrument.name,
    quote.exchange,
    quote.last,
    quote.previousClose,
    quote.open,
    quote.high,
    quote.low,
    quote.change,
    quote.changePercent,
    quote.volume,
    quote.source,
  );

  return { instrument, quote, symbol: parsed.symbol, id };
}
