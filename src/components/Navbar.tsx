'use client';

import Link from 'next/link';
import { TrendingUp, Shield, Cpu, ArrowRight } from 'lucide-react';

export default function Navbar({ authenticated = false, user = null }: { authenticated?: boolean; user?: any }) {
  return (
    <header className="sticky top-0 z-50 fintech-glass border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
            M
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold tracking-tight text-white group-hover:text-blue-400 transition-colors">
              MAXLITH
            </span>
            <span className="text-[10px] uppercase tracking-widest text-slate-400 font-mono -mt-1">
              FINTECH AI • V1
            </span>
          </div>
        </Link>

        {/* Center Nav Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
          <Link href="#features" className="hover:text-white transition-colors">Features</Link>
          <Link href="#markets" className="hover:text-white transition-colors">Markets</Link>
          <Link href="#ai-ecosystem" className="hover:text-white transition-colors">AI Agents</Link>
          <Link href="#paper-trading" className="hover:text-white transition-colors">Paper Trading</Link>
          <Link href="#faq" className="hover:text-white transition-colors">FAQ</Link>
        </nav>

        {/* Right CTA Actions */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs font-mono text-blue-400">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
            PAPER TRADING ONLY
          </div>

          {authenticated ? (
            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition-all shadow-md shadow-blue-600/30 active:scale-[0.98]"
            >
              Go to Dashboard
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="px-4 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/60 font-medium text-sm transition-all"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition-all shadow-md shadow-blue-600/30 active:scale-[0.98]"
              >
                Get Started
                <ArrowRight className="w-4 h-4" />
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
