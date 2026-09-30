import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { executePaperOrder, previewOrder } from '@/lib/paper-trading';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const OrderSchema = z.object({
  symbol: z.string().min(1),
  side: z.enum(['BUY', 'SELL']),
  orderType: z.enum(['MARKET', 'LIMIT', 'SL', 'SL-M']).default('MARKET'),
  productType: z.enum(['CNC', 'MIS']).default('CNC'),
  quantity: z.number().int().positive(),
  price: z.number().positive().optional(),
  limitPrice: z.union([z.number(), z.string()]).optional(),
  triggerPrice: z.number().positive().optional(),
  idempotencyKey: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol') || 'RELIANCE';
    const side = (searchParams.get('side') || 'BUY').toUpperCase() as 'BUY' | 'SELL';
    const orderType = (searchParams.get('orderType') || 'MARKET').toUpperCase() as any;
    const productType = (searchParams.get('productType') || 'CNC').toUpperCase() as any;
    const quantity = parseInt(searchParams.get('quantity') || '1', 10);
    const priceStr = searchParams.get('price');
    const price = priceStr ? parseFloat(priceStr) : undefined;

    const preview = previewOrder({
      userId: session.id,
      symbol,
      side,
      orderType,
      productType,
      quantity,
      price,
    });

    return NextResponse.json({ data: preview, preview });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to preview order.' }, { status: 400 });
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

    const result = executePaperOrder({
      userId: session.id,
      symbol: body.symbol.toUpperCase(),
      side: body.side,
      orderType: body.orderType,
      productType: body.productType,
      quantity: body.quantity,
      price: effectivePrice,
      triggerPrice: body.triggerPrice,
      idempotencyKey,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Paper trade execution error', error);
    return NextResponse.json({ error: error.message || 'Order execution failed.' }, { status: 400 });
  }
}
