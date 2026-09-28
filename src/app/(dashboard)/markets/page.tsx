'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, Filter, TrendingUp, TrendingDown, Layers, Bot, ChevronRight } from 'lucide-react';

export default function MarketsPage() {
  const [instruments, setInstruments] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedSector, setSelectedSector] = useState('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/markets')
      .then((res) => res.json())
      .then((data) => {
        if (data.instruments) {
          setInstruments(data.instruments);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const sectors = ['ALL', ...Array.from(new Set(instruments.map((i) => i.sector).filter(Boolean)))];

  const filtered = instruments.filter((inst) => {
    const matchesQuery =
      inst.symbol.toLowerCase().includes(search.toLowerCase()) ||
      inst.name.toLowerCase().includes(search.toLowerCase());
    const matchesSector = selectedSector === 'ALL' || inst.sector === selectedSector;
    return matchesQuery && matchesSector;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-400" />
            <span>Indian Stock Explorer</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time quotes, technical metrics, and sector classification for NSE/BSE equities.
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 fintech-card p-4">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search symbol or company name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#0d121c] border border-slate-800 focus:border-blue-500 text-xs text-white placeholder-slate-500 rounded-lg pl-9 pr-4 py-2 outline-none transition-colors"
          />
        </div>

        {/* Sector Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {sectors.map((sec) => (
            <button
              key={sec}
              onClick={() => setSelectedSector(sec)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all flex-shrink-0 ${
                selectedSector === sec
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'bg-[#0d121c] text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {sec}
            </button>
          ))}
        </div>
      </div>

      {/* Instruments Table */}
      <div className="fintech-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500 text-xs font-mono">Loading market securities...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs font-mono">
            No instruments matched your search criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0d121c] text-slate-400 font-mono text-[10px] uppercase border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Instrument</th>
                  <th className="py-3 px-4">Sector</th>
                  <th className="py-3 px-4 text-right">Price</th>
                  <th className="py-3 px-4 text-right">Change (%)</th>
                  <th className="py-3 px-4 text-right">Volume</th>
                  <th className="py-3 px-4 text-right">P/E Ratio</th>
                  <th className="py-3 px-4 text-right">52W Range</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {filtered.map((inst) => (
                  <tr key={inst.symbol} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <Link href={`/markets/${inst.symbol}`} className="font-bold text-white hover:text-blue-400 transition-colors">
                          {inst.symbol}
                        </Link>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">{inst.exchange}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 truncate max-w-[180px] font-sans">{inst.name}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 font-sans text-[11px]">{inst.sector}</td>
                    <td className="py-3.5 px-4 text-right font-bold text-white">₹{inst.current_price.toFixed(2)}</td>
                    <td className={`py-3.5 px-4 text-right font-bold ${inst.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {inst.change >= 0 ? '+' : ''}{inst.percent_change.toFixed(2)}%
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-400">{(inst.volume / 100000).toFixed(2)}L</td>
                    <td className="py-3.5 px-4 text-right text-slate-400">{inst.pe_ratio || 'N/A'}</td>
                    <td className="py-3.5 px-4 text-right text-slate-400 text-[11px]">
                      ₹{inst.low_52w} - ₹{inst.high_52w}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/markets/${inst.symbol}`}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] flex items-center gap-1 border border-slate-700"
                        >
                          <span>Analysis</span>
                          <ChevronRight className="w-3 h-3" />
                        </Link>
                        <Link
                          href={`/paper-trading?symbol=${inst.symbol}`}
                          className="px-2.5 py-1 rounded bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white transition-all text-[11px]"
                        >
                          Trade
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
