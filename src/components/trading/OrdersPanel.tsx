'use client';

export interface OrderRow {
  id: string;
  symbol: string;
  side: string;
  order_type: string;
  quantity: number;
  price: number;
  status: string;
  created_at: string;
}

export default function OrdersPanel({ orders }: { orders: OrderRow[] }) {
  return <div className="overflow-x-auto">
    <table className="w-full min-w-[540px] text-left text-[10px]">
      <thead className="text-[9px] uppercase tracking-wide text-slate-500"><tr>{['Order', 'Side', 'Type', 'Qty', 'Limit / trigger', 'Status', 'Created'].map((heading) => <th key={heading} className="px-3 py-2 font-medium">{heading}</th>)}</tr></thead>
      <tbody className="divide-y divide-slate-800/70">{orders.map((order) => <tr key={order.id} className="text-slate-300"><td className="px-3 py-2 font-semibold text-slate-100">{order.symbol}</td><td className={`px-3 py-2 ${order.side === 'BUY' ? 'text-emerald-400' : 'text-rose-400'}`}>{order.side}</td><td className="px-3 py-2">{order.order_type}</td><td className="px-3 py-2 tabular-nums">{order.quantity}</td><td className="px-3 py-2 tabular-nums">{Number(order.price) > 0 ? `₹${Number(order.price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}</td><td className="px-3 py-2">{order.status}</td><td className="px-3 py-2 text-slate-500">{new Date(order.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</td></tr>)}</tbody>
    </table>
    {!orders.length && <p className="px-3 py-6 text-center text-[10px] text-slate-500">No orders recorded.</p>}
  </div>;
}
