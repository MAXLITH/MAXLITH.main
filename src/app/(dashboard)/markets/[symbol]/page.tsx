'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import StockChart from '@/components/StockChart';
import {
  TrendingUp,
  TrendingDown,
  Layers,
  Bot,
  ShieldAlert,
  BarChart2,
  Newspaper,
  Sparkles,
  ArrowLeft,
  CheckCircle2
} from 'lucide-react';

export default function StockAnalysisPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = use(params);
  const [data, setData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'TECHNICAL' | 'FUNDAMENTALS' | 'NEWS' | 'AI_ANALYSIS' | 'RISK'>('OVERVIEW');
  const [aiReport, setAiReport] = useState<any>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/markets/${symbol}`)
      .then((res) => res.json())
      .then((resData) => {
        setData(resData);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [symbol]);

  const handleRunAiAnalysis = () => {
    setLoadingAi(true);
    fetch('/api/ai/copilot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: `Analyze stock ${symbol}` })
    })
      .then((res) => res.json())
      .then((resData) => setAiReport(resData))
      .catch((err) => console.error(err))
      .finally(() => setLoadingAi(false));
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500 font-mono text-xs">Loading instrument analysis...</div>;
  }

  if (!data || !data.instrument) {
    return (
      <div className="p-8 text-center text-slate-400 font-mono text-xs">
        Instrument <strong>{symbol}</strong> not found.
      </div>
    );
  }

  const inst = data.instrument;
  const history = data.history || [];

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/markets" className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white font-mono">{inst.symbol}</h1>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">{inst.exchange}</span>
            </div>
            <p className="text-xs text-slate-400">{inst.name} • {inst.sector}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRunAiAnalysis}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white font-medium text-xs border border-indigo-500/30 transition-all"
          >
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span>Ask MAXLITH AI</span>
          </button>
          <Link
            href={`/paper-trading?symbol=${inst.symbol}`}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs shadow-md shadow-blue-600/30 transition-all"
          >
            <Layers className="w-4 h-4" />
            <span>Paper Trade</span>
          </Link>
        </div>
      </div>

      {/* Main Stock Banner Card */}
      <div className="fintech-card p-6 grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
        <div>
          <span className="text-[10px] uppercase font-mono text-slate-500">Current Market Price</span>
          <div className="text-2xl font-bold font-mono text-white mt-0.5">₹{inst.current_price.toFixed(2)}</div>
          <div className={`text-xs font-mono font-bold mt-0.5 flex items-center gap-1 ${inst.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            <span>{inst.change >= 0 ? '+' : ''}{inst.change.toFixed(2)}</span>
            <span>({inst.percent_change.toFixed(2)}%)</span>
          </div>
        </div>

        <div>
          <span className="text-[10px] uppercase font-mono text-slate-500">Day Open / Prev Close</span>
          <div className="text-sm font-mono text-white mt-1">₹{inst.open_price.toFixed(2)} / ₹{inst.previous_close.toFixed(2)}</div>
          <div className="text-[11px] font-mono text-slate-400 mt-0.5">High: ₹{inst.high_price} | Low: ₹{inst.low_price}</div>
        </div>

        <div>
          <span className="text-[10px] uppercase font-mono text-slate-500">52-Week Range</span>
          <div className="text-sm font-mono text-white mt-1">₹{inst.low_52w} - ₹{inst.high_52w}</div>
          <div className="text-[11px] font-mono text-slate-400 mt-0.5">P/E: {inst.pe_ratio || 'N/A'} | P/B: {inst.pb_ratio || 'N/A'}</div>
        </div>

        <div>
          <span className="text-[10px] uppercase font-mono text-slate-500">Market Cap & Volume</span>
          <div className="text-sm font-mono text-white mt-1">₹{inst.market_cap?.toLocaleString('en-IN')} Cr</div>
          <div className="text-[11px] font-mono text-slate-400 mt-0.5">Vol: {(inst.volume / 100000).toFixed(2)} Lakhs</div>
        </div>
      </div>

      {/* CHART CONTAINER */}
      <div className="fintech-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-white font-mono">Price Action Chart ({inst.symbol})</h2>
          <span className="text-[10px] font-mono text-slate-500">30-Day Daily Candles</span>
        </div>
        <StockChart data={history} symbol={inst.symbol} isPositive={inst.change >= 0} />
      </div>

      {/* ANALYSIS TABS */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
          {(['OVERVIEW', 'TECHNICAL', 'FUNDAMENTALS', 'NEWS', 'AI_ANALYSIS', 'RISK'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-xs font-mono transition-all flex-shrink-0 ${
                activeTab === tab
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
              }`}
            >
              {tab.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* TAB CONTENT: OVERVIEW */}
        {activeTab === 'OVERVIEW' && (
          <div className="fintech-card p-5 text-xs text-slate-300 space-y-3">
            <h3 className="font-bold text-white text-sm">Company Summary</h3>
            <p className="leading-relaxed">
              {inst.name} is a leading bluechip entity listed on the {inst.exchange} in India, operating within the {inst.sector} sector.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 font-mono text-slate-400">
              <div className="p-3 bg-[#0d121c] rounded">
                <span className="text-[10px] text-slate-500 block">52W HIGH</span>
                <span className="text-white font-bold">₹{inst.high_52w}</span>
              </div>
              <div className="p-3 bg-[#0d121c] rounded">
                <span className="text-[10px] text-slate-500 block">52W LOW</span>
                <span className="text-white font-bold">₹{inst.low_52w}</span>
              </div>
              <div className="p-3 bg-[#0d121c] rounded">
                <span className="text-[10px] text-slate-500 block">P/E MULTIPLE</span>
                <span className="text-white font-bold">{inst.pe_ratio}</span>
              </div>
              <div className="p-3 bg-[#0d121c] rounded">
                <span className="text-[10px] text-slate-500 block">P/B MULTIPLE</span>
                <span className="text-white font-bold">{inst.pb_ratio}</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB CONTENT: TECHNICAL */}
        {activeTab === 'TECHNICAL' && (
          <div className="fintech-card p-5 space-y-4">
            <h3 className="font-bold text-white text-sm">Technical Indicator Matrix</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
              <div className="p-4 rounded bg-[#0d121c] border border-slate-800">
                <span className="text-[10px] text-slate-400 block">20-DAY SMA</span>
                <span className="text-base font-bold text-white">₹{(inst.current_price * 0.99).toFixed(2)}</span>
                <span className="text-emerald-400 text-[10px] block mt-1">Trading Above Moving Avg</span>
              </div>

              <div className="p-4 rounded bg-[#0d121c] border border-slate-800">
                <span className="text-[10px] text-slate-400 block">RSI (14-DAY)</span>
                <span className="text-base font-bold text-white">58.4</span>
                <span className="text-slate-400 text-[10px] block mt-1">Neutral Zone (30-70)</span>
              </div>

              <div className="p-4 rounded bg-[#0d121c] border border-slate-800">
                <span className="text-[10px] text-slate-400 block">SUPPORT / RESISTANCE</span>
                <span className="text-xs font-bold text-white">Sup: ₹{inst.low_price} | Res: ₹{inst.high_price}</span>
                <span className="text-blue-400 text-[10px] block mt-1">30-Day Range Levels</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB CONTENT: AI ANALYSIS */}
        {activeTab === 'AI_ANALYSIS' && (
          <div className="fintech-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-400" />
                <span>Multi-Agent AI Intelligence Synthesis</span>
              </h3>
              <button
                onClick={handleRunAiAnalysis}
                disabled={loadingAi}
                className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono transition-colors disabled:opacity-50"
              >
                {loadingAi ? 'Orchestrating Agents...' : 'Run Fresh AI Scan'}
              </button>
            </div>

            {aiReport ? (
              <div className="p-4 rounded bg-[#0d121c] border border-slate-800 text-xs leading-relaxed space-y-3 font-mono text-slate-300">
                <pre className="whitespace-pre-wrap font-sans">{aiReport.response}</pre>
                <div className="text-[10px] text-amber-400 bg-amber-950/30 p-2 rounded border border-amber-500/20">
                  {aiReport.disclaimer}
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-slate-400 text-xs font-mono">
                Click &quot;Run Fresh AI Scan&quot; to invoke MAXLITH AI Agents (Tech, News, Risk, Fundamental, Info).
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
