'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, AlertCircle, ShieldCheck, CheckCircle2, Eye, EyeOff, Mail } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      if (data.emailConfirmationRequired) {
        setInfoMessage(data.message || 'Account created! Please check your email inbox and click the verification link before logging in.');
        return;
      }

      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please check your credentials and try again.');
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
          <h1 className="text-xl font-bold text-white font-mono">Create Paper Account</h1>
          <p className="text-xs text-[#94A3B8] mt-1 font-mono">Receive ₹10,00,000 Virtual Capital for Paper Trading</p>
        </div>

        {/* Signup Form Card */}
        <div className="rounded-xl p-6 bg-[#111720] border border-[#1C2533] shadow-2xl">
          <div className="mb-4 p-2.5 rounded-lg bg-[#7C6FF2]/10 border border-[#7C6FF2]/30 text-[#7C6FF2] text-xs flex items-center gap-2 font-mono">
            <ShieldCheck className="w-4 h-4 flex-shrink-0" />
            <span>V1 Paper Trading Only • Zero Monetary Risk</span>
          </div>

          {infoMessage ? (
            <div className="space-y-4 py-2">
              <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-semibold block font-mono">Verification Email Dispatched</span>
                  <p className="text-slate-300 leading-relaxed">{infoMessage}</p>
                </div>
              </div>

              <div className="pt-2 text-center">
                <Link
                  href="/login"
                  className="w-full py-2.5 px-4 rounded-lg bg-[#7C6FF2] hover:bg-[#6A5AE0] text-white font-mono font-bold text-xs transition-all shadow-[0_0_20px_rgba(124,111,242,0.25)] flex items-center justify-center gap-2"
                >
                  <Mail className="w-4 h-4" />
                  <span>Proceed to Terminal Sign In</span>
                </Link>
              </div>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2 font-mono">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#94A3B8] mb-1.5 font-mono">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Rohan Sharma"
                    className="w-full bg-[#080B10] border border-[#1C2533] focus:border-[#7C6FF2] focus:ring-1 focus:ring-[#7C6FF2]/30 text-xs text-white placeholder-[#64748B] rounded-lg px-3.5 py-2.5 outline-none transition-colors font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#94A3B8] mb-1.5 font-mono">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="rohan@example.com"
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
                      minLength={6}
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
                      <span>Provisioning Account...</span>
                    </div>
                  ) : (
                    <>
                      <span>Create Paper Account</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 pt-4 border-t border-[#1C2533] text-center text-xs text-[#94A3B8] font-mono">
                Already registered?{' '}
                <Link href="/login" className="text-[#7C6FF2] hover:underline font-semibold">
                  Sign in to your account
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
