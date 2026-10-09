import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import db from './db';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'maxlith_dev_jwt_secret_998877665544332211'
);

export interface UserSession {
  id: string;
  email: string;
  fullName: string;
  role: 'USER' | 'ADMIN';
  virtualCash: number;
  initialCapital: number;
  blockedMargin: number;
}

export async function createSessionToken(user: { id: string; email: string; role: string }) {
  return await new SignJWT({ id: user.id, email: user.email, role: user.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

export async function verifySessionToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as { id: string; email: string; role: 'USER' | 'ADMIN' };
  } catch {
    return null;
  }
}

export async function getAuthSession(): Promise<UserSession | null> {
  let token: string | undefined;
  try {
    const cookieStore = await cookies();
    token = cookieStore.get('maxlith_session')?.value;
  } catch {
    return null;
  }
  if (!token) return null;

  const payload = await verifySessionToken(token);
  if (!payload) return null;

  const user = db.prepare('SELECT id, email, full_name, role, virtual_cash, initial_capital, blocked_margin FROM users WHERE id = ?').get(payload.id) as {
    id: string;
    email: string;
    full_name: string;
    role: 'USER' | 'ADMIN';
    virtual_cash: number;
    initial_capital?: number;
    blocked_margin?: number;
  } | undefined;

  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    fullName: user.full_name,
    role: user.role,
    virtualCash: user.virtual_cash,
    initialCapital: user.initial_capital ?? 1000000.0,
    blockedMargin: user.blocked_margin ?? 0.0,
  };
}

export async function requireAuthSession(): Promise<UserSession> {
  const session = await getAuthSession();
  if (!session) {
    throw new Error('UNAUTHORIZED');
  }
  return session;
}

export async function requireAdminSession(): Promise<UserSession> {
  const session = await requireAuthSession();
  if (session.role !== 'ADMIN') {
    throw new Error('FORBIDDEN_ADMIN_ONLY');
  }
  return session;
}
