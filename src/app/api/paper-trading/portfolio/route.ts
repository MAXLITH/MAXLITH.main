import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { getUserPortfolioSummary, getUserPositions } from '@/lib/paper-trading';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const summary = getUserPortfolioSummary(session.id);
    const positions = getUserPositions(session.id);

    const equityCurve = db.prepare(`
      SELECT as_of as date, portfolio_value as value, cash, holdings_value
      FROM portfolio_snapshots
      WHERE user_id = ?
      ORDER BY as_of ASC
    `).all(session.id);

    const realizedTrades = db.prepare(`
      SELECT id, symbol, side, quantity, price, created_at
      FROM trades
      WHERE user_id = ? AND side = 'SELL'
      ORDER BY created_at DESC
      LIMIT 20
    `).all(session.id);

    return NextResponse.json({
      data: {
        summary,
        positions,
        sectorAllocations: summary.sectorAllocations,
        equityCurve,
        realizedTrades,
      },
      summary,
      positions
      positions,
      sectorAllocations: summary.sectorAllocations,
      equityCurve,
      realizedTrades,
    });
  } catch (error: any) {
    console.error('Portfolio API error', error);
    return NextResponse.json({ error: 'Failed to fetch portfolio data' }, { status: 500 });
  }
}
