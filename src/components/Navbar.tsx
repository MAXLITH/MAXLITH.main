'use client';

import Link from 'next/link';
import { TrendingUp, Shield, Cpu, ArrowRight } from 'lucide-react';

export default function Navbar({ authenticated = false, user = null }: { authenticated?: boolean; user?: any }) {
  return (
    <header className="sticky top-0 z-50 fintech-glass border-b border-max-border/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-4 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded flex items-center justify-center text-white font-bold group-hover:scale-105 transition-transform">
            M
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold tracking-tight text-white group-hover:text-max-brand-primary transition-colors">
              MAXLITH
            </span>
            <span className="text-[10px] uppercase tracking-widest text-max-text-secondary font-mono -mt-1">
              FINTECH AI • V1
            </span>
          </div>
        </Link>

        {/* Center Nav Links */}
        <nav className="hidden md:flex items-center gap-4 text-sm font-medium text-max-text-primary">
          <Link href="#features" className="hover:text-white transition-colors">Features</Link>
          <Link href="#markets" className="hover:text-white transition-colors">Markets</Link>
          <Link href="#ai-ecosystem" className="hover:text-white transition-colors">AI Agents</Link>
          <Link href="#paper-trading" className="hover:text-white transition-colors">Paper Trading</Link>
          <Link href="#faq" className="hover:text-white transition-colors">FAQ</Link>
        </nav>

        {/* Right CTA Actions */}
        <div className="flex items-center gap-3 font-mono">
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded bg-max-brand-primary/10 border border-max-brand-primary/20 text-[10px] text-max-brand-primary">
            <span className="w-1.5 h-1.5 rounded-full bg-max-brand-primary animate-pulse"></span>
            PAPER TRADING ONLY
          </div>

          {authenticated ? (
            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-3.5 py-1.5 rounded bg-max-brand-primary hover:bg-max-brand-secondary text-white font-medium text-xs transition-all active:scale-[0.98]"
            >
              Go to Dashboard
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="px-3.5 py-1.5 rounded text-max-text-primary hover:text-white hover:bg-max-surface-hover font-medium text-xs transition-all"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-max-brand-primary hover:bg-max-brand-secondary text-white font-medium text-xs transition-all active:scale-[0.98]"
              >
                Get Started
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
