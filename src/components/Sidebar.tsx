'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  TrendingUp,
  Bookmark,
  Briefcase,
  Layers,
  FileText,
  BarChart3,
  Bot,
  Cpu,
  Newspaper,
  Bell,
  Settings,
  ShieldAlert,
  LogOut
} from 'lucide-react';

export default function Sidebar({ user }: { user: any }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Markets', href: '/markets', icon: TrendingUp },
    { name: 'Watchlist', href: '/watchlist', icon: Bookmark },
    { name: 'Portfolio', href: '/portfolio', icon: Briefcase },
    { name: 'Paper Trading', href: '/paper-trading', icon: Layers, highlight: true },
    { name: 'Orders', href: '/orders', icon: FileText },
    { name: 'AI Copilot', href: '/ai-copilot', icon: Bot, highlight: true },
    { name: 'AI Agents', href: '/ai-agents', icon: Cpu },
    { name: 'News Feed', href: '/news', icon: Newspaper },
    { name: 'Price Alerts', href: '/alerts', icon: Bell },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-[#0d121c] border-r border-slate-800/80 flex flex-col h-screen sticky top-0">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-blue-500/20">
            M
          </div>
          <div>
            <div className="font-bold text-white tracking-tight leading-none text-base">MAXLITH</div>
            <div className="text-[9px] font-mono text-blue-400 tracking-wider">PAPER TRADING V1</div>
          </div>
        </Link>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : item.highlight ? 'text-blue-400' : 'text-slate-400'}`} />
                <span>{item.name}</span>
              </div>
              {item.highlight && !isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
              )}
            </Link>
          );
        })}

        {/* Admin Link if role is ADMIN */}
        {user?.role === 'ADMIN' && (
          <div className="pt-3 mt-3 border-t border-slate-800/60">
            <Link
              href="/admin"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                pathname.startsWith('/admin')
                  ? 'bg-purple-600 text-white font-semibold shadow-md shadow-purple-600/30'
                  : 'text-purple-400 hover:bg-purple-950/40 border border-purple-500/20'
              }`}
            >
              <ShieldAlert className="w-4 h-4 text-purple-400" />
              <span>Admin Telemetry</span>
            </Link>
          </div>
        )}
      </nav>

      {/* User Footer Account Menu */}
      <div className="p-3 border-t border-slate-800/80 bg-[#0a0e16]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-xs text-slate-300 border border-slate-700">
              {user?.fullName?.charAt(0) || 'U'}
            </div>
            <div className="truncate">
              <p className="text-xs font-semibold text-white truncate">{user?.fullName || 'Trader'}</p>
              <p className="text-[10px] font-mono text-slate-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Sign Out"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
