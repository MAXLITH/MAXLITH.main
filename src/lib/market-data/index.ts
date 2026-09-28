import db from '../db';

export interface MarketSessionStatus {
  isOpen: boolean;
  session: 'PRE_MARKET' | 'OPEN' | 'POST_MARKET' | 'CLOSED';
  nextSessionText: string;
  currentTimeIST: string;
}

export interface InstrumentData {
  symbol: string;
  name: string;
  exchange: string;
  sector: string;
  asset_type: string;
  current_price: number;
  previous_close: number;
  open_price: number;
  high_price: number;
  low_price: number;
  change: number;
  percent_change: number;
  volume: number;
  high_52w?: number;
  low_52w?: number;
  market_cap?: number;
  pe_ratio?: number;
  pb_ratio?: number;
  updated_at: string;
}

/**
 * Deterministically checks Indian Market (NSE/BSE) Session Status
 * Trading Days: Monday - Friday
 * Trading Hours: 09:15 AM - 03:30 PM IST (Asia/Kolkata)
 */
export function getMarketSessionStatus(): MarketSessionStatus {
  // Convert current time to Indian Standard Time (IST, UTC+5:30)
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(now.getTime() + (now.getTimezoneOffset() * 60 * 1000) + istOffset);
  
  const dayOfWeek = istDate.getDay(); // 0 = Sun, 6 = Sat
  const hours = istDate.getHours();
  const minutes = istDate.getMinutes();
  const timeInMinutes = hours * 60 + minutes;

  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const preMarketStart = 9 * 60; // 09:00 AM
  const marketStart = 9 * 60 + 15; // 09:15 AM
  const marketEnd = 15 * 60 + 30; // 03:30 PM

  const timeStr = istDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

  if (isWeekend) {
    return {
      isOpen: false,
      session: 'CLOSED',
      nextSessionText: 'Opens Monday at 09:15 AM IST',
      currentTimeIST: `${timeStr} IST`
    };
  }

  if (timeInMinutes >= preMarketStart && timeInMinutes < marketStart) {
    return {
      isOpen: false,
      session: 'PRE_MARKET',
      nextSessionText: 'Regular Session Opens at 09:15 AM IST',
      currentTimeIST: `${timeStr} IST`
    };
  } else if (timeInMinutes >= marketStart && timeInMinutes <= marketEnd) {
    return {
      isOpen: true,
      session: 'OPEN',
      nextSessionText: 'Closes at 03:30 PM IST',
      currentTimeIST: `${timeStr} IST`
    };
  } else {
    return {
      isOpen: false,
      session: 'CLOSED',
      nextSessionText: 'Opens Next Trading Day at 09:15 AM IST',
      currentTimeIST: `${timeStr} IST`
    };
  }
}

/**
 * Fetch all registered market instruments from the persistent database
 */
export function getAllInstruments(): InstrumentData[] {
  return db.prepare('SELECT * FROM instruments ORDER BY market_cap DESC').all() as InstrumentData[];
}

/**
 * Fetch single instrument details by ticker symbol
 */
export function getInstrument(symbol: string): InstrumentData | null {
  const result = db.prepare('SELECT * FROM instruments WHERE symbol = ?').get(symbol.toUpperCase());
  return result ? (result as InstrumentData) : null;
}

/**
 * Fetch historical price series (candles) for chart rendering
 */
export function getInstrumentHistory(symbol: string) {
  return db.prepare(`
    SELECT timestamp, open, high, low, close, volume 
    FROM price_history 
    WHERE symbol = ? 
    ORDER BY timestamp ASC
  `).all(symbol.toUpperCase());
}

/**
 * Search instruments by query string (symbol or company name)
 */
export function searchInstruments(query: string): InstrumentData[] {
  if (!query || query.trim().length === 0) {
    return getAllInstruments();
  }
  const q = `%${query.trim()}%`;
  return db.prepare(`
    SELECT * FROM instruments 
    WHERE symbol LIKE ? OR name LIKE ? OR sector LIKE ?
    ORDER BY market_cap DESC
  `).all(q, q, q) as InstrumentData[];
}
