'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  Bot,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  UserCheck,
  UserX,
  Flag,
  AlertTriangle,
  Eye,
  Clock,
  Activity,
  Loader2,
  CheckCircle,
  XCircle,
  MessageSquare,
  CreditCard,
} from 'lucide-react';

interface DashboardStats {
  totalCreators: number;
  totalModels: number;
  totalUsers: number;
  totalSubscriptions: number;
  pendingCreators: number;
  pendingModels: number;
  pendingReports: number;
  activeStrikes: number;
  totalRevenue: number;
  monthlyRevenue: number;
  pendingPayouts: number;
  newUsersToday: number;
  newCreatorsThisWeek: number;
  recentActivity: ActivityItem[];
}

interface ActivityItem {
  id: string;
  type: string;
  description: string;
  timestamp: string;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/dashboard');
      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  // Mock data if API not ready
  const data = stats || {
    totalCreators: 156,
    totalModels: 234,
    totalUsers: 12847,
    totalSubscriptions: 3429,
    pendingCreators: 8,
    pendingModels: 12,
    pendingReports: 5,
    activeStrikes: 3,
    totalRevenue: 89432100,
    monthlyRevenue: 12453200,
    pendingPayouts: 4521300,
    newUsersToday: 127,
    newCreatorsThisWeek: 14,
    recentActivity: [
      { id: '1', type: 'CREATOR_APPROVED', description: 'Creator "Luna Studios" was approved', timestamp: new Date().toISOString() },
      { id: '2', type: 'MODEL_SUBMITTED', description: 'New model "Aria" submitted for review', timestamp: new Date(Date.now() - 3600000).toISOString() },
      { id: '3', type: 'REPORT_FILED', description: 'Content report filed for model "Sophie"', timestamp: new Date(Date.now() - 7200000).toISOString() },
      { id: '4', type: 'PAYOUT_COMPLETED', description: 'Payout of £2,340 completed for creator', timestamp: new Date(Date.now() - 10800000).toISOString() },
      { id: '5', type: 'STRIKE_ISSUED', description: 'Warning issued to creator for policy violation', timestamp: new Date(Date.now() - 14400000).toISOString() },
    ],
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard Overview</h1>
        <p className="text-gray-400">Welcome back. Here's what's happening on the platform.</p>
      </div>

      {/* Quick Actions - Pending Items */}
      {(data.pendingCreators > 0 || data.pendingModels > 0 || data.pendingReports > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {data.pendingCreators > 0 && (
            <Link href="/admin/creators/pending" className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl hover:bg-yellow-500/20 transition">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <UserCheck className="w-5 h-5 text-yellow-400" />
                  <div>
                    <p className="font-medium text-yellow-400">{data.pendingCreators} Pending Creators</p>
                    <p className="text-sm text-gray-400">Awaiting approval</p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-yellow-400" />
              </div>
            </Link>
          )}
          {data.pendingModels > 0 && (
            <Link href="/admin/models/pending" className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl hover:bg-blue-500/20 transition">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bot className="w-5 h-5 text-blue-400" />
                  <div>
                    <p className="font-medium text-blue-400">{data.pendingModels} Pending Models</p>
                    <p className="text-sm text-gray-400">Awaiting review</p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-blue-400" />
              </div>
            </Link>
          )}
          {data.pendingReports > 0 && (
            <Link href="/admin/reports" className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl hover:bg-red-500/20 transition">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Flag className="w-5 h-5 text-red-400" />
                  <div>
                    <p className="font-medium text-red-400">{data.pendingReports} Content Reports</p>
                    <p className="text-sm text-gray-400">Need attention</p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-red-400" />
              </div>
            </Link>
          )}
        </div>
      )}

      {/* Main Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Creators" value={data.totalCreators.toLocaleString()} change={`+${data.newCreatorsThisWeek} this week`} changePositive color="purple" />
        <StatCard icon={Bot} label="Total Models" value={data.totalModels.toLocaleString()} color="blue" />
        <StatCard icon={Users} label="Total Users" value={data.totalUsers.toLocaleString()} change={`+${data.newUsersToday} today`} changePositive color="green" />
        <StatCard icon={CreditCard} label="Active Subscriptions" value={data.totalSubscriptions.toLocaleString()} color="pink" />
      </div>

      {/* Financial Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-zinc-900 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Total Revenue</p>
              <p className="text-2xl font-bold">£{(data.totalRevenue / 100).toLocaleString()}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-green-400">
            <TrendingUp className="w-4 h-4" />
            <span>+12.5% from last month</span>
          </div>
        </div>

        <div className="bg-zinc-900 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Activity className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Monthly Revenue</p>
              <p className="text-2xl font-bold">£{(data.monthlyRevenue / 100).toLocaleString()}</p>
            </div>
          </div>
          <div className="h-12 flex items-end gap-1">
            {[40, 65, 45, 80, 55, 70, 90, 60, 75, 85, 95, 100].map((h, i) => (
              <div key={i} className="flex-1 bg-blue-500/30 rounded-t" style={{ height: `${h}%` }} />
            ))}
          </div>
        </div>

        <div className="bg-zinc-900 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Pending Payouts</p>
              <p className="text-2xl font-bold">£{(data.pendingPayouts / 100).toLocaleString()}</p>
            </div>
          </div>
          <Link href="/admin/financials/payouts" className="text-sm text-purple-400 hover:underline flex items-center gap-1">
            Process payouts <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-zinc-900 rounded-xl p-6">
          <h2 className="text-lg font-bold mb-4">Recent Activity</h2>
          <div className="space-y-4">
            {data.recentActivity.map((activity) => (
              <ActivityRow key={activity.id} activity={activity} />
            ))}
          </div>
          <Link href="/admin/audit-log" className="mt-4 block text-center text-sm text-purple-400 hover:underline">
            View full audit log
          </Link>
        </div>

        {/* Moderation Status */}
        <div className="space-y-4">
          <div className="bg-zinc-900 rounded-xl p-6">
            <h2 className="text-lg font-bold mb-4">Platform Health</h2>
            <div className="space-y-3">
              <HealthItem label="API Response Time" value="124ms" status="good" />
              <HealthItem label="Database Load" value="23%" status="good" />
              <HealthItem label="Active Sessions" value="1,234" status="good" />
              <HealthItem label="Error Rate" value="0.02%" status="good" />
            </div>
          </div>

          <div className="bg-zinc-900 rounded-xl p-6">
            <h2 className="text-lg font-bold mb-4">Moderation Queue</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-zinc-800 rounded-lg">
                <p className="text-2xl font-bold text-yellow-400">{data.pendingCreators}</p>
                <p className="text-xs text-gray-400">Pending Creators</p>
              </div>
              <div className="text-center p-3 bg-zinc-800 rounded-lg">
                <p className="text-2xl font-bold text-blue-400">{data.pendingModels}</p>
                <p className="text-xs text-gray-400">Pending Models</p>
              </div>
              <div className="text-center p-3 bg-zinc-800 rounded-lg">
                <p className="text-2xl font-bold text-red-400">{data.pendingReports}</p>
                <p className="text-xs text-gray-400">Open Reports</p>
              </div>
              <div className="text-center p-3 bg-zinc-800 rounded-lg">
                <p className="text-2xl font-bold text-orange-400">{data.activeStrikes}</p>
                <p className="text-xs text-gray-400">Active Strikes</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, change, changePositive, color }: {
  icon: any; label: string; value: string; change?: string; changePositive?: boolean;
  color: 'purple' | 'blue' | 'green' | 'pink' | 'yellow';
}) {
  const colors = {
    purple: 'bg-purple-500/20 text-purple-400',
    blue: 'bg-blue-500/20 text-blue-400',
    green: 'bg-green-500/20 text-green-400',
    pink: 'bg-pink-500/20 text-pink-400',
    yellow: 'bg-yellow-500/20 text-yellow-400',
  };

  return (
    <div className="bg-zinc-900 rounded-xl p-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-sm text-gray-400">{label}</p>
          <p className="text-xl font-bold">{value}</p>
        </div>
      </div>
      {change && <p className={`text-xs mt-2 ${changePositive ? 'text-green-400' : 'text-red-400'}`}>{change}</p>}
    </div>
  );
}

