'use client';

import { useState, useEffect } from 'react';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Clock, Wallet, ShieldCheck, RefreshCw } from 'lucide-react';
import { Search, Clock, Wallet, ShieldCheck, RefreshCw, TrendingUp } from 'lucide-react';

export default function Header({ user }: { user: any }) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<any>(null);
  const [virtualCash, setVirtualCash] = useState<number>(user?.virtualCash || 1000000);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/markets')
  const fetchStatus = () => {
    fetch('/api/market/status')
      .then((res) => res.json())
      .then((data) => {
        if (data.sessionStatus) {
        if (data.data) {
          setSessionStatus(data.data);
        } else if (data.sessionStatus) {
          setSessionStatus(data.sessionStatus);
        }
      })
      .catch((err) => console.error(err));
  };

  const fetchPortfolio = () => {
    fetch('/api/paper-trading/portfolio')
      .then((res) => res.json())
      .then((data) => {
        if (data.summary) {
          setVirtualCash(data.summary.virtualCash);
        }
      })
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    fetchStatus();
    fetchPortfolio();

    // Periodic refresh for status clock
    const statusInterval = setInterval(fetchStatus, 15000);

    // Listen for custom wallet refresh event
    const handleWalletUpdate = () => fetchPortfolio();
    window.addEventListener('maxlith:wallet_updated', handleWalletUpdate);

    return () => {
      clearInterval(statusInterval);
      window.removeEventListener('maxlith:wallet_updated', handleWalletUpdate);
    };
  }, []);

  // Debounced search autocomplete
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery.trim())}&limit=6`);
        const data = await res.json();
        setSearchResults(data.data || []);
        setShowDropdown(true);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Click outside listener for autocomplete dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/markets?q=${encodeURIComponent(searchQuery.trim())}`);
      setShowDropdown(false);
      router.push(`/dashboard/markets/${encodeURIComponent(searchQuery.trim().toUpperCase())}`);
    }
  };

  const handleSelectSymbol = (sym: string) => {
    setShowDropdown(false);
    setSearchQuery('');
    router.push(`/dashboard/markets/${encodeURIComponent(sym)}`);
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
      {/* Quick Instrument Search Bar with Autocomplete Dropdown */}
      <div className="relative w-80" ref={dropdownRef}>
        <form onSubmit={handleSearchSubmit} className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search NSE/BSE stocks (e.g. RELIANCE, TCS)..."
            value={searchQuery}
            onFocus={() => searchQuery.trim() && setShowDropdown(true)}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#121824] border border-slate-800 focus:border-blue-500 text-xs text-white placeholder-slate-500 rounded-lg pl-9 pr-4 py-2 outline-none transition-colors"
          />
        </form>

        {/* Autocomplete Dropdown Results */}
        {showDropdown && searchResults.length > 0 && (
          <div className="absolute left-0 top-full mt-1.5 w-full bg-[#121824] border border-slate-800 rounded-lg shadow-2xl py-1.5 z-50 overflow-hidden divide-y divide-slate-800/60 font-mono">
            {searchResults.map((item) => (
              <button
                key={item.symbol}
                type="button"
                onClick={() => handleSelectSymbol(item.symbol)}
                className="w-full px-3.5 py-2 flex items-center justify-between text-left hover:bg-slate-800/60 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white">{item.symbol}</span>
                    <span className="text-[10px] text-slate-400 uppercase font-sans">({item.exchange})</span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-sans truncate max-w-[180px]">{item.name}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-white">₹{Number(item.current_price).toFixed(2)}</div>
                  <div
                    className={`text-[10px] ${
                      item.percent_change >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {item.percent_change >= 0 ? '+' : ''}
                    {Number(item.percent_change).toFixed(2)}%
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

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
