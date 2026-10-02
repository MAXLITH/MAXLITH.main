import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getMarketSessionStatus } from '@/lib/market-hours';

export const dynamic = 'force-dynamic';

export async function GET() {
  const startTime = Date.now();
  let dbStatus = 'HEALTHY';

  try {
    db.prepare('SELECT 1').get();
  } catch (err) {
    dbStatus = 'DEGRADED';
  }

  const marketStatus = getMarketSessionStatus();
  const latencyMs = Date.now() - startTime;

  return NextResponse.json({
    status: dbStatus === 'HEALTHY' ? 'OK' : 'DEGRADED',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    database: {
      engine: 'better-sqlite3 (WAL mode)',
      status: dbStatus,
      latencyMs,
    },
    market: {
      session: marketStatus.session,
      isOpen: marketStatus.isOpen,
      currentTimeIST: marketStatus.currentTimeIST,
    },
    version: '1.0.0-paper-v1',
  });
}
