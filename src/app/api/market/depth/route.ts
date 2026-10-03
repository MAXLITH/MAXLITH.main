import { NextResponse } from 'next/server';
import { normalizeSymbol } from '@/lib/tradingview/symbols';
import { marketDataProviderFromEnvironment } from '@/lib/market-data/rest-provider';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const rawSymbol = new URL(request.url).searchParams.get('symbol');
  if (!rawSymbol) return NextResponse.json({ error: 'symbol is required.' }, { status: 400 });
  let symbol: string;
  try {
    symbol = normalizeSymbol(rawSymbol);
  } catch {
    return NextResponse.json({ error: 'Invalid market symbol.' }, { status: 400 });
  }

  const provider = marketDataProviderFromEnvironment();
  if (!provider) return NextResponse.json({ available: false, bids: [], asks: [], message: 'Market depth unavailable for this data source.' });
  try {
    const data = await provider.getDepth(symbol);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Market depth request failed', error);
    return NextResponse.json({ available: false, bids: [], asks: [], message: 'Market depth unavailable for this data source.' });
  }
}
