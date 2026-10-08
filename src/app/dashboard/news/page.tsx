import db from '@/lib/db';
import { Newspaper, ExternalLink, Sparkles } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function NewsPage() {
  const newsList = db.prepare('SELECT * FROM news ORDER BY published_at DESC').all() as any[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Newspaper className="w-5 h-5 text-max-brand-primary" />
          <span>Indian Financial Market News</span>
        </h1>
        <p className="text-xs text-max-text-secondary mt-1">
          Real-time headlines, RBI monetary policy releases, and corporate announcements with AI sentiment tags.
        </p>
      </div>

      <div className="space-y-4">
        {newsList.map((n) => (
          <div key={n.id} className="fintech-card p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-max-surface text-max-text-primary">
                {n.symbol}
              </span>
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                  n.sentiment === 'POSITIVE'
                    ? 'bg-emerald-500/10 text-max-market-positive border border-emerald-500/20'
                    : n.sentiment === 'NEGATIVE'
                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    : 'bg-max-surface text-max-text-secondary'
                }`}
              >
                SENTIMENT: {n.sentiment}
              </span>
            </div>

            <h2 className="text-base font-bold text-white leading-snug">{n.title}</h2>
            <p className="text-xs text-max-text-secondary leading-relaxed">{n.summary}</p>

            <div className="flex items-center justify-between text-[11px] font-mono text-max-text-muted pt-2 border-t border-max-border/60">
              <span>Source: {n.source}</span>
              <span>Published: {new Date(n.published_at).toLocaleString()}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
