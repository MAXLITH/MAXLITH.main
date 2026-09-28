import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { getUserOrders } from '@/lib/paper-trading';

export async function GET() {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orders = getUserOrders(session.id);
    return NextResponse.json({ orders });
  } catch (error: any) {
    console.error('Orders API error', error);
    return NextResponse.json({ error: 'Failed to fetch orders history' }, { status: 500 });
  }
}
