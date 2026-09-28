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
    const initialCash = 1000000.0; // ₹10,00,000 Virtual Capital

    db.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, role, virtual_cash)
      VALUES (?, ?, ?, ?, 'USER', ?)
    `).run(userId, normalizedEmail, passwordHash, fullName, initialCash);

    // Create default Watchlist for new user
    const watchlistId = `wl-${Date.now()}`;
    db.prepare('INSERT INTO watchlists (id, user_id, name) VALUES (?, ?, ?)').run(watchlistId, userId, 'My First Watchlist');
    db.prepare('INSERT INTO watchlist_items (id, watchlist_id, symbol) VALUES (?, ?, ?)').run(`wli-1-${Date.now()}`, watchlistId, 'RELIANCE');
    db.prepare('INSERT INTO watchlist_items (id, watchlist_id, symbol) VALUES (?, ?, ?)').run(`wli-2-${Date.now()}`, watchlistId, 'TCS');

    const token = await createSessionToken({ id: userId, email: normalizedEmail, role: 'USER' });

    const response = NextResponse.json({
      success: true,
      user: {
        id: userId,
        email: normalizedEmail,
        fullName,
        role: 'USER',
        virtualCash: initialCash
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
