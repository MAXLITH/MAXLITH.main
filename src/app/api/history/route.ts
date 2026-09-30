import { NextResponse } from 'next/server';
import { marketDataService } from '@/lib/market-data';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol') || 'RELIANCE';
    const timeframe = searchParams.get('timeframe') || '1D';

    const candles = await marketDataService.getHistory(symbol, timeframe);

    return NextResponse.json({
      data: candles,
      meta: {
        symbol: symbol.toUpperCase(),
        timeframe,
        count: candles.length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch history', data: [] },
      { status: 500 }
    );
  }
}
