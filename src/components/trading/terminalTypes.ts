import type { TradingSymbol } from '@/lib/tradingview/symbols';

export interface MarketQuote {
  symbol: string;
  exchange: 'NSE' | 'BSE';
  name: string;
  currency: 'INR';
  last: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  previousClose: number;
  volume: number;
  asOf: string;
  source: string;
  delaySeconds: number;
}

export interface WatchlistSummary {
  id: string;
  name: string;
}

export interface WatchlistEntry extends TradingSymbol {
  itemId: string;
}

export function formatRupees(value: number | null | undefined, fractionDigits = 2) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits })}`;
}

export function formatNumber(value: number | null | undefined) {
  return value === null || value === undefined || !Number.isFinite(value) ? '—' : value.toLocaleString('en-IN');
}
