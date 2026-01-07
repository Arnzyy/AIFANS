'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Users,
  Sparkles,
  AlertTriangle,
  TrendingUp,
  Clock,
  DollarSign,
} from 'lucide-react';

interface AdminStats {
  pending_creators: number;
  pending_models: number;
  pending_reports: number;
  total_creators: number;
  total_models: number;
  total_subscribers: number;
  total_revenue: number;
  new_creators_today: number;
  new_subscribers_today: number;
  revenue_today: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/admin/dashboard');
        const data = await res.json();

        if (data.stats) {
          setStats(data.stats);
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-zinc-900 rounded-xl p-6 animate-pulse">
              <div className="h-4 bg-zinc-800 rounded w-1/2 mb-4" />
              <div className="h-8 bg-zinc-800 rounded w-1/3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const queueCards = [
    {
      title: 'Pending Creators',
      count: stats?.pending_creators || 0,
      href: '/admin/creators?status=pending',
      icon: Users,
      color: 'bg-blue-500/20 text-blue-400',
    },
    {
      title: 'Pending Models',
      count: stats?.pending_models || 0,
      href: '/admin/models?status=pending_review',
      icon: Sparkles,
      color: 'bg-purple-500/20 text-purple-400',
    },
    {
      title: 'Pending Reports',
      count: stats?.pending_reports || 0,
      href: '/admin/reports?status=pending',
      icon: AlertTriangle,
      color: 'bg-orange-500/20 text-orange-400',
    },
  ];

  const overviewCards = [
    {
      title: 'Total Creators',
      value: stats?.total_creators || 0,
      subtext: `+${stats?.new_creators_today || 0} today`,
      icon: Users,
    },
    {
      title: 'Total Models',
      value: stats?.total_models || 0,
      icon: Sparkles,
    },
    {
      title: 'Active Subscribers',
      value: stats?.total_subscribers || 0,
      subtext: `+${stats?.new_subscribers_today || 0} today`,
      icon: TrendingUp,
    },
    {
      title: 'Total Revenue',
      value: `${((stats?.total_revenue || 0) / 250).toFixed(2)}`,
      subtext: `Today: ${((stats?.revenue_today || 0) / 250).toFixed(2)}`,
      icon: DollarSign,
      prefix: '£',
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-zinc-400 mt-1">Platform overview and approval queues</p>
      </div>

      {/* Approval Queues */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Clock size={20} className="text-zinc-400" />
          Approval Queues
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {queueCards.map((card) => (
            <Link
              key={card.title}
              href={card.href}
              className="bg-zinc-900 rounded-xl p-6 hover:bg-zinc-800/50 transition-colors group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-zinc-400 text-sm">{card.title}</p>
                  <p className="text-3xl font-bold mt-1">{card.count}</p>
                </div>
                <div className={`p-3 rounded-lg ${card.color}`}>
                  <card.icon size={24} />
                </div>
              </div>
              {card.count > 0 && (
                <p className="text-sm text-purple-400 mt-4 group-hover:underline">
                  Review now →
                </p>
              )}
            </Link>
          ))}
        </div>
      </div>

      {/* Platform Overview */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Platform Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {overviewCards.map((card) => (
            <div
              key={card.title}
              className="bg-zinc-900 rounded-xl p-6"
            >
              <div className="flex items-center gap-3 text-zinc-400 mb-2">
                <card.icon size={18} />
                <span className="text-sm">{card.title}</span>
              </div>
              <p className="text-2xl font-bold">
                {card.prefix}{card.value}
              </p>
              {card.subtext && (
                <p className="text-sm text-zinc-500 mt-1">{card.subtext}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/creators"
            className="px-4 py-2 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors"
          >
            View All Creators
          </Link>
          <Link
            href="/admin/models"
            className="px-4 py-2 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors"
          >
            View All Models
          </Link>
          <Link
            href="/admin/audit-log"
            className="px-4 py-2 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors"
          >
            Audit Log
          </Link>
        </div>
      </div>
    </div>
  );
}
