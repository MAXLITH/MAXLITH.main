'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Bookmark, Plus, Trash2, ListPlus } from 'lucide-react';

type VerifiedQuote = { last: number; change: number; changePercent: number; volume: number; asOf: string };

export default function WatchlistPage() {
  const [watchlists, setWatchlists] = useState<any[]>([]);
  const [activeWatchlist, setActiveWatchlist] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [newSymbol, setNewSymbol] = useState('');
  const [newListName, setNewListName] = useState('');
  const [showNewListForm, setShowNewListForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [quotes, setQuotes] = useState<Record<string, VerifiedQuote | undefined>>({});
  const [message, setMessage] = useState('');

  const fetchWatchlist = (watchlistId?: string) => {
    const url = watchlistId ? `/api/watchlist?watchlistId=${watchlistId}` : '/api/watchlist';
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (data.watchlists) setWatchlists(data.watchlists);
        if (data.watchlist) setActiveWatchlist(data.watchlist);
        if (data.items) setItems(data.items);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchWatchlist();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all(items.map(async (item) => {
      try {
        const response = await fetch(`/api/market/quote?symbol=${encodeURIComponent(item.symbol)}`, { signal: controller.signal, cache: 'no-store' });
        if (!response.ok) return null;
        const payload = await response.json();
        return [item.symbol, payload.data as VerifiedQuote] as const;
      } catch { return null; }
    })).then((rows) => {
      if (!controller.signal.aborted) setQuotes(Object.fromEntries(rows.filter((row): row is NonNullable<typeof row> => row !== null)));
    });
    return () => controller.abort();
  }, [items]);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSymbol.trim()) return;

    const response = await fetch('/api/watchlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        symbol: newSymbol.trim().toUpperCase(),
        watchlistId: activeWatchlist?.id,
      }),
    });
    const payload = await response.json();
    if (!response.ok) { setMessage(payload.error || 'Could not add that symbol.'); return; }
    setNewSymbol('');
    setMessage('');
    fetchWatchlist(activeWatchlist?.id);
  };

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim()) return;

    const res = await fetch('/api/watchlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newListName.trim() }),
    });

    const data = await res.json();
    if (!res.ok) { setMessage(data.error || 'Could not create watchlist.'); return; }
    setNewListName('');
    setShowNewListForm(false);
    if (data.watchlist) {
      fetchWatchlist(data.watchlist.id);
    }
  };

  const handleRemoveItem = async (symbol: string) => {
    await fetch(`/api/watchlist?symbol=${encodeURIComponent(symbol)}&watchlistId=${activeWatchlist?.id}`, {
      method: 'DELETE',
    });
    fetchWatchlist(activeWatchlist?.id);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-max-brand-primary" />
            <span>Personal Stock Watchlist</span>
          </h1>
          <p className="text-xs text-max-text-secondary mt-1">
            Monitor real-time price movements, daily % change, and volumes with live SSE feeds for your preferred Indian market instruments.
          </p>
        </div>

        <form onSubmit={handleAddItem} className="flex items-center gap-2 w-full sm:w-auto">
          <input
            type="text"
            placeholder="Add symbol (e.g. INFY)..."
            value={newSymbol}
            onChange={(e) => setNewSymbol(e.target.value)}
            className="bg-max-surface border border-max-border focus:border-blue-500 text-xs text-white placeholder-slate-500 rounded px-3.5 py-2 outline-none font-mono uppercase"
          />
          <button
            type="submit"
            className="px-3.5 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition-all flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            <span>Add Stock</span>
          </button>
        </form>
      </div>

      {message && <p role="status" className="rounded border border-amber-900/50 bg-amber-950/20 px-3 py-2 text-[11px] text-amber-200">{message}</p>}

      {/* MULTIPLE NAMED WATCHLISTS BAR */}
      <div className="flex items-center justify-between border-b border-max-border pb-3">
        <div className="flex items-center gap-2 overflow-x-auto text-xs font-mono">
          {watchlists.map((wl) => (
            <button
              key={wl.id}
              onClick={() => fetchWatchlist(wl.id)}
              className={`px-3 py-1.5 rounded transition-all ${
                activeWatchlist?.id === wl.id
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'bg-max-surface text-max-text-secondary hover:text-white border border-max-border'
              }`}
            >
              {wl.name}
            </button>
          ))}
          <button
            onClick={() => setShowNewListForm(!showNewListForm)}
            className="flex items-center gap-1 px-3 py-1.5 rounded bg-max-surface hover:bg-max-surface-hover text-max-text-primary text-xs transition-colors"
          >
            <ListPlus className="w-3.5 h-3.5" />
            <span>New List</span>
          </button>
        </div>
      </div>

      {showNewListForm && (
        <form onSubmit={handleCreateList} className="p-3.5 rounded bg-max-bg border border-max-border flex items-center gap-2 max-w-md">
          <input
            type="text"
            required
            placeholder="Watchlist name (e.g. Banking Stocks)..."
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            className="flex-1 bg-[#0d121c] border border-max-border focus:border-blue-500 text-xs text-white px-3 py-1.5 rounded outline-none font-mono"
          />
          <button
            type="submit"
            className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold font-mono transition-all"
          >
            Create
          </button>
        </form>
      )}

      {/* WATCHLIST ITEMS TABLE */}
      <div className="fintech-card overflow-hidden">
        {loading ? (
          <div className="p-4 text-center text-max-text-muted font-mono text-xs">Loading watchlist...</div>
        ) : items.length === 0 ? (
          <div className="p-4 text-center text-max-text-muted font-mono text-xs">
            Your watchlist is empty. Add ticker symbols above to track stock prices with live SSE ticks.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#0d121c] text-max-text-secondary text-[10px] uppercase border-b border-max-border">
                <tr>
                  <th className="py-3 px-4">Instrument</th>
                  <th className="py-3 px-4">Sector</th>
                  <th className="py-3 px-4 text-right">Price</th>
                  <th className="py-3 px-4 text-right">Change (%)</th>
                  <th className="py-3 px-4 text-right">Volume</th>
                  <th className="py-3 px-4 text-right">52W Range</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-max-border">
                {items.map((item) => (
                  <tr key={item.symbol} className="hover:bg-max-surface/30">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <Link href={`/dashboard/markets/${encodeURIComponent(item.symbol)}`} className="font-bold text-white hover:text-max-brand-primary transition-colors">
                          {item.ticker || item.symbol}
                        </Link>
                        {item.exchange && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-max-surface text-max-text-secondary">{item.exchange}</span>
                        )}
                      </div>
                      <div className="text-[10px] text-max-text-secondary font-sans truncate max-w-[160px]">{item.name}</div>
                    </td>
                    <td className="py-3.5 px-4 text-max-text-secondary text-[11px] font-sans">{item.sector}</td>
                    <td className="py-3.5 px-4 text-right font-bold text-white">{quotes[item.symbol] ? `₹${quotes[item.symbol]!.last.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}</td>
                    <td className={`py-3.5 px-4 text-right font-bold ${quotes[item.symbol] ? quotes[item.symbol]!.change >= 0 ? 'text-max-market-positive' : 'text-rose-400' : 'text-slate-600'}`}>
                      {quotes[item.symbol] ? `${quotes[item.symbol]!.change > 0 ? '+' : ''}${quotes[item.symbol]!.changePercent.toFixed(2)}%` : 'No quote'}
                    </td>
                    <td className="py-3.5 px-4 text-right text-max-text-primary">
                      {quotes[item.symbol] ? quotes[item.symbol]!.volume.toLocaleString('en-IN') : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-right text-max-text-secondary text-[11px]">
                      —
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/dashboard/paper-trading?symbol=${item.symbol}`}
                          className="px-2.5 py-1 rounded bg-emerald-600/20 hover:bg-emerald-600 text-max-market-positive hover:text-white transition-all text-[11px]"
                        >
                          Trade
                        </Link>
                        <Link
                          href={`/dashboard/markets/${encodeURIComponent(item.symbol)}`}
                          className="px-2.5 py-1 rounded bg-blue-600/20 hover:bg-blue-600 text-max-brand-primary hover:text-white transition-all text-[11px]"
                        >
                          Analyze
                        </Link>
                        <button
                          onClick={() => handleRemoveItem(item.symbol)}
                          title="Remove from Watchlist"
                          className="p-1 rounded text-max-text-muted hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
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
