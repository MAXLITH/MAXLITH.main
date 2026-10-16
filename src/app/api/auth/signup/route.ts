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

    const existing = db.prepare('SELECT id, email, password_hash, full_name, role, virtual_cash, initial_capital FROM users WHERE email = ?').get(normalizedEmail) as {
      id: string;
      email: string;
      password_hash: string;
      full_name: string;
      role: string;
      virtual_cash: number;
      initial_capital: number;
    } | undefined;

    if (existing) {
      // If user provided the correct existing password or requested reset, log them in seamlessly
      const passwordMatches = await bcrypt.compare(password, existing.password_hash);
      const allowReset = body.resetKey === true || body.overwrite === true;

      if (passwordMatches || allowReset) {
        if (allowReset && !passwordMatches) {
          const newHash = await bcrypt.hash(password, 10);
          db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, existing.id);
        }

        const token = await createSessionToken({
          id: existing.id,
          email: existing.email,
          role: existing.role || 'USER',
          fullName: existing.full_name,
          virtualCash: existing.virtual_cash ?? 1000000.0,
          initialCapital: existing.initial_capital ?? 1000000.0,
        });

        const response = NextResponse.json({
          success: true,
          message: 'Account verified. Access granted.',
          user: {
            id: existing.id,
            email: existing.email,
            fullName: existing.full_name,
            role: existing.role || 'USER',
            virtualCash: existing.virtual_cash ?? 1000000.0,
            initialCapital: existing.initial_capital ?? 1000000.0,
          }
        });

        response.cookies.set({
          name: 'maxlith_session',
          value: token,
          httpOnly: true,
          path: '/',
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7
        });

        return response;
      }

      return NextResponse.json({
        error: 'An account with this email address already exists. Please sign in, or click "Reset Key" to update your password.',
        code: 'ACCOUNT_EXISTS'
      }, { status: 409 });
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

    const token = await createSessionToken({
      id: userId,
      email: normalizedEmail,
      role: 'USER',
      fullName,
      virtualCash: initialCash,
      initialCapital: initialCash,
    });

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
