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
  const cookieStore = await cookies();
  const token = cookieStore.get('maxlith_session')?.value;
  if (!token) return null;

  const payload = await verifySessionToken(token);
  if (!payload) return null;

  const user = db.prepare('SELECT id, email, full_name, role, virtual_cash FROM users WHERE id = ?').get(payload.id) as {
    id: string;
    email: string;
    full_name: string;
    role: 'USER' | 'ADMIN';
    virtual_cash: number;
  } | undefined;

  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    fullName: user.full_name,
    role: user.role,
    virtualCash: user.virtual_cash,
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
