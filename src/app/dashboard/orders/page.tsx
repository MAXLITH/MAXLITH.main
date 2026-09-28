import { getAuthSession } from '@/lib/auth';
import { getUserOrders } from '@/lib/paper-trading';
import { FileText, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function OrdersPage() {
  const session = await getAuthSession();
  const orders = getUserOrders(session!.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-400" />
          <span>Paper Trading Orders History</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Complete audit ledger of market and limit order submissions, execution prices, and statuses.
        </p>
      </div>

      <div className="fintech-card p-5">
        {orders.length === 0 ? (
          <div className="p-8 text-center text-slate-500 font-mono text-xs bg-[#0d121c] rounded-lg">
            No order submissions found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#0d121c] text-slate-400 text-[10px] uppercase border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Order ID</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Instrument</th>
                  <th className="py-3 px-4">Side</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4 text-right">Quantity</th>
                  <th className="py-3 px-4 text-right">Limit Price</th>
                  <th className="py-3 px-4 text-right">Exec Price</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {orders.map((ord: any) => (
                  <tr key={ord.id} className="hover:bg-slate-800/30">
                    <td className="py-3.5 px-4 text-[11px] text-slate-400">{ord.id}</td>
                    <td className="py-3.5 px-4 text-slate-400 text-[11px]">{ord.created_at}</td>
                    <td className="py-3.5 px-4 font-bold text-white">{ord.symbol}</td>
                    <td className={`py-3.5 px-4 font-bold ${ord.side === 'BUY' ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {ord.side}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">{ord.order_type}</td>
                    <td className="py-3.5 px-4 text-right text-slate-200">{ord.quantity}</td>
                    <td className="py-3.5 px-4 text-right text-slate-300">
                      {ord.price ? `₹${ord.price.toFixed(2)}` : 'Market'}
                    </td>
                    <td className="py-3.5 px-4 text-right text-white">
                      {ord.executed_price ? `₹${ord.executed_price.toFixed(2)}` : '-'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span
                        className={`px-2.5 py-1 rounded text-[10px] ${
                          ord.status === 'EXECUTED'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : ord.status === 'REJECTED'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {ord.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
