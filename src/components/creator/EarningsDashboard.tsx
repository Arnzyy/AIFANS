'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, DollarSign, ShoppingBag, AlertTriangle } from 'lucide-react';

// ===========================================
// TYPES
// ===========================================

interface EarningsSummary {
  total_gross: number;
  total_fees: number;
  total_net: number;
  subscription_earnings: number;
  ppv_earnings: number;
  message_earnings: number;
  other_earnings: number;
  transaction_count: number;
}

interface EarningsData {
  today: EarningsSummary | null;
  thisWeek: EarningsSummary | null;
  thisMonth: EarningsSummary | null;
  thisYear: EarningsSummary | null;
  allTime: EarningsSummary | null;
}

interface TaxProfile {
  legal_name: string;
  national_insurance_number?: string;
  tax_reporting_consent: boolean;
}

// ===========================================
// MAIN COMPONENT
// ===========================================

export function CreatorEarningsDashboard() {
  const [earnings, setEarnings] = useState<EarningsData | null>(null);
  const [taxProfile, setTaxProfile] = useState<TaxProfile | null>(null);
  const [needsTaxAttention, setNeedsTaxAttention] = useState<string | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<
    'today' | 'thisWeek' | 'thisMonth' | 'thisYear' | 'allTime'
  >('thisMonth');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [earningsRes, taxRes] = await Promise.all([
        fetch('/api/creator/earnings'),
        fetch('/api/creator/tax-profile'),
      ]);

      const earningsData = await earningsRes.json();
      const taxData = await taxRes.json();

      setEarnings(earningsData);
      setTaxProfile(taxData.profile);
      setNeedsTaxAttention(taxData.attention_reason);
    } catch (error) {
      console.error('Failed to load earnings:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const currentEarnings = earnings?.[selectedPeriod];

  return (
    <div className="space-y-6">
      {/* Tax Alert */}
      {needsTaxAttention && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-yellow-500">
              Tax Profile Required
            </h3>
            <p className="text-sm text-yellow-400/80 mt-1">
              {needsTaxAttention}
            </p>
            <a
              href="/dashboard/tax-profile"
              className="inline-block mt-2 text-sm text-yellow-400 underline hover:text-yellow-300"
            >
              Complete Tax Profile
            </a>
          </div>
        </div>
      )}

      {/* Period Selector */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          { key: 'today', label: 'Today' },
          { key: 'thisWeek', label: 'This Week' },
          { key: 'thisMonth', label: 'This Month' },
          { key: 'thisYear', label: 'This Year' },
          { key: 'allTime', label: 'All Time' },
        ].map((period) => (
          <button
            key={period.key}
            onClick={() => setSelectedPeriod(period.key as any)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${
              selectedPeriod === period.key
                ? 'bg-purple-500 text-white'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            {period.label}
          </button>
        ))}
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          icon={<DollarSign className="w-6 h-6" />}
          label="Net Earnings"
          value={`£${(currentEarnings?.total_net || 0).toFixed(2)}`}
          subtext={`Gross: £${(currentEarnings?.total_gross || 0).toFixed(2)}`}
          color="green"
        />
        <StatCard
          icon={<TrendingUp className="w-6 h-6" />}
          label="Transactions"
          value={currentEarnings?.transaction_count?.toString() || '0'}
          subtext="Total purchases"
          color="purple"
        />
        <StatCard
          icon={<ShoppingBag className="w-6 h-6" />}
          label="Platform Fees"
          value={`£${(currentEarnings?.total_fees || 0).toFixed(2)}`}
          subtext="20-70% depending on type"
          color="gray"
        />
      </div>

      {/* Breakdown */}
      <div className="bg-zinc-900 rounded-xl p-6">
        <h3 className="font-semibold mb-4">Earnings Breakdown</h3>
        <div className="space-y-4">
          <BreakdownRow
            label="Subscriptions"
            amount={currentEarnings?.subscription_earnings || 0}
            total={currentEarnings?.total_net || 0}
            color="purple"
          />
          <BreakdownRow
            label="PPV Content"
            amount={currentEarnings?.ppv_earnings || 0}
            total={currentEarnings?.total_net || 0}
            color="pink"
          />
          <BreakdownRow
            label="Chat Messages"
            amount={currentEarnings?.message_earnings || 0}
            total={currentEarnings?.total_net || 0}
            color="blue"
          />
          <BreakdownRow
            label="Other"
            amount={currentEarnings?.other_earnings || 0}
            total={currentEarnings?.total_net || 0}
            color="gray"
          />
        </div>
      </div>

      {/* Revenue Split Info */}
      <div className="bg-white/5 rounded-xl p-4">
        <h4 className="font-medium mb-3">Revenue Split</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-400">Content (Subs, PPV)</p>
            <p className="text-green-400 font-semibold">You keep 80%</p>
          </div>
          <div>
            <p className="text-gray-400">AI Chat</p>
            <p className="text-green-400 font-semibold">You keep 30%</p>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-3">
          Platform handles AI costs, infrastructure, and support. You focus on
          content.
        </p>
      </div>

      {/* Tax Info */}
      <div className="bg-white/5 rounded-xl p-4">
        <h4 className="font-medium mb-2">Tax Reporting (DAC7)</h4>
        <p className="text-sm text-gray-400">
          LYRA reports your earnings to HMRC annually under DAC7 regulations.
          You remain responsible for your own tax obligations.
        </p>
        {taxProfile && (
          <div className="mt-3 text-sm">
            <p className="text-gray-500">
              Profile: <span className="text-white">{taxProfile.legal_name}</span>
            </p>
            {taxProfile.national_insurance_number && (
              <p className="text-gray-500">
                NI:{' '}
                <span className="text-white">
                  ••••••{taxProfile.national_insurance_number.slice(-3)}
                </span>
              </p>
            )}
          </div>
        )}
        <a
          href="/dashboard/tax-profile"
          className="inline-block mt-3 text-sm text-purple-400 hover:underline"
        >
          Manage Tax Profile
        </a>
      </div>
    </div>
  );
}

// ===========================================
// SUB COMPONENTS
// ===========================================

function StatCard({
  icon,
  label,
  value,
  subtext,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtext: string;
  color: 'green' | 'purple' | 'pink' | 'blue' | 'gray';
}) {
  const colorClasses = {
    green: 'text-green-400 bg-green-500/10',
    purple: 'text-purple-400 bg-purple-500/10',
    pink: 'text-pink-400 bg-pink-500/10',
    blue: 'text-blue-400 bg-blue-500/10',
    gray: 'text-gray-400 bg-gray-500/10',
  };

  return (
    <div className="bg-zinc-900 rounded-xl p-5">
      <div
        className={`w-12 h-12 rounded-full ${colorClasses[color]} flex items-center justify-center mb-3`}
      >
        {icon}
      </div>
      <p className="text-gray-400 text-sm">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      <p className="text-gray-500 text-xs mt-1">{subtext}</p>
    </div>
  );
}

function BreakdownRow({
  label,
  amount,
  total,
  color,
}: {
  label: string;
  amount: number;
  total: number;
  color: 'purple' | 'pink' | 'blue' | 'gray';
}) {
  const percentage = total > 0 ? (amount / total) * 100 : 0;

  const barColors = {
    purple: 'bg-purple-500',
    pink: 'bg-pink-500',
    blue: 'bg-blue-500',
    gray: 'bg-gray-500',
  };

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-400">{label}</span>
        <span className="font-medium">£{amount.toFixed(2)}</span>
      </div>
      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
        <div
          className={`h-full ${barColors[color]} rounded-full transition-all`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
}
