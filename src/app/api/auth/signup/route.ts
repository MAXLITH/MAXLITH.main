import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import db from '@/lib/db';
import { createSessionToken } from '@/lib/auth';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, fullName } = body;

    if (!email || !password || !fullName) {
      return NextResponse.json({ error: 'Missing required fields: email, password, fullName' }, { status: 400 });
    }

    if (typeof password !== 'string' || password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters long' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const cleanFullName = fullName.trim();
    const initialCash = Number(process.env.INITIAL_VIRTUAL_CAPITAL || 1000000.0);

    // Fast check: Prevent duplicate email in local store
    const existingLocal = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
    if (existingLocal) {
      return NextResponse.json({ error: 'An account with this email address already exists.' }, { status: 409 });
    }

    // 1. Authoritative: Register with Supabase Auth
    let supabaseUser: any = null;
    let supabaseSession: any = null;
    let supabaseError: any = null;

    try {
      const cookieStore = await cookies();
      const supabase = createClient(cookieStore);
      const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'https://maxlith-main.vercel.app';

      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            full_name: cleanFullName,
            role: 'USER',
            initial_capital: initialCash,
            virtual_cash: initialCash,
          },
          emailRedirectTo: `${origin}/auth/callback?next=/dashboard`,
        },
      });

      supabaseUser = data?.user;
      supabaseSession = data?.session;
      supabaseError = error;
    } catch (clientErr: any) {
      console.warn('Supabase client signup initialization warning:', clientErr?.message);
    }

    // Handle Supabase specific error codes and messages
    if (supabaseError) {
      const errMsg = supabaseError.message || '';
      const errStatus = supabaseError.status || 400;

      if (errMsg.toLowerCase().includes('already registered') || errMsg.toLowerCase().includes('already exists') || supabaseError.code === 'user_already_exists') {
        return NextResponse.json({ error: 'An account with this email address already exists.' }, { status: 409 });
      }

      if (errMsg.toLowerCase().includes('rate limit')) {
        return NextResponse.json({
          error: 'Email verification rate limit reached. Please wait a few minutes or verify your custom SMTP configuration in Supabase.',
          code: 'rate_limit_exceeded',
        }, { status: 429 });
      }

      if (errMsg.toLowerCase().includes('invalid')) {
        return NextResponse.json({ error: errMsg }, { status: 400 });
      }

      return NextResponse.json({ error: errMsg || 'Registration failed via identity provider.' }, { status: errStatus });
    }

    // Determine User ID
    const userId = supabaseUser?.id || `usr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    // 2. Initialize in local DB Store (idempotent, supports paper-trading, ledger, and watchlist)
    try {
      const passwordHash = await bcrypt.hash(password, 10);
      db.prepare(`
        INSERT INTO users (id, email, password_hash, full_name, role, virtual_cash, initial_capital, blocked_margin)
        VALUES (?, ?, ?, ?, 'USER', ?, ?, 0.0)
      `).run(userId, normalizedEmail, passwordHash, cleanFullName, initialCash, initialCash);

      // Ledger entry for ₹10L initial capital
      db.prepare(`
        INSERT INTO ledger_entries (id, user_id, direction, account_kind, amount_paise, ref_type, memo, created_at)
        VALUES (?, ?, 'CREDIT', 'CASH', ?, 'INITIAL_CAPITAL', 'Account creation virtual capital', CURRENT_TIMESTAMP)
      `).run(`led-${Date.now()}-init`, userId, Math.round(initialCash * 100));

      // Default Watchlist for new user
      const watchlistId = `wl-${Date.now()}`;
      db.prepare('INSERT INTO watchlists (id, user_id, name, is_default) VALUES (?, ?, ?, 1)').run(watchlistId, userId, 'Default Watchlist');
      db.prepare('INSERT INTO watchlist_items (id, watchlist_id, symbol) VALUES (?, ?, ?)').run(`wli-1-${Date.now()}`, watchlistId, 'RELIANCE');
      db.prepare('INSERT INTO watchlist_items (id, watchlist_id, symbol) VALUES (?, ?, ?)').run(`wli-2-${Date.now()}`, watchlistId, 'TCS');
      db.prepare('INSERT INTO watchlist_items (id, watchlist_id, symbol) VALUES (?, ?, ?)').run(`wli-3-${Date.now()}`, watchlistId, 'HDFCBANK');
      db.prepare('INSERT INTO watchlist_items (id, watchlist_id, symbol) VALUES (?, ?, ?)').run(`wli-4-${Date.now()}`, watchlistId, 'INFY');
    } catch {
      // Ignore unique constraint if user already initialized
    }

    // 3. Handle outcomes explicitly based on session availability vs email confirmation
    if (supabaseUser && !supabaseSession) {
      // User created, but Supabase requires email confirmation before session is granted
      return NextResponse.json({
        success: true,
        sessionAvailable: false,
        emailConfirmationRequired: true,
        message: 'Account created! Please check your email inbox and click the verification link before logging in.',
        user: {
          id: userId,
          email: normalizedEmail,
          fullName: cleanFullName,
          role: 'USER',
        },
      });
    }

    // Session is immediately available (or running local fallback)
    const token = await createSessionToken({ id: userId, email: normalizedEmail, role: 'USER' });

    const response = NextResponse.json({
      success: true,
      sessionAvailable: true,
      emailConfirmationRequired: false,
      user: {
        id: userId,
        email: normalizedEmail,
        fullName: cleanFullName,
        role: 'USER',
        virtualCash: initialCash,
        initialCapital: initialCash,
      },
    });

    response.cookies.set({
      name: 'maxlith_session',
      value: token,
      httpOnly: true,
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error: any) {
    console.error('Signup route error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to complete registration.' }, { status: 500 });
  }
}
