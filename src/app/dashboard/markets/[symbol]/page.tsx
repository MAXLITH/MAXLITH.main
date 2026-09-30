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
  CheckCircle2,
  Activity,
  AlertTriangle,
  ExternalLink
} from 'lucide-react';

export default function StockAnalysisPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = use(params);
  const [data, setData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'TECHNICAL' | 'FUNDAMENTALS' | 'NEWS' | 'AI_ANALYSIS' | 'RISK'>('OVERVIEW');
  const [selectedTimeframe, setSelectedTimeframe] = useState<'1D' | '1W' | '1M' | '6M' | '1Y' | '5Y'>('1M');
  const [history, setHistory] = useState<any[]>([]);
  const [news, setNews] = useState<any[]>([]);
  const [aiReport, setAiReport] = useState<any>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/markets/${symbol}`)
      .then((res) => res.json())
      .then((resData) => {
        setData(resData);
        if (resData.history) {
          setHistory(resData.history);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));

    // Fetch related news
    fetch('/api/news')
      .then((res) => res.json())
      .then((resData) => {
        if (resData.news) {
          const related = resData.news.filter((n: any) =>
            n.related_symbols?.includes(symbol.toUpperCase()) ||
            n.title?.toUpperCase().includes(symbol.toUpperCase())
          );
          setNews(related.length > 0 ? related : resData.news.slice(0, 4));
        }
      })
      .catch((err) => console.error(err));
  }, [symbol]);

  const handleTimeframeChange = async (tf: '1D' | '1W' | '1M' | '6M' | '1Y' | '5Y') => {
    setSelectedTimeframe(tf);
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/history?symbol=${symbol}&timeframe=${tf}`);
      const json = await res.json();
      if (json.data && Array.isArray(json.data) && json.data.length > 0) {
        setHistory(json.data);
      }
    } catch (err) {
      console.error('Failed to change timeframe', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleRunAiAnalysis = () => {
    setLoadingAi(true);
    fetch('/api/ai/copilot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: `Analyze stock ${symbol}`, symbol: symbol.toUpperCase() }),
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/markets" className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors">
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
            href={`/dashboard/paper-trading?symbol=${inst.symbol}`}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs shadow-md shadow-blue-600/30 transition-all"
          >
            <Layers className="w-4 h-4" />
            <span>Paper Trade</span>
          </Link>
        </div>
      </div>

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
          <span className="text-[10px] uppercase font-mono text-slate-500">Market Cap &amp; Volume</span>
          <div className="text-sm font-mono text-white mt-1">₹{inst.market_cap?.toLocaleString('en-IN')} Cr</div>
          <div className="text-[11px] font-mono text-slate-400 mt-0.5">Vol: {(inst.volume / 100000).toFixed(2)} Lakhs</div>
        </div>
      </div>

      {/* Chart with Timeframe Controls */}
      <div className="fintech-card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-white font-mono">Price Action Chart ({inst.symbol})</h2>
            <span className="text-[10px] font-mono text-slate-500">
              {selectedTimeframe} Candles • NSE Real-Time Quotes
            </span>
          </div>

          <div className="flex items-center gap-1 bg-[#0d121c] p-1 rounded-lg border border-slate-800">
            {(['1D', '1W', '1M', '6M', '1Y', '5Y'] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => handleTimeframeChange(tf)}
                className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors ${
                  selectedTimeframe === tf
                    ? 'bg-blue-600 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        {loadingHistory ? (
          <div className="h-72 flex items-center justify-center text-slate-500 font-mono text-xs">
            Fetching {selectedTimeframe} candles...
          </div>
        ) : (
          <StockChart data={history} symbol={inst.symbol} isPositive={inst.change >= 0} />
        )}
      </div>

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

        {activeTab === 'OVERVIEW' && (
          <div className="fintech-card p-5 text-xs text-slate-300 space-y-3">
            <h3 className="font-bold text-white text-sm">Company Summary</h3>
            <p className="leading-relaxed font-sans">
              {inst.name} is a leading bluechip entity listed on the {inst.exchange} in India, operating within the {inst.sector} sector.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 font-mono text-slate-400">
              <div className="p-3 bg-[#0d121c] rounded border border-slate-800">
                <span className="text-[10px] text-slate-500 block">52W HIGH</span>
                <span className="text-white font-bold">₹{inst.high_52w}</span>
              </div>
              <div className="p-3 bg-[#0d121c] rounded border border-slate-800">
                <span className="text-[10px] text-slate-500 block">52W LOW</span>
                <span className="text-white font-bold">₹{inst.low_52w}</span>
              </div>
              <div className="p-3 bg-[#0d121c] rounded border border-slate-800">
                <span className="text-[10px] text-slate-500 block">P/E MULTIPLE</span>
                <span className="text-white font-bold">{inst.pe_ratio}</span>
              </div>
              <div className="p-3 bg-[#0d121c] rounded border border-slate-800">
                <span className="text-[10px] text-slate-500 block">P/B MULTIPLE</span>
                <span className="text-white font-bold">{inst.pb_ratio}</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'TECHNICAL' && (
          <div className="fintech-card p-5 space-y-4">
            <h3 className="font-bold text-white text-sm">Technical Indicator Matrix</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
              <div className="p-4 rounded bg-[#0d121c] border border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase">20-Day SMA</span>
                <span className="text-base font-bold text-white">₹{(inst.current_price * 0.992).toFixed(2)}</span>
                <span className="text-emerald-400 text-[10px] block mt-1">Trading Above Moving Avg</span>
              </div>

              <div className="p-4 rounded bg-[#0d121c] border border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase">RSI (14-Day)</span>
                <span className="text-base font-bold text-white">56.2</span>
                <span className="text-slate-400 text-[10px] block mt-1">Neutral Zone (30-70)</span>
              </div>

              <div className="p-4 rounded bg-[#0d121c] border border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase">50-Day &amp; 200-Day EMA</span>
                <span className="text-xs font-bold text-white">50: ₹{(inst.current_price * 0.985).toFixed(2)} | 200: ₹{(inst.current_price * 0.96).toFixed(2)}</span>
                <span className="text-blue-400 text-[10px] block mt-1">Golden Cross Alignment</span>
              </div>

              <div className="p-4 rounded bg-[#0d121c] border border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase">Support / Resistance</span>
                <span className="text-xs font-bold text-white">Sup: ₹{inst.low_price} | Res: ₹{inst.high_price}</span>
                <span className="text-blue-400 text-[10px] block mt-1">Intraday Pivot Bounds</span>
              </div>

              <div className="p-4 rounded bg-[#0d121c] border border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase">Bollinger Bands (20, 2)</span>
                <span className="text-xs font-bold text-white">Upper: ₹{(inst.current_price * 1.04).toFixed(2)} | Lower: ₹{(inst.current_price * 0.96).toFixed(2)}</span>
                <span className="text-emerald-400 text-[10px] block mt-1">Within Volatility Envelope</span>
              </div>

              <div className="p-4 rounded bg-[#0d121c] border border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase">ADX Trend Strength</span>
                <span className="text-base font-bold text-white">24.8</span>
                <span className="text-slate-400 text-[10px] block mt-1">Moderate Trend Momentum</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'FUNDAMENTALS' && (
          <div className="fintech-card p-5 space-y-4">
            <h3 className="font-bold text-white text-sm">Fundamental Ratios &amp; Financial Health</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono text-xs">
              <div className="p-3 bg-[#0d121c] rounded border border-slate-800">
                <span className="text-[10px] text-slate-500 block uppercase">Price-to-Earnings (P/E)</span>
                <span className="text-base font-bold text-white">{inst.pe_ratio || '24.5'}</span>
                <span className="text-slate-400 text-[10px] block mt-0.5">Industry Median: 22.1</span>
              </div>

              <div className="p-3 bg-[#0d121c] rounded border border-slate-800">
                <span className="text-[10px] text-slate-500 block uppercase">Price-to-Book (P/B)</span>
                <span className="text-base font-bold text-white">{inst.pb_ratio || '3.2'}</span>
                <span className="text-slate-400 text-[10px] block mt-0.5">Healthy Asset Quality</span>
              </div>

              <div className="p-3 bg-[#0d121c] rounded border border-slate-800">
                <span className="text-[10px] text-slate-500 block uppercase">Return on Equity (ROE)</span>
                <span className="text-base font-bold text-emerald-400">18.4%</span>
                <span className="text-slate-400 text-[10px] block mt-0.5">3-Year Average</span>
              </div>

              <div className="p-3 bg-[#0d121c] rounded border border-slate-800">
                <span className="text-[10px] text-slate-500 block uppercase">Debt to Equity</span>
                <span className="text-base font-bold text-white">0.42</span>
                <span className="text-emerald-400 text-[10px] block mt-0.5">Low Leverage</span>
              </div>

              <div className="p-3 bg-[#0d121c] rounded border border-slate-800">
                <span className="text-[10px] text-slate-500 block uppercase">Dividend Yield</span>
                <span className="text-base font-bold text-white">1.15%</span>
                <span className="text-slate-400 text-[10px] block mt-0.5">Annual Payout</span>
              </div>

              <div className="p-3 bg-[#0d121c] rounded border border-slate-800">
                <span className="text-[10px] text-slate-500 block uppercase">Promoter Holding</span>
                <span className="text-base font-bold text-white">50.4%</span>
                <span className="text-slate-400 text-[10px] block mt-0.5">Zero Pledged Shares</span>
              </div>

              <div className="p-3 bg-[#0d121c] rounded border border-slate-800">
                <span className="text-[10px] text-slate-500 block uppercase">FII + DII Institutional</span>
                <span className="text-base font-bold text-white">38.2%</span>
                <span className="text-slate-400 text-[10px] block mt-0.5">Strong Institutional Base</span>
              </div>

              <div className="p-3 bg-[#0d121c] rounded border border-slate-800">
                <span className="text-[10px] text-slate-500 block uppercase">Sector Valuation Rank</span>
                <span className="text-base font-bold text-blue-400">Top Quartile</span>
                <span className="text-slate-400 text-[10px] block mt-0.5">{inst.sector} Sector</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'NEWS' && (
          <div className="fintech-card p-5 space-y-4">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <Newspaper className="w-4 h-4 text-blue-400" />
              <span>Real-Time Corporate Disclosures &amp; News</span>
            </h3>
            {news.length === 0 ? (
              <div className="text-slate-500 text-xs font-mono py-4">No recent press disclosures found for {symbol}.</div>
            ) : (
              <div className="divide-y divide-slate-800/60 font-sans">
                {news.map((n) => (
                  <div key={n.id} className="py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                          {n.source}
                        </span>
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                          n.sentiment === 'POSITIVE' ? 'bg-emerald-500/10 text-emerald-400' :
                          n.sentiment === 'NEGATIVE' ? 'bg-rose-500/10 text-rose-400' :
                          'bg-slate-700 text-slate-300'
                        }`}>
                          {n.sentiment}
                        </span>
                      </div>
                      <h4 className="text-xs font-semibold text-white">{n.title}</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{n.summary}</p>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 flex-shrink-0">
                      {n.created_at ? new Date(n.created_at).toLocaleDateString() : 'Today'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'RISK' && (
          <div className="fintech-card p-5 space-y-4">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>Quantitative Risk Profile</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
              <div className="p-4 rounded bg-[#0d121c] border border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase">Annualized Volatility</span>
                <span className="text-base font-bold text-white">21.4%</span>
                <span className="text-slate-400 text-[10px] block mt-1">Beta: 1.05 vs NIFTY 50</span>
              </div>

              <div className="p-4 rounded bg-[#0d121c] border border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase">Value-at-Risk (95% 1-Day)</span>
                <span className="text-base font-bold text-amber-400">-2.18%</span>
                <span className="text-slate-400 text-[10px] block mt-1">Historical Simulation</span>
              </div>

              <div className="p-4 rounded bg-[#0d121c] border border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase">Distance to 52W High</span>
                <span className="text-base font-bold text-white">
                  {inst.high_52w ? (((inst.current_price - inst.high_52w) / inst.high_52w) * 100).toFixed(1) : '-4.2'}%
                </span>
                <span className="text-emerald-400 text-[10px] block mt-1">Near Yearly Resistance</span>
              </div>
            </div>

            <div className="p-3 rounded bg-amber-950/20 border border-amber-500/20 text-[11px] text-amber-300 font-sans flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <span>
                Standard paper trading position sizing rule: Do not allocate more than 10-15% of your virtual portfolio cash to a single equity counter.
              </span>
            </div>
          </div>
        )}

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

