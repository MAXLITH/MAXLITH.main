import React from 'react';
import { Activity, ShieldCheck, Cpu, Terminal, ArrowUpRight } from 'lucide-react';

export default function TradingTerminalVisual() {
  return (
    <aside
      aria-label="MAXLITH Trading Intelligence Overview"
      className="relative hidden lg:flex flex-col justify-between w-full h-full min-h-[100dvh] bg-[#080B10] border-r border-[#1C2533] p-8 xl:p-12 overflow-hidden select-none"
    >
      {/* Background Architectural Grid Lines */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.035]"
        style={{
          backgroundImage: `
            linear-gradient(to right, #35D49A 1px, transparent 1px),
            linear-gradient(to bottom, #35D49A 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Subtle Atmospheric Radial Gradients */}
      <div 
        className="absolute -top-32 -left-32 w-96 h-96 rounded-full pointer-events-none opacity-20 blur-3xl"
        style={{
          background: 'radial-gradient(circle, #35D49A 0%, rgba(53, 212, 154, 0.05) 60%, transparent 80%)'
        }}
      />
      <div 
        className="absolute bottom-10 right-10 w-80 h-80 rounded-full pointer-events-none opacity-10 blur-3xl"
        style={{
          background: 'radial-gradient(circle, #38BDF8 0%, transparent 70%)'
        }}
      />

      {/* Top Header & Branding */}
      <div className="relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Geometric Machined Brand Emblem */}
            <div className="relative flex items-center justify-center w-10 h-10 rounded-lg bg-[#111720] border border-[#1C2533] shadow-[0_0_15px_rgba(53,212,154,0.15)] ring-1 ring-[#35D49A]/20">
              <span className="font-mono font-black text-lg text-[#35D49A] tracking-tighter">M</span>
              <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-[#35D49A] rounded-full shadow-[0_0_6px_#35D49A]" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-[#F4F7FA]">MAXLITH</span>
                <span className="text-xs font-mono font-medium text-[#35D49A] px-1.5 py-0.5 rounded bg-[#35D49A]/10 border border-[#35D49A]/30">
                  AI v1.0
                </span>
              </div>
              <p className="text-[11px] font-mono tracking-wider uppercase text-[#94A3B8]">
                Institutional Quant Terminal • NSE / BSE
              </p>
            </div>
          </div>

          {/* Colo Status Badge */}
          <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#111720] border border-[#1C2533] text-[11px] font-mono text-[#94A3B8]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#35D49A] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#35D49A]"></span>
            </span>
            <span>MUMBAI BKC • 0.8ms</span>
          </div>
        </div>

        {/* Trading Intelligence Headline */}
        <div className="mt-10 xl:mt-12 max-w-xl">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-[#111720] border border-[#1C2533] text-[11px] font-mono text-[#35D49A] mb-3">
            <Terminal className="w-3.5 h-3.5" />
            <span>ALGORITHMIC REASONING ENGINE</span>
          </div>
          <h2 className="text-2xl xl:text-3xl font-semibold tracking-tight text-[#F4F7FA] leading-snug">
            Precision Trading Intelligence &amp; Autonomous Execution for Indian Markets
          </h2>
          <p className="mt-3 text-sm text-[#94A3B8] leading-relaxed">
            Multi-agent market microstructure analysis, sub-millisecond tick telemetry, and zero-slippage simulated execution across NIFTY, BANKNIFTY, and equities.
          </p>
        </div>
      </div>

      {/* Centerpiece: Machined Terminal Candlestick Chart */}
      <div className="relative z-10 my-6 xl:my-8">
        <div className="rounded-xl bg-[#111720]/90 backdrop-blur-md border border-[#1C2533] p-5 shadow-2xl shadow-black/80">
          {/* Card Header with Ticker Bar */}
          <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-[#1C2533]">
            <div className="flex items-center gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold font-mono text-[#F4F7FA]">NIFTY 50</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-[#94A3B8] border border-white/5">
                    INDEX_NSE
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-lg font-bold font-mono text-[#F4F7FA]">24,842.15</span>
                  <span className="inline-flex items-center text-xs font-mono font-medium text-[#35D49A]">
                    <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
                    +168.40 (+0.68%)
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 text-[11px] font-mono text-[#94A3B8]">
              <div className="hidden sm:block text-right">
                <div className="text-[10px] text-[#64748B]">SESSION VWAP</div>
                <div className="text-[#F4F7FA] font-medium">₹24,812.30</div>
              </div>
              <div className="hidden sm:block text-right pl-3 border-l border-[#1C2533]">
                <div className="text-[10px] text-[#64748B]">CONFIDENCE</div>
                <div className="text-[#35D49A] font-medium">94.2% BULL</div>
              </div>
            </div>
          </div>

          {/* SVG Vector Candlestick Chart */}
          <div className="relative w-full h-44 xl:h-52">
            <svg
              className="w-full h-full overflow-visible"
              viewBox="0 0 600 200"
              preserveAspectRatio="none"
              aria-label="Decorative NIFTY 50 Candlestick Chart"
            >
              <defs>
                <linearGradient id="volGradBull" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#35D49A" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#35D49A" stopOpacity="0.05" />
                </linearGradient>
                <linearGradient id="volGradBear" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F05252" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#F05252" stopOpacity="0.05" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1="0" y1="40" x2="600" y2="40" stroke="#1C2533" strokeDasharray="3 3" strokeWidth="1" />
              <line x1="0" y1="90" x2="600" y2="90" stroke="#1C2533" strokeDasharray="3 3" strokeWidth="1" />
              <line x1="0" y1="140" x2="600" y2="140" stroke="#1C2533" strokeDasharray="3 3" strokeWidth="1" />

              {/* Price labels right-aligned */}
              <text x="595" y="36" fill="#64748B" fontSize="9" fontFamily="monospace" textAnchor="end">24,880</text>
              <text x="595" y="86" fill="#64748B" fontSize="9" fontFamily="monospace" textAnchor="end">24,840</text>
              <text x="595" y="136" fill="#64748B" fontSize="9" fontFamily="monospace" textAnchor="end">24,800</text>

              {/* Volume Bars at Bottom (y from 160 to 200) */}
              {/* x, width, height, fill */}
              <rect x="18" y="178" width="10" height="22" fill="url(#volGradBull)" rx="1" />
              <rect x="42" y="184" width="10" height="16" fill="url(#volGradBear)" rx="1" />
              <rect x="66" y="172" width="10" height="28" fill="url(#volGradBull)" rx="1" />
              <rect x="90" y="180" width="10" height="20" fill="url(#volGradBull)" rx="1" />
              <rect x="114" y="186" width="10" height="14" fill="url(#volGradBear)" rx="1" />
              <rect x="138" y="168" width="10" height="32" fill="url(#volGradBull)" rx="1" />
              <rect x="162" y="175" width="10" height="25" fill="url(#volGradBull)" rx="1" />
              <rect x="186" y="182" width="10" height="18" fill="url(#volGradBear)" rx="1" />
              <rect x="210" y="165" width="10" height="35" fill="url(#volGradBull)" rx="1" />
              <rect x="234" y="170" width="10" height="30" fill="url(#volGradBull)" rx="1" />
              <rect x="258" y="179" width="10" height="21" fill="url(#volGradBear)" rx="1" />
              <rect x="282" y="160" width="10" height="40" fill="url(#volGradBull)" rx="1" />
              <rect x="306" y="174" width="10" height="26" fill="url(#volGradBear)" rx="1" />
              <rect x="330" y="166" width="10" height="34" fill="url(#volGradBull)" rx="1" />
              <rect x="354" y="162" width="10" height="38" fill="url(#volGradBull)" rx="1" />
              <rect x="378" y="176" width="10" height="24" fill="url(#volGradBear)" rx="1" />
              <rect x="402" y="158" width="10" height="42" fill="url(#volGradBull)" rx="1" />
              <rect x="426" y="152" width="10" height="48" fill="url(#volGradBull)" rx="1" />
              <rect x="450" y="164" width="10" height="36" fill="url(#volGradBear)" rx="1" />
              <rect x="474" y="155" width="10" height="45" fill="url(#volGradBull)" rx="1" />
              <rect x="498" y="148" width="10" height="52" fill="url(#volGradBull)" rx="1" />
              <rect x="522" y="160" width="10" height="40" fill="url(#volGradBear)" rx="1" />
              <rect x="546" y="145" width="10" height="55" fill="url(#volGradBull)" rx="1" />

              {/* Candles: Candlestick bodies and wicks */}
              {/* Candle 1 (Bull) */}
              <line x1="23" y1="115" x2="23" y2="148" stroke="#35D49A" strokeWidth="1.2" />
              <rect x="18" y="122" width="10" height="18" fill="#35D49A" rx="1" />

              {/* Candle 2 (Bear) */}
              <line x1="47" y1="120" x2="47" y2="152" stroke="#F05252" strokeWidth="1.2" />
              <rect x="42" y="124" width="10" height="16" fill="#F05252" rx="1" />

              {/* Candle 3 (Bull) */}
              <line x1="71" y1="105" x2="71" y2="142" stroke="#35D49A" strokeWidth="1.2" />
              <rect x="66" y="112" width="10" height="20" fill="#35D49A" rx="1" />

              {/* Candle 4 (Bull) */}
              <line x1="95" y1="100" x2="95" y2="135" stroke="#35D49A" strokeWidth="1.2" />
              <rect x="90" y="106" width="10" height="18" fill="#35D49A" rx="1" />

              {/* Candle 5 (Bear pull-back) */}
              <line x1="119" y1="104" x2="119" y2="138" stroke="#F05252" strokeWidth="1.2" />
              <rect x="114" y="110" width="10" height="15" fill="#F05252" rx="1" />

              {/* Candle 6 (Bull breakout candle) */}
              <line x1="143" y1="88" x2="143" y2="128" stroke="#35D49A" strokeWidth="1.2" />
              <rect x="138" y="94" width="10" height="24" fill="#35D49A" rx="1" />

              {/* Candle 7 (Bull continuation) */}
              <line x1="167" y1="82" x2="167" y2="118" stroke="#35D49A" strokeWidth="1.2" />
              <rect x="162" y="86" width="10" height="18" fill="#35D49A" rx="1" />

              {/* Candle 8 (Bear consolidation) */}
              <line x1="191" y1="84" x2="191" y2="112" stroke="#F05252" strokeWidth="1.2" />
              <rect x="186" y="88" width="10" height="12" fill="#F05252" rx="1" />

              {/* Candle 9 (Bull hammer) */}
              <line x1="215" y1="78" x2="215" y2="115" stroke="#35D49A" strokeWidth="1.2" />
              <rect x="210" y="80" width="10" height="16" fill="#35D49A" rx="1" />

              {/* Candle 10 (Bull momentum) */}
              <line x1="239" y1="68" x2="239" y2="102" stroke="#35D49A" strokeWidth="1.2" />
              <rect x="234" y="72" width="10" height="20" fill="#35D49A" rx="1" />

              {/* Candle 11 (Bear rest) */}
              <line x1="263" y1="70" x2="263" y2="98" stroke="#F05252" strokeWidth="1.2" />
              <rect x="258" y="74" width="10" height="11" fill="#F05252" rx="1" />

              {/* Candle 12 (Strong Bull surge) */}
              <line x1="287" y1="52" x2="287" y2="92" stroke="#35D49A" strokeWidth="1.2" />
              <rect x="282" y="58" width="10" height="25" fill="#35D49A" rx="1" />

              {/* Candle 13 (Bear doji) */}
              <line x1="311" y1="54" x2="311" y2="82" stroke="#F05252" strokeWidth="1.2" />
              <rect x="306" y="62" width="10" height="8" fill="#F05252" rx="1" />

              {/* Candle 14 (Bull) */}
              <line x1="335" y1="48" x2="335" y2="78" stroke="#35D49A" strokeWidth="1.2" />
              <rect x="330" y="54" width="10" height="16" fill="#35D49A" rx="1" />

              {/* Candle 15 (Bull) */}
              <line x1="359" y1="42" x2="359" y2="74" stroke="#35D49A" strokeWidth="1.2" />
              <rect x="354" y="46" width="10" height="18" fill="#35D49A" rx="1" />

              {/* Candle 16 (Bear pull) */}
              <line x1="383" y1="48" x2="383" y2="76" stroke="#F05252" strokeWidth="1.2" />
              <rect x="378" y="52" width="10" height="14" fill="#F05252" rx="1" />

              {/* Candle 17 (Bull) */}
              <line x1="407" y1="36" x2="407" y2="68" stroke="#35D49A" strokeWidth="1.2" />
              <rect x="402" y="40" width="10" height="20" fill="#35D49A" rx="1" />

              {/* Candle 18 (Bull expansion) */}
              <line x1="431" y1="28" x2="431" y2="62" stroke="#35D49A" strokeWidth="1.2" />
              <rect x="426" y="32" width="10" height="22" fill="#35D49A" rx="1" />

              {/* Candle 19 (Bear) */}
              <line x1="455" y1="32" x2="455" y2="58" stroke="#F05252" strokeWidth="1.2" />
              <rect x="450" y="35" width="10" height="12" fill="#F05252" rx="1" />

              {/* Candle 20 (Bull) */}
              <line x1="479" y1="24" x2="479" y2="52" stroke="#35D49A" strokeWidth="1.2" />
              <rect x="474" y="28" width="10" height="16" fill="#35D49A" rx="1" />

              {/* Candle 21 (Bull continuation) */}
              <line x1="503" y1="18" x2="503" y2="44" stroke="#35D49A" strokeWidth="1.2" />
              <rect x="498" y="22" width="10" height="15" fill="#35D49A" rx="1" />

              {/* Candle 22 (Bear consolidation) */}
              <line x1="527" y1="20" x2="527" y2="46" stroke="#F05252" strokeWidth="1.2" />
              <rect x="522" y="24" width="10" height="10" fill="#F05252" rx="1" />

              {/* Candle 23 (Current Bull pin bar) */}
              <line x1="551" y1="14" x2="551" y2="40" stroke="#35D49A" strokeWidth="1.2" />
              <rect x="546" y="16" width="10" height="14" fill="#35D49A" rx="1" />

              {/* EMA 20 Overlay (Amber #F2B84B) */}
              <path
                d="M 23 135 C 71 125, 143 105, 215 90 C 287 75, 359 55, 431 40 C 479 32, 527 25, 551 22"
                fill="none"
                stroke="#F2B84B"
                strokeWidth="1.5"
                strokeLinecap="round"
                opacity="0.85"
              />

              {/* EMA 50 Overlay (Cyan #38BDF8) */}
              <path
                d="M 23 145 C 95 140, 191 120, 287 105 C 383 85, 479 65, 551 45"
                fill="none"
                stroke="#38BDF8"
                strokeWidth="1.5"
                strokeLinecap="round"
                opacity="0.75"
              />

              {/* Resistance marker */}
              <line x1="280" y1="14" x2="560" y2="14" stroke="#35D49A" strokeWidth="1" strokeDasharray="2 2" opacity="0.4" />
              <circle cx="551" cy="23" r="3" fill="#35D49A" className="animate-pulse" />
            </svg>
          </div>

          {/* Timeframe & Legend Strip */}
          <div className="flex items-center justify-between pt-3 mt-3 border-t border-[#1C2533] text-[10px] font-mono text-[#64748B]">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="w-2 h-0.5 bg-[#F2B84B] rounded-full" />
                <span>EMA 20</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-0.5 bg-[#38BDF8] rounded-full" />
                <span>EMA 50</span>
              </span>
              <span className="flex items-center gap-1 text-[#35D49A]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#35D49A]" />
                <span>BULL MOMENTUM</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span>09:15</span>
              <span>11:30</span>
              <span>13:45</span>
              <span className="text-[#94A3B8]">15:30 IST</span>
            </div>
          </div>
        </div>
      </div>

      {/* Institutional Telemetry Modules */}
      <div className="relative z-10 grid grid-cols-3 gap-3">
        <div className="rounded-lg bg-[#111720]/70 border border-[#1C2533] p-3">
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#94A3B8]">
            <Activity className="w-3.5 h-3.5 text-[#35D49A]" />
            <span className="truncate">TICK TELEMETRY</span>
          </div>
          <p className="mt-1 font-mono text-xs font-semibold text-[#F4F7FA]">NSE Co-Location</p>
          <p className="text-[10px] font-mono text-[#35D49A]">0.8ms • Zero Drops</p>
        </div>

        <div className="rounded-lg bg-[#111720]/70 border border-[#1C2533] p-3">
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#94A3B8]">
            <Cpu className="w-3.5 h-3.5 text-[#38BDF8]" />
            <span className="truncate">AI CO-PILOT</span>
          </div>
          <p className="mt-1 font-mono text-xs font-semibold text-[#F4F7FA]">Quant Multi-Agent</p>
          <p className="text-[10px] font-mono text-[#38BDF8]">Autonomous Consensus</p>
        </div>

        <div className="rounded-lg bg-[#111720]/70 border border-[#1C2533] p-3">
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#94A3B8]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#35D49A]" />
            <span className="truncate">RISK DESK</span>
          </div>
          <p className="mt-1 font-mono text-xs font-semibold text-[#F4F7FA]">SEBI Compliant</p>
          <p className="text-[10px] font-mono text-[#94A3B8]">Paper Engine V1</p>
        </div>
      </div>

      {/* Bottom Legal / Protocol Bar */}
      <div className="relative z-10 pt-6 mt-4 border-t border-[#1C2533]/80 flex items-center justify-between text-[11px] font-mono text-[#64748B]">
        <span>© 2026 MAXLITH QUANT SYSTEMS</span>
        <span>NSE &amp; BSE EQUITIES • DERIVATIVES</span>
      </div>
    </aside>
  );
}
