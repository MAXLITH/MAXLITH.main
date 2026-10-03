import { NextResponse } from 'next/server';
import { getMarketDataProviderStatus, marketDataProviderFromEnvironment } from '@/lib/market-data/rest-provider';

export const dynamic = 'force-dynamic';

export async function GET() {
  const providerStatus = getMarketDataProviderStatus();
  const provider = marketDataProviderFromEnvironment();
  const marketStatus = provider ? await provider.getMarketStatus() : null;
  return NextResponse.json({
    data: { provider: providerStatus, marketStatus },
    meta: { timestamp: new Date().toISOString() },
  });
}
