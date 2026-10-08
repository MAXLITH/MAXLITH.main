'use client';

import { useState } from 'react';
import { GripVertical, ListPlus, Plus, X } from 'lucide-react';
import type { MarketQuote, WatchlistEntry, WatchlistSummary } from './terminalTypes';

export default function Watchlist({
  lists,
  activeListId,
  entries,
  selectedSymbol,
  quotes,
  onListChange,
  onAddSelected,
  onRemove,
  onSelect,
  onCreateList,
  onRenameList,
  onDeleteList,
  onReorder,
}: {
  lists: WatchlistSummary[];
  activeListId: string;
  entries: WatchlistEntry[];
  selectedSymbol: string;
  quotes: Record<string, MarketQuote | undefined>;
  onListChange: (id: string) => void;
  onAddSelected: () => Promise<void>;
  onRemove: (symbol: string) => Promise<void>;
  onSelect: (entry: WatchlistEntry) => void;
  onCreateList: (name: string) => Promise<void>;
  onRenameList: (name: string) => Promise<void>;
  onDeleteList: () => Promise<void>;
  onReorder: (symbols: string[]) => Promise<void>;
}) {
  const [dragged, setDragged] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [listName, setListName] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [message, setMessage] = useState('');
  const activeList = lists.find((list) => list.id === activeListId);

  const act = async (action: () => Promise<void>) => {
    setMessage('');
    try { await action(); } catch (error) { setMessage(error instanceof Error ? error.message : 'Watchlist action failed.'); }
  };

  const reorder = async (target: string) => {
    if (!dragged || dragged === target) return;
    const symbols = entries.map((entry) => entry.id);
    const from = symbols.indexOf(dragged);
    const to = symbols.indexOf(target);
    if (from < 0 || to < 0) return;
    symbols.splice(to, 0, symbols.splice(from, 1)[0]);
    await act(() => onReorder(symbols));
    setDragged(null);
  };

  return (
    <section className="flex h-full min-h-[300px] flex-col rounded border border-max-border bg-max-bg-elevated">
      <div className="flex items-center justify-between border-b border-max-border px-3 py-3">
        <div><h2 className="text-[11px] font-semibold uppercase tracking-[0.13em] text-max-text-primary">Watchlist</h2><p className="mt-1 text-[9px] text-max-text-muted">Provider verified quotes only</p></div>
        <button type="button" title="Add selected instrument" onClick={() => void act(onAddSelected)} className="rounded p-1.5 text-max-text-secondary hover:bg-max-surface hover:text-white"><Plus className="h-3.5 w-3.5" /></button>
      </div>
      <div className="flex items-center gap-1.5 border-b border-max-border px-2.5 py-2">
        <select value={activeListId} onChange={(event) => onListChange(event.target.value)} aria-label="Select watchlist" className="h-7 min-w-0 flex-1 rounded border border-max-border bg-max-surface px-2 text-[10px] text-max-text-primary outline-none focus:border-max-brand-primary">
          {lists.map((list) => <option key={list.id} value={list.id}>{list.name}</option>)}
        </select>
        <button type="button" title="Create watchlist" onClick={() => setCreating(!creating)} className="rounded p-1 text-max-text-muted hover:bg-max-surface hover:text-white"><ListPlus className="h-3.5 w-3.5" /></button>
        <button type="button" title="Rename watchlist" onClick={() => { setListName(activeList?.name || ''); setRenaming(!renaming); }} className="rounded px-1 text-[10px] text-max-text-muted hover:bg-max-surface hover:text-white">Rename</button>
        <button type="button" title="Delete watchlist" onClick={() => void act(onDeleteList)} className="rounded p-1 text-max-text-muted hover:bg-rose-950/60 hover:text-max-market-negative"><X className="h-3.5 w-3.5" /></button>
      </div>
      {(creating || renaming) && (
        <form className="flex gap-1.5 border-b border-max-border p-2" onSubmit={(event) => {
          event.preventDefault();
          const action = creating ? onCreateList(listName) : onRenameList(listName);
          void act(() => action).then(() => { setCreating(false); setRenaming(false); setListName(''); });
        }}>
          <input autoFocus value={listName} onChange={(event) => setListName(event.target.value)} maxLength={48} placeholder="Watchlist name" className="min-w-0 flex-1 rounded border border-max-border bg-max-surface px-2 py-1.5 text-[10px] text-white outline-none focus:border-max-brand-primary" />
          <button type="submit" className="rounded bg-max-brand-primary px-2 text-[10px] font-semibold text-white">Save</button>
        </form>
      )}
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 border-b border-max-border px-3 py-2 text-[9px] uppercase tracking-wide text-max-text-muted"><span>Instrument</span><span className="text-right">Last / Chg%</span></div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {entries.map((entry) => {
          const quote = quotes[entry.id];
          const isSelected = entry.id === selectedSymbol;
          return (
            <div key={entry.id} draggable onDragStart={() => setDragged(entry.id)} onDragOver={(event) => event.preventDefault()} onDrop={() => void reorder(entry.id)} onDragEnd={() => setDragged(null)} className={`group flex items-center gap-1 border-b border-max-border px-2 py-2 ${isSelected ? 'bg-max-brand-primary/10 border-l-[3px] border-l-max-brand-primary' : 'hover:bg-max-surface-hover border-l-[3px] border-l-transparent'} ${dragged === entry.id ? 'opacity-40' : ''}`}>
              <GripVertical className="h-3 w-3 shrink-0 cursor-grab text-max-text-disabled group-hover:text-max-text-muted" />
              <button type="button" onClick={() => onSelect(entry)} className="min-w-0 flex-1 text-left">
                <span className="flex items-center gap-1.5"><span className={`truncate text-[11px] font-semibold ${isSelected ? 'text-max-brand-primary' : 'text-max-text-primary'}`}>{entry.symbol}</span><span className="text-[8px] text-max-text-disabled">{entry.exchange}</span></span>
                <span className="block truncate text-[9px] text-max-text-muted">{entry.name}</span>
              </button>
              <div className="min-w-[68px] text-right">
                <span className="block text-[10px] tabular-nums text-max-text-primary">{quote ? `₹${quote.last.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}</span>
                <span className={`block text-[9px] tabular-nums ${quote ? quote.changePercent >= 0 ? 'text-max-market-positive' : 'text-max-market-negative' : 'text-max-text-disabled'}`}>{quote ? `${quote.changePercent > 0 ? '+' : ''}${quote.changePercent.toFixed(2)}%` : 'NO FEED'}</span>
              </div>
              <button type="button" title={`Remove ${entry.symbol}`} onClick={() => void act(() => onRemove(entry.id))} className="rounded p-1 text-max-text-disabled opacity-0 hover:bg-max-surface-hover hover:text-max-market-negative group-hover:opacity-100"><X className="h-3 w-3" /></button>
            </div>
          );
        })}
        {!entries.length && <p className="px-3 py-8 text-center text-[10px] leading-5 text-max-text-muted">This watchlist is empty.<br />Search a verified instrument to add it.</p>}
      </div>
      <div className="border-t border-max-border px-3 py-2 text-[9px] text-max-text-disabled">Drag rows to reorder</div>
      {message && <div className="border-t border-rose-900/60 px-3 py-2 text-[10px] text-max-market-negative">{message}</div>}
    </section>
  );
}
