import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import db from '@/lib/db';
import { newId } from '@/lib/ids';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const CreateAlertSchema = z.object({
  symbol: z.string().min(1),
  condition: z.enum(['ABOVE', 'BELOW']),
  targetValue: z.number().positive(),
});

export async function GET(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unreadOnly') === 'true';

    const unreadRow = db.prepare('SELECT COUNT(*) as cnt FROM notifications WHERE user_id = ? AND is_read = 0').get(session.id) as { cnt: number };
    const unreadCount = unreadRow ? unreadRow.cnt : 0;

    if (unreadOnly) {
      return NextResponse.json({ unreadCount });
    }

    const alerts = db.prepare('SELECT * FROM alerts WHERE user_id = ? ORDER BY created_at DESC').all(session.id);
    const notifications = db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 20').all(session.id);

    return NextResponse.json({
      alerts,
      notifications,
      unreadCount,
      data: { alerts, notifications, unreadCount },
    });
  } catch (error: any) {
    console.error('Alerts API error', error);
    return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = CreateAlertSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid alert parameters', details: parsed.error.format() }, { status: 400 });
    }

    const { symbol, condition, targetValue } = parsed.data;
    const symUpper = symbol.toUpperCase().trim();

    const inst = db.prepare('SELECT symbol, current_price FROM instruments WHERE symbol = ?').get(symUpper) as any;
    if (!inst) {
      return NextResponse.json({ error: `Instrument ${symUpper} not found.` }, { status: 404 });
    }

    const alertId = newId('alt');
    db.prepare(`
      INSERT INTO alerts (id, user_id, symbol, condition, target_value, is_triggered, created_at)
      VALUES (?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP)
    `).run(alertId, session.id, symUpper, condition, targetValue);

    return NextResponse.json({
      success: true,
      alert: {
        id: alertId,
        symbol: symUpper,
        condition,
        targetValue,
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create alert' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, condition, targetValue, markAllNotificationsRead } = body;

    if (markAllNotificationsRead) {
      db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(session.id);
      return NextResponse.json({ success: true, message: 'All notifications marked as read.' });
    }

    if (!id) {
      return NextResponse.json({ error: 'Alert id required.' }, { status: 400 });
    }

    db.prepare(`
      UPDATE alerts 
      SET condition = COALESCE(?, condition),
          target_value = COALESCE(?, target_value),
          is_triggered = 0
      WHERE id = ? AND user_id = ?
    `).run(condition || null, targetValue || null, id, session.id);

    return NextResponse.json({ success: true, message: 'Alert updated successfully.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update alert' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Alert id is required' }, { status: 400 });
    }

    db.prepare('DELETE FROM alerts WHERE id = ? AND user_id = ?').run(id, session.id);
    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to delete alert' }, { status: 500 });
  }
}
