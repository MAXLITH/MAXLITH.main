'use client';

import { useEffect, useState } from 'react';
import type { MarketDepth as MarketDepthData } from '@/lib/tradingview/datafeed';

export default function MarketDepth({ symbol }: { symbol: string }) {
  const [depth, setDepth] = useState<MarketDepthData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetch(`/api/market/depth?symbol=${encodeURIComponent(symbol)}`, { signal: controller.signal, cache: 'no-store' })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Depth unavailable');
        setDepth(data);
      })
      .catch(() => { if (!controller.signal.aborted) setDepth(null); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [symbol]);

  if (loading && !depth) return <p className="px-3 py-5 text-center text-[10px] text-slate-500">Loading provider depth…</p>;
  if (!depth?.available) return <p className="px-3 py-5 text-center text-[10px] text-slate-500">{depth?.message || 'Market depth unavailable for this data source.'}</p>;
  return <div className="grid grid-cols-2 gap-4 p-3 text-[10px]">
    <div><h3 className="mb-2 text-[9px] font-semibold uppercase tracking-wide text-emerald-400">Bid · qty</h3>{depth.bids.map((level, index) => <div key={`${level.price}-${index}`} className="flex justify-between border-b border-slate-800/60 py-1 text-slate-300"><span>₹{level.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span><span>{level.quantity.toLocaleString('en-IN')}</span></div>)}</div>
    <div><h3 className="mb-2 text-[9px] font-semibold uppercase tracking-wide text-rose-400">Ask · qty</h3>{depth.asks.map((level, index) => <div key={`${level.price}-${index}`} className="flex justify-between border-b border-slate-800/60 py-1 text-slate-300"><span>₹{level.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span><span>{level.quantity.toLocaleString('en-IN')}</span></div>)}</div>
  </div>;
}
