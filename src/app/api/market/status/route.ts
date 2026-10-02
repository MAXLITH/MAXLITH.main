import { NextResponse } from 'next/server';
import { getMarketSessionStatus } from '@/lib/market-hours';

export const dynamic = 'force-dynamic';

export async function GET() {
  const status = getMarketSessionStatus();
  return NextResponse.json({
    data: status,
    meta: {
      timestamp: new Date().toISOString(),
      exchange: 'NSE,BSE',
      timezone: 'Asia/Kolkata (IST)',
    },
  });
}
