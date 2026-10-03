'use client';

import type { MarketBar } from '@/lib/tradingview/datafeed';
import type { MarketQuote } from './terminalTypes';

export default function AIAnalysisPanel({ quote, bars }: { quote: MarketQuote | null; bars: MarketBar[] }) {
  const available = Boolean(quote && bars.length > 0);
  return <div className="px-4 py-7 text-center">
    <p className="text-[11px] font-medium text-slate-300">MAXLITH AI market analysis</p>
    <p className="mx-auto mt-1 max-w-lg text-[10px] leading-5 text-slate-500">
      {available
        ? 'AI analysis is not enabled for this feed yet. Connect a server-side analysis path that receives this verified quote and candle set before requesting interpretation.'
        : 'Analysis is unavailable until verified market quotes and historical candles are present.'}
    </p>
  </div>;
}
