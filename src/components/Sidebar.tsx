'use client';

import { useState, useEffect } from 'react';
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
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Check unread notifications / alerts count
    const fetchUnread = () => {
      fetch('/api/alerts?unreadOnly=true')
        .then((res) => res.json())
        .then((data) => {
          if (typeof data.unreadCount === 'number') {
            setUnreadCount(data.unreadCount);
          }
        })
        .catch(() => {});
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 15000);

    // Also connect to SSE if available
    let es: EventSource | null = null;
    try {
      es = new EventSource('/api/stream/alerts');
      es.addEventListener('alert_update', (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (typeof parsed.unreadCount === 'number') {
            setUnreadCount(parsed.unreadCount);
          }
        } catch {}
      });
    } catch {}

    return () => {
      clearInterval(interval);
      es?.close();
    };
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Markets', href: '/dashboard/markets', icon: TrendingUp },
    { name: 'Watchlist', href: '/dashboard/watchlist', icon: Bookmark },
    { name: 'Portfolio', href: '/dashboard/portfolio', icon: Briefcase },
    { name: 'Paper Trading', href: '/dashboard/paper-trading', icon: Layers, highlight: true },
    { name: 'Orders', href: '/dashboard/orders', icon: FileText },
    { name: 'AI Copilot', href: '/dashboard/ai-copilot', icon: Bot, highlight: true },
    { name: 'AI Agents', href: '/dashboard/ai-agents', icon: Cpu },
    { name: 'News Feed', href: '/dashboard/news', icon: Newspaper },
    { name: 'Price Alerts', href: '/dashboard/alerts', icon: Bell, badgeCount: unreadCount },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
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
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
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
              <div className="flex items-center gap-1.5">
                {item.badgeCount && item.badgeCount > 0 ? (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-rose-500 text-white font-bold leading-none animate-pulse">
                    {item.badgeCount}
                  </span>
                ) : item.highlight && !isActive ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                ) : null}
              </div>
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
