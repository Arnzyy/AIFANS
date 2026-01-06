'use client';

import { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Bot,
  DollarSign,
  MessageSquare,
  Eye,
  Clock,
  Loader2,
  Calendar,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';

interface AnalyticsData {
  overview: {
    totalUsers: number;
    activeUsers: number;
    newUsers: number;
    totalCreators: number;
    activeCreators: number;
    totalModels: number;
    activeModels: number;
    totalMessages: number;
    avgSessionDuration: number;
  };
  growth: {
    users: { date: string; count: number }[];
    creators: { date: string; count: number }[];
    revenue: { date: string; amount: number }[];
    messages: { date: string; count: number }[];
  };
  engagement: {
    avgMessagesPerUser: number;
    avgSubscriptionsPerUser: number;
    avgTokenSpendPerUser: number;
    peakHour: number;
    topModels: { name: string; subscribers: number; messages: number }[];
  };
  retention: {
    day1: number;
    day7: number;
    day30: number;
  };
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/analytics?range=${dateRange}`);
      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error('Failed to fetch analytics');
    } finally {
      setLoading(false);
    }
  };

  // Mock data
  const analytics: AnalyticsData = data || {
    overview: {
      totalUsers: 12847,
      activeUsers: 4532,
      newUsers: 847,
      totalCreators: 156,
      activeCreators: 89,
      totalModels: 234,
      activeModels: 178,
      totalMessages: 1245678,
      avgSessionDuration: 18.5,
    },
    growth: {
      users: Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - (29 - i) * 86400000).toISOString().split('T')[0],
        count: Math.floor(50 + Math.random() * 100),
      })),
      creators: Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - (29 - i) * 86400000).toISOString().split('T')[0],
        count: Math.floor(2 + Math.random() * 5),
      })),
      revenue: Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - (29 - i) * 86400000).toISOString().split('T')[0],
        amount: Math.floor(300000 + Math.random() * 200000),
      })),
      messages: Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - (29 - i) * 86400000).toISOString().split('T')[0],
        count: Math.floor(30000 + Math.random() * 20000),
      })),
    },
    engagement: {
      avgMessagesPerUser: 42.3,
      avgSubscriptionsPerUser: 2.1,
      avgTokenSpendPerUser: 3450,
      peakHour: 21,
      topModels: [
        { name: 'Luna', subscribers: 1234, messages: 45678 },
        { name: 'Aria', subscribers: 987, messages: 38456 },
        { name: 'Nova', subscribers: 856, messages: 32145 },
        { name: 'Sophie', subscribers: 743, messages: 28934 },
        { name: 'Mia', subscribers: 654, messages: 24567 },
      ],
    },
    retention: {
      day1: 68,
      day7: 42,
      day30: 28,
    },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-gray-400">Platform performance and user insights</p>
        </div>
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value as any)}
          className="px-4 py-2 bg-zinc-900 border border-white/10 rounded-lg"
        >
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
        </select>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Users"
          value={analytics.overview.totalUsers.toLocaleString()}
          subValue={`${analytics.overview.activeUsers.toLocaleString()} active`}
          icon={Users}
          trend={12.5}
        />
        <StatCard
          label="Total Creators"
          value={analytics.overview.totalCreators.toLocaleString()}
          subValue={`${analytics.overview.activeCreators} active`}
          icon={Users}
          trend={8.3}
        />
        <StatCard
          label="Total Models"
          value={analytics.overview.totalModels.toLocaleString()}
          subValue={`${analytics.overview.activeModels} active`}
          icon={Bot}
          trend={15.2}
        />
        <StatCard
          label="Total Messages"
          value={(analytics.overview.totalMessages / 1000000).toFixed(2) + 'M'}
          subValue={`${analytics.overview.avgSessionDuration}min avg session`}
          icon={MessageSquare}
          trend={22.1}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Growth Chart */}
        <div className="bg-zinc-900 rounded-xl p-6">
          <h2 className="text-lg font-bold mb-4">User Growth</h2>
          <div className="h-48 flex items-end gap-1">
            {analytics.growth.users.map((day, i) => {
              const max = Math.max(...analytics.growth.users.map((d) => d.count));
              const height = (day.count / max) * 100;
              return (
                <div
                  key={i}
                  className="flex-1 bg-blue-500/30 hover:bg-blue-500/50 rounded-t transition"
                  style={{ height: `${height}%` }}
                  title={`${day.date}: ${day.count} new users`}
                />
              );
            })}
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-500">
            <span>{analytics.growth.users[0]?.date}</span>
            <span>{analytics.growth.users[analytics.growth.users.length - 1]?.date}</span>
          </div>
        </div>

        {/* Messages Chart */}
        <div className="bg-zinc-900 rounded-xl p-6">
          <h2 className="text-lg font-bold mb-4">Daily Messages</h2>
          <div className="h-48 flex items-end gap-1">
            {analytics.growth.messages.map((day, i) => {
              const max = Math.max(...analytics.growth.messages.map((d) => d.count));
              const height = (day.count / max) * 100;
              return (
                <div
                  key={i}
                  className="flex-1 bg-purple-500/30 hover:bg-purple-500/50 rounded-t transition"
                  style={{ height: `${height}%` }}
                  title={`${day.date}: ${day.count.toLocaleString()} messages`}
                />
              );
            })}
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-500">
            <span>{analytics.growth.messages[0]?.date}</span>
            <span>{analytics.growth.messages[analytics.growth.messages.length - 1]?.date}</span>
          </div>
        </div>
      </div>

      {/* Engagement & Retention */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Engagement Metrics */}
        <div className="bg-zinc-900 rounded-xl p-6">
          <h2 className="text-lg font-bold mb-4">Engagement</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Avg Messages/User</span>
              <span className="font-bold">{analytics.engagement.avgMessagesPerUser}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Avg Subs/User</span>
              <span className="font-bold">{analytics.engagement.avgSubscriptionsPerUser}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Avg Token Spend</span>
              <span className="font-bold">{analytics.engagement.avgTokenSpendPerUser.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Peak Hour</span>
              <span className="font-bold">{analytics.engagement.peakHour}:00</span>
            </div>
          </div>
        </div>

        {/* Retention */}
        <div className="bg-zinc-900 rounded-xl p-6">
          <h2 className="text-lg font-bold mb-4">User Retention</h2>
          <div className="space-y-4">
            <RetentionBar label="Day 1" value={analytics.retention.day1} />
            <RetentionBar label="Day 7" value={analytics.retention.day7} />
            <RetentionBar label="Day 30" value={analytics.retention.day30} />
          </div>
        </div>

        {/* Top Models */}
        <div className="bg-zinc-900 rounded-xl p-6">
          <h2 className="text-lg font-bold mb-4">Top Models</h2>
          <div className="space-y-3">
            {analytics.engagement.topModels.map((model, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 bg-purple-500/20 rounded-full flex items-center justify-center text-xs font-bold">
                    {i + 1}
                  </span>
                  <span>{model.name}</span>
                </div>
                <div className="text-right text-sm">
                  <p className="text-gray-400">{model.subscribers} subs</p>
                  <p className="text-xs text-gray-500">{(model.messages / 1000).toFixed(1)}k msgs</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-zinc-900 rounded-xl p-4">
          <p className="text-sm text-gray-400">New Users Today</p>
          <p className="text-2xl font-bold">{analytics.overview.newUsers}</p>
        </div>
        <div className="bg-zinc-900 rounded-xl p-4">
          <p className="text-sm text-gray-400">Active Users (30d)</p>
          <p className="text-2xl font-bold">{analytics.overview.activeUsers.toLocaleString()}</p>
        </div>
        <div className="bg-zinc-900 rounded-xl p-4">
          <p className="text-sm text-gray-400">Avg Session Duration</p>
          <p className="text-2xl font-bold">{analytics.overview.avgSessionDuration} min</p>
        </div>
        <div className="bg-zinc-900 rounded-xl p-4">
          <p className="text-sm text-gray-400">DAU/MAU Ratio</p>
          <p className="text-2xl font-bold">
            {((analytics.overview.activeUsers / analytics.overview.totalUsers) * 100).toFixed(1)}%
          </p>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  subValue,
  icon: Icon,
  trend,
}: {
  label: string;
  value: string;
  subValue: string;
  icon: any;
  trend: number;
}) {
  const isPositive = trend > 0;

  return (
    <div className="bg-zinc-900 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <Icon className="w-5 h-5 text-gray-500" />
        <div className={`flex items-center gap-1 text-xs ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
          {isPositive ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
          {Math.abs(trend)}%
        </div>
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm text-gray-500">{subValue}</p>
      <p className="text-xs text-gray-400 mt-1">{label}</p>
    </div>
  );
}

function RetentionBar({ label, value }: { label: string; value: number }) {
  const getColor = (v: number) => {
    if (v >= 50) return 'bg-green-500';
    if (v >= 30) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-gray-400">{label}</span>
        <span className="text-sm font-medium">{value}%</span>
      </div>
      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div className={`h-full ${getColor(value)} rounded-full`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
