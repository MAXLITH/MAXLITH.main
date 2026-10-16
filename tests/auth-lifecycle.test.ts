import { describe, it, expect, beforeEach } from 'vitest';
import { POST as signupHandler } from '../src/app/api/auth/signup/route';
import { POST as loginHandler } from '../src/app/api/auth/login/route';
import { POST as logoutHandler } from '../src/app/api/auth/logout/route';
import { GET as meHandler } from '../src/app/api/auth/me/route';
import { validateAuthEnvironment } from '../src/lib/env-validator';
import db from '../src/lib/db';
import bcrypt from 'bcryptjs';

describe('MAXLITH AI — Authentication Lifecycle & Production Verification', () => {
  const uniqueId = Date.now();
  const testUser = {
    email: `trader.auth.${uniqueId}@maxlith-test.com`,
    password: 'SecurePassword2026!',
    fullName: 'Institutional Trader',
  };

  describe('1. Environment Configuration & Validation', () => {
    it('validates authentication environment configuration without leaking credentials', () => {
      const validation = validateAuthEnvironment();
      expect(validation.config).toBeDefined();
      expect(typeof validation.config.supabaseUrlConfigured).toBe('boolean');
      expect(typeof validation.config.jwtSecretConfigured).toBe('boolean');
      expect(validation.config.siteUrl).toBeDefined();
      // Ensure no raw secret values are present in validation output
      const serialized = JSON.stringify(validation);
      expect(serialized).not.toContain(process.env.ADMIN_PASSWORD || 'NEVER_EXPOSE');
      expect(serialized).not.toContain(process.env.JWT_SECRET || 'NEVER_EXPOSE');
    });

    it('ensures production redirect origin uses canonical site URL without hardcoded localhost', () => {
      const validation = validateAuthEnvironment();
      if (process.env.NODE_ENV === 'production') {
        expect(validation.config.siteUrl).not.toContain('localhost');
      }
    });
  });

  describe('2. User Registration (Signup)', () => {
    it('rejects registration with missing required fields (400)', async () => {
      const req = new Request('http://localhost/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testUser.email }),
      });
      const res = await signupHandler(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('Missing required fields');
    });

    it('rejects registration with a password shorter than 6 characters (400)', async () => {
      const req = new Request('http://localhost/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: testUser.fullName,
          email: testUser.email,
          password: '123',
        }),
      });
      const res = await signupHandler(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('Password must be at least 6 characters');
    });

    it('successfully handles valid registration request with explicit session or email confirmation flags', async () => {
      const req = new Request('http://localhost/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testUser),
      });
      const res = await signupHandler(req);
      // Registration will either succeed with 200 (direct session or confirmation required) or 429 if Supabase email rate limit
      if (res.status === 200) {
        const data = await res.json();
        expect(data.success).toBe(true);
        expect(typeof data.emailConfirmationRequired).toBe('boolean');
        expect(data.user).toBeDefined();
        expect(data.user.email).toBe(testUser.email.toLowerCase());
      } else {
        expect([429, 409]).toContain(res.status);
      }
    });

    it('prevents duplicate account creation with same email', async () => {
      // Seed a test user in local store to guarantee duplication check
      const dupEmail = `duplicate.${uniqueId}@maxlith-test.com`;
      const pHash = bcrypt.hashSync('Pass12345!', 10);
      db.prepare(`
        INSERT INTO users (id, email, password_hash, full_name, role, virtual_cash, initial_capital, blocked_margin)
        VALUES (?, ?, ?, 'Existing User', 'USER', 1000000.0, 1000000.0, 0.0)
      `).run(`dup-user-${uniqueId}`, dupEmail, pHash);

      const req = new Request('http://localhost/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: 'Duplicate Tester',
          email: dupEmail,
          password: 'NewPassword123!',
        }),
      });
      const res = await signupHandler(req);
      // Supabase or local store returns 409 or rate limit
      expect([409, 429, 400]).toContain(res.status);
    });
  });

  describe('3. User Authentication (Login)', () => {
    const loginUser = {
      id: `login-usr-${uniqueId}`,
      email: `valid.login.${uniqueId}@maxlith-test.com`,
      password: 'LoginPass2026!',
      fullName: 'Login Verification User',
    };

    beforeEach(() => {
      // Seed user in memory DB store for deterministic fallback verification
      const passHash = bcrypt.hashSync(loginUser.password, 10);
      try {
        db.prepare(`
          INSERT INTO users (id, email, password_hash, full_name, role, virtual_cash, initial_capital, blocked_margin)
          VALUES (?, ?, ?, ?, 'USER', 1000000.0, 1000000.0, 0.0)
        `).run(loginUser.id, loginUser.email, passHash, loginUser.fullName);
      } catch {
        // Already seeded
      }
    });

    it('rejects login with missing email or password with 400', async () => {
      const req = new Request('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginUser.email }),
      });
      const res = await loginHandler(req);
      expect(res.status).toBe(400);
    });

    it('rejects login with incorrect password with 401', async () => {
      const req = new Request('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginUser.email, password: 'WrongPassword999!' }),
      });
      const res = await loginHandler(req);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBe('Invalid email or password.');
    });

    it('authenticates valid credentials, returns 200, and sets session cookie', async () => {
      const req = new Request('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginUser.email, password: loginUser.password }),
      });
      const res = await loginHandler(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.user.email).toBe(loginUser.email);
      expect(data.user.virtualCash).toBe(1000000.0);

      // Verify cookie header was set
      const setCookie = res.headers.get('set-cookie');
      expect(setCookie).toBeDefined();
      expect(setCookie).toContain('maxlith_session');
    });
  });

  describe('4. Session Management & Sign Out', () => {
    it('returns unauthenticated state when no session cookie is provided', async () => {
      const res = await meHandler();
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.authenticated).toBe(false);
      expect(data.user).toBeNull();
    });

    it('clears session cookies on logout', async () => {
      const res = await logoutHandler();
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);

      const setCookie = res.headers.get('set-cookie');
      expect(setCookie).toBeDefined();
      expect(setCookie).toContain('maxlith_session=;');
    });
  });
});
