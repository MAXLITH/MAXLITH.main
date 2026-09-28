import { NextResponse } from 'next/server';
import { getAllInstruments, searchInstruments, getMarketSessionStatus } from '@/lib/market-data';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    const instruments = query ? searchInstruments(query) : getAllInstruments();
    const sessionStatus = getMarketSessionStatus();

    // Top gainers, losers, volume leaders
    const sortedByChange = [...instruments].sort((a, b) => b.percent_change - a.percent_change);
    const topGainers = sortedByChange.slice(0, 3);
    const topLosers = sortedByChange.slice(-3).reverse();
    const volumeLeaders = [...instruments].sort((a, b) => b.volume - a.volume).slice(0, 3);

    return NextResponse.json({
      sessionStatus,
      instrumentsCount: instruments.length,
      instruments,
      movers: {
        topGainers,
        topLosers,
        volumeLeaders
      }
    });
  } catch (error: any) {
    console.error('Markets API error', error);
    return NextResponse.json({ error: 'Failed to fetch market data' }, { status: 500 });
  }
}
