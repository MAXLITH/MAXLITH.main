import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import db from '@/lib/db';
import { newId } from '@/lib/ids';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const requestedId = searchParams.get('watchlistId');

    let watchlists = db.prepare('SELECT * FROM watchlists WHERE user_id = ? ORDER BY created_at ASC').all(session.id) as { id: string; name: string }[];

    if (watchlists.length === 0) {
      const wlId = newId('wl');
      db.prepare('INSERT INTO watchlists (id, user_id, name) VALUES (?, ?, ?)').run(wlId, session.id, 'NIFTY Leaders');
      db.prepare('INSERT INTO watchlist_items (id, watchlist_id, symbol) VALUES (?, ?, ?)').run(newId('wli'), wlId, 'RELIANCE');
      db.prepare('INSERT INTO watchlist_items (id, watchlist_id, symbol) VALUES (?, ?, ?)').run(newId('wli'), wlId, 'TCS');
      db.prepare('INSERT INTO watchlist_items (id, watchlist_id, symbol) VALUES (?, ?, ?)').run(newId('wli'), wlId, 'HDFCBANK');
      watchlists = [{ id: wlId, name: 'NIFTY Leaders' }];
    }

    const activeWatchlist = (requestedId ? watchlists.find((w) => w.id === requestedId) : null) || watchlists[0];

    const items = db.prepare(`
      SELECT wi.id as item_id, i.*
      FROM watchlist_items wi
      JOIN instruments i ON wi.symbol = i.symbol
      WHERE wi.watchlist_id = ?
      ORDER BY wi.added_at DESC
    `).all(activeWatchlist.id);

    return NextResponse.json({
      watchlists,
      watchlist: activeWatchlist,
      items,
      data: {
        watchlists,
        activeWatchlist,
        items,
      },
    });
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
    const { symbol, name, watchlistId } = body;

    // Create a new named watchlist
    if (name && !symbol) {
      const newWlId = newId('wl');
      db.prepare('INSERT INTO watchlists (id, user_id, name) VALUES (?, ?, ?)').run(newWlId, session.id, name.trim());
      return NextResponse.json({ success: true, watchlist: { id: newWlId, name: name.trim() } });
    }

    if (!symbol) {
      return NextResponse.json({ error: 'Symbol or name is required.' }, { status: 400 });
    }

    // Target specific watchlist or default
    let targetWlId = watchlistId;
    if (!targetWlId) {
      const firstWl = db.prepare('SELECT id FROM watchlists WHERE user_id = ? ORDER BY created_at ASC LIMIT 1').get(session.id) as { id: string } | undefined;
      if (firstWl) {
        targetWlId = firstWl.id;
      } else {
        targetWlId = newId('wl');
        db.prepare('INSERT INTO watchlists (id, user_id, name) VALUES (?, ?, ?)').run(targetWlId, session.id, 'My Watchlist');
      }
    }

    const symUpper = symbol.toUpperCase().trim();
    const inst = db.prepare('SELECT symbol FROM instruments WHERE symbol = ?').get(symUpper);
    if (!inst) {
      return NextResponse.json({ error: `Instrument ${symUpper} not found.` }, { status: 404 });
    }

    const itemId = newId('wli');
    try {
      db.prepare('INSERT INTO watchlist_items (id, watchlist_id, symbol) VALUES (?, ?, ?)').run(itemId, targetWlId, symUpper);
    } catch {
      // Already in watchlist
    }

    return NextResponse.json({ success: true, symbol: symUpper, watchlistId: targetWlId });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to update watchlist' }, { status: 500 });
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
    const watchlistId = searchParams.get('watchlistId');
    const deleteList = searchParams.get('deleteList') === 'true';

    // Delete entire watchlist
    if (deleteList && watchlistId) {
      db.prepare('DELETE FROM watchlists WHERE id = ? AND user_id = ?').run(watchlistId, session.id);
      return NextResponse.json({ success: true, message: 'Watchlist deleted.' });
    }

    if (!symbol) {
      return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
    }

    const symUpper = symbol.toUpperCase().trim();
    if (watchlistId) {
      db.prepare('DELETE FROM watchlist_items WHERE watchlist_id = ? AND symbol = ?').run(watchlistId, symUpper);
    } else {
      // Remove from all user watchlists
      db.prepare(`
        DELETE FROM watchlist_items 
        WHERE symbol = ? AND watchlist_id IN (SELECT id FROM watchlists WHERE user_id = ?)
      `).run(symUpper, session.id);
    }

    return NextResponse.json({ success: true, symbol: symUpper });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to remove item from watchlist' }, { status: 500 });
  }
}
