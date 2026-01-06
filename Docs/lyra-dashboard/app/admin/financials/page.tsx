'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  CreditCard,
  Users,
  Loader2,
  Calendar,
  Download,
  PieChart,
  BarChart3,
} from 'lucide-react';

interface FinancialStats {
  totalRevenue: number;
  monthlyRevenue: number;
  weeklyRevenue: number;
  dailyRevenue: number;
  platformFees: number;
  creatorPayouts: number;
  pendingPayouts: number;
  refundsIssued: number;
  subscriptionRevenue: number;
  tokenRevenue: number;
  ppvRevenue: number;
  tipRevenue: number;
  averageOrderValue: number;
  totalTransactions: number;
  monthlyGrowth: number;
  topCreators: { name: string; earnings: number }[];
  revenueByDay: { date: string; amount: number }[];
}

export default function FinancialsPage() {
  const [stats, setStats] = useState<FinancialStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  useEffect(() => {
    fetchStats();
  }, [dateRange]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/financials?range=${dateRange}`);
      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch financials');
    } finally {
      setLoading(false);
    }
  };

  // Mock data
  const data = stats || {
    totalRevenue: 89432100,
    monthlyRevenue: 12453200,
    weeklyRevenue: 3124500,
    dailyRevenue: 445300,
    platformFees: 17886420,
    creatorPayouts: 71545680,
    pendingPayouts: 4521300,
    refundsIssued: 234500,
    subscriptionRevenue: 45230000,
    tokenRevenue: 28450000,
    ppvRevenue: 12340000,
    tipRevenue: 3412100,
    averageOrderValue: 1245,
    totalTransactions: 71823,
    monthlyGrowth: 12.5,
    topCreators: [
      { name: 'Luna Studios', earnings: 2340000 },
      { name: 'Aria Digital', earnings: 1890000 },
      { name: 'Nova Creations', earnings: 1560000 },
      { name: 'Stellar Media', earnings: 1230000 },
      { name: 'Eclipse AI', earnings: 980000 },
    ],
    revenueByDay: Array.from({ length: 30 }, (_, i) => ({
      date: new Date(Date.now() - (29 - i) * 86400000).toISOString().split('T')[0],
      amount: Math.floor(300000 + Math.random() * 200000),
    })),
  };

  const formatCurrency = (pence: number) => `£${(pence / 100).toLocaleString('en-GB', { minimumFractionDigits: 2 })}`;

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
          <h1 className="text-2xl font-bold">Financial Overview</h1>
          <p className="text-gray-400">Platform revenue and creator payouts</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as any)}
            className="px-4 py-2 bg-zinc-900 border border-white/10 rounded-lg"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="all">All time</option>
          </select>
          <button className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Revenue"
          value={formatCurrency(data.totalRevenue)}
          icon={DollarSign}
          color="green"
        />
        <StatCard
          label="Monthly Revenue"
          value={formatCurrency(data.monthlyRevenue)}
          icon={TrendingUp}
          color="blue"
          change={`+${data.monthlyGrowth}%`}
          changePositive
        />
        <StatCard
          label="Platform Fees (20%)"
          value={formatCurrency(data.platformFees)}
          icon={PieChart}
          color="purple"
        />
        <StatCard
          label="Creator Payouts"
          value={formatCurrency(data.creatorPayouts)}
          icon={Users}
          color="pink"
        />
      </div>

      {/* Revenue Chart */}
      <div className="bg-zinc-900 rounded-xl p-6">
        <h2 className="text-lg font-bold mb-4">Revenue Trend</h2>
        <div className="h-64 flex items-end gap-1">
          {data.revenueByDay.map((day, i) => {
            const maxAmount = Math.max(...data.revenueByDay.map((d) => d.amount));
            const height = (day.amount / maxAmount) * 100;
            return (
              <div
                key={i}
                className="flex-1 bg-purple-500/30 hover:bg-purple-500/50 rounded-t transition cursor-pointer group relative"
                style={{ height: `${height}%` }}
              >
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block">
                  <div className="bg-zinc-800 px-2 py-1 rounded text-xs whitespace-nowrap">
                    {formatCurrency(day.amount)}
                    <br />
                    <span className="text-gray-500">{day.date}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          <span>{data.revenueByDay[0]?.date}</span>
          <span>{data.revenueByDay[data.revenueByDay.length - 1]?.date}</span>
        </div>
      </div>

      {/* Revenue Breakdown & Top Creators */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Breakdown */}
        <div className="bg-zinc-900 rounded-xl p-6">
          <h2 className="text-lg font-bold mb-4">Revenue Breakdown</h2>
          <div className="space-y-4">
            <RevenueBar
              label="Subscriptions"
              amount={data.subscriptionRevenue}
              total={data.totalRevenue}
              color="bg-blue-500"
            />
            <RevenueBar
              label="Token Purchases"
              amount={data.tokenRevenue}
              total={data.totalRevenue}
              color="bg-green-500"
            />
            <RevenueBar
              label="PPV Sales"
              amount={data.ppvRevenue}
              total={data.totalRevenue}
              color="bg-yellow-500"
            />
            <RevenueBar
              label="Tips"
              amount={data.tipRevenue}
              total={data.totalRevenue}
              color="bg-pink-500"
            />
          </div>
        </div>

        {/* Top Creators */}
        <div className="bg-zinc-900 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">Top Earners</h2>
            <Link href="/admin/creators" className="text-sm text-purple-400 hover:underline">
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {data.topCreators.map((creator, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 bg-purple-500/20 rounded-full flex items-center justify-center text-sm font-bold">
                    {i + 1}
                  </span>
                  <span>{creator.name}</span>
                </div>
                <span className="font-medium text-green-400">{formatCurrency(creator.earnings)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/admin/financials/payouts"
          className="p-4 bg-zinc-900 rounded-xl hover:bg-zinc-800 transition flex items-center justify-between"
        >
          <div>
            <p className="font-medium">Pending Payouts</p>
            <p className="text-2xl font-bold text-yellow-400">{formatCurrency(data.pendingPayouts)}</p>
          </div>
          <ArrowRight className="w-5 h-5 text-gray-500" />
        </Link>
        <Link
          href="/admin/financials/transactions"
          className="p-4 bg-zinc-900 rounded-xl hover:bg-zinc-800 transition flex items-center justify-between"
        >
          <div>
            <p className="font-medium">Total Transactions</p>
            <p className="text-2xl font-bold">{data.totalTransactions.toLocaleString()}</p>
          </div>
          <ArrowRight className="w-5 h-5 text-gray-500" />
        </Link>
        <Link
          href="/admin/financials/refunds"
          className="p-4 bg-zinc-900 rounded-xl hover:bg-zinc-800 transition flex items-center justify-between"
        >
          <div>
            <p className="font-medium">Refunds Issued</p>
            <p className="text-2xl font-bold text-red-400">{formatCurrency(data.refundsIssued)}</p>
          </div>
          <ArrowRight className="w-5 h-5 text-gray-500" />
        </Link>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-zinc-900 rounded-xl p-4">
          <p className="text-sm text-gray-400">Avg Order Value</p>
          <p className="text-xl font-bold">{formatCurrency(data.averageOrderValue)}</p>
        </div>
        <div className="bg-zinc-900 rounded-xl p-4">
          <p className="text-sm text-gray-400">Daily Revenue</p>
          <p className="text-xl font-bold">{formatCurrency(data.dailyRevenue)}</p>
        </div>
        <div className="bg-zinc-900 rounded-xl p-4">
          <p className="text-sm text-gray-400">Weekly Revenue</p>
          <p className="text-xl font-bold">{formatCurrency(data.weeklyRevenue)}</p>
        </div>
        <div className="bg-zinc-900 rounded-xl p-4">
          <p className="text-sm text-gray-400">Monthly Growth</p>
          <p className="text-xl font-bold text-green-400">+{data.monthlyGrowth}%</p>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  change,
  changePositive,
}: {
  label: string;
  value: string;
  icon: any;
  color: 'green' | 'blue' | 'purple' | 'pink' | 'yellow';
  change?: string;
  changePositive?: boolean;
}) {
  const colors = {
    green: 'bg-green-500/20 text-green-400',
    blue: 'bg-blue-500/20 text-blue-400',
    purple: 'bg-purple-500/20 text-purple-400',
    pink: 'bg-pink-500/20 text-pink-400',
    yellow: 'bg-yellow-500/20 text-yellow-400',
  };

  return (
    <div className="bg-zinc-900 rounded-xl p-4">
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <p className="text-sm text-gray-400">{label}</p>
      <p className="text-xl font-bold">{value}</p>
      {change && (
        <p className={`text-xs mt-1 ${changePositive ? 'text-green-400' : 'text-red-400'}`}>
          {change} vs last period
        </p>
      )}
    </div>
  );
}

function RevenueBar({
  label,
  amount,
  total,
  color,
}: {
  label: string;
  amount: number;
  total: number;
  color: string;
}) {
  const percentage = (amount / total) * 100;
  const formatCurrency = (pence: number) => `£${(pence / 100).toLocaleString('en-GB')}`;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm">{label}</span>
        <span className="text-sm font-medium">{formatCurrency(amount)} ({percentage.toFixed(1)}%)</span>
      </div>
      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}
