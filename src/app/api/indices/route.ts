import { NextResponse } from 'next/server';
import { marketDataService } from '@/lib/market-data';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const indices = await marketDataService.getIndices();
    return NextResponse.json({
      data: indices,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch indices', data: [] },
      { status: 500 }
    );
  }
}
