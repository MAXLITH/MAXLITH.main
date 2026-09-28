import { Cpu, ShieldCheck, Zap, Activity } from 'lucide-react';

export default function AIAgentsPage() {
  const agents = [
    {
      name: 'TECH AGENT',
      role: 'Technical Indicators & Trend Analysis',
      metrics: 'RSI 14, 20-day SMA, MACD, Support/Resistance Levels',
      description: 'Calculates mathematical momentum, trend directions, and price boundaries from candle history.'
    },
    {
      name: 'NEWS AGENT',
      role: 'Market Sentiment & Press Coverage',
      metrics: 'Sentiment Scoring (Bullish/Bearish/Neutral), Article Parsing',
      description: 'Scans official financial media (Moneycontrol, Economic Times, LiveMint) for corporate releases.'
    },
    {
      name: 'RISK AGENT',
      role: 'Volatility & Portfolio Drawdown',
      metrics: 'Annualized Volatility, 30-Day Max Drawdown, 52W High Distance',
      description: 'Evaluates standard deviation of daily returns and stress scenarios to assess equity risk.'
    },
    {
      name: 'FUNDAMENTAL AGENT',
      role: 'Valuation Multiples & Financial Metrics',
      metrics: 'Market Cap, P/E Ratio, P/B Ratio, ROE, Sector Multiples',
      description: 'Retrieves fundamental balance sheet indicators and quarterly performance valuation multiples.'
    },
    {
      name: 'INFO AGENT',
      role: 'Company Profile & Market Context',
      metrics: 'Exchange (NSE/BSE), Sector Classification, Asset Type',
      description: 'Maintains static company metadata, index inclusion lists, and industry sector grouping.'
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Cpu className="w-5 h-5 text-blue-400" />
          <span>Specialized AI Agent Ecosystem</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          MAXLITH operates a decoupled multi-agent orchestration architecture to eliminate single-model hallucination.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map((agent) => (
          <div key={agent.name} className="fintech-card p-5 border-t-2 border-t-blue-500 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white font-mono text-sm">{agent.name}</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            </div>

            <div className="text-xs font-semibold text-blue-400 font-sans">{agent.role}</div>

            <p className="text-xs text-slate-400 leading-relaxed font-sans">{agent.description}</p>

            <div className="p-2.5 rounded bg-[#0d121c] border border-slate-800 text-[10px] font-mono text-slate-300">
              <span className="text-slate-500 block mb-0.5 uppercase">Tracked Metrics</span>
              <span>{agent.metrics}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
