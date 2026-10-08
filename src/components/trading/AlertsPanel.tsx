'use client';

export interface AlertRow {
  id: string;
  symbol: string;
  condition: string;
  target_value: number;
  is_triggered: number | boolean;
  created_at?: string;
}

export default function AlertsPanel({ alerts }: { alerts: AlertRow[] }) {
  return <div className="overflow-x-auto">
    <table className="w-full min-w-[430px] text-left text-[10px]">
      <thead className="text-[9px] uppercase tracking-wide text-max-text-muted"><tr>{['Instrument', 'Condition', 'Target', 'Status'].map((heading) => <th key={heading} className="px-3 py-2 font-medium">{heading}</th>)}</tr></thead>
      <tbody className="divide-y divide-slate-800/70">{alerts.map((alert) => <tr key={alert.id} className="text-max-text-primary"><td className="px-3 py-2 font-semibold text-slate-100">{alert.symbol}</td><td className="px-3 py-2">{alert.condition}</td><td className="px-3 py-2 tabular-nums">₹{Number(alert.target_value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td><td className="px-3 py-2">{alert.is_triggered ? 'Triggered' : 'Active'}</td></tr>)}</tbody>
    </table>
    {!alerts.length && <p className="px-3 py-3 text-center text-[10px] text-max-text-muted">No price alerts recorded.</p>}
  </div>;
}
