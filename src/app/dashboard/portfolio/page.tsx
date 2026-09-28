import Link from 'next/link';
import { getAuthSession } from '@/lib/auth';
import { getUserPortfolioSummary, getUserPositions } from '@/lib/paper-trading';
import { Briefcase, Wallet, PieChart, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function PortfolioPage() {
  const session = await getAuthSession();
  const summary = getUserPortfolioSummary(session!.id);
  const positions = getUserPositions(session!.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-blue-400" />
            <span>Portfolio &amp; Asset Holdings</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Track virtual equity allocations, realized/unrealized return metrics, and cash reserves.
          </p>
        </div>
        <Link
          href="/dashboard/paper-trading"
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition-all shadow-md shadow-blue-600/30"
        >
          <span>Manage Positions</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="fintech-card p-4">
          <span className="text-[10px] uppercase font-mono text-slate-500 block">Total Portfolio Valuation</span>
          <div className="text-xl font-bold font-mono text-white mt-1">
            ₹{summary.currentPortfolioValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] font-mono text-slate-400 mt-0.5">Initial: ₹10,00,000.00</div>
        </div>

        <div className="fintech-card p-4">
          <span className="text-[10px] uppercase font-mono text-slate-500 block">Unrealized P&amp;L</span>
          <div className={`text-xl font-bold font-mono mt-1 ${summary.unrealizedPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {summary.unrealizedPnl >= 0 ? '+' : ''}₹{summary.unrealizedPnl.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] font-mono text-slate-400 mt-0.5">Open Positions</div>
        </div>

        <div className="fintech-card p-4">
          <span className="text-[10px] uppercase font-mono text-slate-500 block">Realized P&amp;L</span>
          <div className={`text-xl font-bold font-mono mt-1 ${summary.realizedPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {summary.realizedPnl >= 0 ? '+' : ''}₹{summary.realizedPnl.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] font-mono text-slate-400 mt-0.5">Closed Trades</div>
        </div>

        <div className="fintech-card p-4">
          <span className="text-[10px] uppercase font-mono text-slate-500 block">Available Cash Balance</span>
          <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
            ₹{summary.virtualCash.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] font-mono text-slate-400 mt-0.5">Liquid Virtual Reserves</div>
        </div>
      </div>

      <div className="fintech-card p-5">
        <h2 className="text-sm font-bold text-white mb-4 font-mono">Current Holdings Breakdown ({positions.length})</h2>
        {positions.length === 0 ? (
          <div className="p-8 text-center text-slate-500 font-mono text-xs bg-[#0d121c] rounded-lg">
            Your portfolio currently holds no stock positions. Use Paper Trading to execute orders.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#0d121c] text-slate-400 text-[10px] uppercase border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Instrument</th>
                  <th className="py-3 px-4 text-right">Quantity</th>
                  <th className="py-3 px-4 text-right">Avg Buy Price</th>
                  <th className="py-3 px-4 text-right">Invested Value</th>
                  <th className="py-3 px-4 text-right">Current Price</th>
                  <th className="py-3 px-4 text-right">Current Value</th>
                  <th className="py-3 px-4 text-right">Unrealized Return</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {positions.map((pos) => (
                  <tr key={pos.id} className="hover:bg-slate-800/30">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-white">{pos.symbol}</div>
                      <div className="text-[10px] text-slate-400 font-sans">{pos.name}</div>
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-200">{pos.quantity}</td>
                    <td className="py-3.5 px-4 text-right text-slate-300">₹{pos.average_price.toFixed(2)}</td>
                    <td className="py-3.5 px-4 text-right text-slate-300">₹{pos.invested_value.toFixed(2)}</td>
                    <td className="py-3.5 px-4 text-right text-white">₹{pos.current_price.toFixed(2)}</td>
                    <td className="py-3.5 px-4 text-right font-bold text-white">₹{pos.current_value.toFixed(2)}</td>
                    <td className={`py-3.5 px-4 text-right font-bold ${pos.unrealized_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {pos.unrealized_pnl >= 0 ? '+' : ''}₹{pos.unrealized_pnl.toFixed(2)} ({pos.unrealized_pnl_percent >= 0 ? '+' : ''}{pos.unrealized_pnl_percent.toFixed(2)}%)
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
