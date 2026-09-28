import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth';
import db from '@/lib/db';
import { getMarketSessionStatus } from '@/lib/market-data';

export async function GET() {
  try {
    const session = await requireAdminSession();

    const userCount = (db.prepare('SELECT COUNT(*) as cnt FROM users').get() as { cnt: number }).cnt;
    const ordersCount = (db.prepare('SELECT COUNT(*) as cnt FROM orders').get() as { cnt: number }).cnt;
    const aiRunsCount = (db.prepare('SELECT COUNT(*) as cnt FROM ai_agent_runs').get() as { cnt: number }).cnt;
    const instrumentsCount = (db.prepare('SELECT COUNT(*) as cnt FROM instruments').get() as { cnt: number }).cnt;

    const recentUsers = db.prepare('SELECT id, email, full_name, role, virtual_cash, created_at FROM users ORDER BY created_at DESC LIMIT 10').all();
    const recentOrders = db.prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT 10').all();
    const recentAiRuns = db.prepare('SELECT * FROM ai_agent_runs ORDER BY created_at DESC LIMIT 10').all();

    const marketSession = getMarketSessionStatus();

    return NextResponse.json({
      adminSession: { id: session.id, email: session.email, name: session.fullName },
      systemHealth: 'OPERATIONAL',
      databaseStatus: 'HEALTHY (SQLite WAL Mode)',
      marketSession,
      metrics: {
        totalUsers: userCount,
        totalOrders: ordersCount,
        totalAiRuns: aiRunsCount,
        monitoredInstruments: instrumentsCount,
      },
      recentUsers,
      recentOrders,
      recentAiRuns
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN_ADMIN_ONLY') {
      return NextResponse.json({ error: 'Forbidden: Admin authorization required.' }, { status: 403 });
    }
    console.error('Admin metrics error', error);
    return NextResponse.json({ error: 'Failed to retrieve admin telemetry.' }, { status: 500 });
  }
}
