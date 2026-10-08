import Link from 'next/link';
import { getAuthSession } from '@/lib/auth';
import { getUserPortfolioSummary, getUserPositions } from '@/lib/paper-trading';
import db from '@/lib/db';
import { Briefcase, PieChart, ArrowRight, BarChart2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function PortfolioPage() {
  const session = await getAuthSession();
  const summary = getUserPortfolioSummary(session!.id);
  const positions = getUserPositions(session!.id);

  const closedTrades = db.prepare(`
    SELECT t.*, o.order_type, o.product_type
    FROM trades t
    JOIN orders o ON t.order_id = o.id
    WHERE t.user_id = ? AND t.side = 'SELL'
    ORDER BY t.created_at DESC
    LIMIT 10
  `).all(session!.id) as any[];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-max-brand-primary" />
            <span>Portfolio &amp; Asset Holdings</span>
          </h1>
          <p className="text-xs text-max-text-secondary mt-1">
            Track virtual equity allocations, realized/unrealized return metrics, and cash reserves.
          </p>
        </div>
        <Link
          href="/dashboard/paper-trading"
          className="flex items-center gap-1.5 px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition-all"
        >
          <span>Manage Positions</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="fintech-card p-4">
          <span className="text-[10px] uppercase font-mono text-max-text-muted block">Total Portfolio Valuation</span>
          <div className="text-xl font-bold font-mono text-white mt-1">
            ₹{summary.currentPortfolioValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] font-mono text-max-text-secondary mt-0.5">
            Initial: ₹{summary.initialCapital.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="fintech-card p-4">
          <span className="text-[10px] uppercase font-mono text-max-text-muted block">Unrealized P&amp;L</span>
          <div className={`text-xl font-bold font-mono mt-1 ${summary.unrealizedPnl >= 0 ? 'text-max-market-positive' : 'text-rose-400'}`}>
            {summary.unrealizedPnl >= 0 ? '+' : ''}₹{summary.unrealizedPnl.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] font-mono text-max-text-secondary mt-0.5">Open Positions</div>
        </div>

        <div className="fintech-card p-4">
          <span className="text-[10px] uppercase font-mono text-max-text-muted block">Realized P&amp;L</span>
          <div className={`text-xl font-bold font-mono mt-1 ${summary.realizedPnl >= 0 ? 'text-max-market-positive' : 'text-rose-400'}`}>
            {summary.realizedPnl >= 0 ? '+' : ''}₹{summary.realizedPnl.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] font-mono text-max-text-secondary mt-0.5">Closed Trades</div>
        </div>

        <div className="fintech-card p-4">
          <span className="text-[10px] uppercase font-mono text-max-text-muted block">Available Cash Balance</span>
          <div className="text-xl font-bold font-mono text-max-market-positive mt-1">
            ₹{(summary.availableCash ?? summary.virtualCash).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] font-mono text-max-text-secondary mt-0.5">Liquid Virtual Reserves</div>
        </div>
      </div>

      {/* HOLDINGS TABLE */}
      <div className="fintech-card p-5">
        <h2 className="text-sm font-bold text-white mb-4 font-mono">Current Holdings Breakdown ({positions.length})</h2>
        {positions.length === 0 ? (
          <div className="p-4 text-center text-max-text-muted font-mono text-xs bg-[#0d121c] rounded">
            Your portfolio currently holds no stock positions. Use Paper Trading to execute orders.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#0d121c] text-max-text-secondary text-[10px] uppercase border-b border-max-border">
                <tr>
                  <th className="py-3 px-4">Instrument</th>
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4 text-right">Quantity</th>
                  <th className="py-3 px-4 text-right">Avg Price</th>
                  <th className="py-3 px-4 text-right">LTP</th>
                  <th className="py-3 px-4 text-right">Current Value</th>
                  <th className="py-3 px-4 text-right">Day P&amp;L</th>
                  <th className="py-3 px-4 text-right">Total P&amp;L (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-max-border">
                {positions.map((pos) => (
                  <tr key={pos.id} className="hover:bg-max-surface/30">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-white">{pos.symbol}</div>
                      <div className="text-[10px] text-max-text-secondary font-sans">{pos.name}</div>
                    </td>
                    <td className="py-3.5 px-4 text-max-text-secondary text-[11px]">{pos.product_type}</td>
                    <td className="py-3.5 px-4 text-right text-slate-200">{pos.quantity}</td>
                    <td className="py-3.5 px-4 text-right text-max-text-primary">₹{Number(pos.average_price).toFixed(2)}</td>
                    <td className="py-3.5 px-4 text-right text-white">₹{Number(pos.current_price).toFixed(2)}</td>
                    <td className="py-3.5 px-4 text-right font-bold text-white">
                      ₹{Number(pos.current_value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className={`py-3.5 px-4 text-right font-bold ${pos.day_pnl >= 0 ? 'text-max-market-positive' : 'text-rose-400'}`}>
                      {pos.day_pnl >= 0 ? '+' : ''}₹{Number(pos.day_pnl || 0).toFixed(2)}
                    </td>
                    <td className={`py-3.5 px-4 text-right font-bold ${pos.unrealized_pnl >= 0 ? 'text-max-market-positive' : 'text-rose-400'}`}>
                      {pos.unrealized_pnl >= 0 ? '+' : ''}₹{Number(pos.unrealized_pnl).toLocaleString('en-IN', { minimumFractionDigits: 2 })} ({pos.unrealized_pnl_percent >= 0 ? '+' : ''}{Number(pos.unrealized_pnl_percent).toFixed(2)}%)
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SECTOR ALLOCATION & TRADE HISTORY */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Sector Allocation Breakdown */}
        <div className="fintech-card p-5">
          <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <PieChart className="w-4 h-4 text-max-brand-primary" />
            <span>Allocation by Sector</span>
          </h2>
          {summary.sectorAllocations.length === 0 ? (
            <div className="p-4 text-center text-max-text-muted font-mono text-xs bg-[#0d121c] rounded">
              No sector allocations yet.
            </div>
          ) : (
            <div className="space-y-3 font-mono text-xs">
              {summary.sectorAllocations.map((sec) => (
                <div key={sec.sector} className="p-3 rounded bg-[#0d121c] border border-max-border">
                  <div className="flex justify-between mb-1.5">
                    <span className="font-semibold text-white">{sec.sector}</span>
                    <span className="text-max-brand-primary font-bold">{sec.percentage}%</span>
                  </div>
                  <div className="w-full bg-max-surface h-2 rounded overflow-hidden">
                    <div
                      className="bg-blue-600 h-full rounded transition-all"
                      style={{ width: `${Math.min(100, sec.percentage)}%` }}
                    ></div>
                  </div>
                  <div className="text-[10px] text-max-text-secondary mt-1 text-right">
                    ₹{sec.value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Closed Trades / Realized P&L History */}
        <div className="fintech-card p-5">
          <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-purple-400" />
            <span>Realized P&amp;L Trade History</span>
          </h2>
          {closedTrades.length === 0 ? (
            <div className="p-4 text-center text-max-text-muted font-mono text-xs bg-[#0d121c] rounded">
              No closed sell trades recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[#0d121c] text-max-text-secondary text-[10px] uppercase border-b border-max-border">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Symbol</th>
                    <th className="py-2.5 px-3 text-right">Qty</th>
                    <th className="py-2.5 px-3 text-right">Sell Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-max-border">
                  {closedTrades.map((tr) => (
                    <tr key={tr.id} className="hover:bg-max-surface/30">
                      <td className="py-2.5 px-3 text-max-text-secondary text-[10px]">{tr.created_at?.split(' ')[0]}</td>
                      <td className="py-2.5 px-3 font-bold text-white">{tr.symbol}</td>
                      <td className="py-2.5 px-3 text-right text-max-text-primary">{tr.quantity}</td>
                      <td className="py-2.5 px-3 text-right text-max-market-positive">₹{Number(tr.price).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
