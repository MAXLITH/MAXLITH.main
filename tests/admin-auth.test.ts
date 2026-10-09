import { describe, it, expect, beforeAll } from 'vitest';
import db from '../src/lib/db';
import bcrypt from 'bcryptjs';
import { POST as adminLoginHandler } from '../src/app/api/auth/admin-login/route';
import { POST as userLoginHandler } from '../src/app/api/auth/login/route';
import { GET as adminMetricsHandler } from '../src/app/api/admin/metrics/route';

describe('Admin Authentication & RBAC Authorization', () => {
  const regularUserId = `reg-user-${Date.now()}`;
  const regularEmail = `${regularUserId}@example.com`;
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@maxlith.com';
  const adminPass = process.env.ADMIN_PASSWORD || 'AdminSecurePass2026!';

  beforeAll(() => {
    // Seed regular user with USER role
    const passHash = bcrypt.hashSync('UserPassword123!', 10);
    db.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, role, virtual_cash, initial_capital, blocked_margin)
      VALUES (?, ?, ?, 'Regular User', 'USER', 1000000.0, 1000000.0, 0.0)
    `).run(regularUserId, regularEmail, passHash);
  });

  it('allows regular user login through standard user login API', async () => {
    const req = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: regularEmail, password: 'UserPassword123!' }),
    });

    const res = await userLoginHandler(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(['USER', 'TRADER']).toContain(data.user.role);
  });

  it('rejects regular user credentials on admin login API with 401', async () => {
    const req = new Request('http://localhost/api/auth/admin-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: regularEmail, password: 'UserPassword123!' }),
    });

    const res = await adminLoginHandler(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe('Invalid administrator credentials.');
  });

  it('allows valid administrator credentials on admin login API', async () => {
    const req = new Request('http://localhost/api/auth/admin-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: adminEmail, password: adminPass }),
    });

    const res = await adminLoginHandler(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.user.role).toBe('ADMIN');
  });

  it('rejects unauthenticated requests to protected admin APIs with 403', async () => {
    const res = await adminMetricsHandler();
    expect(res.status).toBe(403);
  });
});
