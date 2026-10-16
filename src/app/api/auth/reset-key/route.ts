import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import db from '@/lib/db';
import { createSessionToken } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, newPassword } = body;

    if (!email || !newPassword) {
      return NextResponse.json({ error: 'Please provide email and new access key (password).' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'New access key must be at least 6 characters long.' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    let user = db.prepare('SELECT id, email, full_name, role, virtual_cash, initial_capital FROM users WHERE email = ?').get(normalizedEmail) as {
      id: string;
      email: string;
      full_name: string;
      role: string;
      virtual_cash: number;
      initial_capital: number;
    } | undefined;

    const passwordHash = await bcrypt.hash(newPassword, 10);

    if (user) {
      // Update existing user password
      db.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(passwordHash, user.id);
    } else {
      // Create user if not existing
      const userId = `usr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const initialCash = Number(process.env.INITIAL_VIRTUAL_CAPITAL || 1000000.0);
      user = {
        id: userId,
        email: normalizedEmail,
        full_name: normalizedEmail.split('@')[0],
        role: 'USER',
        virtual_cash: initialCash,
        initial_capital: initialCash,
      };

      db.prepare(`
        INSERT INTO users (id, email, password_hash, full_name, role, virtual_cash, initial_capital, blocked_margin)
        VALUES (?, ?, ?, ?, 'USER', ?, ?, 0.0)
      `).run(userId, normalizedEmail, passwordHash, user.full_name, initialCash, initialCash);
    }

    const token = await createSessionToken({
      id: user.id,
      email: user.email,
      role: user.role || 'USER',
      fullName: user.full_name,
      virtualCash: user.virtual_cash ?? 1000000.0,
      initialCapital: user.initial_capital ?? 1000000.0,
    });

    const response = NextResponse.json({
      success: true,
      message: 'Access key updated successfully. Session initialized.',
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role || 'USER',
        virtualCash: user.virtual_cash ?? 1000000.0,
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
  } catch (error: any) {
    console.error('Reset key error', error);
    return NextResponse.json({ error: error.message || 'Failed to update access key.' }, { status: 500 });
  }
}
