import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { getUserOrders, cancelOrder, modifyOrder } from '@/lib/paper-trading';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;

    const orders = getUserOrders(session.id, status);
    return NextResponse.json({ orders, data: orders, meta: { count: orders.length } });
  } catch (error: any) {
    console.error('Orders API error', error);
    return NextResponse.json({ error: 'Failed to fetch orders history' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');
    if (!orderId) {
      return NextResponse.json({ error: 'Missing orderId parameter' }, { status: 400 });
    }

    const result = cancelOrder(orderId, session.id);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to cancel order' }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { orderId, quantity, price } = body;

    if (!orderId || !quantity) {
      return NextResponse.json({ error: 'Missing orderId or quantity' }, { status: 400 });
    }

    const result = modifyOrder(orderId, session.id, parseInt(quantity, 10), price ? parseFloat(price) : undefined);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to modify order' }, { status: 400 });
  }
}
