import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import db from '@/lib/db';
import { createSessionToken } from '@/lib/auth';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Please provide email and password.' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 1. Authoritative: Authenticate against Supabase Auth
    let supabaseUser: any = null;
    let supabaseSession: any = null;
    let supabaseError: any = null;

    try {
      const cookieStore = await cookies();
      const supabase = createClient(cookieStore);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      supabaseUser = data?.user;
      supabaseSession = data?.session;
      supabaseError = error;
    } catch (clientErr: any) {
      console.warn('Supabase login client initialization error:', clientErr?.message);
    }

    // Explicitly handle unconfirmed email error
    if (supabaseError && (supabaseError.message?.toLowerCase().includes('email not confirmed') || supabaseError.code === 'email_not_confirmed')) {
      return NextResponse.json({
        error: 'Your email address has not been confirmed. Please check your inbox and click the verification link.',
        code: 'email_not_confirmed',
      }, { status: 403 });
    }

    // If Supabase authentication succeeded
    if (supabaseUser && supabaseSession) {
      const userId = supabaseUser.id;
      const fullName = (supabaseUser.user_metadata?.full_name as string) || normalizedEmail.split('@')[0] || 'Trader';
      const adminEmail = (process.env.ADMIN_EMAIL || 'admin@maxlith.com').toLowerCase().trim();
      const role: 'USER' | 'ADMIN' = (supabaseUser.user_metadata?.role === 'ADMIN' || normalizedEmail === adminEmail) ? 'ADMIN' : 'USER';
      const initialCash = Number(process.env.INITIAL_VIRTUAL_CAPITAL || 1000000.0);

      // Hydrate local db store so trading operations work seamlessly
      let dbUser = db.prepare('SELECT id, email, full_name, role, virtual_cash FROM users WHERE id = ?').get(userId) as any;
      if (!dbUser) {
        try {
          db.prepare(`
            INSERT INTO users (id, email, password_hash, full_name, role, virtual_cash, initial_capital, blocked_margin)
            VALUES (?, ?, '', ?, ?, ?, ?, 0.0)
          `).run(userId, normalizedEmail, fullName, role, initialCash, initialCash);
        } catch {
          // Ignore if exists
        }
        dbUser = db.prepare('SELECT id, email, full_name, role, virtual_cash FROM users WHERE id = ?').get(userId) as any;
      }

      const token = await createSessionToken({ id: userId, email: normalizedEmail, role });

      const response = NextResponse.json({
        success: true,
        user: {
          id: userId,
          email: normalizedEmail,
          fullName: dbUser?.full_name || fullName,
          role: dbUser?.role || role,
          virtualCash: dbUser?.virtual_cash ?? initialCash,
        },
      });

      // Also set legacy cookie for backward-compatible server-side reads
      response.cookies.set({
        name: 'maxlith_session',
        value: token,
        httpOnly: true,
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
      });

      return response;
    }

    // 2. Compatibility Fallback: Check local store for seeded admin or test suite credentials
    const localUser = db.prepare('SELECT id, email, password_hash, full_name, role, virtual_cash FROM users WHERE email = ?').get(normalizedEmail) as {
      id: string;
      email: string;
      password_hash: string;
      full_name: string;
      role: 'USER' | 'ADMIN';
      virtual_cash: number;
    } | undefined;

    if (localUser && localUser.password_hash) {
      const isValid = await bcrypt.compare(password, localUser.password_hash);
      if (isValid) {
        const token = await createSessionToken({ id: localUser.id, email: localUser.email, role: localUser.role });

        const response = NextResponse.json({
          success: true,
          user: {
            id: localUser.id,
            email: localUser.email,
            fullName: localUser.full_name,
            role: localUser.role,
            virtualCash: localUser.virtual_cash,
          },
        });

        response.cookies.set({
          name: 'maxlith_session',
          value: token,
          httpOnly: true,
          path: '/',
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7,
        });

        return response;
      }
    }

    // If both Supabase and fallback checks fail, reject
    return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
  } catch (error: any) {
    console.error('Login route error:', error);
    return NextResponse.json({ error: 'Authentication failed.' }, { status: 500 });
  }
}
