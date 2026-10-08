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
    <aside className="w-64 bg-max-bg-elevated border-r border-max-border flex flex-col h-screen sticky top-0">
      {/* Brand Header */}
      <div className="p-4 border-b border-max-border flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded bg-max-brand-primary/20 flex items-center justify-center text-max-brand-primary font-bold text-xs">
            M
          </div>
          <div>
            <div className="font-bold text-white tracking-tight leading-none text-base">MAXLITH</div>
            <div className="text-[9px] font-mono text-max-brand-primary tracking-wider">PAPER TRADING V1</div>
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
              className={`flex items-center justify-between px-3 py-2 rounded-sm text-[11px] font-medium transition-all ${
                isActive
                  ? 'bg-max-surface-hover text-max-brand-primary font-semibold'
                  : 'text-max-text-secondary hover:text-white hover:bg-max-surface-hover/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-max-brand-primary' : item.highlight ? 'text-max-brand-secondary' : 'text-max-text-muted'}`} />
                <span>{item.name}</span>
              </div>
              <div className="flex items-center gap-1.5">
                {item.badgeCount && item.badgeCount > 0 ? (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-rose-500 text-white font-bold leading-none animate-pulse">
                    {item.badgeCount}
                  </span>
                ) : item.highlight && !isActive ? (
                  <span className="w-1.5 h-1.5 rounded bg-blue-400"></span>
                ) : null}
              </div>
            </Link>
          );
        })}

        {/* Admin Link if role is ADMIN */}
        {user?.role === 'ADMIN' && (
          <div className="pt-3 mt-3 border-t border-max-border">
            <Link
              href="/admin"
              className={`flex items-center gap-3 px-3 py-2 rounded-sm text-[11px] font-medium transition-all ${
                pathname.startsWith('/admin')
                  ? 'bg-max-brand-primary/10 text-max-brand-primary font-semibold'
                  : 'text-max-brand-secondary hover:bg-max-surface-hover/50'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5 text-max-brand-secondary" />
              <span>Admin Telemetry</span>
            </Link>
          </div>
        )}
      </nav>

      {/* User Footer Account Menu */}
      <div className="p-3 border-t border-max-border bg-max-bg-elevated">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded bg-max-surface flex items-center justify-center font-bold text-xs text-max-text-primary border border-max-border-strong">
              {user?.fullName?.charAt(0) || 'U'}
            </div>
            <div className="truncate">
              <p className="text-xs font-semibold text-white truncate">{user?.fullName || 'Trader'}</p>
              <p className="text-[10px] font-mono text-max-text-muted truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Sign Out"
            className="p-1.5 rounded text-max-text-secondary hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
