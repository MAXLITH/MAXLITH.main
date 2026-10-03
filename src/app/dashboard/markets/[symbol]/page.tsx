import { redirect } from 'next/navigation';
import { normalizeSymbol } from '@/lib/tradingview/symbols';

export default async function MarketInstrumentPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params;
  let canonical: string;
  try {
    canonical = normalizeSymbol(symbol);
  } catch {
    redirect('/dashboard/markets');
  }
  redirect(`/dashboard/markets?symbol=${encodeURIComponent(canonical)}`);
}
