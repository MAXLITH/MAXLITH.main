import { NextResponse } from 'next/server';
import { normalizeSymbol } from '@/lib/tradingview/symbols';
import { marketDataProviderFromEnvironment } from '@/lib/market-data/rest-provider';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params;
  let symbolId: string;
  try {
    symbolId = normalizeSymbol(decodeURIComponent(symbol));
  } catch {
    return NextResponse.json({ error: 'Invalid market symbol.' }, { status: 400 });
  }

  const provider = marketDataProviderFromEnvironment();
  if (!provider) return NextResponse.json({ error: 'Market-data provider is not configured.', code: 'PROVIDER_UNAVAILABLE' }, { status: 503 });
  try {
    const data = await provider.resolveSymbol(symbolId);
    if (!data) return NextResponse.json({ error: `Instrument ${symbolId} is unavailable.` }, { status: 404 });
    return NextResponse.json({ data, meta: { provider: provider.name, timestamp: new Date().toISOString() } });
  } catch (error) {
    console.error('Market symbol resolution failed', error);
    return NextResponse.json({ error: 'Market symbol resolution is temporarily unavailable.', code: 'PROVIDER_ERROR' }, { status: 502 });
  }
}
