import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { executePaperOrder } from '@/lib/paper-trading';

export async function POST(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in to paper trade.' }, { status: 401 });
    }

    const body = await request.json();
    const { symbol, side, orderType, quantity, limitPrice } = body;

    if (!symbol || !side || !orderType || !quantity) {
      return NextResponse.json({ error: 'Invalid order parameters.' }, { status: 400 });
    }

    const result = executePaperOrder({
      userId: session.id,
      symbol,
      side,
      orderType,
      quantity: parseInt(quantity, 10),
      limitPrice: limitPrice ? parseFloat(limitPrice) : undefined
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Paper trade execution error', error);
    return NextResponse.json({ error: error.message || 'Order execution failed.' }, { status: 400 });
  }
}
