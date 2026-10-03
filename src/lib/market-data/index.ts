import db from '../db';
import { getMarketSessionStatus as getStatusFromHours, MarketSessionStatus } from '../market-hours';
import { marketDataService, MarketDataService } from './service';
export * from './types';
export * from './service';
export type { MarketSessionStatus };

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
  return getStatusFromHours() as any;
}

/**
 * Fetch all registered market instruments from the persistent database
 */
export function getAllInstruments(): InstrumentData[] {
  if (process.env.NODE_ENV === 'production') {
    return db.prepare("SELECT * FROM instruments WHERE source IS NOT NULL AND source != 'SEED' AND stale = 0 ORDER BY market_cap DESC").all() as InstrumentData[];
  }
  return db.prepare('SELECT * FROM instruments ORDER BY market_cap DESC').all() as InstrumentData[];
}

/**
 * Fetch single instrument details by ticker symbol
 */
export function getInstrument(symbol: string): InstrumentData | null {
  const result = process.env.NODE_ENV === 'production'
    ? db.prepare("SELECT * FROM instruments WHERE symbol = ? AND source IS NOT NULL AND source != 'SEED' AND stale = 0").get(symbol.toUpperCase())
    : db.prepare('SELECT * FROM instruments WHERE symbol = ?').get(symbol.toUpperCase());
  return result ? (result as InstrumentData) : null;
}

/**
 * Fetch historical price series (candles) for chart rendering
 */
export function getInstrumentHistory(symbol: string, timeframe: string = '1D') {
  if (process.env.NODE_ENV === 'production') return [];
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
  const prefix = `${query.trim()}%`;
  if (process.env.NODE_ENV === 'production') {
    return db.prepare(`
      SELECT * FROM instruments
      WHERE (symbol LIKE ? OR name LIKE ? OR sector LIKE ?)
        AND source IS NOT NULL AND source != 'SEED' AND stale = 0
      ORDER BY CASE WHEN symbol LIKE ? THEN 1 WHEN name LIKE ? THEN 2 ELSE 3 END, market_cap DESC
    `).all(q, q, q, prefix, prefix) as InstrumentData[];
  }
  return db.prepare(`
    SELECT * FROM instruments 
    WHERE symbol LIKE ? OR name LIKE ? OR sector LIKE ?
    ORDER BY 
      CASE WHEN symbol LIKE ? THEN 1 WHEN name LIKE ? THEN 2 ELSE 3 END,
      market_cap DESC
  `).all(q, q, q, prefix, prefix) as InstrumentData[];
}
