import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { getAuthSession } from '@/lib/auth';
import { getAllInstruments, getMarketSessionStatus } from '@/lib/market-data';
import {
  TrendingUp,
  ShieldCheck,
  Cpu,
  Layers,
  ArrowRight,
  Bot,
  Zap,
  BarChart3,
  CheckCircle2,
  Lock,
  Sparkles
} from 'lucide-react';

export default async function LandingPage() {
  const session = await getAuthSession();
  const instruments = getAllInstruments().slice(0, 6);
  const marketSession = getMarketSessionStatus();

  return (
    <div className="min-h-screen bg-[#0b0e14] text-slate-100 flex flex-col font-sans">
      <Navbar authenticated={!!session} user={session} />

      {/* HERO SECTION */}
      <section className="relative pt-16 pb-20 overflow-hidden border-b border-slate-800/60">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-950 to-transparent pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
            {/* Eyebrow Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-mono mb-6">
              <Sparkles className="w-3.5 h-3.5" />
              <span>INDIAN STOCK MARKET AI INTELLIGENCE & PAPER TRADING</span>
            </div>

            {/* Headline (Max 2 lines) */}
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white leading-tight mb-6">
              Institutional Financial AI for Indian Markets
            </h1>

            {/* Subtext (Max 20 words per Taste guidelines) */}
            <p className="text-base md:text-lg text-slate-400 leading-relaxed mb-8 max-w-xl">
              Execute risk-free paper trades, monitor NIFTY 50 bluechips, and leverage specialized AI agents for technical and fundamental market intelligence.
            </p>

            {/* CTA Group */}
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center mb-12">
              <Link
                href={session ? '/dashboard' : '/signup'}
                className="w-full sm:w-auto px-6 py-3.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                <span>{session ? 'Enter Platform Dashboard' : 'Start Free Paper Trading'}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="#markets"
                className="w-full sm:w-auto px-6 py-3.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-semibold text-sm transition-all flex items-center justify-center gap-2"
              >
                <span>Explore Indian Markets</span>
              </Link>
            </div>

            {/* Live Market Session Banner */}
            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-lg bg-[#121824] border border-slate-800 text-xs font-mono">
              <span className={`w-2.5 h-2.5 rounded-full ${marketSession.isOpen ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span className="text-slate-300 font-semibold">NSE/BSE STATUS: {marketSession.session}</span>
              <span className="text-slate-500">|</span>
              <span className="text-slate-400">{marketSession.nextSessionText}</span>
            </div>
          </div>
        </div>
      </section>

      {/* MARKET MOVERS SNAPSHOT SECTION */}
      <section id="markets" className="py-16 border-b border-slate-800/60 bg-[#0d121c]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-8 gap-4">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-widest text-blue-400">REAL MARKET FEEDS</span>
              <h2 className="text-2xl font-bold text-white mt-1">NSE Bluechip Quotes</h2>
            </div>
            <Link href="/signup" className="text-xs text-blue-400 hover:underline flex items-center gap-1 font-mono">
              <span>View All 50+ Instruments</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {instruments.map((inst) => (
              <div key={inst.symbol} className="fintech-card p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-base font-mono">{inst.symbol}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">{inst.exchange}</span>
                  </div>
                  <div className="text-xs text-slate-400 truncate max-w-[180px] mt-0.5">{inst.name}</div>
                  <div className="text-[11px] text-slate-500 font-mono mt-1">Vol: {(inst.volume / 100000).toFixed(2)}L</div>
                </div>
                <div className="text-right font-mono">
                  <div className="text-base font-bold text-white">₹{inst.current_price.toFixed(2)}</div>
                  <div className={`text-xs font-semibold flex items-center justify-end gap-0.5 ${inst.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    <span>{inst.change >= 0 ? '+' : ''}{inst.change.toFixed(2)}</span>
                    <span>({inst.percent_change.toFixed(2)}%)</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI AGENT ECOSYSTEM SECTION */}
      <section id="ai-ecosystem" className="py-20 border-b border-slate-800/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-[11px] font-mono uppercase tracking-widest text-blue-400">MULTI-AGENT ARCHITECTURE</span>
            <h2 className="text-3xl font-bold text-white mt-1">Specialized Market AI Agents</h2>
            <p className="text-sm text-slate-400 mt-3">
              MAXLITH orchestrates five dedicated intelligence agents to analyze market signals without human bias.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="fintech-card p-5 border-t-2 border-t-blue-500">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold font-mono text-xs mb-3">
                TECH
              </div>
              <h3 className="font-bold text-white text-sm mb-1">TECH AGENT</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                RSI 14, 20-day SMA, MACD momentum, and automated 30-day support/resistance detection.
              </p>
            </div>

            <div className="fintech-card p-5 border-t-2 border-t-emerald-500">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold font-mono text-xs mb-3">
                NEWS
              </div>
              <h3 className="font-bold text-white text-sm mb-1">NEWS AGENT</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Real-time sentiment scoring across financial press (Moneycontrol, Economic Times, LiveMint).
              </p>
            </div>

            <div className="fintech-card p-5 border-t-2 border-t-rose-500">
              <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center font-bold font-mono text-xs mb-3">
                RISK
              </div>
              <h3 className="font-bold text-white text-sm mb-1">RISK AGENT</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Annualized volatility metrics, drawdown simulation, and 52-week peak distance analysis.
              </p>
            </div>

            <div className="fintech-card p-5 border-t-2 border-t-purple-500">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold font-mono text-xs mb-3">
                FUND
              </div>
              <h3 className="font-bold text-white text-sm mb-1">FUNDAMENTAL</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                P/E, P/B, Market Capitalization multiples, and quarterly financial report summaries.
              </p>
            </div>

            <div className="fintech-card p-5 border-t-2 border-t-amber-500">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold font-mono text-xs mb-3">
                INFO
              </div>
              <h3 className="font-bold text-white text-sm mb-1">INFO AGENT</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Company profile, sector peer grouping, and corporate event updates.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* PAPER TRADING FEATURES SECTION */}
      <section id="paper-trading" className="py-20 border-b border-slate-800/60 bg-[#0d121c]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-widest text-blue-400">VIRTUAL TRADING ENGINE</span>
              <h2 className="text-3xl font-bold text-white mt-1 mb-4">
                Master Trading Strategies Without Financial Risk
              </h2>
              <p className="text-sm text-slate-400 leading-relaxed mb-6">
                Every MAXLITH account is provisioned with ₹10,00,000 in virtual capital. Test market and limit orders against real NSE/BSE stock price movements.
              </p>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span className="text-xs text-slate-200">Real-time order validation & execution algorithm</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span className="text-xs text-slate-200">Realized & unrealized P&L calculations</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span className="text-xs text-slate-200">Deterministic after-hours session freezing</span>
                </div>
              </div>

              <div className="mt-8">
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition-all shadow-md shadow-blue-600/30"
                >
                  <span>Open Paper Account</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Mock Order Ticket Graphic */}
            <div className="fintech-card p-6 border border-slate-700/80 bg-[#121824] shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse"></div>
                  <span className="font-mono text-xs font-bold text-white">RELIANCE • NSE</span>
                </div>
                <span className="font-mono text-xs text-slate-400">LAST: ₹2,985.40</span>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-3 rounded bg-emerald-950/30 border border-emerald-500/30 text-center">
                  <span className="text-[10px] uppercase font-mono text-emerald-400 block">BUY ORDER</span>
                  <span className="font-mono font-bold text-white text-sm">100 Shares</span>
                </div>
                <div className="p-3 rounded bg-slate-900 border border-slate-800 text-center">
                  <span className="text-[10px] uppercase font-mono text-slate-400 block">TOTAL VALUE</span>
                  <span className="font-mono font-bold text-white text-sm">₹2,98,540.00</span>
                </div>
              </div>

              <div className="p-3 rounded bg-slate-950 text-xs font-mono text-slate-400 space-y-1">
                <div className="flex justify-between">
                  <span>Available Virtual Cash:</span>
                  <span className="text-white">₹10,00,000.00</span>
                </div>
                <div className="flex justify-between">
                  <span>Execution Price:</span>
                  <span className="text-emerald-400">₹2,985.40 (Market)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section id="faq" className="py-20 border-b border-slate-800/60">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-[11px] font-mono uppercase tracking-widest text-blue-400">FREQUENTLY ASKED QUESTIONS</span>
            <h2 className="text-2xl font-bold text-white mt-1">Platform Guidance</h2>
          </div>

          <div className="space-y-4">
            <div className="fintech-card p-5">
              <h3 className="font-semibold text-white text-sm mb-1">Is MAXLITH V1 real money or paper trading?</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                MAXLITH V1 is strictly PAPER TRADING ONLY. All user portfolios use virtual funds (₹10,00,000 starting cash) to practice trading against live Indian market prices without financial risk.
              </p>
            </div>

            <div className="fintech-card p-5">
              <h3 className="font-semibold text-white text-sm mb-1">Are the stock market prices real?</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Yes. MAXLITH connects to official market data structures for Indian NSE/BSE securities. When external data feeds are closed or offline, session states are transparently displayed without fake price generation.
              </p>
            </div>

            <div className="fintech-card p-5">
              <h3 className="font-semibold text-white text-sm mb-1">How does MAXLITH AI assist traders?</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                MAXLITH features a multi-agent orchestrator that combines five specialized agents (Technical, News, Risk, Fundamental, Info) to provide objective evidence and technical indicators for any selected security.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
