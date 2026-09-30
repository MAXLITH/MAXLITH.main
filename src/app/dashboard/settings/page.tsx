import { getAuthSession } from '@/lib/auth';
import { Settings, ShieldCheck, User, RefreshCw } from 'lucide-react';
'use client';

export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { Settings, ShieldCheck, User, RefreshCw, AlertTriangle, CheckCircle2, Lock, Bell, Check } from 'lucide-react';

export default async function SettingsPage() {
  const session = await getAuthSession();
export default function SettingsPage() {
  const [user, setUser] = useState<any>(null);
  const [startingCapital, setStartingCapital] = useState('1000000');
  const [resetting, setResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetError, setResetError] = useState('');

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordUpdating, setPasswordUpdating] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Notification preferences
  const [notifAlerts, setNotifAlerts] = useState(true);
  const [notifFills, setNotifFills] = useState(true);
  const [notifMarket, setNotifMarket] = useState(false);

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data.authenticated && data.user) {
        setUser(data.user);
        if (data.user.initialCapital) {
          setStartingCapital(data.user.initialCapital.toString());
        }
      }
    } catch (err) {
      console.error('Failed to load user profile', err);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const handleResetAccount = async () => {
    if (!confirm('Are you sure you want to reset your paper trading account? This will cancel all open orders, close all positions, and reset your virtual wallet balance.')) {
      return;
    }

    setResetting(true);
    setResetSuccess(false);
    setResetError('');

    try {
      const amount = parseFloat(startingCapital) || 1000000;
      const res = await fetch('/api/paper-trading/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startingCapital: amount }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResetError(data.error || 'Failed to reset account');
      } else {
        setResetSuccess(true);
        await fetchUser();
        // Discard success notice after 4 seconds
        setTimeout(() => setResetSuccess(false), 4000);
      }
    } catch (err: any) {
      setResetError(err.message || 'Reset failed');
    } finally {
      setResetting(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess(false);

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters.');
      return;
    }

    setPasswordUpdating(true);
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setPasswordError(data.error || 'Failed to update password');
      } else {
        setPasswordSuccess(true);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setPasswordSuccess(false), 4000);
      }
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to update password');
    } finally {
      setPasswordUpdating(false);
    }
  };

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

      {/* Profile Information */}
      <div className="fintech-card p-6 space-y-4">
        <h2 className="text-sm font-bold text-white border-b border-slate-800 pb-3">Profile Information</h2>
        <h2 className="text-sm font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
          <User className="w-4 h-4 text-blue-400" />
          <span>Profile Information</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
          <div>
            <span className="text-slate-500 text-[10px] block uppercase">Full Name</span>
            <span className="text-white font-bold text-sm">{session?.fullName}</span>
            <span className="text-white font-bold text-sm">{user?.fullName || 'Active User'}</span>
          </div>

          <div>
            <span className="text-slate-500 text-[10px] block uppercase">Email Address</span>
            <span className="text-white font-bold text-sm">{session?.email}</span>
            <span className="text-white font-bold text-sm">{user?.email || 'user@maxlith.com'}</span>
          </div>

          <div>
            <span className="text-slate-500 text-[10px] block uppercase">Role Authorization</span>
            <span className="text-blue-400 font-bold text-sm">{session?.role}</span>
            <span className="text-blue-400 font-bold text-sm">{user?.role || 'USER'}</span>
          </div>

          <div>
            <span className="text-slate-500 text-[10px] block uppercase">Environment Mode</span>
            <span className="text-emerald-400 font-bold text-sm">MAXLITH PAPER V1</span>
          </div>
        </div>
      </div>

      {/* Virtual Trading & Reset Settings */}
      <div className="fintech-card p-6 space-y-4">
        <h2 className="text-sm font-bold text-white border-b border-slate-800 pb-3">Virtual Trading Settings</h2>
        <div className="flex items-center justify-between text-xs font-mono">
        <h2 className="text-sm font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-blue-400" />
          <span>Virtual Trading &amp; Reset Account</span>
        </h2>

        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
            <div>
              <span className="text-white font-bold block">Starting Virtual Capital</span>
              <span className="text-slate-400 text-[11px]">Allocation credited on initial setup or account reset</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-bold">₹</span>
              <input
                type="number"
                value={startingCapital}
                onChange={(e) => setStartingCapital(e.target.value)}
                className="w-36 bg-[#0d121c] border border-slate-800 focus:border-blue-500 text-xs font-mono font-bold text-emerald-400 rounded-lg px-3 py-1.5 outline-none"
              />
            </div>
          </div>

          <div className="p-3 rounded bg-amber-950/20 border border-amber-500/20 text-xs font-sans text-amber-300 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <span>
              Resetting your paper trading account cancels all pending orders, closes all current holdings, clears your trade book, and restores your wallet balance to the specified starting virtual capital.
            </span>
          </div>

          {resetSuccess && (
            <div className="p-3 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>Paper trading account successfully reset to ₹{Number(startingCapital).toLocaleString('en-IN')}.</span>
            </div>
          )}

          {resetError && (
            <div className="p-3 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-mono">
              {resetError}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              onClick={handleResetAccount}
              disabled={resetting}
              className="px-4 py-2 rounded-lg bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/30 text-xs font-mono font-semibold transition-all disabled:opacity-50 flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${resetting ? 'animate-spin' : ''}`} />
              <span>{resetting ? 'Resetting Account...' : 'Reset Paper Account'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Password Change */}
      <div className="fintech-card p-6 space-y-4">
        <h2 className="text-sm font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
          <Lock className="w-4 h-4 text-blue-400" />
          <span>Security &amp; Password</span>
        </h2>

        <form onSubmit={handleUpdatePassword} className="space-y-3 font-mono text-xs">
          <div>
            <span className="text-white font-bold block">Starting Virtual Capital</span>
            <span className="text-slate-400 text-[11px]">Default allocation for paper trading</span>
            <label className="block text-[10px] uppercase text-slate-400 mb-1">Current Password</label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full sm:w-80 bg-[#0d121c] border border-slate-800 focus:border-blue-500 text-xs text-white rounded-lg px-3 py-2 outline-none"
            />
          </div>
          <span className="text-emerald-400 font-bold text-sm">₹10,00,000.00</span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] uppercase text-slate-400 mb-1">New Password</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-[#0d121c] border border-slate-800 focus:border-blue-500 text-xs text-white rounded-lg px-3 py-2 outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase text-slate-400 mb-1">Confirm New Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-[#0d121c] border border-slate-800 focus:border-blue-500 text-xs text-white rounded-lg px-3 py-2 outline-none"
              />
            </div>
          </div>

          {passwordSuccess && (
            <div className="p-3 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>Password updated successfully.</span>
            </div>
          )}

          {passwordError && (
            <div className="p-3 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-mono">
              {passwordError}
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={passwordUpdating}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition-colors disabled:opacity-50"
            >
              {passwordUpdating ? 'Updating Password...' : 'Change Password'}
            </button>
          </div>
        </form>
      </div>

      {/* Notification Preferences */}
      <div className="fintech-card p-6 space-y-4">
        <h2 className="text-sm font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
          <Bell className="w-4 h-4 text-blue-400" />
          <span>Notification Preferences</span>
        </h2>

        <div className="space-y-3 text-xs font-mono">
          <label className="flex items-center justify-between p-2.5 rounded bg-[#0d121c] border border-slate-800 cursor-pointer">
            <span className="text-slate-300">Price Breakout &amp; Threshold Alerts</span>
            <input
              type="checkbox"
              checked={notifAlerts}
              onChange={(e) => setNotifAlerts(e.target.checked)}
              className="w-4 h-4 accent-blue-600"
            />
          </label>

          <label className="flex items-center justify-between p-2.5 rounded bg-[#0d121c] border border-slate-800 cursor-pointer">
            <span className="text-slate-300">Order Execution &amp; Fill Confirmations</span>
            <input
              type="checkbox"
              checked={notifFills}
              onChange={(e) => setNotifFills(e.target.checked)}
              className="w-4 h-4 accent-blue-600"
            />
          </label>

          <label className="flex items-center justify-between p-2.5 rounded bg-[#0d121c] border border-slate-800 cursor-pointer">
            <span className="text-slate-300">NSE/BSE Market Session Status Transitions</span>
            <input
              type="checkbox"
              checked={notifMarket}
              onChange={(e) => setNotifMarket(e.target.checked)}
              className="w-4 h-4 accent-blue-600"
            />
          </label>
        </div>
      </div>
    </div>
  );
}

