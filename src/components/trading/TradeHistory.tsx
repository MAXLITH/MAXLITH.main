'use client';

export interface TradeRow {
  id: string;
  symbol: string;
  side: string;
  quantity: number;
  price: number;
  created_at: string;
  order_type?: string;
}

export default function TradeHistory({ trades }: { trades: TradeRow[] }) {
  return <div className="overflow-x-auto">
    <table className="w-full min-w-[480px] text-left text-[10px]">
      <thead className="text-[9px] uppercase tracking-wide text-slate-500"><tr>{['Instrument', 'Side', 'Qty', 'Fill price', 'Order type', 'Time'].map((heading) => <th key={heading} className="px-3 py-2 font-medium">{heading}</th>)}</tr></thead>
      <tbody className="divide-y divide-slate-800/70">{trades.map((trade) => <tr key={trade.id} className="text-slate-300"><td className="px-3 py-2 font-semibold text-slate-100">{trade.symbol}</td><td className={`px-3 py-2 ${trade.side === 'BUY' ? 'text-emerald-400' : 'text-rose-400'}`}>{trade.side}</td><td className="px-3 py-2 tabular-nums">{trade.quantity}</td><td className="px-3 py-2 tabular-nums">₹{Number(trade.price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td><td className="px-3 py-2">{trade.order_type || '—'}</td><td className="px-3 py-2 text-slate-500">{new Date(trade.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</td></tr>)}</tbody>
    </table>
    {!trades.length && <p className="px-3 py-6 text-center text-[10px] text-slate-500">No completed trades recorded.</p>}
  </div>;
}
