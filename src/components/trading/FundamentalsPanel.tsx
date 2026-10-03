'use client';

export default function FundamentalsPanel({ symbol }: { symbol: string }) {
  return <div className="px-4 py-7 text-center">
    <p className="text-[11px] font-medium text-slate-300">Fundamentals for {symbol}</p>
    <p className="mx-auto mt-1 max-w-md text-[10px] leading-5 text-slate-500">The configured market-data contract does not include verified fundamentals. Valuation and financial fields are hidden until a licensed source provides them.</p>
  </div>;
}
