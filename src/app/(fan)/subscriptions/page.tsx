import { Heart } from 'lucide-react';

export default function SubscriptionsPage() {
  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">My Subscriptions</h1>
        <p className="text-gray-400 mt-1">Manage your active subscriptions</p>
      </div>

      <div className="text-center py-12 bg-zinc-900 rounded-xl border border-white/10">
        <Heart className="w-12 h-12 mx-auto mb-3 text-gray-500" />
        <p className="text-gray-400">No active subscriptions</p>
        <p className="text-sm text-gray-500 mt-1">
          Subscribe to creators to see their exclusive content
        </p>
      </div>
    </div>
  );
}
