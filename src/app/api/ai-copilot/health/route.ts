import { NextResponse } from 'next/server';
import { getMarketDataProviderStatus } from '@/lib/market-data/rest-provider';
import { getMarketSessionStatus } from '@/lib/market-hours';
import { config } from '@/lib/config';

export const dynamic = 'force-dynamic';

export async function GET() {
  const providerStatus = getMarketDataProviderStatus();
  const sessionStatus = getMarketSessionStatus();

  return NextResponse.json({
    status: 'HEALTHY',
    service: 'MAXLITH AI Copilot Market Intelligence',
    timestamp: new Date().toISOString(),
    market: {
      session: sessionStatus.session,
      isOpen: sessionStatus.isOpen,
      timezone: 'Asia/Kolkata',
    },
    provider: {
      configured: providerStatus.configured,
      name: providerStatus.provider,
      source: providerStatus.source,
      streamingAvailable: providerStatus.streamingAvailable,
    },
    ai: {
      geminiConfigured: Boolean(config.geminiApiKey),
      geminiModel: config.geminiModel,
      anthropicConfigured: Boolean(config.anthropicApiKey),
      defaultModel: config.geminiApiKey ? config.geminiModel : 'maxlith-deterministic-grounded-v1',
    },
  });
}

