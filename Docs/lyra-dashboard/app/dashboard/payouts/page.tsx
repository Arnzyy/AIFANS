'use client';

import { useState, useEffect } from 'react';
import {
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowUpRight,
  Download,
  CreditCard,
  TrendingUp,
  Calendar,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { CreatorPayout, CreatorEarning, formatGBP } from '@/lib/creators/types';

export default function PayoutsPage() {
  const [stats, setStats] = useState({
    available_balance: 0,
    pending_balance: 0,
    total_earnings: 0,
    last_payout: null as string | null,
  });
  const [payouts, setPayouts] = useState<CreatorPayout[]>([]);
  const [earnings, setEarnings] = useState<CreatorEarning[]>([]);
  const [stripeConnected, setStripeConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [requestingPayout, setRequestingPayout] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, payoutsRes, earningsRes] = await Promise.all([
        fetch('/api/creator/stats'),
        fetch('/api/creator/payouts'),
        fetch('/api/creator/earnings?limit=20'),
      ]);

      const statsData = await statsRes.json();
      const payoutsData = await payoutsRes.json();
      const earningsData = await earningsRes.json();

      setStats(statsData);
      setPayouts(payoutsData.payouts || []);
      setEarnings(earningsData.earnings || []);
      setStripeConnected(statsData.stripe_connected || false);
    } catch (err) {
      console.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const requestPayout = async () => {
    setRequestingPayout(true);
    try {
      await fetch('/api/creator/payouts', {
        method: 'POST',
      });
      fetchData();
    } catch (err) {
      console.error('Failed to request payout');
    } finally {
      setRequestingPayout(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Payouts & Earnings</h1>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          icon={DollarSign}
          label="Available Balance"
          value={formatGBP(stats.available_balance)}
          color="green"
        />
        <StatCard
          icon={Clock}
          label="Pending Balance"
          value={formatGBP(stats.pending_balance)}
          color="yellow"
          subtitle="Available in 14 days"
        />
        <StatCard
          icon={TrendingUp}
          label="Total Earnings"
          value={formatGBP(stats.total_earnings)}
          color="purple"
        />
        <StatCard
          icon={Calendar}
          label="Last Payout"
          value={stats.last_payout ? new Date(stats.last_payout).toLocaleDateString() : 'None yet'}
          color="blue"
        />
      </div>

      {/* Request Payout */}
      <div className="bg-zinc-900 rounded-xl p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold mb-1">Request Payout</h2>
            <p className="text-gray-400 text-sm">
              Minimum payout: £10.00 • Payouts processed weekly
            </p>
          </div>
          <button
            onClick={requestPayout}
            disabled={requestingPayout || stats.available_balance < 1000 || !stripeConnected}
            className="px-6 py-3 bg-green-500 hover:bg-green-600 rounded-lg font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {requestingPayout ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <ArrowUpRight className="w-5 h-5" />
                Request Payout
              </>
            )}
          </button>
        </div>

        {!stripeConnected && (
          <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-400" />
            <div>
              <p className="font-medium text-yellow-400">Stripe not connected</p>
              <p className="text-sm text-gray-400">Connect your Stripe account to receive payouts</p>
            </div>
            <a
              href="/dashboard/settings"
              className="ml-auto px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded-lg text-sm"
            >
              Connect Stripe
            </a>
          </div>
        )}
      </div>

      {/* Payout Policy */}
      <div className="bg-zinc-900 rounded-xl p-6">
        <h2 className="text-lg font-bold mb-4">Payout Policy</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-400">Payout Schedule</p>
            <p className="font-medium">Weekly (Every Monday)</p>
          </div>
          <div>
            <p className="text-gray-400">Minimum Payout</p>
            <p className="font-medium">£10.00</p>
          </div>
          <div>
            <p className="text-gray-400">Earnings Hold Period</p>
            <p className="font-medium">14 days</p>
          </div>
          <div>
            <p className="text-gray-400">Platform Fee</p>
            <p className="font-medium">20%</p>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-4">
          Earnings are held for 14 days to allow for chargebacks and refunds. After this period, they become available for payout.
        </p>
      </div>

      {/* Payout History */}
      <div className="bg-zinc-900 rounded-xl p-6">
        <h2 className="text-lg font-bold mb-4">Payout History</h2>
        {payouts.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No payouts yet</p>
        ) : (
          <div className="space-y-3">
            {payouts.map((payout) => (
              <div
                key={payout.id}
                className="flex items-center justify-between p-4 bg-zinc-800 rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      payout.status === 'completed'
                        ? 'bg-green-500/20'
                        : payout.status === 'failed'
                        ? 'bg-red-500/20'
                        : 'bg-yellow-500/20'
                    }`}
                  >
                    {payout.status === 'completed' ? (
                      <CheckCircle className="w-5 h-5 text-green-400" />
                    ) : payout.status === 'failed' ? (
                      <AlertCircle className="w-5 h-5 text-red-400" />
                    ) : (
                      <Clock className="w-5 h-5 text-yellow-400" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{formatGBP(payout.amount_gbp_minor)}</p>
                    <p className="text-sm text-gray-400">
                      {new Date(payout.requested_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-sm ${
                    payout.status === 'completed'
                      ? 'bg-green-500/20 text-green-400'
                      : payout.status === 'failed'
                      ? 'bg-red-500/20 text-red-400'
                      : 'bg-yellow-500/20 text-yellow-400'
                  }`}
                >
                  {payout.status.charAt(0).toUpperCase() + payout.status.slice(1)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Earnings */}
      <div className="bg-zinc-900 rounded-xl p-6">
        <h2 className="text-lg font-bold mb-4">Recent Earnings</h2>
        {earnings.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No earnings yet</p>
        ) : (
          <div className="space-y-2">
            {earnings.map((earning) => (
              <div
                key={earning.id}
                className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    earning.type === 'SUBSCRIPTION'
                      ? 'bg-blue-500/20'
                      : earning.type === 'TIP'
                      ? 'bg-pink-500/20'
                      : earning.type === 'PPV_SALE'
                      ? 'bg-yellow-500/20'
                      : 'bg-gray-500/20'
                  }`}>
                    {earning.type === 'SUBSCRIPTION' ? (
                      <CreditCard className="w-4 h-4 text-blue-400" />
                    ) : earning.type === 'TIP' ? (
                      <DollarSign className="w-4 h-4 text-pink-400" />
                    ) : (
                      <Download className="w-4 h-4 text-yellow-400" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {earning.type === 'SUBSCRIPTION'
                        ? 'Subscription'
                        : earning.type === 'TIP'
                        ? 'Tip received'
                        : earning.type === 'PPV_SALE'
                        ? 'PPV Sale'
                        : earning.type}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(earning.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-green-400">+{formatGBP(earning.net_amount_gbp)}</p>
                  <p className="text-xs text-gray-500">
                    {earning.status === 'available' ? 'Available' : 'Pending'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  subtitle,
}: {
  icon: any;
  label: string;
  value: string;
  color: 'green' | 'yellow' | 'purple' | 'blue';
  subtitle?: string;
}) {
  const colors = {
    green: 'bg-green-500/20 text-green-400',
    yellow: 'bg-yellow-500/20 text-yellow-400',
    purple: 'bg-purple-500/20 text-purple-400',
    blue: 'bg-blue-500/20 text-blue-400',
  };

  return (
    <div className="bg-zinc-900 rounded-xl p-4">
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-sm text-gray-400">{label}</p>
          <p className="text-xl font-bold">{value}</p>
        </div>
      </div>
      {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
    </div>
  );
}
