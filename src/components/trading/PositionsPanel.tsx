'use client';

import type { MarketQuote } from './terminalTypes';
import { formatRupees } from './terminalTypes';

export interface PositionRow {
  id: string;
  symbol: string;
  name?: string;
  quantity: number;
  average_price: number;
  product_type?: string;
  realized_pnl?: number;
}

export default function PositionsPanel({
  positions,
  quotes,
  onSelect,
}: {
  positions: PositionRow[];
  quotes: Record<string, MarketQuote | undefined>;
  onSelect: (symbol: string) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[620px] text-left text-[10px]">
        <thead className="text-[9px] uppercase tracking-wide text-slate-500"><tr>{['Instrument', 'Product', 'Qty', 'Avg', 'Verified LTP', 'Market value', 'Unrealized P&L'].map((heading) => <th key={heading} className="px-3 py-2 font-medium">{heading}</th>)}</tr></thead>
        <tbody className="divide-y divide-slate-800/70">
          {positions.map((position) => {
            const quote = quotes[`NSE:${position.symbol}`];
            const marketValue = quote ? position.quantity * quote.last : null;
            const pnl = marketValue === null ? null : marketValue - position.quantity * position.average_price;
            return <tr key={position.id} className="text-slate-300 hover:bg-slate-800/30">
              <td className="px-3 py-2"><button onClick={() => onSelect(`NSE:${position.symbol}`)} className="font-semibold text-slate-100 hover:text-blue-300">{position.symbol}</button><span className="ml-1 text-[8px] text-slate-600">NSE</span></td>
              <td className="px-3 py-2 text-slate-500">{position.product_type || 'CNC'}</td><td className="px-3 py-2 tabular-nums">{position.quantity}</td><td className="px-3 py-2 tabular-nums">{formatRupees(position.average_price)}</td>
              <td className="px-3 py-2 tabular-nums">{quote ? formatRupees(quote.last) : '—'}</td><td className="px-3 py-2 tabular-nums">{marketValue === null ? '—' : formatRupees(marketValue)}</td>
              <td className={`px-3 py-2 tabular-nums ${pnl === null ? 'text-slate-600' : pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{pnl === null ? '—' : formatRupees(pnl)}</td>
            </tr>;
          })}
        </tbody>
      </table>
      {!positions.length && <p className="px-3 py-6 text-center text-[10px] text-slate-500">No open positions.</p>}
      {positions.length > 0 && Object.keys(quotes).length === 0 && <p className="px-3 py-2 text-[9px] text-slate-600">Market value and unrealized P&amp;L require verified quotes.</p>}
    </div>
  );
}
