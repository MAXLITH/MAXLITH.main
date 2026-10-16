'use client';

export const dynamic = 'force-dynamic';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, AlertCircle, Eye, EyeOff, CheckCircle2 } from 'lucide-react';

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam === 'email_confirmation_failed') {
      setError('Email verification link is invalid or has expired. Please try signing in or register again.');
    } else if (errorParam === 'confirmation_failed') {
      setError('Email verification could not be completed. Please request a new verification link.');
    } else if (searchParams.get('verified') === 'true') {
      setInfoMessage('Email verified successfully! You can now sign in with your credentials.');
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 403 && data.code === 'email_not_confirmed') {
          setError(data.error || 'Your email has not been verified yet. Please check your inbox for the confirmation email.');
          return;
        }
        throw new Error(data.error || 'Authentication failed');
      }

      const redirectPath = searchParams.get('redirect') || '/dashboard';
      router.push(redirectPath);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080B10] text-[#F4F7FA] flex flex-col justify-center items-center px-4 relative">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-4 group">
            <div className="w-10 h-10 rounded-lg bg-[#7C6FF2] flex items-center justify-center text-white font-bold text-lg shadow-[0_0_20px_rgba(124,111,242,0.3)] group-hover:scale-105 transition-transform font-mono">
              M
            </div>
            <span className="text-2xl font-bold tracking-tight text-white font-mono">MAXLITH</span>
          </Link>
          <h1 className="text-xl font-bold text-white font-mono">Sign In to MAXLITH Terminal</h1>
          <p className="text-xs text-[#94A3B8] mt-1 font-mono">Indian Market AI Intelligence & Paper Trading</p>
        </div>

        {/* Login Form Card */}
        <div className="rounded-xl p-6 bg-[#111720] border border-[#1C2533] shadow-2xl">
          {infoMessage && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2 font-mono">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{infoMessage}</span>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2 font-mono">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#94A3B8] mb-1.5 font-mono">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="trader@maxlith.com"
                className="w-full bg-[#080B10] border border-[#1C2533] focus:border-[#7C6FF2] focus:ring-1 focus:ring-[#7C6FF2]/30 text-xs text-white placeholder-[#64748B] rounded-lg px-3.5 py-2.5 outline-none transition-colors font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#94A3B8] mb-1.5 font-mono">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#080B10] border border-[#1C2533] focus:border-[#7C6FF2] focus:ring-1 focus:ring-[#7C6FF2]/30 text-xs text-white placeholder-[#64748B] rounded-lg px-3.5 py-2.5 pr-10 outline-none transition-colors font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#94A3B8] transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-[#7C6FF2] hover:bg-[#6A5AE0] text-white font-mono font-bold text-xs transition-all shadow-[0_0_20px_rgba(124,111,242,0.25)] flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] cursor-pointer"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Authenticating...</span>
                </div>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-[#1C2533] text-center text-xs text-[#94A3B8] font-mono">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-[#7C6FF2] hover:underline font-semibold">
              Create free paper account (₹10L Virtual)
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#080B10] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#7C6FF2] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <LoginFormContent />
    </Suspense>
  );
}
