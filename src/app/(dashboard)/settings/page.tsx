import { getAuthSession } from '@/lib/auth';
import { Settings, ShieldCheck, User, RefreshCw } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const session = await getAuthSession();

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-blue-400" />
          <span>User &amp; Platform Settings</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Account details, role verification, and virtual capital preferences.
        </p>
      </div>

      <div className="fintech-card p-6 space-y-4">
        <h2 className="text-sm font-bold text-white border-b border-slate-800 pb-3">Profile Information</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
          <div>
            <span className="text-slate-500 text-[10px] block uppercase">Full Name</span>
            <span className="text-white font-bold text-sm">{session?.fullName}</span>
          </div>

          <div>
            <span className="text-slate-500 text-[10px] block uppercase">Email Address</span>
            <span className="text-white font-bold text-sm">{session?.email}</span>
          </div>

          <div>
            <span className="text-slate-500 text-[10px] block uppercase">Role Authorization</span>
            <span className="text-blue-400 font-bold text-sm">{session?.role}</span>
          </div>

          <div>
            <span className="text-slate-500 text-[10px] block uppercase">Environment Mode</span>
            <span className="text-emerald-400 font-bold text-sm">MAXLITH PAPER V1</span>
          </div>
        </div>
      </div>

      <div className="fintech-card p-6 space-y-4">
        <h2 className="text-sm font-bold text-white border-b border-slate-800 pb-3">Virtual Trading Settings</h2>
        <div className="flex items-center justify-between text-xs font-mono">
          <div>
            <span className="text-white font-bold block">Starting Virtual Capital</span>
            <span className="text-slate-400 text-[11px]">Default allocation for paper trading</span>
          </div>
          <span className="text-emerald-400 font-bold text-sm">₹10,00,000.00</span>
        </div>
      </div>
    </div>
  );
}
