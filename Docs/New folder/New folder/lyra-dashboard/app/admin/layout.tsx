'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Shield,
  LayoutDashboard,
  Users,
  Bot,
  Flag,
  AlertTriangle,
  DollarSign,
  Settings,
  FileText,
  Search,
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  X,
  UserCheck,
  Image as ImageIcon,
  BarChart3,
  Banknote,
  ScrollText,
  UserCog,
  Loader2,
} from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [stats, setStats] = useState({
    pendingCreators: 0,
    pendingModels: 0,
    pendingReports: 0,
    activeStrikes: 0,
  });
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminAccess();
    fetchStats();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const response = await fetch('/api/admin/check-access');
      const data = await response.json();
      setIsAdmin(data.isAdmin);
      if (!data.isAdmin) {
        router.push('/');
      }
    } catch (err) {
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/stats');
      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch stats');
    }
  };

  const navItems = [
    {
      label: 'Overview',
      href: '/admin',
      icon: LayoutDashboard,
    },
    {
      label: 'Creators',
      icon: Users,
      children: [
        { label: 'All Creators', href: '/admin/creators' },
        { label: 'Pending Approval', href: '/admin/creators/pending', badge: stats.pendingCreators },
        { label: 'Suspended', href: '/admin/creators/suspended' },
      ],
    },
    {
      label: 'Models',
      icon: Bot,
      children: [
        { label: 'All Models', href: '/admin/models' },
        { label: 'Pending Approval', href: '/admin/models/pending', badge: stats.pendingModels },
        { label: 'Suspended', href: '/admin/models/suspended' },
      ],
    },
    {
      label: 'Users',
      href: '/admin/users',
      icon: UserCog,
    },
    {
      label: 'Moderation',
      icon: Flag,
      children: [
        { label: 'Content Reports', href: '/admin/reports', badge: stats.pendingReports },
        { label: 'Strikes & Bans', href: '/admin/strikes', badge: stats.activeStrikes },
        { label: 'Appeals', href: '/admin/appeals' },
      ],
    },
    {
      label: 'Financials',
      icon: DollarSign,
      children: [
        { label: 'Overview', href: '/admin/financials' },
        { label: 'Payouts', href: '/admin/financials/payouts' },
        { label: 'Transactions', href: '/admin/financials/transactions' },
        { label: 'Refunds', href: '/admin/financials/refunds' },
      ],
    },
    {
      label: 'Analytics',
      href: '/admin/analytics',
      icon: BarChart3,
    },
    {
      label: 'Audit Log',
      href: '/admin/audit-log',
      icon: ScrollText,
    },
    {
      label: 'Settings',
      href: '/admin/settings',
      icon: Settings,
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black flex">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 bg-zinc-900 border-r border-white/10 transition-all duration-300 ${
          sidebarOpen ? 'w-64' : 'w-20'
        }`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-white/10">
          <Link href="/admin" className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-purple-500" />
            {sidebarOpen && <span className="font-bold text-lg">LYRA Admin</span>}
          </Link>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1 hover:bg-white/10 rounded"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1 overflow-y-auto" style={{ height: 'calc(100vh - 64px)' }}>
          {navItems.map((item) => (
            <NavItem
              key={item.label}
              item={item}
              pathname={pathname}
              collapsed={!sidebarOpen}
            />
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-20'}`}>
        {/* Top Bar */}
        <header className="h-16 bg-zinc-900/50 border-b border-white/10 flex items-center justify-between px-6 sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search..."
                className="w-64 pl-10 pr-4 py-2 bg-zinc-800 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Notifications */}
            <button className="relative p-2 hover:bg-white/10 rounded-lg">
              <Bell className="w-5 h-5" />
              {(stats.pendingCreators + stats.pendingModels + stats.pendingReports) > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              )}
            </button>

            {/* Profile */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                <span className="text-sm font-bold">A</span>
              </div>
              <span className="text-sm font-medium">Admin</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}

// ===========================================
// NAV ITEM COMPONENT
// ===========================================

interface NavItemProps {
  item: {
    label: string;
    href?: string;
    icon: any;
    children?: { label: string; href: string; badge?: number }[];
  };
  pathname: string;
  collapsed: boolean;
}

function NavItem({ item, pathname, collapsed }: NavItemProps) {
  const [expanded, setExpanded] = useState(false);
  const Icon = item.icon;
  const isActive = item.href === pathname || item.children?.some((c) => c.href === pathname);

  // Auto-expand if a child is active
  useEffect(() => {
    if (item.children?.some((c) => c.href === pathname)) {
      setExpanded(true);
    }
  }, [pathname, item.children]);

  if (item.children) {
    return (
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition ${
            isActive ? 'bg-purple-500/20 text-purple-400' : 'hover:bg-white/10 text-gray-400'
          }`}
        >
          <Icon className="w-5 h-5 flex-shrink-0" />
          {!collapsed && (
            <>
              <span className="flex-1 text-left text-sm">{item.label}</span>
              <ChevronDown
                className={`w-4 h-4 transition ${expanded ? 'rotate-180' : ''}`}
              />
            </>
          )}
        </button>
        {!collapsed && expanded && (
          <div className="ml-8 mt-1 space-y-1">
            {item.children.map((child) => (
              <Link
                key={child.href}
                href={child.href}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition ${
                  pathname === child.href
                    ? 'bg-purple-500/20 text-purple-400'
                    : 'hover:bg-white/10 text-gray-400'
                }`}
              >
                <span>{child.label}</span>
                {child.badge !== undefined && child.badge > 0 && (
                  <span className="px-2 py-0.5 bg-red-500 rounded-full text-xs font-bold text-white">
                    {child.badge}
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link
      href={item.href!}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition ${
        isActive ? 'bg-purple-500/20 text-purple-400' : 'hover:bg-white/10 text-gray-400'
      }`}
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      {!collapsed && <span className="text-sm">{item.label}</span>}
    </Link>
  );
}
