'use client';

import Link from 'next/link';
import {
  Users,
  PoundSterling,
  FileText,
  MessageCircle,
  TrendingUp,
  Bot,
  Layers,
  ArrowRight,
} from 'lucide-react';

// ===========================================
// MOCK DATA
// ===========================================

const STATS = {
  subscribers: { value: 0, change: '+12%' },
  earnings: { value: '£0.00', change: '+8%' },
  posts: { value: 0 },
  messages: { value: 0 },
};

// ===========================================
// MAIN COMPONENT
// ===========================================

export default function DashboardOverviewPage() {
  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Welcome back, billy</h1>
        <p className="text-gray-400 mt-1">Here's how your content is performing</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Subscribers"
          value={STATS.subscribers.value}
          change={STATS.subscribers.change}
          positive
        />
        <StatCard
          label="This Month"
          value={STATS.earnings.value}
          change={STATS.earnings.change}
          positive
        />
        <StatCard label="Posts" value={STATS.posts.value} />
        <StatCard label="Messages" value={STATS.messages.value} />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <QuickAction
          href="/dashboard/posts/new"
          icon={FileText}
          title="Create Post"
          description="Share new content with your fans"
          gradient="from-orange-500/20 to-pink-500/20"
        />
        <QuickAction
          href="/dashboard/ai-chat"
          icon={Bot}
          title="AI Personality"
          description="Build your unique AI persona"
          gradient="from-purple-500/20 to-pink-500/20"
        />
        <QuickAction
          href="/dashboard/settings?tab=tiers"
          icon={Layers}
          title="Subscription Tiers"
          description="Manage your pricing"
          gradient="from-blue-500/20 to-purple-500/20"
        />
      </div>

      {/* Recent Posts */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Recent Posts</h2>
          <Link
            href="/dashboard/posts"
            className="text-purple-400 hover:text-purple-300 flex items-center gap-1 text-sm"
          >
            View all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="bg-zinc-900 rounded-xl p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
            <FileText className="w-8 h-8 text-gray-500" />
          </div>
          <p className="text-gray-400 mb-4">No posts yet</p>
          <Link
            href="/dashboard/posts/new"
            className="inline-block px-6 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg font-medium hover:opacity-90 transition"
          >
            Create your first post
          </Link>
        </div>
      </div>

      {/* AI Chat Stats */}
      <div>
        <h2 className="text-xl font-bold mb-4">AI Chat Performance</h2>
        <div className="bg-zinc-900 rounded-xl p-6">
          <div className="grid grid-cols-3 gap-6 mb-6">
            <div>
              <p className="text-gray-400 text-sm">Messages Handled</p>
              <p className="text-2xl font-bold">0</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Avg Response Time</p>
              <p className="text-2xl font-bold">-</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Revenue from AI</p>
              <p className="text-2xl font-bold">£0.00</p>
            </div>
          </div>
          <Link
            href="/dashboard/ai-chat"
            className="text-purple-400 hover:text-purple-300 flex items-center gap-1 text-sm"
          >
            Configure AI Chat <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

// ===========================================
// SUB COMPONENTS
// ===========================================

function StatCard({
  label,
  value,
  change,
  positive,
}: {
  label: string;
  value: string | number;
  change?: string;
  positive?: boolean;
}) {
  return (
    <div className="bg-zinc-900 rounded-xl p-4">
      <p className="text-gray-400 text-sm">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      {change && (
        <p className={`text-sm mt-1 ${positive ? 'text-green-400' : 'text-red-400'}`}>
          {change} this month
        </p>
      )}
    </div>
  );
}

function QuickAction({
  href,
  icon: Icon,
  title,
  description,
  gradient,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  gradient: string;
}) {
  return (
    <Link
      href={href}
      className={`bg-gradient-to-br ${gradient} rounded-xl p-6 hover:opacity-90 transition group`}
    >
      <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center mb-4">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="font-bold mb-1">{title}</h3>
      <p className="text-sm text-gray-300">{description}</p>
    </Link>
  );
}
