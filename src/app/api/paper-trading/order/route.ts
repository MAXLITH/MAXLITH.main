import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { executePaperOrder, previewOrder } from '@/lib/paper-trading';
import { getVerifiedPaperQuote, PaperMarketQuoteError } from '@/lib/market-data/paper-trading-quote';
import { MarketDataUnavailableError } from '@/lib/market-data/provider';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const OrderSchema = z.object({
  symbol: z.string().min(1),
  side: z.enum(['BUY', 'SELL']),
  orderType: z.enum(['MARKET', 'LIMIT', 'SL', 'SL-M']).default('MARKET'),
  productType: z.enum(['CNC', 'MIS']).default('CNC'),
  quantity: z.number().int().positive(),
  price: z.number().positive().optional(),
  limitPrice: z.union([z.number().positive(), z.string().regex(/^\d+(\.\d+)?$/)]).optional(),
  triggerPrice: z.number().positive().optional(),
  idempotencyKey: z.string().optional(),
}).superRefine((order, context) => {
  if (order.orderType === 'LIMIT' && order.price === undefined && order.limitPrice === undefined) {
    context.addIssue({ code: 'custom', path: ['price'], message: 'A limit price is required.' });
  }
  if ((order.orderType === 'SL' || order.orderType === 'SL-M') && order.triggerPrice === undefined) {
    context.addIssue({ code: 'custom', path: ['triggerPrice'], message: 'A trigger price is required for stop orders.' });
  }
});

function orderError(error: unknown) {
  const message = error instanceof Error ? error.message : 'Order request failed.';
  const status = error instanceof MarketDataUnavailableError
    ? 503
    : error instanceof PaperMarketQuoteError
      ? error.status
      : 400;
  const code = status === 503 ? 'MARKET_DATA_UNAVAILABLE' : status >= 500 ? 'MARKET_DATA_ERROR' : 'ORDER_VALIDATION_FAILED';
  return NextResponse.json({ error: message, code }, { status });
}

export async function GET(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol') || 'NSE:RELIANCE';
    const priceStr = searchParams.get('price');
    const triggerStr = searchParams.get('triggerPrice');
    const parsed = OrderSchema.safeParse({
      symbol,
      side: (searchParams.get('side') || 'BUY').toUpperCase(),
      orderType: (searchParams.get('orderType') || 'MARKET').toUpperCase(),
      productType: (searchParams.get('productType') || 'CNC').toUpperCase(),
      quantity: Number(searchParams.get('quantity') || '1'),
      ...(priceStr ? { price: Number(priceStr) } : {}),
      ...(triggerStr ? { triggerPrice: Number(triggerStr) } : {}),
    });
    if (!parsed.success) return NextResponse.json({ error: 'Invalid order preview parameters.', details: parsed.error.format() }, { status: 400 });
    const { side, orderType, productType, quantity, price } = parsed.data;

    const verified = await getVerifiedPaperQuote(symbol);
    const preview = previewOrder({
      userId: session.id,
      symbol: verified.symbol,
      side,
      orderType,
      productType,
      quantity,
      price,
      marketPrice: verified.quote.last,
    });

    return NextResponse.json({ data: preview, preview });
  } catch (error) {
    return orderError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in to paper trade.' }, { status: 401 });
    }

    const json = await request.json();
    const parsed = OrderSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid order input', details: parsed.error.format() }, { status: 400 });
    }

    const body = parsed.data;
    const headerIdempotency = request.headers.get('Idempotency-Key') || request.headers.get('idempotency-key');
    const idempotencyKey = body.idempotencyKey || headerIdempotency || undefined;

    const effectivePrice = body.price ?? (body.limitPrice ? parseFloat(String(body.limitPrice)) : undefined);
    const verified = await getVerifiedPaperQuote(body.symbol);

    const result = executePaperOrder({
      userId: session.id,
      symbol: verified.symbol,
      side: body.side,
      orderType: body.orderType,
      productType: body.productType,
      quantity: body.quantity,
      price: effectivePrice,
      marketPrice: verified.quote.last,
      triggerPrice: body.triggerPrice,
      idempotencyKey,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Paper trade execution error', error);
    return orderError(error);
  }
}
