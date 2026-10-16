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

export async function createSessionToken(user: {
  id: string;
  email: string;
  role: string;
  fullName?: string;
  virtualCash?: number;
  initialCapital?: number;
  blockedMargin?: number;
}) {
  return await new SignJWT({
    id: user.id,
    email: user.email,
    role: user.role,
    fullName: user.fullName || 'Institutional Trader',
    virtualCash: user.virtualCash ?? 1000000.0,
    initialCapital: user.initialCapital ?? 1000000.0,
    blockedMargin: user.blockedMargin ?? 0.0,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

export async function verifySessionToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as {
      id: string;
      email: string;
      role: 'USER' | 'ADMIN';
      fullName?: string;
      virtualCash?: number;
      initialCapital?: number;
      blockedMargin?: number;
    };
  } catch {
    return null;
  }
}

export async function getAuthSession(): Promise<UserSession | null> {
  let cookieStore: Awaited<ReturnType<typeof cookies>> | undefined;
  let token: string | undefined;
  try {
    cookieStore = await cookies();
    token = cookieStore.get('maxlith_session')?.value;
  } catch {
    return null;
  }

  // 1. If maxlith_session JWT exists, verify and extract session
  if (token) {
    const payload = await verifySessionToken(token);
    if (payload && payload.id && payload.email) {
      let user = db.prepare('SELECT id, email, full_name, role, virtual_cash, initial_capital, blocked_margin FROM users WHERE id = ?').get(payload.id) as {
        id: string;
        email: string;
        full_name: string;
        role: 'USER' | 'ADMIN';
        virtual_cash: number;
        initial_capital?: number;
        blocked_margin?: number;
      } | undefined;

      // Serverless lambda fallback: if in-memory store in this instance hasn't recorded the user, reconstruct from signed JWT
      if (!user) {
        user = {
          id: payload.id,
          email: payload.email,
          full_name: payload.fullName || 'Institutional Trader',
          role: payload.role || 'USER',
          virtual_cash: Number(payload.virtualCash ?? 1000000.0),
          initial_capital: Number(payload.initialCapital ?? 1000000.0),
          blocked_margin: Number(payload.blockedMargin ?? 0.0),
        };
        try {
          db.prepare(`
            INSERT INTO users (id, email, password_hash, full_name, role, virtual_cash, initial_capital, blocked_margin)
            VALUES (?, ?, '', ?, ?, ?, ?, ?)
          `).run(user.id, user.email, user.full_name, user.role, user.virtual_cash, user.initial_capital, user.blocked_margin);
        } catch {}
      }

      return {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        virtualCash: Number(user.virtual_cash ?? 1000000.0),
        initialCapital: Number(user.initial_capital ?? 1000000.0),
        blockedMargin: Number(user.blocked_margin ?? 0.0),
      };
    }
  }

  // 2. Check Supabase session fallback if Supabase auth cookie exists
  if (cookieStore) {
    try {
      const { createClient } = await import('@/utils/supabase/server');
      const supabase = createClient(cookieStore);
      const { data: { user: sbUser } } = await supabase.auth.getUser();
      if (sbUser && sbUser.email) {
        return {
          id: sbUser.id,
          email: sbUser.email,
          fullName: sbUser.user_metadata?.full_name || sbUser.email.split('@')[0],
          role: (sbUser.user_metadata?.role || 'USER') as 'USER' | 'ADMIN',
          virtualCash: 1000000.0,
          initialCapital: 1000000.0,
          blockedMargin: 0.0,
        };
      }
    } catch {
      // Ignore Supabase auth check errors
    }
  }

  return null;
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
