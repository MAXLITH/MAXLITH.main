'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  Lock,
  Mail,
  User,
  Shield,
  ShieldCheck,
  X,
  HelpCircle,
  ChevronLeft,
  Terminal,
  Sparkles,
} from 'lucide-react';
import TradingTerminalVisual from './components/TradingTerminalVisual';

interface LoginFormProps {
  initialMode?: 'login' | 'signup';
}

export default function LoginForm({ initialMode }: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/dashboard';
  const paramMode = searchParams.get('mode') === 'signup' || searchParams.get('tab') === 'signup' ? 'signup' : 'login';

  const [mode, setMode] = useState<'login' | 'signup'>(initialMode || paramMode);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);

  // Sync mode with URL if param changes
  useEffect(() => {
    if (searchParams.get('mode') === 'signup' || searchParams.get('tab') === 'signup') {
      setMode('signup');
    }
  }, [searchParams]);

  // Restore remembered email on client mount for login mode
  useEffect(() => {
    try {
      const savedEmail = localStorage.getItem('maxlith_saved_email');
      if (savedEmail) {
        setEmail(savedEmail);
        setRememberMe(true);
      }
    } catch {
      // LocalStorage access may fail in restricted privacy modes
    }
  }, []);

  const handleModeChange = (newMode: 'login' | 'signup') => {
    setMode(newMode);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const cleanEmail = email.trim();

    if (mode === 'signup') {
      // Signup flow
      if (!fullName.trim()) {
        setError('Please provide your full name.');
        setLoading(false);
        return;
      }
      if (password.length < 6) {
        setError('Access key must be at least 6 characters long.');
        setLoading(false);
        return;
      }

      try {
        const res = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fullName: fullName.trim(),
            email: cleanEmail,
            password,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Registration failed. Please try again.');
        }

        router.push(redirectTo);
        router.refresh();
      } catch (err: any) {
        setError(err.message || 'Registration failed. Please check your details.');
      } finally {
        setLoading(false);
      }
    } else {
      // Login flow
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail, password }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Authentication failed');
        }

        // Handle remember me preference
        try {
          if (rememberMe) {
            localStorage.setItem('maxlith_saved_email', cleanEmail);
          } else {
            localStorage.removeItem('maxlith_saved_email');
          }
        } catch {
          // Ignore localStorage errors
        }

        router.push(redirectTo);
        router.refresh();
      } catch (err: any) {
        setError(err.message || 'Login failed. Please verify your credentials.');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-[100dvh] w-full bg-[#080B10] text-[#F4F7FA] lg:grid lg:grid-cols-12 overflow-x-hidden">
      {/* Left Column: Brand & Market Intelligence Terminal Visual (Desktop Only) */}
      <div className="lg:col-span-7 xl:col-span-7">
        <TradingTerminalVisual />
      </div>

      {/* Right Column: Focused Authentication Panel */}
      <main
        aria-label="MAXLITH Authentication Terminal"
        className="lg:col-span-5 xl:col-span-5 min-h-[100dvh] flex flex-col justify-between p-6 sm:p-10 lg:p-10 xl:p-14 bg-[#080B10] relative"
      >
        {/* Top Utility Bar */}
        <div className="flex items-center justify-between w-full">
          {/* Back to Home Link */}
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-mono text-[#94A3B8] hover:text-[#7C6FF2] transition-colors group"
          >
            <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
            <span>TERMINAL OVERVIEW</span>
          </Link>

          {/* Institutional Gateway Status Indicator */}
          <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-[#111720] border border-[#1C2533] text-[11px] font-mono text-[#94A3B8]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#7C6FF2] shadow-[0_0_6px_#7C6FF2]" />
            <span className="text-[10px] text-[#A9B4C0]">GATEWAY: 256-BIT</span>
          </div>
        </div>

        {/* Center Authentication Container */}
        <div className="w-full max-w-md mx-auto my-auto py-6">
          {/* Mobile-Only Header Brand Badge */}
          <div className="lg:hidden flex items-center justify-between pb-6 mb-6 border-b border-[#1C2533]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#111720] border border-[#1C2533] flex items-center justify-center text-[#7C6FF2] font-mono font-bold text-sm shadow-[0_0_12px_rgba(124,111,242,0.15)] ring-1 ring-[#7C6FF2]/20">
                M
              </div>
              <div>
                <span className="text-base font-bold tracking-tight text-[#F4F7FA]">MAXLITH AI</span>
                <span className="block text-[10px] font-mono text-[#94A3B8] -mt-0.5">
                  NSE / BSE QUANT TERMINAL
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#7C6FF2]/10 border border-[#7C6FF2]/30 text-[10px] font-mono text-[#7C6FF2]">
              <span>PAPER TRADING</span>
            </div>
          </div>

          {/* Mode Switcher Segmented Control */}
          <div className="grid grid-cols-2 p-1 rounded-lg bg-[#111720] border border-[#1C2533] mb-6">
            <button
              type="button"
              onClick={() => handleModeChange('login')}
              className={`py-2 px-3 rounded-md text-xs font-mono font-semibold transition-all cursor-pointer ${
                mode === 'login'
                  ? 'bg-[#1C2533] text-[#7C6FF2] shadow-sm ring-1 ring-[#7C6FF2]/30'
                  : 'text-[#94A3B8] hover:text-[#F4F7FA]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => handleModeChange('signup')}
              className={`py-2 px-3 rounded-md text-xs font-mono font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                mode === 'signup'
                  ? 'bg-[#1C2533] text-[#7C6FF2] shadow-sm ring-1 ring-[#7C6FF2]/30'
                  : 'text-[#94A3B8] hover:text-[#F4F7FA]'
              }`}
            >
              <span>Create Account</span>
              <span className="hidden sm:inline text-[9px] px-1 py-0.2 rounded bg-[#7C6FF2]/20 text-[#7C6FF2]">
                ₹10L
              </span>
            </button>
          </div>

          {/* Form Header */}
          <div className="mb-6">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#111720] border border-[#1C2533] text-[10px] font-mono text-[#7C6FF2] uppercase tracking-wider mb-2.5">
              <Terminal className="w-3 h-3" />
              <span>{mode === 'login' ? 'TERMINAL ACCESS PORTAL' : 'TERMINAL PROVISIONING • V1.0'}</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[#F4F7FA]">
              {mode === 'login' ? 'Sign In to Your Workspace' : 'Open Paper Trading Account'}
            </h1>
            <p className="mt-1 text-xs text-[#94A3B8] leading-relaxed">
              {mode === 'login'
                ? 'Authenticate your session to access algorithmic trading signals, portfolio risk matrices, and order routing.'
                : 'Receive ₹10,00,000 in virtual capital for zero-risk algorithmic paper trading on NSE & BSE.'}
            </p>
          </div>

          {/* Virtual Capital Highlight for Account Creation */}
          {mode === 'signup' && (
            <div className="mb-5 p-3 rounded-lg bg-[#7C6FF2]/10 border border-[#7C6FF2]/30 flex items-center gap-3">
              <div className="w-8 h-8 rounded-md bg-[#7C6FF2]/20 flex items-center justify-center text-[#7C6FF2] flex-shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <p className="font-mono text-xs font-bold text-[#F4F7FA]">
                  ₹10,00,000 Starting Virtual Capital
                </p>
                <p className="text-[10px] font-mono text-[#7C6FF2]">
                  Zero monetary risk • Auto-credited on registration
                </p>
              </div>
            </div>
          )}

          {/* Error Banner with Contextual Actions */}
          {error && (
            <div
              role="alert"
              className="mb-5 p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex flex-col gap-2.5 animate-fadeIn"
            >
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-400" />
                <div className="flex-1">
                  <span className="font-semibold text-rose-200">
                    {mode === 'login' ? 'Authentication Failed:' : 'Registration Notice:'}
                  </span>{' '}
                  <span>{error}</span>
                </div>
              </div>

              {/* Seamless Action Buttons if user exists or password mismatch */}
              {mode === 'signup' && (error.includes('already exists') || error.includes('ACCOUNT_EXISTS')) && (
                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-rose-500/20">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setError('');
                    }}
                    className="px-3 py-1.5 rounded-md bg-[#7C6FF2] hover:bg-[#6A5AE0] text-white text-[11px] font-mono font-semibold transition-colors cursor-pointer"
                  >
                    Switch to Sign In →
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!email || !password) {
                        setError('Please provide email and access key to proceed.');
                        return;
                      }
                      setLoading(true);
                      try {
                        const res = await fetch('/api/auth/reset-key', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ email: email.trim().toLowerCase(), newPassword: password }),
                        });
                        const d = await res.json();
                        if (!res.ok) throw new Error(d.error || 'Failed to update key');
                        router.push(redirectTo);
                        router.refresh();
                      } catch (e: any) {
                        setError(e.message);
                      } finally {
                        setLoading(false);
                      }
                    }}
                    className="px-3 py-1.5 rounded-md bg-[#1C2533] hover:bg-[#253245] text-[#F4F7FA] text-[11px] font-mono transition-colors border border-[#2D3B4F] cursor-pointer"
                  >
                    Set Password to Current Input & Sign In
                  </button>
                </div>
              )}

              {mode === 'login' && error.includes('Invalid email or password') && (
                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-rose-500/20">
                  <button
                    type="button"
                    onClick={async () => {
                      if (!email || !password) {
                        setError('Enter your email and the desired access key you want to set.');
                        return;
                      }
                      setLoading(true);
                      try {
                        const res = await fetch('/api/auth/reset-key', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ email: email.trim().toLowerCase(), newPassword: password }),
                        });
                        const d = await res.json();
                        if (!res.ok) throw new Error(d.error || 'Failed to reset key');
                        router.push(redirectTo);
                        router.refresh();
                      } catch (e: any) {
                        setError(e.message);
                      } finally {
                        setLoading(false);
                      }
                    }}
                    className="px-3 py-1.5 rounded-md bg-[#7C6FF2] hover:bg-[#6A5AE0] text-white text-[11px] font-mono font-semibold transition-colors cursor-pointer"
                  >
                    Reset Key to Entered Password & Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signup');
                      setError('');
                    }}
                    className="px-3 py-1.5 rounded-md bg-[#1C2533] hover:bg-[#253245] text-[#94A3B8] hover:text-white text-[11px] font-mono transition-colors border border-[#2D3B4F] cursor-pointer"
                  >
                    Create Fresh Account Instead
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Authentication & Registration Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name Field (Sign Up Only) */}
            {mode === 'signup' && (
              <div>
                <label
                  htmlFor="maxlith-name"
                  className="block text-xs font-mono font-medium text-[#F4F7FA] mb-1.5"
                >
                  Full Name / Trader Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#64748B]">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    id="maxlith-name"
                    type="text"
                    name="name"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Rohan Sharma"
                    disabled={loading}
                    className="w-full bg-[#111720] border border-[#1C2533] focus:border-[#7C6FF2] focus:ring-1 focus:ring-[#7C6FF2]/30 text-xs text-[#F4F7FA] placeholder-[#4E5A67] rounded-lg pl-10 pr-3.5 py-2.5 outline-none transition-all disabled:opacity-50 font-mono"
                  />
                </div>
              </div>
            )}

            {/* Email Field */}
            <div>
              <label
                htmlFor="maxlith-email"
                className="block text-xs font-mono font-medium text-[#F4F7FA] mb-1.5"
              >
                {mode === 'login' ? 'Institutional Email / User ID' : 'Email Address'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#64748B]">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="maxlith-email"
                  type="email"
                  name="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="trader@institution.com"
                  disabled={loading}
                  className="w-full bg-[#111720] border border-[#1C2533] focus:border-[#7C6FF2] focus:ring-1 focus:ring-[#7C6FF2]/30 text-xs text-[#F4F7FA] placeholder-[#4E5A67] rounded-lg pl-10 pr-3.5 py-2.5 outline-none transition-all disabled:opacity-50 font-mono"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="maxlith-password"
                  className="block text-xs font-mono font-medium text-[#F4F7FA]"
                >
                  {mode === 'login' ? 'Access Key / Password' : 'Create Access Key (Password)'}
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => setShowRecoveryModal(true)}
                    className="text-[11px] font-mono text-[#94A3B8] hover:text-[#7C6FF2] transition-colors focus:outline-none underline-offset-2 hover:underline cursor-pointer"
                  >
                    Forgot Key?
                  </button>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#64748B]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="maxlith-password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  required
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'login' ? '••••••••••••' : 'Min. 6 characters'}
                  disabled={loading}
                  className="w-full bg-[#111720] border border-[#1C2533] focus:border-[#7C6FF2] focus:ring-1 focus:ring-[#7C6FF2]/30 text-xs text-[#F4F7FA] placeholder-[#4E5A67] rounded-lg pl-10 pr-10 py-2.5 outline-none transition-all disabled:opacity-50 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#F4F7FA] transition-colors p-1 focus:outline-none cursor-pointer"
                  aria-label={showPassword ? 'Hide access key' : 'Show access key'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me for Login Mode */}
            {mode === 'login' && (
              <div className="flex items-center justify-between pt-1 text-xs">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-3.5 h-3.5 rounded bg-[#111720] border-[#1C2533] text-[#7C6FF2] focus:ring-0 focus:ring-offset-0 focus:outline-none accent-[#7C6FF2] cursor-pointer"
                  />
                  <span className="font-mono text-[11px] text-[#94A3B8]">Remember ID</span>
                </label>
                <span className="font-mono text-[10px] text-[#64748B]">
                  SESSION: 7-DAY JWT
                </span>
              </div>
            )}

            {/* Terms Notice for Signup Mode */}
            {mode === 'signup' && (
              <div className="pt-1 flex items-start gap-2 text-[10px] font-mono text-[#64748B] leading-relaxed">
                <ShieldCheck className="w-3.5 h-3.5 text-[#7C6FF2] flex-shrink-0 mt-0.5" />
                <span>
                  Paper trading simulation only. No real money or bank account required.
                </span>
              </div>
            )}

            {/* Submit Action */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 rounded-lg bg-[#7C6FF2] hover:bg-[#6A5AE0] text-white font-mono font-bold text-xs transition-all shadow-[0_0_20px_rgba(124,111,242,0.25)] hover:shadow-[0_0_25px_rgba(124,111,242,0.4)] flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.99] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#7C6FF2]/50"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>{mode === 'login' ? 'AUTHENTICATING SESSION...' : 'PROVISIONING ACCOUNT...'}</span>
                </div>
              ) : (
                <>
                  <span>{mode === 'login' ? 'INITIALIZE SESSION' : 'CREATE PAPER ACCOUNT'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Alternate Mode Switch Link */}
          <div className="mt-5 p-3 rounded-lg bg-[#111720]/60 border border-[#1C2533] text-center">
            {mode === 'login' ? (
              <p className="text-xs text-[#94A3B8]">
                Need a paper trading sandbox?{' '}
                <button
                  type="button"
                  onClick={() => handleModeChange('signup')}
                  className="text-[#7C6FF2] hover:underline font-mono font-semibold transition-colors inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>Create Paper Account</span>
                  <span className="text-[10px] text-[#A9B4C0]">(₹10L Virtual)</span>
                </button>
              </p>
            ) : (
              <p className="text-xs text-[#94A3B8]">
                Already have institutional clearance?{' '}
                <button
                  type="button"
                  onClick={() => handleModeChange('login')}
                  className="text-[#7C6FF2] hover:underline font-mono font-semibold transition-colors inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>Sign In to Terminal</span>
                </button>
              </p>
            )}
          </div>
        </div>

        {/* Security & Regulatory Compliance Footer */}
        <div className="pt-6 border-t border-[#1C2533] flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] font-mono text-[#64748B]">
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-[#7C6FF2]" />
            <span>256-BIT ENCRYPTED SESSION</span>
          </div>
          <span className="hidden sm:inline">•</span>
          <span>SEBI PAPER TRADING COMPLIANT</span>
          <span className="hidden sm:inline">•</span>
          <span>MAXLITH SECURE RUNTIME</span>
        </div>
      </main>

      {/* Password Recovery & Key Protocol Modal */}
      {showRecoveryModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="recovery-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
        >
          <div className="relative w-full max-w-md rounded-xl bg-[#111720] border border-[#1C2533] p-6 shadow-2xl text-[#F4F7FA]">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#1C2533]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#7C6FF2]/10 border border-[#7C6FF2]/20 flex items-center justify-center text-[#7C6FF2]">
                  <HelpCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 id="recovery-modal-title" className="text-sm font-bold font-mono text-[#F4F7FA]">
                    Credential Recovery Protocol
                  </h3>
                  <p className="text-[10px] font-mono text-[#94A3B8]">MAXLITH Desk Assistance</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRecoveryModal(false)}
                className="text-[#64748B] hover:text-[#F4F7FA] transition-colors p-1 focus:outline-none cursor-pointer"
                aria-label="Close recovery modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="py-4 space-y-3.5 text-xs text-[#94A3B8] leading-relaxed">
              <p>
                In compliance with institutional security standards, automated public password resets are restricted to authorized operational channels.
              </p>

              <div className="space-y-1">
                <span className="font-mono text-[11px] font-semibold text-[#F4F7FA]">Enterprise Traders:</span>
                <p className="text-[11px]">
                  Contact your organization&apos;s MAXLITH security administrator or contact support desk directly at{' '}
                  <a
                    href="mailto:support@maxlith.com"
                    className="text-[#7C6FF2] hover:underline font-mono"
                  >
                    support@maxlith.com
                  </a>.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-4 border-t border-[#1C2533] flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowRecoveryModal(false)}
                className="px-3.5 py-1.5 rounded-lg bg-[#7C6FF2] hover:bg-[#6A5AE0] text-white font-mono font-semibold text-xs transition-colors focus:outline-none cursor-pointer"
              >
                Acknowledge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
