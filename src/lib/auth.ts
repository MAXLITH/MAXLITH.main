import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import db from './db';
import { createClient } from '@/utils/supabase/server';

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
  // 1. Authoritative: Supabase Auth via @supabase/ssr session cookies
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: { user }, error } = await supabase.auth.getUser();

    if (user && !error) {
      const userId = user.id;
      const email = (user.email || '').toLowerCase().trim();
      const adminEmail = (process.env.ADMIN_EMAIL || 'admin@maxlith.com').toLowerCase().trim();
      const fullName = (user.user_metadata?.full_name as string) || email.split('@')[0] || 'Trader';
      const role: 'USER' | 'ADMIN' = (user.user_metadata?.role === 'ADMIN' || email === adminEmail) ? 'ADMIN' : 'USER';

      // Idempotently ensure user is present in memory store for paper trading & portfolio operations
      let dbUser = db.prepare('SELECT id, email, full_name, role, virtual_cash, initial_capital, blocked_margin FROM users WHERE id = ?').get(userId) as {
        id: string;
        email: string;
        full_name: string;
        role: 'USER' | 'ADMIN';
        virtual_cash: number;
        initial_capital?: number;
        blocked_margin?: number;
      } | undefined;

      if (!dbUser) {
        const initialCash = Number(process.env.INITIAL_VIRTUAL_CAPITAL || 1000000.0);
        db.prepare(`
          INSERT INTO users (id, email, password_hash, full_name, role, virtual_cash, initial_capital, blocked_margin)
          VALUES (?, ?, '', ?, ?, ?, ?, 0.0)
        `).run(userId, email, fullName, role, initialCash, initialCash);

        // Ensure default watchlist exists
        const defaultWl = db.prepare('SELECT id FROM watchlists WHERE user_id = ? AND is_default = 1').get(userId);
        if (!defaultWl) {
          const watchlistId = `wl-${Date.now()}`;
          db.prepare('INSERT INTO watchlists (id, user_id, name, is_default) VALUES (?, ?, ?, 1)').run(watchlistId, userId, 'Default Watchlist');
          db.prepare('INSERT INTO watchlist_items (id, watchlist_id, symbol) VALUES (?, ?, ?)').run(`wli-1-${Date.now()}`, watchlistId, 'RELIANCE');
          db.prepare('INSERT INTO watchlist_items (id, watchlist_id, symbol) VALUES (?, ?, ?)').run(`wli-2-${Date.now()}`, watchlistId, 'TCS');
          db.prepare('INSERT INTO watchlist_items (id, watchlist_id, symbol) VALUES (?, ?, ?)').run(`wli-3-${Date.now()}`, watchlistId, 'HDFCBANK');
          db.prepare('INSERT INTO watchlist_items (id, watchlist_id, symbol) VALUES (?, ?, ?)').run(`wli-4-${Date.now()}`, watchlistId, 'INFY');
        }

        dbUser = db.prepare('SELECT id, email, full_name, role, virtual_cash, initial_capital, blocked_margin FROM users WHERE id = ?').get(userId) as any;
      }

      return {
        id: userId,
        email,
        fullName: dbUser?.full_name || fullName,
        role: dbUser?.role || role,
        virtualCash: dbUser?.virtual_cash ?? 1000000.0,
        initialCapital: dbUser?.initial_capital ?? 1000000.0,
        blockedMargin: dbUser?.blocked_margin ?? 0.0,
      };
    }
  } catch {
    // If Supabase check encounters an error or running in standalone test environment, continue to fallback
  }

  // 2. Compatibility Fallback: Legacy/Admin signed session token
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
