import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    await supabase.auth.signOut();
  } catch (err: any) {
    console.warn('Supabase signOut warning:', err?.message);
  }

  const response = NextResponse.json({ success: true });
  response.cookies.delete('maxlith_session');
  return response;
}
