import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import db from '@/lib/db';
import { newId } from '@/lib/ids';
import { MarketDataUnavailableError } from '@/lib/market-data/provider';
import { marketDataProviderFromEnvironment } from '@/lib/market-data/rest-provider';
import { normalizeSymbol, parseSymbol } from '@/lib/tradingview/symbols';

export const dynamic = 'force-dynamic';

function errorResponse(error: unknown) {
  if (error instanceof MarketDataUnavailableError) {
    return NextResponse.json({ error: error.message, code: 'PROVIDER_UNAVAILABLE' }, { status: 503 });
  }
  console.error('Watchlist API error', error);
  return NextResponse.json({ error: 'Unable to update the watchlist.' }, { status: 502 });
}

function isOwnedWatchlist(watchlistId: string, userId: string) {
  return db.prepare('SELECT id FROM watchlists WHERE id = ? AND user_id = ?').get(watchlistId, userId) as { id: string } | undefined;
}

export async function GET(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const requestedId = new URL(request.url).searchParams.get('watchlistId');
    let watchlists = db.prepare('SELECT id, name FROM watchlists WHERE user_id = ? ORDER BY created_at ASC').all(session.id) as { id: string; name: string }[];
    if (watchlists.length === 0) {
      const id = newId('wl');
      db.prepare('INSERT INTO watchlists (id, user_id, name) VALUES (?, ?, ?)').run(id, session.id, 'My Watchlist');
      watchlists = [{ id, name: 'My Watchlist' }];
    }

    const activeWatchlist = requestedId ? watchlists.find((list) => list.id === requestedId) : watchlists[0];
    if (!activeWatchlist) return NextResponse.json({ error: 'Watchlist not found.' }, { status: 404 });

    const items = db.prepare(`
      SELECT wi.id AS item_id, wi.symbol, wi.position,
        substr(wi.symbol, 1, 3) AS exchange,
        substr(wi.symbol, 5) AS ticker,
        COALESCE(i.name, substr(wi.symbol, 5)) AS name,
        i.sector
      FROM watchlist_items wi
      LEFT JOIN instruments i
        ON i.symbol = substr(wi.symbol, 5)
        AND i.exchange = substr(wi.symbol, 1, 3)
      WHERE wi.watchlist_id = ?
      ORDER BY wi.position ASC, wi.added_at ASC
    `).all(activeWatchlist.id);

    return NextResponse.json({
      watchlists,
      watchlist: activeWatchlist,
      items,
      data: { watchlists, activeWatchlist, items },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json() as { symbol?: unknown; name?: unknown; watchlistId?: unknown };
    if (typeof body.name === 'string' && !body.symbol) {
      const name = body.name.trim().slice(0, 48);
      if (!name) return NextResponse.json({ error: 'Watchlist name is required.' }, { status: 400 });
      const id = newId('wl');
      db.prepare('INSERT INTO watchlists (id, user_id, name) VALUES (?, ?, ?)').run(id, session.id, name);
      return NextResponse.json({ success: true, watchlist: { id, name } });
    }

    if (typeof body.symbol !== 'string') return NextResponse.json({ error: 'Symbol is required.' }, { status: 400 });
    const symbol = normalizeSymbol(body.symbol);
    const provider = marketDataProviderFromEnvironment();
    if (!provider) throw new MarketDataUnavailableError('Symbol verification requires a configured market-data provider.');
    const instrument = await provider.resolveSymbol(symbol);
    if (!instrument) return NextResponse.json({ error: `Instrument ${symbol} was not found by the provider.` }, { status: 404 });

    let watchlistId = typeof body.watchlistId === 'string' ? body.watchlistId : undefined;
    if (watchlistId && !isOwnedWatchlist(watchlistId, session.id)) {
      return NextResponse.json({ error: 'Watchlist not found.' }, { status: 404 });
    }
    if (!watchlistId) {
      const existing = db.prepare('SELECT id FROM watchlists WHERE user_id = ? ORDER BY created_at ASC LIMIT 1').get(session.id) as { id: string } | undefined;
      watchlistId = existing?.id || newId('wl');
      if (!existing) db.prepare('INSERT INTO watchlists (id, user_id, name) VALUES (?, ?, ?)').run(watchlistId, session.id, 'My Watchlist');
    }

    const nextPosition = (db.prepare('SELECT COALESCE(MAX(position), -1) + 1 AS value FROM watchlist_items WHERE watchlist_id = ?').get(watchlistId) as { value: number }).value;
    db.prepare('INSERT OR IGNORE INTO watchlist_items (id, watchlist_id, symbol, position) VALUES (?, ?, ?, ?)')
      .run(newId('wli'), watchlistId, normalizeSymbol(`${parseSymbol(symbol).exchange}:${instrument.symbol}`), nextPosition);

    return NextResponse.json({ success: true, symbol, watchlistId });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await request.json() as { watchlistId?: unknown; name?: unknown; symbols?: unknown };
    if (typeof body.watchlistId !== 'string' || !isOwnedWatchlist(body.watchlistId, session.id)) {
      return NextResponse.json({ error: 'Watchlist not found.' }, { status: 404 });
    }

    if (typeof body.name === 'string') {
      const name = body.name.trim().slice(0, 48);
      if (!name) return NextResponse.json({ error: 'Watchlist name is required.' }, { status: 400 });
      db.prepare('UPDATE watchlists SET name = ? WHERE id = ? AND user_id = ?').run(name, body.watchlistId, session.id);
      return NextResponse.json({ success: true, watchlist: { id: body.watchlistId, name } });
    }

    if (!Array.isArray(body.symbols) || !body.symbols.every((value): value is string => typeof value === 'string')) {
      return NextResponse.json({ error: 'An ordered symbol list is required.' }, { status: 400 });
    }
    const symbols = body.symbols.map((value) => normalizeSymbol(value));
    if (new Set(symbols).size !== symbols.length) return NextResponse.json({ error: 'Duplicate symbols are not allowed.' }, { status: 400 });
    const current = (db.prepare('SELECT symbol FROM watchlist_items WHERE watchlist_id = ? ORDER BY position, added_at').all(body.watchlistId) as { symbol: string }[]).map((item) => item.symbol);
    if (symbols.length !== current.length || symbols.some((symbol) => !current.includes(symbol))) {
      return NextResponse.json({ error: 'The reorder request must include every current watchlist item once.' }, { status: 400 });
    }
    const updatePosition = db.prepare('UPDATE watchlist_items SET position = ? WHERE watchlist_id = ? AND symbol = ?');
    db.transaction(() => symbols.forEach((symbol, position) => updatePosition.run(position, body.watchlistId, symbol)))();
    return NextResponse.json({ success: true, symbols });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const params = new URL(request.url).searchParams;
    const symbol = params.get('symbol');
    const watchlistId = params.get('watchlistId');
    if (params.get('deleteList') === 'true') {
      if (!watchlistId || !isOwnedWatchlist(watchlistId, session.id)) return NextResponse.json({ error: 'Watchlist not found.' }, { status: 404 });
      db.prepare('DELETE FROM watchlists WHERE id = ? AND user_id = ?').run(watchlistId, session.id);
      return NextResponse.json({ success: true, message: 'Watchlist deleted.' });
    }
    if (!symbol) return NextResponse.json({ error: 'Symbol is required.' }, { status: 400 });

    const canonical = normalizeSymbol(symbol);
    if (watchlistId) {
      if (!isOwnedWatchlist(watchlistId, session.id)) return NextResponse.json({ error: 'Watchlist not found.' }, { status: 404 });
      db.prepare('DELETE FROM watchlist_items WHERE watchlist_id = ? AND symbol = ?').run(watchlistId, canonical);
    } else {
      db.prepare(`
        DELETE FROM watchlist_items
        WHERE symbol = ? AND watchlist_id IN (SELECT id FROM watchlists WHERE user_id = ?)
      `).run(canonical, session.id);
    }
    return NextResponse.json({ success: true, symbol: canonical });
  } catch (error) {
    return errorResponse(error);
  }
}
