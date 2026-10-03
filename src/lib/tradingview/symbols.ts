export type Exchange = 'NSE' | 'BSE';
export type InstrumentType = 'stock' | 'index' | 'etf' | 'commodity' | 'forex' | 'crypto';

export interface TradingSymbol {
  /** Stable exchange-qualified identifier, for example NSE:RELIANCE. */
  id: string;
  symbol: string;
  exchange: Exchange;
  name: string;
  description: string;
  type: InstrumentType;
  currency: 'INR';
  timezone: 'Asia/Kolkata';
  tradable: boolean;
}

const SYMBOL_PART = /^[A-Z0-9][A-Z0-9._&-]{0,31}$/;

export function normalizeSymbol(input: string, defaultExchange: Exchange = 'NSE'): TradingSymbol['id'] {
  const value = input.trim().toUpperCase();
  const [exchangePart, symbolPart, extra] = value.includes(':') ? value.split(':') : [defaultExchange, value];

  if (extra !== undefined || (exchangePart !== 'NSE' && exchangePart !== 'BSE')) {
    throw new Error(`Unsupported market symbol: ${input}`);
  }

  const symbol = symbolPart.replace(/\.(NS|BO)$/, '');
  if (!SYMBOL_PART.test(symbol)) throw new Error(`Invalid market symbol: ${input}`);
  return `${exchangePart}:${symbol}`;
}

export function parseSymbol(input: string, defaultExchange: Exchange = 'NSE') {
  const id = normalizeSymbol(input, defaultExchange);
  const [exchange, symbol] = id.split(':') as [Exchange, string];
  return { id, exchange, symbol };
}

export function toLegacyTicker(id: string): string {
  const { symbol, exchange } = parseSymbol(id);
  return `${symbol}${exchange === 'BSE' ? '.BO' : '.NS'}`;
}

export function toTradingSymbol(input: {
  symbol: string;
  exchange?: string;
  name?: string | null;
  type?: InstrumentType;
  tradable?: boolean;
}): TradingSymbol {
  const exchange = (input.exchange || 'NSE').toUpperCase() as Exchange;
  const id = normalizeSymbol(`${exchange}:${input.symbol}`);
  const symbol = id.split(':')[1];
  const type = input.type || (['NIFTY50', 'BANKNIFTY', 'SENSEX'].includes(symbol) ? 'index' : 'stock');
  return {
    id,
    symbol,
    exchange,
    name: input.name?.trim() || symbol,
    description: input.name?.trim() || symbol,
    type,
    currency: 'INR',
    timezone: 'Asia/Kolkata',
    tradable: input.tradable ?? type !== 'index',
  };
}
