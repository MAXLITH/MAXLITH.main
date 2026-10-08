'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, AlertCircle } from 'lucide-react';

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0e14] text-slate-100 flex flex-col justify-center items-center px-4 relative">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-4 group">
            <div className="w-10 h-10 rounded bg-blue-600 flex items-center justify-center text-white font-bold text-lg group-hover:scale-105 transition-transform">
              M
            </div>
            <span className="text-2xl font-bold tracking-tight text-white">MAXLITH</span>
          </Link>
          <h1 className="text-xl font-bold text-white">Sign In to MAXLITH V1</h1>
          <p className="text-xs text-max-text-secondary mt-1">Indian Market AI Intelligence & Paper Trading</p>
        </div>

        {/* Login Form Card */}
        <div className="fintech-card p-4 border border-max-border">
          {error && (
            <div className="mb-4 p-3 rounded bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-max-text-primary mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full bg-[#0d121c] border border-max-border focus:border-blue-500 text-xs text-white placeholder-slate-500 rounded px-3.5 py-2.5 outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-max-text-primary mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#0d121c] border border-max-border focus:border-blue-500 text-xs text-white placeholder-slate-500 rounded px-3.5 py-2.5 outline-none transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98]"
            >
              {loading ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-max-border/80 text-center text-xs text-max-text-secondary">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-max-brand-primary hover:underline font-semibold">
              Create free paper account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
