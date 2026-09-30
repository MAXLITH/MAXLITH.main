import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { resetUserAccount } from '@/lib/paper-trading';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const ResetSchema = z.object({
  startingCapital: z.number().min(10000).max(100000000).optional(),
});

export async function POST(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let startingCapital: number | undefined = undefined;
    try {
      const body = await request.json();
      const parsed = ResetSchema.safeParse(body);
      if (parsed.success && parsed.data.startingCapital) {
        startingCapital = parsed.data.startingCapital;
      }
    } catch {
      /* body optional */
    }

    const result = resetUserAccount(session.id, startingCapital);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Account reset error', error);
    return NextResponse.json({ error: error.message || 'Failed to reset account' }, { status: 500 });
  }
}
