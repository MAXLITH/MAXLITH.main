import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import db from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function GET() {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ authenticated: false, user: null });
    }
    return NextResponse.json({ authenticated: true, user: session });
  } catch {
    return NextResponse.json({ authenticated: false, user: null });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { fullName, currentPassword, newPassword } = body;

    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json({ error: 'Current password is required to change password.' }, { status: 400 });
      }
      if (newPassword.length < 6) {
        return NextResponse.json({ error: 'New password must be at least 6 characters long.' }, { status: 400 });
      }

      const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(session.id) as { password_hash: string } | undefined;
      if (!user || !bcrypt.compareSync(currentPassword, user.password_hash)) {
        return NextResponse.json({ error: 'Incorrect current password.' }, { status: 400 });
      }

      const newHash = bcrypt.hashSync(newPassword, 10);
      db.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newHash, session.id);
    }

    if (fullName && typeof fullName === 'string' && fullName.trim().length > 0) {
      db.prepare('UPDATE users SET full_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(fullName.trim(), session.id);
    }

    return NextResponse.json({ success: true, message: 'Profile updated successfully.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update profile' }, { status: 500 });
  }
}

