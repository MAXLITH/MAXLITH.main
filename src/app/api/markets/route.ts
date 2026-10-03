import { NextResponse } from 'next/server';
import { getAllInstruments, searchInstruments, getMarketSessionStatus, marketDataService } from '@/lib/market-data';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    const instruments = query ? searchInstruments(query) : getAllInstruments();
    const sessionStatus = getMarketSessionStatus();

    // Indices
    const indices = await marketDataService.getIndices();

    // Movers
    const sortedByChange = [...instruments].filter(i => i.asset_type === 'EQUITY').sort((a, b) => b.percent_change - a.percent_change);
    const topGainers = sortedByChange.slice(0, 5);
    const topLosers = [...sortedByChange].reverse().slice(0, 5);
    const mostActive = [...instruments].filter(i => i.asset_type === 'EQUITY').sort((a, b) => (b.volume * b.current_price) - (a.volume * a.current_price)).slice(0, 5);
    const volumeLeaders = [...instruments].sort((a, b) => b.volume - a.volume).slice(0, 5);

    // Sector Heatmap
    const sectorHeatmap = marketDataService.getSectorHeatmap();

    // 52-Week High / Low
    const near52wHigh = process.env.NODE_ENV === 'production' ? [] : db.prepare(`
      SELECT symbol, name, current_price, high_52w, percent_change
      FROM instruments
      WHERE asset_type = 'EQUITY' AND high_52w > 0
      ORDER BY (current_price / high_52w) DESC
      LIMIT 5
    `).all();

    const near52wLow = process.env.NODE_ENV === 'production' ? [] : db.prepare(`
      SELECT symbol, name, current_price, low_52w, percent_change
      FROM instruments
      WHERE asset_type = 'EQUITY' AND low_52w > 0
      ORDER BY (current_price / low_52w) ASC
      LIMIT 5
    `).all();

    return NextResponse.json({
      sessionStatus,
      instrumentsCount: instruments.length,
      instruments,
      indices,
      movers: {
        topGainers,
        topLosers,
        mostActive,
        volumeLeaders,
      },
      sectorHeatmap,
      highLow52w: {
        nearHigh: near52wHigh,
        nearLow: near52wLow,
      },
    });
  } catch (error: any) {
    console.error('Markets API error', error);
    return NextResponse.json({ error: 'Failed to fetch market data' }, { status: 500 });
  }
}
