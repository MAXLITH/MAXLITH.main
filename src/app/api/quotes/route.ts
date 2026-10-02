import { NextResponse } from 'next/server';
import { marketDataService } from '@/lib/market-data';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbolsParam = searchParams.get('symbols') || searchParams.get('symbol') || '';

    let symbols: string[] = [];
    if (symbolsParam.trim()) {
      symbols = symbolsParam.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
    } else {
      // Default to core liquid symbols
      symbols = ['NIFTY50', 'BANKNIFTY', 'RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK'];
    }

    const quoteMap = await marketDataService.getQuotes(symbols);
    const quotes = Array.from(quoteMap.values());

    return NextResponse.json({
      data: quotes,
      meta: {
        count: quotes.length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch quotes', data: [] },
      { status: 500 }
    );
  }
}
