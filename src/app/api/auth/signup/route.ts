import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import db from '@/lib/db';
import { createSessionToken } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, fullName } = body;

    if (!email || !password || !fullName) {
      return NextResponse.json({ error: 'Missing required fields: email, password, fullName' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters long' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
    if (existing) {
      return NextResponse.json({ error: 'An account with this email address already exists.' }, { status: 409 });
    }

    const userId = `usr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const passwordHash = await bcrypt.hash(password, 10);
    const initialCash = Number(process.env.INITIAL_VIRTUAL_CAPITAL || 1000000.0);

    db.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, role, virtual_cash, initial_capital, blocked_margin)
      VALUES (?, ?, ?, ?, 'USER', ?, ?, 0.0)
    `).run(userId, normalizedEmail, passwordHash, fullName, initialCash, initialCash);

    // Double-entry ledger entry for initial capital deposit
    db.prepare(`
      INSERT INTO ledger_entries (id, user_id, direction, account_kind, amount_paise, ref_type, memo, created_at)
      VALUES (?, ?, 'CREDIT', 'CASH', ?, 'INITIAL_CAPITAL', 'Account creation virtual capital', CURRENT_TIMESTAMP)
    `).run(`led-${Date.now()}-init`, userId, Math.round(initialCash * 100));

    // Create default Watchlist for new user
    const watchlistId = `wl-${Date.now()}`;
    db.prepare('INSERT INTO watchlists (id, user_id, name) VALUES (?, ?, ?)').run(watchlistId, userId, 'My First Watchlist');
    db.prepare('INSERT INTO watchlist_items (id, watchlist_id, symbol) VALUES (?, ?, ?)').run(`wli-1-${Date.now()}`, watchlistId, 'RELIANCE');
    db.prepare('INSERT INTO watchlist_items (id, watchlist_id, symbol) VALUES (?, ?, ?)').run(`wli-2-${Date.now()}`, watchlistId, 'TCS');
    db.prepare('INSERT INTO watchlist_items (id, watchlist_id, symbol) VALUES (?, ?, ?)').run(`wli-3-${Date.now()}`, watchlistId, 'HDFCBANK');
    db.prepare('INSERT INTO watchlist_items (id, watchlist_id, symbol) VALUES (?, ?, ?)').run(`wli-4-${Date.now()}`, watchlistId, 'INFY');

    const token = await createSessionToken({ id: userId, email: normalizedEmail, role: 'USER' });

    const response = NextResponse.json({
      success: true,
      user: {
        id: userId,
        email: normalizedEmail,
        fullName,
        role: 'USER',
        virtualCash: initialCash,
        initialCapital: initialCash,
      }
    });

    response.cookies.set({
      name: 'maxlith_session',
      value: token,
      httpOnly: true,
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });

    return response;
  } catch (error: any) {
    console.error('Signup error', error);
    return NextResponse.json({ error: 'Failed to complete registration.' }, { status: 500 });
  }
}
