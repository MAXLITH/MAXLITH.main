'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  Trash2,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Layers,
  Activity,
  BarChart2,
  FileText,
  Shield,
  Info,
  CornerDownLeft,
} from 'lucide-react';

interface VerifiedQuoteSnapshot {
  symbol: string;
  name: string;
  exchange: 'NSE' | 'BSE';
  price: number;
  change: number;
  percentChange: number;
  open: number;
  high: number;
  low: number;
  previousClose: number;
  volume: number;
  providerTimestamp: string;
  receivedAt: string;
  provider: string;
  freshnessStatus: 'LIVE' | 'DELAYED' | 'END_OF_DAY' | 'CACHED' | 'UNAVAILABLE';
  sessionStatus: 'OPEN' | 'CLOSED' | 'PRE_MARKET' | 'POST_MARKET' | 'UNKNOWN';
}

interface ChatMessage {
  id: string;
  sender: 'USER' | 'ASSISTANT';
  text: string;
  quoteSnapshot?: VerifiedQuoteSnapshot;
  agentReports?: any;
  verdict?: any;
  disclaimer?: string;
  timestamp: string;
}

export default function AICopilotPage() {
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-msg',
      sender: 'ASSISTANT',
      text: `### Welcome to MAXLITH AI Market Intelligence
I am your institutional-grade AI Copilot for Indian equities (**NSE/BSE**).

Before providing analysis, I retrieve **verified live market quotes** and calculate **mathematical technical indicators** (SMA, EMA, RSI 14, MACD, ATR, Pivot Channels) across 5 specialized agents:
- 📊 **Market Data & Technical Agent**: Live ticks and verified historical candles.
- 🏛️ **Fundamental Valuation Agent**: Real P/E multiples, P/B, ROE & financial health.
- 📰 **News & Sentiment Agent**: Authorized media feeds & event narrative scoring.
- 🛡️ **Risk Telemetry Agent**: Value-at-Risk (95%), Portfolio Beta & drawdown warnings.
- ℹ️ **Corporate Intelligence Agent**: Exchange classification and company fundamentals.

Submit a stock query below to begin.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState('Orchestrating agents...');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedReports, setExpandedReports] = useState<Record<string, boolean>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const samplePrompts = [
    'Analyze RELIANCE stock.',
    'Technical setup for TCS and INFY.',
    'Risk assessment for HDFC Bank.',
    'Latest market sentiment for NIFTY 50.',
    'Calculate State Bank of India moving averages and RSI.',
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy message:', err);
    }
  };

  const handleClearChat = async () => {
    setMessages([
      {
        id: 'welcome-cleared',
        sender: 'ASSISTANT',
        text: 'Conversation cleared. How can I assist your market analysis today?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setErrorMessage(null);

    try {
      await fetch('/api/ai/copilot', { method: 'DELETE' });
    } catch {
      // Ignored for guest or offline
    }
  };

  const toggleReportExpansion = (id: string) => {
    setExpandedReports((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || prompt).trim();
    if (!query || loading) return;

    setErrorMessage(null);

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'USER',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setPrompt('');
    setLoading(true);

    // Multi-stage status indicator
    setLoadingStage('Retrieving verified market data...');
    const stageTimer1 = setTimeout(() => {
      setLoadingStage('Computing mathematical indicators & valuation...');
    }, 1200);
    const stageTimer2 = setTimeout(() => {
      setLoadingStage('Synthesizing institutional multi-agent consensus...');
    }, 2400);

    try {
      const res = await fetch('/api/ai/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: query }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `Server responded with ${res.status}`);
      }

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ASSISTANT',
        text: data.response || 'Agent orchestration returned no response.',
        quoteSnapshot: data.quoteSnapshot,
        agentReports: data.agentReports,
        verdict: data.verdict,
        disclaimer: data.disclaimer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Failed to complete AI market intelligence request.');
    } finally {
      clearTimeout(stageTimer1);
      clearTimeout(stageTimer2);
      setLoading(false);
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Safe lightweight markdown parser for trading terminal responses
  const renderFormattedMarkdown = (text: string) => {
    const lines = text.split('\n');

    return lines.map((line, idx) => {
      const trimmed = line.trim();

      // Heading 3
      if (trimmed.startsWith('### ')) {
        return (
          <h3
            key={idx}
            className="text-xs font-bold uppercase tracking-wider text-white mt-3 mb-1.5 flex items-center gap-2 border-b border-max-border/60 pb-1"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
            {trimmed.replace(/^###\s+/, '')}
          </h3>
        );
      }

      // Heading 4
      if (trimmed.startsWith('#### ')) {
        return (
          <h4
            key={idx}
            className="text-[11px] font-semibold text-slate-200 mt-2.5 mb-1 text-max-brand-primary"
          >
            {trimmed.replace(/^####\s+/, '')}
          </h4>
        );
      }

      // Horizontal Rule
      if (trimmed === '---') {
        return <hr key={idx} className="my-2 border-max-border/60" />;
      }

      // Blockquote / Important note
      if (trimmed.startsWith('> ')) {
        return (
          <blockquote
            key={idx}
            className="my-2 p-2 rounded bg-amber-950/20 border-l-2 border-amber-500 text-[10px] text-amber-300/90 font-mono"
          >
            {trimmed.replace(/^>\s+/, '')}
          </blockquote>
        );
      }

      // Bullet list item
      if (trimmed.startsWith('- ')) {
        const itemContent = trimmed.replace(/^-\s+/, '');
        return (
          <div key={idx} className="flex items-start gap-2 my-0.5 ml-1 leading-relaxed text-slate-300">
            <span className="text-blue-400 mt-1 text-[8px]">•</span>
            <span>{formatInlineMarkdown(itemContent)}</span>
          </div>
        );
      }

      // Empty line
      if (trimmed === '') {
        return <div key={idx} className="h-1.5" />;
      }

      // Regular paragraph
      return (
        <p key={idx} className="my-1 leading-relaxed text-slate-300">
          {formatInlineMarkdown(line)}
        </p>
      );
    });
  };

  // Helper for bold, code tags, and metrics
  const formatInlineMarkdown = (content: string) => {
    const parts = content.split(/(\*\*.*?\*\*|`.*?`)/g);

    return parts.map((part, pIdx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={pIdx} className="font-semibold text-white">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        const codeText = part.slice(1, -1);
        const isBullish = codeText.includes('BUY') || codeText.includes('BULLISH');
        const isBearish = codeText.includes('SELL') || codeText.includes('BEARISH');
        const badgeColor = isBullish
          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
          : isBearish
          ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
          : 'bg-blue-500/10 text-blue-400 border-blue-500/30';

        return (
          <span
            key={pIdx}
            className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${badgeColor} inline-block mx-0.5`}
          >
            {codeText}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col space-y-3">
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-max-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-white tracking-wide">MAXLITH AI Copilot</h1>
              <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-max-brand-primary text-[9px] font-mono border border-blue-500/20">
                MULTI-AGENT V1
              </span>
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[9px] font-mono border border-emerald-500/20 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                LIVE DATA
              </span>
            </div>
            <p className="text-[11px] text-max-text-secondary">
              Natural Language Stock Intelligence • Verified Indian Market Feeds (NSE/BSE)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleClearChat}
            title="Clear Chat History"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-max-surface hover:bg-red-950/20 text-max-text-muted hover:text-red-400 border border-max-border hover:border-red-500/30 text-[11px] font-mono transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear Chat</span>
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.sender === 'USER' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.sender === 'ASSISTANT' && (
              <div className="w-7 h-7 rounded bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-blue-400 font-bold text-xs flex-shrink-0 mt-1">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
            )}

            <div
              className={`max-w-3xl rounded-lg text-xs leading-relaxed transition-all ${
                msg.sender === 'USER'
                  ? 'bg-blue-600 text-white font-medium p-3 rounded-tr-none'
                  : 'fintech-card text-slate-200 border border-max-border p-4'
              }`}
            >
              {/* If Quote Snapshot is available, display Verified Stock Quote Card */}
              {msg.quoteSnapshot && (
                <div className="mb-3 p-3 rounded bg-[#090d16] border border-max-border font-sans">
                  <div className="flex items-start justify-between gap-2 border-b border-max-border/60 pb-2.5 mb-2.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white font-mono tracking-wide">
                          {msg.quoteSnapshot.symbol}
                        </span>
                        <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 text-[9px] font-mono border border-slate-700">
                          {msg.quoteSnapshot.exchange}
                        </span>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[9px] font-mono border ${
                            msg.quoteSnapshot.freshnessStatus === 'LIVE'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : msg.quoteSnapshot.freshnessStatus === 'DELAYED'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                              : 'bg-slate-700/30 text-slate-400 border-slate-600/30'
                          }`}
                        >
                          {msg.quoteSnapshot.freshnessStatus}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 truncate max-w-sm">
                        {msg.quoteSnapshot.name}
                      </p>
                    </div>

                    <div className="text-right">
                      <div className="text-base font-bold text-white font-mono flex items-center justify-end gap-1">
                        <span>₹{msg.quoteSnapshot.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        {msg.quoteSnapshot.change >= 0 ? (
                          <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
                        )}
                      </div>
                      <div
                        className={`text-[11px] font-mono font-medium ${
                          msg.quoteSnapshot.change >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {msg.quoteSnapshot.change >= 0 ? '+' : ''}
                        ₹{msg.quoteSnapshot.change.toFixed(2)} (
                        {msg.quoteSnapshot.percentChange >= 0 ? '+' : ''}
                        {msg.quoteSnapshot.percentChange.toFixed(2)}%)
                      </div>
                    </div>
                  </div>

                  {/* Quote Metrics Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[10px] font-mono">
                    <div className="p-1.5 rounded bg-slate-900/50 border border-slate-800/80">
                      <span className="text-slate-500 block text-[9px]">OPEN</span>
                      <span className="text-slate-200 font-semibold">₹{msg.quoteSnapshot.open.toFixed(2)}</span>
                    </div>
                    <div className="p-1.5 rounded bg-slate-900/50 border border-slate-800/80">
                      <span className="text-slate-500 block text-[9px]">HIGH</span>
                      <span className="text-slate-200 font-semibold">₹{msg.quoteSnapshot.high.toFixed(2)}</span>
                    </div>
                    <div className="p-1.5 rounded bg-slate-900/50 border border-slate-800/80">
                      <span className="text-slate-500 block text-[9px]">LOW</span>
                      <span className="text-slate-200 font-semibold">₹{msg.quoteSnapshot.low.toFixed(2)}</span>
                    </div>
                    <div className="p-1.5 rounded bg-slate-900/50 border border-slate-800/80">
                      <span className="text-slate-500 block text-[9px]">PREV CLOSE</span>
                      <span className="text-slate-200 font-semibold">₹{msg.quoteSnapshot.previousClose.toFixed(2)}</span>
                    </div>
                    <div className="p-1.5 rounded bg-slate-900/50 border border-slate-800/80">
                      <span className="text-slate-500 block text-[9px]">VOLUME</span>
                      <span className="text-slate-200 font-semibold">
                        {msg.quoteSnapshot.volume.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[9px] font-mono text-slate-500 pt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      Feed Source: {msg.quoteSnapshot.provider} (
                      {new Date(msg.quoteSnapshot.providerTimestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                      )
                    </span>
                    <span>Session: {msg.quoteSnapshot.sessionStatus}</span>
                  </div>
                </div>
              )}

              {/* Message Text with Structured Markdown */}
              <div className="font-sans whitespace-pre-wrap">{renderFormattedMarkdown(msg.text)}</div>

              {/* Expandable Multi-Agent Evidence Section */}
              {msg.agentReports && (
                <div className="mt-4 pt-3 border-t border-max-border/80">
                  <button
                    onClick={() => toggleReportExpansion(msg.id)}
                    className="w-full flex items-center justify-between text-[11px] font-mono text-max-brand-primary hover:text-blue-300 py-1 transition-colors"
                  >
                    <span className="flex items-center gap-1.5 font-bold uppercase tracking-wide">
                      <Layers className="w-3.5 h-3.5" />
                      Orchestrated Agent Citations &amp; Evidence
                    </span>
                    {expandedReports[msg.id] ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>

                  {expandedReports[msg.id] && (
                    <div className="mt-3 space-y-2.5 font-mono text-[10px]">
                      {/* Tech Agent Report */}
                      {msg.agentReports.tech && (
                        <div className="p-2.5 rounded bg-[#090d16] border border-max-border">
                          <div className="flex items-center justify-between mb-1 text-slate-300">
                            <span className="font-bold flex items-center gap-1.5 text-blue-400">
                              <Activity className="w-3.5 h-3.5" /> TECHNICAL AGENT
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                              Signal: {msg.agentReports.tech.signal}
                            </span>
                          </div>
                          <p className="text-slate-400 leading-relaxed">{msg.agentReports.tech.rationale}</p>
                          <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[9px] text-slate-400 pt-1.5 border-t border-slate-800">
                            <div>RSI (14): <span className="text-white font-semibold">{msg.agentReports.tech.metrics.rsi14}</span></div>
                            <div>20 SMA: <span className="text-white font-semibold">₹{msg.agentReports.tech.metrics.sma20}</span></div>
                            <div>Support: <span className="text-white font-semibold">₹{msg.agentReports.tech.keyLevels.support}</span></div>
                            <div>Resistance: <span className="text-white font-semibold">₹{msg.agentReports.tech.keyLevels.resistance}</span></div>
                          </div>
                        </div>
                      )}

                      {/* Fundamentals Agent Report */}
                      {msg.agentReports.fundamental && (
                        <div className="p-2.5 rounded bg-[#090d16] border border-max-border">
                          <div className="flex items-center justify-between mb-1 text-slate-300">
                            <span className="font-bold flex items-center gap-1.5 text-emerald-400">
                              <BarChart2 className="w-3.5 h-3.5" /> FUNDAMENTAL AGENT
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              {msg.agentReports.fundamental.valuationVerdict}
                            </span>
                          </div>
                          <p className="text-slate-400 leading-relaxed">{msg.agentReports.fundamental.analysis}</p>
                          <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[9px] text-slate-400 pt-1.5 border-t border-slate-800">
                            <div>P/E: <span className="text-white font-semibold">{msg.agentReports.fundamental.metrics.peRatio}x</span></div>
                            <div>P/B: <span className="text-white font-semibold">{msg.agentReports.fundamental.metrics.pbRatio}x</span></div>
                            <div>ROE: <span className="text-white font-semibold">{msg.agentReports.fundamental.metrics.roe}%</span></div>
                            <div>D/E: <span className="text-white font-semibold">{msg.agentReports.fundamental.metrics.debtEquity}</span></div>
                          </div>
                        </div>
                      )}

                      {/* News Agent Report */}
                      {msg.agentReports.news && (
                        <div className="p-2.5 rounded bg-[#090d16] border border-max-border">
                          <div className="flex items-center justify-between mb-1 text-slate-300">
                            <span className="font-bold flex items-center gap-1.5 text-purple-400">
                              <FileText className="w-3.5 h-3.5" /> NEWS &amp; SENTIMENT AGENT
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                              {msg.agentReports.news.overallSentiment} ({msg.agentReports.news.sentimentScore}/100)
                            </span>
                          </div>
                          <p className="text-slate-400 leading-relaxed">{msg.agentReports.news.impactAssessment}</p>
                          {msg.agentReports.news.topHeadlines?.[0] && (
                            <div className="mt-1.5 text-[9px] text-slate-500 italic">
                              Top story: &ldquo;{msg.agentReports.news.topHeadlines[0].title}&rdquo; (
                              {msg.agentReports.news.topHeadlines[0].source})
                            </div>
                          )}
                        </div>
                      )}

                      {/* Risk Agent Report */}
                      {msg.agentReports.risk && (
                        <div className="p-2.5 rounded bg-[#090d16] border border-max-border">
                          <div className="flex items-center justify-between mb-1 text-slate-300">
                            <span className="font-bold flex items-center gap-1.5 text-amber-400">
                              <Shield className="w-3.5 h-3.5" /> RISK TELEMETRY AGENT
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              Score: {msg.agentReports.risk.riskScore}/100 ({msg.agentReports.risk.riskCategory})
                            </span>
                          </div>
                          <ul className="text-slate-400 list-disc list-inside space-y-0.5">
                            {msg.agentReports.risk.warnings.map((w: string, i: number) => (
                              <li key={i}>{w}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Message Footer: Copy response & Timestamp */}
              {msg.sender === 'ASSISTANT' && (
                <div className="mt-3 pt-2 border-t border-max-border/60 flex items-center justify-between text-[10px] text-max-text-muted font-mono">
                  <button
                    onClick={() => handleCopy(msg.id, msg.text)}
                    className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors"
                  >
                    {copiedId === msg.id ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy Analysis</span>
                      </>
                    )}
                  </button>

                  <span className="text-[9px]">{msg.timestamp}</span>
                </div>
              )}

              {msg.sender === 'USER' && (
                <div className="mt-1 text-[9px] text-blue-200 text-right">{msg.timestamp}</div>
              )}
            </div>

            {msg.sender === 'USER' && (
              <div className="w-7 h-7 rounded bg-max-surface border border-max-border flex items-center justify-center text-max-text-primary font-bold text-xs flex-shrink-0 mt-1">
                U
              </div>
            )}
          </div>
        ))}

        {/* Loading Indicator */}
        {loading && (
          <div className="flex gap-3 justify-start items-start">
            <div className="w-7 h-7 rounded bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-blue-400 font-bold text-xs flex-shrink-0 mt-1 animate-pulse">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div className="fintech-card p-3.5 text-xs font-mono text-max-text-secondary flex items-center gap-2.5 border border-max-border rounded-lg">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-max-brand-primary" />
              <span>{loadingStage}</span>
            </div>
          </div>
        )}

        {/* Error Banner */}
        {errorMessage && (
          <div className="p-3 rounded bg-rose-950/20 border border-rose-500/30 text-rose-400 text-xs font-mono flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => handleSendMessage()}
              className="px-2 py-1 rounded bg-rose-900/40 hover:bg-rose-900/60 border border-rose-500/40 text-[11px] text-white"
            >
              Retry
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompts Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar">
        <span className="text-[10px] font-mono uppercase text-max-text-muted flex-shrink-0 mr-1 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-blue-400" />
          Suggested:
        </span>
        {samplePrompts.map((p) => (
          <button
            key={p}
            onClick={() => handleSendMessage(p)}
            disabled={loading}
            className="px-2.5 py-1 rounded bg-max-surface hover:bg-slate-800 border border-max-border text-[11px] text-max-text-secondary hover:text-white font-mono flex-shrink-0 transition-colors disabled:opacity-50"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Composer Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="relative"
      >
        <div className="relative rounded-lg bg-max-surface border border-max-border focus-within:border-blue-500 transition-colors shadow-sm">
          <textarea
            ref={textareaRef}
            rows={2}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask MAXLITH AI about any NSE/BSE stock (e.g. 'Analyze RELIANCE technical structure')... Press Enter to send, Shift+Enter for newline."
            className="w-full bg-transparent text-xs text-white placeholder-slate-500 pl-4 pr-14 py-2.5 outline-none resize-none"
          />

          <button
            type="submit"
            disabled={!prompt.trim() || loading}
            title="Send Message"
            className="absolute right-2.5 bottom-2.5 p-2 rounded bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-30 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center justify-between text-[9px] font-mono text-max-text-muted mt-1 px-1">
          <span>MAXLITH AI Copilot • Verified Market Data • Paper Trading Educational Analysis</span>
          <span className="hidden sm:inline">Press Enter ↵ to Send</span>
        </div>
      </form>
    </div>
  );
}
