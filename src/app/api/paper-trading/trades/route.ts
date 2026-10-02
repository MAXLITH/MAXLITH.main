import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { getUserTrades } from '@/lib/paper-trading';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const trades = getUserTrades(session.id);
    return NextResponse.json({ trades, data: trades, meta: { count: trades.length } });
  } catch (error: any) {
    console.error('Trades API error', error);
    return NextResponse.json({ error: 'Failed to fetch trade book' }, { status: 500 });
  }
}
