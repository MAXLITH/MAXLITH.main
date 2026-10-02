'use client';

import { useState, useEffect } from 'react';
import { Cpu, ShieldCheck, Zap, Activity, Play, RefreshCw, ChevronDown, ChevronUp, CheckCircle2, AlertCircle } from 'lucide-react';

interface AgentTelemetry {
  name: string;
  status: string;
  lastRunAt: string | null;
  totalRuns: number;
  lastExecutionMs: number | null;
  lastOutput: any;
}

export default function AIAgentsPage() {
  const [symbol, setSymbol] = useState('RELIANCE');
  const [agentTelemetry, setAgentTelemetry] = useState<Record<string, AgentTelemetry>>({});
  const [runningAgent, setRunningAgent] = useState<string | null>(null);
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
  const [loadingInitial, setLoadingInitial] = useState(true);

  const agents = [
    {
      id: 'TECH',
      name: 'TECH AGENT',
      role: 'Technical Indicators & Trend Analysis',
      metrics: 'RSI 14, 20-day SMA, MACD, Support/Resistance Levels',
      description: 'Calculates mathematical momentum, trend directions, and price boundaries from candle history.'
    },
    {
      id: 'NEWS',
      name: 'NEWS AGENT',
      role: 'Market Sentiment & Press Coverage',
      metrics: 'Sentiment Scoring (Bullish/Bearish/Neutral), Article Parsing',
      description: 'Scans official financial media (Moneycontrol, Economic Times, LiveMint) for corporate releases.'
    },
    {
      id: 'RISK',
      name: 'RISK AGENT',
      role: 'Volatility & Portfolio Drawdown',
      metrics: 'Annualized Volatility, 30-Day Max Drawdown, 52W High Distance',
      description: 'Evaluates standard deviation of daily returns and stress scenarios to assess equity risk.'
    },
    {
      id: 'FUNDAMENTAL',
      name: 'FUNDAMENTAL AGENT',
      role: 'Valuation Multiples & Financial Metrics',
      metrics: 'Market Cap, P/E Ratio, P/B Ratio, ROE, Sector Multiples',
      description: 'Retrieves fundamental balance sheet indicators and quarterly performance valuation multiples.'
    },
    {
      id: 'INFO',
      name: 'INFO AGENT',
      role: 'Company Profile & Market Context',
      metrics: 'Exchange (NSE/BSE), Sector Classification, Asset Type',
      description: 'Maintains static company metadata, index inclusion lists, and industry sector grouping.'
    }
  ];

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/ai/agent');
      const data = await res.json();
      if (data.agents && Array.isArray(data.agents)) {
        const map: Record<string, AgentTelemetry> = {};
        for (const ag of data.agents) {
          map[ag.name] = ag;
        }
        setAgentTelemetry(map);
      }
    } catch (err) {
      console.error('Failed to fetch agent status', err);
    } finally {
      setLoadingInitial(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleRunAgent = async (agentId: string) => {
    setRunningAgent(agentId);
    try {
      const res = await fetch('/api/ai/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent: agentId, symbol: symbol.toUpperCase() })
      });
      const data = await res.json();
      if (data.success) {
        setExpandedAgent(agentId);
        await fetchStatus();
      }
    } catch (err) {
      console.error('Failed to run agent', err);
    } finally {
      setRunningAgent(null);
    }
  };

  const handleRunAll = async () => {
    for (const a of agents) {
      await handleRunAgent(a.id);
    }
  };

  const popularSymbols = ['RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'ICICIBANK'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Cpu className="w-5 h-5 text-blue-400" />
            <span>Specialized AI Agent Ecosystem</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Decoupled multi-agent orchestration architecture to eliminate single-model hallucination.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRunAll}
            disabled={runningAgent !== null}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs shadow-md shadow-blue-600/30 transition-all disabled:opacity-50"
          >
            {runningAgent ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            <span>Run All Agents</span>
          </button>
        </div>
      </div>

      {/* Symbol Target Selector Bar */}
      <div className="fintech-card p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono uppercase text-slate-400 font-bold">Target Stock:</span>
          <input
            type="text"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            placeholder="RELIANCE"
            className="w-32 bg-[#0d121c] border border-slate-800 focus:border-blue-500 text-xs font-mono font-bold text-white rounded-lg px-3 py-1.5 outline-none uppercase"
          />
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-mono uppercase text-slate-500 mr-1">Quick Select:</span>
          {popularSymbols.map((sym) => (
            <button
              key={sym}
              onClick={() => setSymbol(sym)}
              className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors ${
                symbol === sym
                  ? 'bg-blue-600 text-white font-bold'
                  : 'bg-[#0d121c] text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {sym}
            </button>
          ))}
        </div>
      </div>

      {/* Agents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map((agent) => {
          const telem = agentTelemetry[agent.id];
          const isRunning = runningAgent === agent.id;
          const isExpanded = expandedAgent === agent.id;

          return (
            <div key={agent.name} className="fintech-card p-5 border-t-2 border-t-blue-500 space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white font-mono text-sm">{agent.name}</span>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-amber-400 animate-ping' : 'bg-emerald-400 animate-pulse'}`}></span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {isRunning ? 'RUNNING' : telem ? 'READY' : 'STANDBY'}
                    </span>
                  </div>
                </div>

                <div className="text-xs font-semibold text-blue-400 font-sans mt-1">{agent.role}</div>
                <p className="text-xs text-slate-400 leading-relaxed font-sans mt-1">{agent.description}</p>

                <div className="p-2.5 rounded bg-[#0d121c] border border-slate-800 text-[10px] font-mono text-slate-300 mt-3 space-y-1">
                  <div className="flex justify-between text-slate-500 uppercase">
                    <span>Lifetime Runs: {telem?.totalRuns || 0}</span>
                    <span>{telem?.lastExecutionMs ? `${telem.lastExecutionMs}ms` : 'Cached'}</span>
                  </div>
                  <div className="text-slate-400 truncate">
                    {agent.metrics}
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleRunAgent(agent.id)}
                    disabled={isRunning}
                    className="flex-1 py-1.5 px-3 rounded bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white transition-all text-xs font-mono font-medium flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {isRunning ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Analyzing {symbol}...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5" />
                        <span>Run on {symbol}</span>
                      </>
                    )}
                  </button>

                  {telem?.lastOutput && (
                    <button
                      onClick={() => setExpandedAgent(isExpanded ? null : agent.id)}
                      className="p-1.5 rounded bg-[#0d121c] text-slate-400 hover:text-white border border-slate-800 transition-colors"
                      title="Inspect Latest Output"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  )}
                </div>

                {isExpanded && telem?.lastOutput && (
                  <div className="p-3 rounded bg-[#0b0e14] border border-slate-800 text-[11px] font-mono text-slate-300 max-h-48 overflow-y-auto">
                    <div className="text-[10px] text-blue-400 font-bold mb-1 uppercase">Latest Execution Output:</div>
                    <pre className="whitespace-pre-wrap leading-tight text-slate-300">
                      {typeof telem.lastOutput === 'object'
                        ? JSON.stringify(telem.lastOutput, null, 2)
                        : telem.lastOutput}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

