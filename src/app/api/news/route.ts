import { NextResponse } from 'next/server';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    const limit = Math.min(parseInt(searchParams.get('limit') || '25', 10), 100);

    let newsItems;
    if (symbol) {
      newsItems = db.prepare(`
        SELECT * FROM news 
        WHERE symbol = ? OR symbol IS NULL 
        ORDER BY published_at DESC 
        LIMIT ?
      `).all(symbol.toUpperCase(), limit);
    } else {
      newsItems = db.prepare(`
        SELECT * FROM news 
        ORDER BY published_at DESC 
        LIMIT ?
      `).all(limit);
    }

    return NextResponse.json({
      news: newsItems,
      data: newsItems,
      meta: {
        count: newsItems.length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('News API error', error);
    return NextResponse.json({ error: 'Failed to fetch news feed' }, { status: 500 });
  }
}
