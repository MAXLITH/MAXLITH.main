'use client';

import { useState, useEffect } from 'react';
import { Bell, Plus, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [symbol, setSymbol] = useState('RELIANCE');
  const [condition, setCondition] = useState('ABOVE');
  const [targetValue, setTargetValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchAlerts = async () => {
    try {
      const res = await fetch('/api/alerts');
      const data = await res.json();
      if (data.alerts) {
        setAlerts(data.alerts);
      }
      if (data.notifications) {
        setNotifications(data.notifications);
      }
    } catch (err) {
      console.error('Failed to fetch alerts', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetValue || submitting) return;

    setSubmitting(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: symbol.toUpperCase(),
          condition,
          targetValue: parseFloat(targetValue),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to create alert');
        return;
      }

      setTargetValue('');
      await fetchAlerts();
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAlert = async (id: string) => {
    try {
      const res = await fetch(`/api/alerts?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setAlerts((prev) => prev.filter((a) => a.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete alert', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-400" />
            <span>Price &amp; Market Alerts</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure automated threshold notifications for stock price breakouts and movements.
          </p>
        </div>
      </div>

      <div className="fintech-card p-5">
        <h2 className="text-sm font-bold text-white mb-3">Create New Price Alert</h2>
        <form onSubmit={handleCreateAlert} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">Symbol</label>
            <input
              type="text"
              required
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="w-full bg-[#0d121c] border border-slate-800 focus:border-blue-500 text-xs text-white rounded-lg px-3 py-2 outline-none font-mono uppercase"
            />
          </div>

          <div>
            <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">Condition</label>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              className="w-full bg-[#0d121c] border border-slate-800 focus:border-blue-500 text-xs text-white rounded-lg px-3 py-2 outline-none font-mono"
            >
              <option value="ABOVE">PRICE RISES ABOVE</option>
              <option value="BELOW">PRICE DROPS BELOW</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">Target Price (₹)</label>
            <input
              type="number"
              step="0.05"
              required
              value={targetValue}
              placeholder="e.g. 3000.00"
              onChange={(e) => setTargetValue(e.target.value)}
              className="w-full bg-[#0d121c] border border-slate-800 focus:border-blue-500 text-xs text-white rounded-lg px-3 py-2 outline-none font-mono"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="py-2 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            <span>Create Alert</span>
          </button>
        </form>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-mono flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="fintech-card p-5">
        <h2 className="text-sm font-bold text-white mb-3">Active Alerts ({alerts.length})</h2>
        {alerts.length === 0 ? (
          <div className="p-6 text-center text-slate-500 text-xs font-mono">
            No price alerts configured. Create one above to receive instant breakout notifications.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#0d121c] text-slate-400 text-[10px] uppercase border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Symbol</th>
                  <th className="py-2.5 px-3">Condition</th>
                  <th className="py-2.5 px-3 text-right">Target Value</th>
                  <th className="py-2.5 px-3 text-right">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {alerts.map((alt) => {
                  const target = alt.target_value ?? alt.targetValue ?? 0;
                  const isTriggered = alt.is_triggered === 1;
                  return (
                    <tr key={alt.id} className="hover:bg-slate-800/30">
                      <td className="py-3 px-3 font-bold text-white">{alt.symbol}</td>
                      <td className="py-3 px-3 text-slate-300">
                        {alt.condition === 'ABOVE' ? 'PRICE RISES ABOVE' : 'PRICE DROPS BELOW'}
                      </td>
                      <td className="py-3 px-3 text-right text-white font-bold">₹{Number(target).toFixed(2)}</td>
                      <td className="py-3 px-3 text-right">
                        <span className={`px-2 py-0.5 rounded text-[10px] ${
                          isTriggered
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}>
                          {isTriggered ? 'TRIGGERED' : 'ACTIVE'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => handleDeleteAlert(alt.id)}
                          className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                          title="Delete Alert"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {notifications.length > 0 && (
        <div className="fintech-card p-5 space-y-3">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Alert Triggered History</span>
          </h2>
          <div className="divide-y divide-slate-800/60 font-mono text-xs">
            {notifications.map((n) => (
              <div key={n.id} className="py-2.5 flex items-center justify-between">
                <div>
                  <span className="font-bold text-white">{n.title}</span>
                  <p className="text-[11px] text-slate-400 font-sans mt-0.5">{n.message}</p>
                </div>
                <span className="text-[10px] text-slate-500">
                  {n.created_at ? new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
