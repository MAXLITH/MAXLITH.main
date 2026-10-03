import { NextResponse } from 'next/server';
import { normalizeSymbol } from '@/lib/tradingview/symbols';
import { marketDataProviderFromEnvironment } from '@/lib/market-data/rest-provider';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const rawSymbol = new URL(request.url).searchParams.get('symbol');
  if (!rawSymbol) return NextResponse.json({ error: 'symbol is required.' }, { status: 400 });
  let symbolId: string;
  try {
    symbolId = normalizeSymbol(rawSymbol);
  } catch {
    return NextResponse.json({ error: 'Invalid market symbol.' }, { status: 400 });
  }

  const provider = marketDataProviderFromEnvironment();
  if (!provider) return NextResponse.json({ error: 'Market-data provider is not configured.', code: 'PROVIDER_UNAVAILABLE' }, { status: 503 });
  try {
    const data = await provider.getQuote(symbolId);
    if (!data) return NextResponse.json({ error: `Quote for ${symbolId} is unavailable.` }, { status: 404 });
    return NextResponse.json({ data, meta: { provider: provider.name, timestamp: new Date().toISOString() } });
  } catch (error) {
    console.error('Market quote request failed', error);
    return NextResponse.json({ error: 'Market quote is temporarily unavailable.', code: 'PROVIDER_ERROR' }, { status: 502 });
  }
}