function ActivityRow({ activity }: { activity: ActivityItem }) {
  const getIcon = () => {
    switch (activity.type) {
      case 'CREATOR_APPROVED': return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'CREATOR_REJECTED': return <XCircle className="w-4 h-4 text-red-400" />;
      case 'MODEL_SUBMITTED': return <Bot className="w-4 h-4 text-blue-400" />;
      case 'REPORT_FILED': return <Flag className="w-4 h-4 text-red-400" />;
      case 'STRIKE_ISSUED': return <AlertTriangle className="w-4 h-4 text-orange-400" />;
      case 'PAYOUT_COMPLETED': return <DollarSign className="w-4 h-4 text-green-400" />;
      default: return <Activity className="w-4 h-4 text-gray-400" />;
    }
  };

  const getTimeAgo = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 bg-zinc-800 rounded-lg flex items-center justify-center flex-shrink-0">{getIcon()}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate">{activity.description}</p>
        <p className="text-xs text-gray-500">{getTimeAgo(activity.timestamp)}</p>
      </div>
    </div>
  );
}

function HealthItem({ label, value, status }: { label: string; value: string; status: 'good' | 'warning' | 'error'; }) {
  const statusColors = { good: 'bg-green-500', warning: 'bg-yellow-500', error: 'bg-red-500' };
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${statusColors[status]}`} />
        <span className="text-sm text-gray-400">{label}</span>
      </div>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}
