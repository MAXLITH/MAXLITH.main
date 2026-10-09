import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAuthSession } from '@/lib/auth';
import { getAllInstruments, getMarketSessionStatus, marketDataService } from '@/lib/market-data';
import { getUserPortfolioSummary } from '@/lib/paper-trading';
import { runTechAgent } from '@/lib/ai';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PieChart,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  Bot,
  BarChart3,
  Sparkles
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function UserDashboard() {
  const session = await getAuthSession();
  if (!session) {
    redirect('/login');
  }
  const summary = getUserPortfolioSummary(session.id);
  const instruments = getAllInstruments();
  const sessionStatus = getMarketSessionStatus();
  const indices = await marketDataService.getIndices();

  const sortedByChange = [...instruments].sort((a, b) => b.percent_change - a.percent_change);
  const topGainers = sortedByChange.slice(0, 3);
  const topLosers = sortedByChange.slice(-3).reverse();
  const techReport = runTechAgent('RELIANCE');

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-max-surface bg-max-surface p-4 rounded border border-max-border">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white">Welcome back, {session?.fullName}</h1>
            <span className="px-2 py-0.5 rounded bg-blue-500/10 text-max-brand-primary text-[10px] font-mono border border-blue-500/20">
              {session?.role === 'ADMIN' ? 'ADMIN V1' : 'TRADER V1'}
            </span>
          </div>
          <p className="text-xs text-max-text-secondary mt-1">
            Indian Equity Markets (NSE/BSE) • Paper Trading Account
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/paper-trading"
            className="flex items-center gap-1.5 px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition-all"
          >
            <Layers className="w-4 h-4" />
            <span>Paper Trade</span>
          </Link>
          <Link
            href="/dashboard/ai-copilot"
            className="flex items-center gap-1.5 px-4 py-2 rounded bg-max-surface hover:bg-max-surface-hover text-slate-200 font-medium text-xs border border-max-border-strong transition-all"
          >
            <Bot className="w-4 h-4 text-max-brand-primary" />
            <span>Ask MAXLITH AI</span>
          </Link>
        </div>
      </div>

      {/* PORTFOLIO SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="fintech-card p-4">
          <div className="flex items-center justify-between text-max-text-secondary text-xs mb-2">
            <span className="font-medium">Total Portfolio Value</span>
            <Wallet className="w-4 h-4 text-max-brand-primary" />
          </div>
          <div className="text-xl font-bold font-mono text-white">
            ₹{summary.currentPortfolioValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="flex items-center gap-1 text-[11px] font-mono mt-1">
            <span className="text-max-text-muted">Capital: ₹{summary.initialCapital.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        <div className="fintech-card p-4">
          <div className="flex items-center justify-between text-max-text-secondary text-xs mb-2">
            <span className="font-medium">Available Virtual Cash</span>
            <PieChart className="w-4 h-4 text-max-market-positive" />
          </div>
          <div className="text-xl font-bold font-mono text-white">
            ₹{summary.availableCash.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] font-mono text-max-text-muted mt-1">
            Invested: ₹{summary.investedValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="fintech-card p-4">
          <div className="flex items-center justify-between text-max-text-secondary text-xs mb-2">
            <span className="font-medium">Today&apos;s P&amp;L</span>
            {summary.todayPnl >= 0 ? (
              <ArrowUpRight className="w-4 h-4 text-max-market-positive" />
            ) : (
              <ArrowDownRight className="w-4 h-4 text-rose-400" />
            )}
          </div>
          <div className={`text-xl font-bold font-mono ${summary.todayPnl >= 0 ? 'text-max-market-positive' : 'text-rose-400'}`}>
            {summary.todayPnl >= 0 ? '+' : ''}₹{summary.todayPnl.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className={`text-[11px] font-mono mt-1 ${summary.todayPnlPercent >= 0 ? 'text-max-market-positive' : 'text-rose-400'}`}>
            ({summary.todayPnlPercent >= 0 ? '+' : ''}{summary.todayPnlPercent.toFixed(2)}%)
          </div>
        </div>

        <div className="fintech-card p-4">
          <div className="flex items-center justify-between text-max-text-secondary text-xs mb-2">
            <span className="font-medium">Overall Return P&amp;L</span>
            <BarChart3 className="w-4 h-4 text-purple-400" />
          </div>
          <div className={`text-xl font-bold font-mono ${summary.overallPnl >= 0 ? 'text-max-market-positive' : 'text-rose-400'}`}>
            {summary.overallPnl >= 0 ? '+' : ''}₹{summary.overallPnl.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className={`text-[11px] font-mono mt-1 ${summary.overallPnlPercent >= 0 ? 'text-max-market-positive' : 'text-rose-400'}`}>
            Return: {summary.overallPnlPercent >= 0 ? '+' : ''}{summary.overallPnlPercent.toFixed(2)}%
          </div>
        </div>
      </div>

      {/* MAIN TWO-COLUMN DASHBOARD GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-6">
          <div className="fintech-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-max-brand-primary" />
                <span>Market Indices Overview</span>
              </h2>
              <span className="text-[10px] font-mono text-max-text-muted">NSE / BSE LIVE</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {indices.map((idx) => (
                <div key={idx.symbol} className="p-3.5 rounded bg-[#0d121c] border border-max-border">
                  <div className="flex justify-between text-xs text-max-text-secondary font-mono">
                    <span>{idx.name}</span>
                    <span className={idx.percentChange >= 0 ? 'text-max-market-positive' : 'text-rose-400'}>
                      {idx.percentChange >= 0 ? '+' : ''}{idx.percentChange.toFixed(2)}%
                    </span>
                  </div>
                  <div className="text-lg font-bold font-mono text-white mt-1">
                    {idx.value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-[10px] font-mono text-max-text-muted mt-0.5">
                    {idx.change >= 0 ? '+' : ''}{idx.change.toFixed(2)} pts
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="fintech-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-white">Live Market Quotes</h2>
                <p className="text-[11px] text-max-text-secondary">NIFTY 50 Bluechips</p>
              </div>
              <Link href="/dashboard/markets" className="text-xs text-max-brand-primary hover:underline font-mono">
                View All Markets →
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0d121c] text-max-text-secondary font-mono text-[10px] uppercase border-b border-max-border">
                  <tr>
                    <th className="py-2.5 px-3">Symbol</th>
                    <th className="py-2.5 px-3">Sector</th>
                    <th className="py-2.5 px-3 text-right">Price</th>
                    <th className="py-2.5 px-3 text-right">Change</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-max-border font-mono">
                  {instruments.slice(0, 5).map((inst) => (
                    <tr key={inst.symbol} className="hover:bg-max-surface/30">
                      <td className="py-3 px-3">
                        <div className="font-bold text-white">{inst.symbol}</div>
                        <div className="text-[10px] text-max-text-muted truncate max-w-[140px]">{inst.name}</div>
                      </td>
                      <td className="py-3 px-3 text-max-text-secondary text-[11px]">{inst.sector}</td>
                      <td className="py-3 px-3 text-right font-bold text-white">₹{inst.current_price.toFixed(2)}</td>
                      <td className={`py-3 px-3 text-right font-bold ${inst.change >= 0 ? 'text-max-market-positive' : 'text-rose-400'}`}>
                        {inst.change >= 0 ? '+' : ''}{inst.percent_change.toFixed(2)}%
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/dashboard/paper-trading?symbol=${inst.symbol}`}
                            className="px-2.5 py-1 rounded bg-emerald-600/20 hover:bg-emerald-600 text-max-market-positive hover:text-white transition-all text-[11px]"
                          >
                            Trade
                          </Link>
                          <Link
                            href={`/dashboard/markets/${inst.symbol}`}
                            className="px-2.5 py-1 rounded bg-blue-600/20 hover:bg-blue-600 text-max-brand-primary hover:text-white transition-all text-[11px]"
                          >
                            Analyze
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="fintech-card p-5">
            <h2 className="text-sm font-bold text-white mb-3">Market Movers</h2>
            <div className="space-y-4">
              <div>
                <span className="text-[10px] font-mono uppercase text-max-market-positive font-bold block mb-2">Top Gainers</span>
                <div className="space-y-2">
                  {topGainers.map((gainer) => (
                    <div key={gainer.symbol} className="flex justify-between items-center text-xs font-mono p-2 rounded bg-[#0d121c]">
                      <span className="font-bold text-white">{gainer.symbol}</span>
                      <div className="text-right">
                        <span className="text-white">₹{gainer.current_price.toFixed(2)}</span>
                        <span className="text-max-market-positive ml-2 font-bold">+{gainer.percent_change.toFixed(2)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-[10px] font-mono uppercase text-rose-400 font-bold block mb-2">Top Losers</span>
                <div className="space-y-2">
                  {topLosers.map((loser) => (
                    <div key={loser.symbol} className="flex justify-between items-center text-xs font-mono p-2 rounded bg-[#0d121c]">
                      <span className="font-bold text-white">{loser.symbol}</span>
                      <div className="text-right">
                        <span className="text-white">₹{loser.current_price.toFixed(2)}</span>
                        <span className="text-rose-400 ml-2 font-bold">{loser.percent_change.toFixed(2)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="fintech-card p-4 border-l-[3px] border-l-max-ai-primary">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-max-ai-secondary font-bold">Tech Agent Signal</div>
                <div className="text-sm font-bold text-white mt-0.5">RELIANCE <span className="text-max-market-positive ml-1 text-[10px] uppercase">{techReport.status}</span></div>
              </div>
              <Bot className="w-4 h-4 text-max-ai-primary" />
            </div>
            
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px] font-mono mb-4">
              <div className="flex justify-between">
                <span className="text-max-text-muted">RSI (14D)</span>
                <span className="text-max-ai-secondary font-bold">{techReport.metrics.rsi14 || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-max-text-muted">SMA (20D)</span>
                <span className="text-white font-bold">{techReport.metrics.sma20 || '—'}</span>
              </div>
              <div className="flex justify-between col-span-2">
                <span className="text-max-text-muted">Structure</span>
                <span className="text-max-market-positive">{techReport.metrics.trend || 'Calculated from OHLCV'}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-1.5 text-[11px] font-mono mb-4 border-y border-max-border py-2.5">
              <div className="flex justify-between">
                <span className="text-max-text-muted">LTP</span>
                <span className="text-white font-bold">{techReport.metrics.currentPrice || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-max-text-muted">30D Resistance</span>
                <span className="text-max-market-positive">{techReport.metrics.resistance30d || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-max-text-muted">30D Support</span>
                <span className="text-max-market-negative">{techReport.metrics.support30d || '—'}</span>
              </div>
            </div>

            <p className="text-[10px] text-max-text-primary leading-relaxed mb-4">
              {techReport.analysis}
            </p>
            
            <Link
              href="/dashboard/ai-copilot"
              className="w-full py-1.5 rounded border border-max-border bg-max-surface-hover hover:bg-max-border text-max-text-primary hover:text-white font-medium text-xs transition-all flex items-center justify-center gap-1.5"
            >
              <span>View Full AI Analysis</span>
              <Bot className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
