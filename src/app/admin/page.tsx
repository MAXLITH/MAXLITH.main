import { redirect } from 'next/navigation';
import { requireAdminSession } from '@/lib/auth';
import db from '@/lib/db';
import { getMarketSessionStatus } from '@/lib/market-data';
import { ShieldAlert, Users, Database, Cpu, Activity, FileText, CheckCircle2, Lock } from 'lucide-react';

export default async function AdminDashboardPage() {
  let session;
  try {
    session = await requireAdminSession();
  } catch {
    redirect('/dashboard'); // Non-admin users redirected
  }

  const userCount = (db.prepare('SELECT COUNT(*) as cnt FROM users').get() as { cnt: number }).cnt;
  const ordersCount = (db.prepare('SELECT COUNT(*) as cnt FROM orders').get() as { cnt: number }).cnt;
  const aiRunsCount = (db.prepare('SELECT COUNT(*) as cnt FROM ai_agent_runs').get() as { cnt: number }).cnt;
  const instrumentsCount = (db.prepare('SELECT COUNT(*) as cnt FROM instruments').get() as { cnt: number }).cnt;

  const users = db.prepare('SELECT id, email, full_name, role, virtual_cash, created_at FROM users ORDER BY created_at DESC LIMIT 10').all() as any[];
  const recentOrders = db.prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT 10').all() as any[];
  const aiRuns = db.prepare('SELECT * FROM ai_agent_runs ORDER BY created_at DESC LIMIT 10').all() as any[];

  const marketSession = getMarketSessionStatus();

  return (
    <div className="min-h-screen bg-[#080b10] text-slate-100 p-8 space-y-8 font-sans">
      {/* Admin Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-purple-500/20 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-purple-400" />
            <h1 className="text-2xl font-bold text-white tracking-tight">MAXLITH Admin Telemetry Control Room</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            System diagnostics, active database metrics, AI agent token logs, and user access control.
          </p>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="px-3 py-1.5 rounded bg-purple-950/40 border border-purple-500/30 text-purple-300">
            ADMIN: {session.fullName} ({session.email})
          </div>
        </div>
      </div>

      {/* SYSTEM TELEMETRY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="fintech-card p-5 border-t-2 border-t-purple-500">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Registered Users</span>
            <Users className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">{userCount}</div>
          <div className="text-[11px] font-mono text-slate-500 mt-1">Role-Based Access (RBAC)</div>
        </div>

        <div className="fintech-card p-5 border-t-2 border-t-blue-500">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Total Paper Orders</span>
            <FileText className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">{ordersCount}</div>
          <div className="text-[11px] font-mono text-slate-500 mt-1">ACID SQLite Transactions</div>
        </div>

        <div className="fintech-card p-5 border-t-2 border-t-emerald-500">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>AI Agent Runs</span>
            <Cpu className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">{aiRunsCount}</div>
          <div className="text-[11px] font-mono text-slate-500 mt-1">Multi-Agent Orchestrations</div>
        </div>

        <div className="fintech-card p-5 border-t-2 border-t-amber-500">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Market Session</span>
            <Activity className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-lg font-bold font-mono text-amber-400">{marketSession.session}</div>
          <div className="text-[10px] font-mono text-slate-500 mt-1">{marketSession.currentTimeIST}</div>
        </div>
      </div>

      {/* DATABASE & SYSTEM DIAGNOSTICS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* System Health */}
        <div className="fintech-card p-5 space-y-4">
          <h2 className="text-sm font-bold text-white font-mono flex items-center gap-2">
            <Database className="w-4 h-4 text-purple-400" />
            <span>Database Telemetry</span>
          </h2>
          <div className="space-y-3 font-mono text-xs">
            <div className="p-3 rounded bg-[#0d121c] border border-slate-800 flex justify-between">
              <span className="text-slate-400">Database Engine:</span>
              <span className="text-emerald-400 font-bold">SQLite 3 (WAL Mode)</span>
            </div>
            <div className="p-3 rounded bg-[#0d121c] border border-slate-800 flex justify-between">
              <span className="text-slate-400">System Status:</span>
              <span className="text-emerald-400 font-bold">100% OPERATIONAL</span>
            </div>
            <div className="p-3 rounded bg-[#0d121c] border border-slate-800 flex justify-between">
              <span className="text-slate-400">Tracked Securities:</span>
              <span className="text-white font-bold">{instrumentsCount} Instruments</span>
            </div>
          </div>
        </div>

        {/* User Management Table */}
        <div className="lg:col-span-2 fintech-card p-5">
          <h2 className="text-sm font-bold text-white mb-4 font-mono">User Accounts Ledger</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#0d121c] text-slate-400 text-[10px] uppercase border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">User ID</th>
                  <th className="py-2.5 px-3">Full Name</th>
                  <th className="py-2.5 px-3">Email</th>
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3 text-right">Virtual Cash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/30">
                    <td className="py-3 px-3 text-slate-500 text-[10px]">{u.id}</td>
                    <td className="py-3 px-3 font-bold text-white">{u.full_name}</td>
                    <td className="py-3 px-3 text-slate-400">{u.email}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] ${u.role === 'ADMIN' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'bg-blue-500/10 text-blue-400'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right text-emerald-400 font-bold">
                      ₹{u.virtual_cash.toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
