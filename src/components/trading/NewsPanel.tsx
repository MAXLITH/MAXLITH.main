'use client';

import { useState, useEffect, useCallback } from 'react';
import { ExternalLink, Newspaper, RefreshCw } from 'lucide-react';

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  url: string;
  sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  published_at: string;
}

export default function NewsPanel({ symbol }: { symbol: string }) {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNews = useCallback(() => {
    setLoading(true);
    fetch(`/api/news?symbol=${encodeURIComponent(symbol)}&limit=10`, { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (data.news && Array.isArray(data.news)) {
          setItems(data.news);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [symbol]);

  useEffect(() => {
    loadNews();
  }, [loadNews]);

  return (
    <div className="p-4 space-y-3 font-mono">
      <div className="flex items-center justify-between border-b border-max-border pb-2">
        <div className="flex items-center gap-2 text-xs font-bold text-white">
          <Newspaper className="w-4 h-4 text-max-brand-primary" />
          <span>Real-Time Headlines for {symbol}</span>
        </div>
        <button
          onClick={loadNews}
          className="p-1 text-max-text-muted hover:text-white transition-colors"
          title="Refresh news"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading ? (
        <div className="py-6 text-center text-xs text-max-text-muted">Loading live headlines...</div>
      ) : items.length === 0 ? (
        <div className="py-6 text-center text-xs text-max-text-muted">No recent headlines found for {symbol}.</div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="p-3 rounded bg-max-surface border border-max-border/60 space-y-1.5 hover:border-max-border transition-colors">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-max-text-secondary">{item.source}</span>
                <span
                  className={`font-bold px-1.5 py-0.5 rounded text-[9px] ${
                    item.sentiment === 'POSITIVE'
                      ? 'bg-emerald-500/10 text-max-market-positive border border-emerald-500/20'
                      : item.sentiment === 'NEGATIVE'
                      ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      : 'bg-max-bg text-max-text-muted'
                  }`}
                >
                  {item.sentiment}
                </span>
              </div>
              <h4 className="text-xs font-bold text-white leading-snug">{item.title}</h4>
              <div className="flex items-center justify-between text-[10px] text-max-text-muted pt-1">
                <span>{new Date(item.published_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                {item.url && item.url !== '#' && (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-max-brand-primary hover:underline text-[9px]"
                  >
                    <span>Read</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
