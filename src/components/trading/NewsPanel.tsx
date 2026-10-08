'use client';

export default function NewsPanel({ symbol }: { symbol: string }) {
  return <div className="px-4 py-7 text-center">
    <p className="text-[11px] font-medium text-max-text-primary">News for {symbol}</p>
    <p className="mx-auto mt-1 max-w-md text-[10px] leading-5 text-max-text-muted">No verified news provider is configured. MAXLITH will not show sample headlines as market news.</p>
  </div>;
}
