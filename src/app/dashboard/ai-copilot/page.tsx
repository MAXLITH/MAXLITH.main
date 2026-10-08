'use client';

import { useState } from 'react';
import { Bot, Send, Sparkles, Cpu, ShieldAlert, CheckCircle2, User, RefreshCw } from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'USER' | 'ASSISTANT';
  text: string;
  agentReports?: any[];
  disclaimer?: string;
  timestamp: string;
}

export default function AICopilotPage() {
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-msg',
      sender: 'ASSISTANT',
      text: 'Greetings! I am the MAXLITH AI Copilot. I orchestrate specialized Tech, News, Risk, Fundamental, and Info Agents to analyze Indian market securities (NSE/BSE). How can I assist your market analysis today?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [loading, setLoading] = useState(false);

  const samplePrompts = [
    'Analyze RELIANCE stock.',
    'Technical setup for TCS and INFY.',
    'Risk assessment for HDFC Bank.',
    'Latest market sentiment for NIFTY 50.'
  ];

  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || prompt;
    if (!query.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'USER',
      text: query.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setPrompt('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: query.trim() })
      });

      const data = await res.json();

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ASSISTANT',
        text: data.response || 'Agent orchestration returned no response.',
        agentReports: data.agentReports,
        disclaimer: data.disclaimer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-max-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white flex items-center gap-2">
              <span>MAXLITH AI Copilot</span>
              <span className="px-2 py-0.5 rounded bg-blue-500/10 text-max-brand-primary text-[9px] font-mono border border-blue-500/20">
                MULTI-AGENT ENGINE
              </span>
            </h1>
            <p className="text-[11px] text-max-text-secondary">Conversational Financial Market Intelligence System</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.sender === 'USER' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.sender === 'ASSISTANT' && (
              <div className="w-7 h-7 rounded bg-blue-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0 mt-1">
                AI
              </div>
            )}

            <div className={`max-w-2xl rounded p-4 text-xs ${
              msg.sender === 'USER'
                ? 'bg-blue-600 text-white font-medium'
                : 'fintech-card text-slate-200 border border-max-border'
            }`}>
              <div className="whitespace-pre-wrap leading-relaxed font-sans">{msg.text}</div>

              {msg.agentReports && msg.agentReports.length > 0 && (
                <div className="mt-4 pt-3 border-t border-max-border/80 space-y-2 font-mono">
                  <span className="text-[10px] uppercase tracking-wider text-max-brand-primary font-bold block">
                    Orchestrated Specialized Agent Evidence
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {msg.agentReports.map((rep) => (
                      <div key={rep.agentName} className="p-2 rounded bg-[#0d121c] border border-max-border text-[10px]">
                        <span className="font-bold text-white block">{rep.agentName} AGENT</span>
                        <span className="text-max-market-positive block">{rep.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {msg.disclaimer && (
                <div className="mt-3 p-2 rounded bg-amber-950/20 border border-amber-500/20 text-[10px] font-mono text-amber-400">
                  {msg.disclaimer}
                </div>
              )}

              <div className="mt-2 text-[9px] font-mono text-max-text-muted text-right">{msg.timestamp}</div>
            </div>

            {msg.sender === 'USER' && (
              <div className="w-7 h-7 rounded bg-max-surface flex items-center justify-center text-max-text-primary font-bold text-xs flex-shrink-0 mt-1">
                U
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="w-7 h-7 rounded bg-blue-600 flex items-center justify-center text-white font-bold text-xs animate-pulse">
              AI
            </div>
            <div className="fintech-card p-4 text-xs font-mono text-max-text-secondary flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-max-brand-primary" />
              <span>Orchestrating Tech, News, Risk, Fundamental &amp; Info agents...</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="text-[10px] font-mono uppercase text-max-text-muted flex-shrink-0">Suggested:</span>
        {samplePrompts.map((p) => (
          <button
            key={p}
            onClick={() => handleSendMessage(p)}
            className="px-3 py-1 rounded bg-max-surface hover:bg-max-surface border border-max-border text-[11px] text-max-text-primary font-mono flex-shrink-0 transition-colors"
          >
            {p}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="relative"
      >
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ask MAXLITH AI (e.g. 'Analyze RELIANCE technical structure')..."
          className="w-full bg-max-surface border border-max-border focus:border-blue-500 text-xs text-white placeholder-slate-500 rounded pl-4 pr-12 py-3 outline-none transition-colors"
        />
        <button
          type="submit"
          disabled={!prompt.trim() || loading}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-40 transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
