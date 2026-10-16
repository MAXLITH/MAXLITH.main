import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth';
import { validateAuthEnvironment } from '@/lib/env-validator';

export async function GET() {
  try {
    await requireAdminSession();
  } catch {
    return NextResponse.json({ error: 'Unauthorized. Admin credentials required.' }, { status: 403 });
  }

  const result = validateAuthEnvironment();
  return NextResponse.json({
    timestamp: new Date().toISOString(),
    status: result.valid ? 'HEALTHY' : 'CONFIGURATION_WARNING',
    ...result,
  });
}
