import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import db from '@/lib/db';
import { createSessionToken } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Please provide email and password.' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = db.prepare('SELECT id, email, password_hash, full_name, role, virtual_cash FROM users WHERE email = ?').get(normalizedEmail) as {
      id: string;
      email: string;
      password_hash: string;
      full_name: string;
      role: 'USER' | 'ADMIN';
      virtual_cash: number;
    } | undefined;

    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    const token = await createSessionToken({ id: user.id, email: user.email, role: user.role });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        virtualCash: user.virtual_cash
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
    console.error('Login error', error);
    return NextResponse.json({ error: 'Authentication failed.' }, { status: 500 });
  }
}
