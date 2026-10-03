import { NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { getAuthSession } from '@/lib/auth';
import { getMarketDataProviderStatus } from '@/lib/market-data/rest-provider';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const status = getMarketDataProviderStatus();
  const secret = process.env.MARKET_STREAM_JWT_SECRET;
  if (!status.streamingAvailable || !secret || secret.length < 32) {
    return NextResponse.json({ error: 'Market streaming is not configured.' }, { status: 503 });
  }

  const token = await new SignJWT({ scope: 'market-stream' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(session.id)
    .setIssuer('maxlith-web')
    .setAudience('market-stream')
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(new TextEncoder().encode(secret));

  return NextResponse.json({ token, expiresIn: 300 });
}
