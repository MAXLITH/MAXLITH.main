'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Clock, Wallet, ShieldCheck, RefreshCw } from 'lucide-react';

export default function Header({ user }: { user: any }) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [sessionStatus, setSessionStatus] = useState<any>(null);
  const [virtualCash, setVirtualCash] = useState<number>(user?.virtualCash || 1000000);

  useEffect(() => {
    fetch('/api/markets')
      .then((res) => res.json())
      .then((data) => {
        if (data.sessionStatus) {
          setSessionStatus(data.sessionStatus);
        }
      })
      .catch((err) => console.error(err));

    fetch('/api/paper-trading/portfolio')
      .then((res) => res.json())
      .then((data) => {
        if (data.summary) {
          setVirtualCash(data.summary.virtualCash);
        }
      })
      .catch((err) => console.error(err));
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/markets?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="h-16 bg-[#0d121c] border-b border-slate-800/80 px-6 flex items-center justify-between sticky top-0 z-40">
      {/* Quick Instrument Search Bar */}
      <form onSubmit={handleSearchSubmit} className="relative w-80">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search NSE/BSE stocks (e.g. RELIANCE, TCS)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-[#121824] border border-slate-800 focus:border-blue-500 text-xs text-white placeholder-slate-500 rounded-lg pl-9 pr-4 py-2 outline-none transition-colors"
        />
      </form>

      {/* Right Telemetry & Virtual Cash */}
      <div className="flex items-center gap-4">
        {/* Central Market Session Status Indicator */}
        {sessionStatus && (
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
            <span className={`w-2 h-2 rounded-full ${sessionStatus.isOpen ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
            <span className="font-semibold text-slate-200">
              NSE/BSE: {sessionStatus.session}
            </span>
            <span className="text-slate-500 font-mono text-[10px]">
              ({sessionStatus.currentTimeIST})
            </span>
          </div>
        )}

        {/* Virtual Capital Chip */}
        <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-lg bg-blue-950/40 border border-blue-500/30 text-xs">
          <Wallet className="w-4 h-4 text-blue-400" />
          <div className="flex flex-col">
            <span className="text-[9px] uppercase tracking-wider text-blue-400 font-mono">Virtual Cash</span>
            <span className="font-mono font-bold text-white text-xs">
              ₹{virtualCash.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Environment Badge */}
        <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 text-slate-300 text-[10px] font-mono border border-slate-700">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
          <span>PAPER V1</span>
        </div>
      </div>
    </header>
  );
}
