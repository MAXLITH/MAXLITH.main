import { NextResponse } from 'next/server';
import { z } from 'zod';
import { marketDataProviderFromEnvironment } from '@/lib/market-data/rest-provider';

export const dynamic = 'force-dynamic';

const ExchangeSchema = z.enum(['NSE', 'BSE']);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get('q') || '').trim().slice(0, 80);
  const exchangeParam = searchParams.get('exchange')?.toUpperCase();
  const limit = Number(searchParams.get('limit') || 20);
  const exchange = exchangeParam ? ExchangeSchema.safeParse(exchangeParam) : null;
  if (exchangeParam && !exchange?.success) return NextResponse.json({ error: 'Unsupported exchange.' }, { status: 400 });
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) return NextResponse.json({ error: 'limit must be between 1 and 50.' }, { status: 400 });

  const provider = marketDataProviderFromEnvironment();
  if (!provider) return NextResponse.json({ error: 'Market-data provider is not configured.', code: 'PROVIDER_UNAVAILABLE', data: [] }, { status: 503 });
  try {
    const data = await provider.searchSymbols(query, exchange?.success ? exchange.data : undefined, limit);
    return NextResponse.json({ data, meta: { query, count: data.length, provider: provider.name, timestamp: new Date().toISOString() } });
  } catch (error) {
    console.error('Market symbol search failed', error);
    return NextResponse.json({ error: 'Market symbol search is temporarily unavailable.', code: 'PROVIDER_ERROR', data: [] }, { status: 502 });
  }
}
