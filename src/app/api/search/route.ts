import { NextResponse } from 'next/server';
import { marketDataService } from '@/lib/market-data';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10), 50);

    const results = marketDataService.search(query, limit);

    return NextResponse.json({
      data: results,
      meta: {
        query,
        count: results.length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Search failed', data: [] },
      { status: 500 }
    );
  }
}
