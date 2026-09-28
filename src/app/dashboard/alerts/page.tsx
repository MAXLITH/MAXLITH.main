'use client';

import { useState } from 'react';
import { Bell, Plus, Trash2, CheckCircle2 } from 'lucide-react';

export default function AlertsPage() {
  const [alerts, setAlerts] = useState([
    { id: 'alt-1', symbol: 'RELIANCE', condition: 'ABOVE', targetValue: 3000.0, status: 'ACTIVE', createdAt: '2026-09-28' },
    { id: 'alt-2', symbol: 'TCS', condition: 'BELOW', targetValue: 4200.0, status: 'ACTIVE', createdAt: '2026-09-28' }
  ]);

  const [symbol, setSymbol] = useState('RELIANCE');
  const [condition, setCondition] = useState('ABOVE');
  const [targetValue, setTargetValue] = useState('');

  const handleCreateAlert = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetValue) return;

    const newAlert = {
      id: `alt-${Date.now()}`,
      symbol: symbol.toUpperCase(),
      condition,
      targetValue: parseFloat(targetValue),
      status: 'ACTIVE',
      createdAt: new Date().toISOString().split('T')[0]
    };

    setAlerts([newAlert, ...alerts]);
    setTargetValue('');
  };

  const handleDeleteAlert = (id: string) => {
    setAlerts(alerts.filter((a) => a.id !== id));
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
            className="py-2 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition-all flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Create Alert</span>
          </button>
        </form>
      </div>

      <div className="fintech-card p-5">
        <h2 className="text-sm font-bold text-white mb-3">Active Alerts ({alerts.length})</h2>
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
              {alerts.map((alt) => (
                <tr key={alt.id} className="hover:bg-slate-800/30">
                  <td className="py-3 px-3 font-bold text-white">{alt.symbol}</td>
                  <td className="py-3 px-3 text-slate-300">{alt.condition}</td>
                  <td className="py-3 px-3 text-right text-white font-bold">₹{alt.targetValue.toFixed(2)}</td>
                  <td className="py-3 px-3 text-right">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {alt.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => handleDeleteAlert(alt.id)}
                      className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
