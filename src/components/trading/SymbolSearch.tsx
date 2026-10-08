'use client';

import { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import type { TradingSymbol } from '@/lib/tradingview/symbols';

export default function SymbolSearch({
  exchange,
  onSelect,
}: {
  exchange: 'NSE' | 'BSE';
  onSelect: (instrument: TradingSymbol) => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<TradingSymbol[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const value = query.trim();
    if (value.length < 2) {
      setResults([]);
      setMessage('');
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setBusy(true);
      setMessage('');
      try {
        const params = new URLSearchParams({ q: value, exchange, limit: '12' });
        const response = await fetch(`/api/market/search?${params}`, { signal: controller.signal, cache: 'no-store' });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || 'Symbol search is unavailable.');
        setResults(Array.isArray(payload.data) ? payload.data : []);
        setIsOpen(true);
        if (!payload.data?.length) setMessage('No verified instruments found.');
      } catch (error) {
        if (controller.signal.aborted) return;
        setResults([]);
        setIsOpen(true);
        setMessage(error instanceof Error ? error.message : 'Symbol search is unavailable.');
      } finally {
        if (!controller.signal.aborted) setBusy(false);
      }
    }, 250);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query, exchange]);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  return (
    <div ref={rootRef} className="relative min-w-0 flex-1">
      <div className="flex h-8 items-center gap-2 rounded border border-max-border bg-max-surface px-2.5 focus-within:border-max-brand-primary transition-colors">
        <Search className="h-3.5 w-3.5 shrink-0 text-max-text-muted" />
        <input
          value={query}
          onChange={(event) => { setQuery(event.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setIsOpen(false);
            if (event.key === 'Enter' && results[0]) {
              onSelect(results[0]);
              setQuery('');
              setIsOpen(false);
            }
          }}
          aria-label="Search NSE and BSE instruments"
          placeholder="Search symbol or company (e.g. RELIANCE)..."
          className="min-w-0 flex-1 bg-transparent text-xs text-white outline-none placeholder:text-max-text-muted font-sans"
        />
        {busy && <span className="text-[9px] font-mono text-max-brand-primary">SEARCHING</span>}
        {query && <button type="button" onClick={() => { setQuery(''); setResults([]); }} aria-label="Clear search"><X className="h-3.5 w-3.5 text-max-text-muted hover:text-white" /></button>}
      </div>
      {isOpen && query.trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-9 z-30 overflow-hidden rounded border border-max-border bg-max-bg-elevated shadow-xl font-mono">
          {results.map((instrument) => (
            <button
              key={instrument.id}
              type="button"
              onClick={() => { onSelect(instrument); setQuery(''); setResults([]); setIsOpen(false); }}
              className="flex w-full items-center justify-between gap-3 border-b border-max-border px-3 py-2 text-left last:border-0 hover:bg-max-surface-hover transition-colors"
            >
              <span className="min-w-0">
                <span className="block truncate text-xs font-bold text-white">{instrument.symbol}<span className="ml-2 text-[9px] text-max-text-muted font-sans">({instrument.exchange})</span></span>
                <span className="block truncate text-[10px] text-max-text-secondary font-sans">{instrument.name}</span>
              </span>
              <span className="text-[9px] uppercase tracking-wide text-max-text-muted">{instrument.type}</span>
            </button>
          ))}
          {!results.length && <div className="px-3 py-3 text-[11px] text-max-text-muted">{message || 'Type at least two characters.'}</div>}
        </div>
      )}
    </div>
  );
}
