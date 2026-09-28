import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { getUserPortfolioSummary, getUserPositions } from '@/lib/paper-trading';

export async function GET() {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const summary = getUserPortfolioSummary(session.id);
    const positions = getUserPositions(session.id);

    return NextResponse.json({
      summary,
      positions
    });
  } catch (error: any) {
    console.error('Portfolio API error', error);
    return NextResponse.json({ error: 'Failed to fetch portfolio data' }, { status: 500 });
  }
}
