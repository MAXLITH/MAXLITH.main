import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import db from '@/lib/db';

export async function GET() {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let watchlist = db.prepare('SELECT * FROM watchlists WHERE user_id = ?').get(session.id) as { id: string; name: string } | undefined;

    if (!watchlist) {
      const wlId = `wl-${Date.now()}`;
      db.prepare('INSERT INTO watchlists (id, user_id, name) VALUES (?, ?, ?)').run(wlId, session.id, 'My Watchlist');
      db.prepare('INSERT INTO watchlist_items (id, watchlist_id, symbol) VALUES (?, ?, ?)').run(`wli-1-${Date.now()}`, wlId, 'RELIANCE');
      db.prepare('INSERT INTO watchlist_items (id, watchlist_id, symbol) VALUES (?, ?, ?)').run(`wli-2-${Date.now()}`, wlId, 'TCS');
      watchlist = { id: wlId, name: 'My Watchlist' };
    }

    const items = db.prepare(`
      SELECT wi.id as item_id, i.*
      FROM watchlist_items wi
      JOIN instruments i ON wi.symbol = i.symbol
      WHERE wi.watchlist_id = ?
      ORDER BY wi.added_at DESC
    `).all(watchlist.id);

    return NextResponse.json({ watchlist, items });
  } catch (error: any) {
    console.error('Watchlist API error', error);
    return NextResponse.json({ error: 'Failed to fetch watchlist' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { symbol } = body;

    if (!symbol) {
      return NextResponse.json({ error: 'Symbol is required.' }, { status: 400 });
    }

    let watchlist = db.prepare('SELECT id FROM watchlists WHERE user_id = ?').get(session.id) as { id: string } | undefined;
    if (!watchlist) {
      const wlId = `wl-${Date.now()}`;
      db.prepare('INSERT INTO watchlists (id, user_id, name) VALUES (?, ?, ?)').run(wlId, session.id, 'My Watchlist');
      watchlist = { id: wlId };
    }

    const itemId = `wli-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    try {
      db.prepare('INSERT INTO watchlist_items (id, watchlist_id, symbol) VALUES (?, ?, ?)').run(itemId, watchlist.id, symbol.toUpperCase());
    } catch {
      // Already exists
    }

    return NextResponse.json({ success: true, symbol: symbol.toUpperCase() });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to add item to watchlist' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');

    if (!symbol) {
      return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
    }

    const watchlist = db.prepare('SELECT id FROM watchlists WHERE user_id = ?').get(session.id) as { id: string } | undefined;
    if (watchlist) {
      db.prepare('DELETE FROM watchlist_items WHERE watchlist_id = ? AND symbol = ?').run(watchlist.id, symbol.toUpperCase());
    }

    return NextResponse.json({ success: true, symbol: symbol.toUpperCase() });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to remove item from watchlist' }, { status: 500 });
  }
}
