'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  DollarSign,
  Users,
  MessageSquare,
  TrendingUp,
  Plus,
  ChevronRight,
  Loader2,
  AlertCircle,
  Eye,
  Package,
  CreditCard,
  Clock,
} from 'lucide-react';
import {
  Creator,
  CreatorModel,
  CreatorDashboardStats,
  getStatusColor,
  getStatusLabel,
  formatGBP,
} from '@/lib/creators/types';

// ===========================================
// CREATOR DASHBOARD OVERVIEW
// ===========================================

export function CreatorDashboardOverview() {
  const [creator, setCreator] = useState<Creator | null>(null);
  const [models, setModels] = useState<CreatorModel[]>([]);
  const [stats, setStats] = useState<CreatorDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [creatorRes, modelsRes, statsRes] = await Promise.all([
        fetch('/api/creator/onboarding'),
        fetch('/api/creator/models'),
        fetch('/api/creator/stats'),
      ]);

      const creatorData = await creatorRes.json();
      const modelsData = await modelsRes.json();
      const statsData = await statsRes.json();

      setCreator(creatorData.creator);
      setModels(modelsData.models || []);
      setStats(statsData);
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

  // Check creator status
  if (!creator || creator.status !== 'APPROVED') {
    return <CreatorStatusBanner creator={creator} />;
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 rounded-2xl p-6">
        <h1 className="text-2xl font-bold mb-2">
          Welcome back, {creator.legal_name || creator.business_name}! 👋
        </h1>
        <p className="text-gray-300">
          Here's how your content is performing
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Total Subscribers"
          value={stats?.total_subscribers || 0}
          color="purple"
        />
        <StatCard
          icon={DollarSign}
          label="Total Earnings"
          value={formatGBP(stats?.total_earnings_gbp || 0)}
          color="green"
        />
        <StatCard
          icon={CreditCard}
          label="Available Balance"
          value={formatGBP(stats?.available_balance_gbp || 0)}
          color="blue"
        />
        <StatCard
          icon={Clock}
          label="Pending"
          value={formatGBP(stats?.pending_balance_gbp || 0)}
          color="yellow"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <QuickActionCard
          icon={Plus}
          title="Create New Model"
          description="Add a new AI persona"
          href="/dashboard/models/new"
          disabled={models.length >= creator.max_models_allowed}
        />
        <QuickActionCard
          icon={Package}
          title="Create PPV"
          description="Monetize exclusive content"
          href="/dashboard/ppv/new"
        />
        <QuickActionCard
          icon={MessageSquare}
          title="View Messages"
          description="Check subscriber messages"
          href="/dashboard/messages"
        />
      </div>

      {/* Models Overview */}
      <div className="bg-zinc-900 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Your Models</h2>
          <Link
            href="/dashboard/models"
            className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1"
          >
            View all
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {models.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400 mb-4">No models yet</p>
            <Link
              href="/dashboard/models/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 rounded-lg font-medium"
            >
              <Plus className="w-4 h-4" />
              Create Your First Model
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {models.slice(0, 3).map((model) => (
              <ModelCard key={model.id} model={model} />
            ))}
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div className="bg-zinc-900 rounded-xl p-6">
        <h2 className="text-lg font-bold mb-4">Recent Activity</h2>
        <div className="space-y-3">
          <ActivityItem
            type="subscription"
            message="New subscriber to Luna"
            time="2 hours ago"
          />
          <ActivityItem
            type="tip"
            message="Received 500 tokens tip"
            time="5 hours ago"
          />
          <ActivityItem
            type="ppv"
            message="PPV 'Exclusive Set' purchased"
            time="1 day ago"
          />
        </div>
      </div>
    </div>
  );
}

// ===========================================
// HELPER COMPONENTS
// ===========================================

function CreatorStatusBanner({ creator }: { creator: Creator | null }) {
  if (!creator) {
    return (
      <div className="bg-zinc-900 rounded-xl p-8 text-center">
        <h2 className="text-xl font-bold mb-4">Complete Your Creator Profile</h2>
        <p className="text-gray-400 mb-6">
          You need to complete onboarding before you can access the creator dashboard.
        </p>
        <Link
          href="/dashboard/onboarding"
          className="inline-flex items-center gap-2 px-6 py-3 bg-purple-500 hover:bg-purple-600 rounded-lg font-medium"
        >
          Start Onboarding
          <ChevronRight className="w-5 h-5" />
        </Link>
      </div>
    );
  }

  const statusConfig = {
    INCOMPLETE: {
      title: 'Complete Your Profile',
      message: 'Finish the onboarding process to start creating.',
      action: 'Continue Onboarding',
      href: '/dashboard/onboarding',
      color: 'yellow',
    },
    PENDING_REVIEW: {
      title: 'Application Under Review',
      message: 'Your creator application is being reviewed. This usually takes 24-48 hours.',
      action: null,
      href: null,
      color: 'blue',
    },
    REJECTED: {
      title: 'Application Rejected',
      message: creator.rejection_reason || 'Your application was not approved.',
      action: 'Contact Support',
      href: '/support',
      color: 'red',
    },
    SUSPENDED: {
      title: 'Account Suspended',
      message: 'Your creator account has been suspended.',
      action: 'Contact Support',
      href: '/support',
      color: 'red',
    },
  };

  const config = statusConfig[creator.status as keyof typeof statusConfig];
  if (!config) return null;

  return (
    <div className={`bg-${config.color}-500/10 border border-${config.color}-500/30 rounded-xl p-8 text-center`}>
      <div className={`w-16 h-16 mx-auto mb-4 bg-${config.color}-500/20 rounded-full flex items-center justify-center`}>
        {creator.status === 'PENDING_REVIEW' ? (
          <Loader2 className={`w-8 h-8 text-${config.color}-400 animate-spin`} />
        ) : (
          <AlertCircle className={`w-8 h-8 text-${config.color}-400`} />
        )}
      </div>
      <h2 className="text-xl font-bold mb-2">{config.title}</h2>
      <p className="text-gray-400 mb-6">{config.message}</p>
      {config.action && config.href && (
        <Link
          href={config.href}
          className={`inline-flex items-center gap-2 px-6 py-3 bg-${config.color}-500 hover:bg-${config.color}-600 rounded-lg font-medium`}
        >
          {config.action}
          <ChevronRight className="w-5 h-5" />
        </Link>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: any;
  label: string;
  value: string | number;
  color: string;
}) {
  const colorClasses = {
    purple: 'bg-purple-500/20 text-purple-400',
    green: 'bg-green-500/20 text-green-400',
    blue: 'bg-blue-500/20 text-blue-400',
    yellow: 'bg-yellow-500/20 text-yellow-400',
  };

  return (
    <div className="bg-zinc-900 rounded-xl p-4">
      <div className={`w-10 h-10 rounded-lg ${colorClasses[color as keyof typeof colorClasses]} flex items-center justify-center mb-3`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm text-gray-400">{label}</p>
    </div>
  );
}

function QuickActionCard({
  icon: Icon,
  title,
  description,
  href,
  disabled = false,
}: {
  icon: any;
  title: string;
  description: string;
  href: string;
  disabled?: boolean;
}) {
  const content = (
    <div className={`bg-zinc-900 rounded-xl p-4 flex items-center gap-4 transition ${
      disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-zinc-800'
    }`}>
      <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
        <Icon className="w-6 h-6 text-purple-400" />
      </div>
      <div className="flex-1">
        <p className="font-medium">{title}</p>
        <p className="text-sm text-gray-400">{description}</p>
      </div>
      <ChevronRight className="w-5 h-5 text-gray-500" />
    </div>
  );

  if (disabled) {
    return content;
  }

  return <Link href={href}>{content}</Link>;
}

function ModelCard({ model }: { model: CreatorModel }) {
  return (
    <Link
      href={`/dashboard/models/${model.id}`}
      className="bg-zinc-800 rounded-lg overflow-hidden hover:ring-2 hover:ring-purple-500 transition"
    >
      <div className="aspect-video bg-zinc-700 relative">
        {model.cover_url ? (
          <img src={model.cover_url} alt="" className="w-full h-full object-cover" />
        ) : model.avatar_url ? (
          <div className="w-full h-full flex items-center justify-center">
            <img src={model.avatar_url} alt="" className="w-20 h-20 rounded-full object-cover" />
          </div>
        ) : null}
        <div className="absolute top-2 right-2">
          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(model.status)}`}>
            {getStatusLabel(model.status)}
          </span>
        </div>
      </div>
      <div className="p-3">
        <p className="font-medium">{model.display_name}</p>
        <div className="flex items-center justify-between mt-1 text-sm text-gray-400">
          <span>{model.subscriber_count} subscribers</span>
          <span>{formatGBP(model.subscription_price_monthly || 0)}/mo</span>
        </div>
      </div>
    </Link>
  );
}

function ActivityItem({
  type,
  message,
  time,
}: {
  type: 'subscription' | 'tip' | 'ppv';
  message: string;
  time: string;
}) {
  const icons = {
    subscription: Users,
    tip: DollarSign,
    ppv: Package,
  };

  const Icon = icons[type];

  return (
    <div className="flex items-center gap-3 p-3 bg-zinc-800 rounded-lg">
      <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center">
        <Icon className="w-4 h-4 text-purple-400" />
      </div>
      <div className="flex-1">
        <p className="text-sm">{message}</p>
        <p className="text-xs text-gray-500">{time}</p>
      </div>
    </div>
  );
}
