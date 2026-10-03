import { NextResponse } from 'next/server';
import { z } from 'zod';
import { normalizeSymbol } from '@/lib/tradingview/symbols';
import { RESOLUTIONS } from '@/lib/tradingview/resolutions';
import { marketDataProviderFromEnvironment } from '@/lib/market-data/rest-provider';

export const dynamic = 'force-dynamic';

const ResolutionSchema = z.enum(RESOLUTIONS.map((item) => item.value) as [string, ...string[]]);

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const rawSymbol = params.get('symbol');
  const resolution = ResolutionSchema.safeParse(params.get('resolution') || '1D');
  const from = parseOptionalTimestamp(params.get('from'));
  const to = parseOptionalTimestamp(params.get('to'));
  const countback = params.has('countback') ? Number(params.get('countback')) : undefined;

  if (!rawSymbol) return NextResponse.json({ error: 'symbol is required.' }, { status: 400 });
  if (!resolution.success) return NextResponse.json({ error: 'Unsupported resolution.' }, { status: 400 });
  if (from === false || to === false || (from !== undefined && to !== undefined && from >= to)) {
    return NextResponse.json({ error: 'Invalid history range.' }, { status: 400 });
  }
  if (countback !== undefined && (!Number.isInteger(countback) || countback < 1 || countback > 5000)) {
    return NextResponse.json({ error: 'countback must be between 1 and 5000.' }, { status: 400 });
  }

  let symbol: string;
  try {
    symbol = normalizeSymbol(rawSymbol);
  } catch {
    return NextResponse.json({ error: 'Invalid market symbol.' }, { status: 400 });
  }

  const provider = marketDataProviderFromEnvironment();
  if (!provider) return NextResponse.json({ error: 'Market-data provider is not configured.', code: 'PROVIDER_UNAVAILABLE', data: [] }, { status: 503 });
  try {
    const data = await provider.getHistoricalBars({ symbol, resolution: resolution.data as never, from: from || undefined, to: to || undefined, countback });
    return NextResponse.json({ data, meta: { symbol, resolution: resolution.data, count: data.length, provider: provider.name, timestamp: new Date().toISOString() } });
  } catch (error) {
    console.error('Market history request failed', error);
    return NextResponse.json({ error: 'Historical market data is temporarily unavailable.', code: 'PROVIDER_ERROR', data: [] }, { status: 502 });
  }
}

function parseOptionalTimestamp(value: string | null): number | undefined | false {
  if (value === null) return undefined;
  if (!/^\d{1,12}$/.test(value)) return false;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : false;
}
