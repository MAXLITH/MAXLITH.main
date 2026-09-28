import Link from 'next/link';
import { getAuthSession } from '@/lib/auth';
import { getAllInstruments, getMarketSessionStatus } from '@/lib/market-data';
import { getUserPortfolioSummary } from '@/lib/paper-trading';
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

export default async function UserDashboard() {
  const session = await getAuthSession();
  const summary = getUserPortfolioSummary(session!.id);
  const instruments = getAllInstruments();
  const sessionStatus = getMarketSessionStatus();

  const sortedByChange = [...instruments].sort((a, b) => b.percent_change - a.percent_change);
  const topGainers = sortedByChange.slice(0, 3);
  const topLosers = sortedByChange.slice(-3).reverse();

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-[#121824] to-[#161e30] p-6 rounded-xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white">Welcome back, {session?.fullName}</h1>
            <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[10px] font-mono border border-blue-500/20">
              TRADER V1
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Indian Equity Markets (NSE/BSE) • Paper Trading Account
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2">
          <Link
            href="/paper-trading"
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition-all shadow-md shadow-blue-600/30"
          >
            <Layers className="w-4 h-4" />
            <span>Paper Trade</span>
          </Link>
          <Link
            href="/ai-copilot"
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs border border-slate-700 transition-all"
          >
            <Bot className="w-4 h-4 text-blue-400" />
            <span>Ask MAXLITH AI</span>
          </Link>
        </div>
      </div>

      {/* PORTFOLIO SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Portfolio Value */}
        <div className="fintech-card p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span className="font-medium">Total Portfolio Value</span>
            <Wallet className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-xl font-bold font-mono text-white">
            ₹{summary.currentPortfolioValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="flex items-center gap-1 text-[11px] font-mono mt-1">
            <span className="text-slate-500">Capital: ₹10,00,000</span>
          </div>
        </div>

        {/* Card 2: Available Cash */}
        <div className="fintech-card p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span className="font-medium">Available Virtual Cash</span>
            <PieChart className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold font-mono text-white">
            ₹{summary.virtualCash.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] font-mono text-slate-500 mt-1">
            Invested: ₹{summary.investedValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
        </div>

        {/* Card 3: Today's P&L */}
        <div className="fintech-card p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span className="font-medium">Today&apos;s P&amp;L</span>
            {summary.todayPnl >= 0 ? (
              <ArrowUpRight className="w-4 h-4 text-emerald-400" />
            ) : (
              <ArrowDownRight className="w-4 h-4 text-rose-400" />
            )}
          </div>
          <div className={`text-xl font-bold font-mono ${summary.todayPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {summary.todayPnl >= 0 ? '+' : ''}₹{summary.todayPnl.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className={`text-[11px] font-mono mt-1 ${summary.todayPnlPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            ({summary.todayPnlPercent >= 0 ? '+' : ''}{summary.todayPnlPercent.toFixed(2)}%)
          </div>
        </div>

        {/* Card 4: Overall P&L */}
        <div className="fintech-card p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span className="font-medium">Overall Return P&amp;L</span>
            <BarChart3 className="w-4 h-4 text-purple-400" />
          </div>
          <div className={`text-xl font-bold font-mono ${summary.overallPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {summary.overallPnl >= 0 ? '+' : ''}₹{summary.overallPnl.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className={`text-[11px] font-mono mt-1 ${summary.overallPnlPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            Return: {summary.overallPnlPercent >= 0 ? '+' : ''}{summary.overallPnlPercent.toFixed(2)}%
          </div>
        </div>
      </div>

      {/* MAIN TWO-COLUMN DASHBOARD GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2-Cols: Market Overview & Stock Watch */}
        <div className="lg:col-span-2 space-y-6">
          {/* Index Overview Bar */}
          <div className="fintech-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-400" />
                <span>Market Indices Overview</span>
              </h2>
              <span className="text-[10px] font-mono text-slate-500">NSE INDIA</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-lg bg-[#0d121c] border border-slate-800">
                <div className="flex justify-between text-xs text-slate-400 font-mono">
                  <span>NIFTY 50</span>
                  <span className="text-emerald-400">+0.68%</span>
                </div>
                <div className="text-lg font-bold font-mono text-white mt-1">25,410.80</div>
                <div className="text-[10px] font-mono text-slate-500 mt-0.5">+172.40 pts</div>
              </div>

              <div className="p-3.5 rounded-lg bg-[#0d121c] border border-slate-800">
                <div className="flex justify-between text-xs text-slate-400 font-mono">
                  <span>BANK NIFTY</span>
                  <span className="text-emerald-400">+0.91%</span>
                </div>
                <div className="text-lg font-bold font-mono text-white mt-1">52,890.15</div>
                <div className="text-[10px] font-mono text-slate-500 mt-0.5">+475.20 pts</div>
              </div>

              <div className="p-3.5 rounded-lg bg-[#0d121c] border border-slate-800">
                <div className="flex justify-between text-xs text-slate-400 font-mono">
                  <span>SENSEX</span>
                  <span className="text-emerald-400">+0.54%</span>
                </div>
                <div className="text-lg font-bold font-mono text-white mt-1">83,120.40</div>
                <div className="text-[10px] font-mono text-slate-500 mt-0.5">+446.80 pts</div>
              </div>
            </div>
          </div>

          {/* Featured Stock Explorer Table */}
          <div className="fintech-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-white">Live Market Quotes</h2>
                <p className="text-[11px] text-slate-400">NIFTY 50 Bluechips</p>
              </div>
              <Link href="/markets" className="text-xs text-blue-400 hover:underline font-mono">
                View All Markets →
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0d121c] text-slate-400 font-mono text-[10px] uppercase border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Symbol</th>
                    <th className="py-2.5 px-3">Sector</th>
                    <th className="py-2.5 px-3 text-right">Price</th>
                    <th className="py-2.5 px-3 text-right">Change</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {instruments.slice(0, 5).map((inst) => (
                    <tr key={inst.symbol} className="hover:bg-slate-800/30">
                      <td className="py-3 px-3">
                        <div className="font-bold text-white">{inst.symbol}</div>
                        <div className="text-[10px] text-slate-500 truncate max-w-[140px]">{inst.name}</div>
                      </td>
                      <td className="py-3 px-3 text-slate-400 text-[11px]">{inst.sector}</td>
                      <td className="py-3 px-3 text-right font-bold text-white">₹{inst.current_price.toFixed(2)}</td>
                      <td className={`py-3 px-3 text-right font-bold ${inst.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {inst.change >= 0 ? '+' : ''}{inst.percent_change.toFixed(2)}%
                      </td>
                      <td className="py-3 px-3 text-right">
                        <Link
                          href={`/markets/${inst.symbol}`}
                          className="px-2.5 py-1 rounded bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white transition-all text-[11px]"
                        >
                          Analyze
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right 1-Col: Market Movers & AI Insights */}
        <div className="space-y-6">
          {/* Top Gainers & Losers Card */}
          <div className="fintech-card p-5">
            <h2 className="text-sm font-bold text-white mb-3">Market Movers</h2>

            <div className="space-y-4">
              <div>
                <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold block mb-2">Top Gainers</span>
                <div className="space-y-2">
                  {topGainers.map((gainer) => (
                    <div key={gainer.symbol} className="flex justify-between items-center text-xs font-mono p-2 rounded bg-[#0d121c]">
                      <span className="font-bold text-white">{gainer.symbol}</span>
                      <div className="text-right">
                        <span className="text-white">₹{gainer.current_price.toFixed(2)}</span>
                        <span className="text-emerald-400 ml-2 font-bold">+{gainer.percent_change.toFixed(2)}%</span>
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

          {/* AI Insights Card */}
          <div className="fintech-card p-5 border-l-4 border-l-blue-500">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-blue-400" />
              <h2 className="text-sm font-bold text-white">MAXLITH AI Insights</h2>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              Technical Agent detects 20-day SMA support holding on <strong>RELIANCE</strong> at ₹2,965. Relative Strength Index (RSI 14) stands at 58.2 (Neutral).
            </p>
            <Link
              href="/ai-copilot"
              className="w-full py-2 rounded bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white font-medium text-xs transition-all flex items-center justify-center gap-1.5"
            >
              <span>Launch AI Copilot</span>
              <Bot className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
