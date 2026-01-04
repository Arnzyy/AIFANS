import { createServerClient } from '@/lib/supabase/server';

export default async function SubscribersPage() {
  const supabase = await createServerClient();
  
  const { data: { user } } = await supabase.auth.getUser();

  // Get subscribers
  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select(`
      *,
      subscriber:profiles!subscriptions_subscriber_id_fkey(
        id, username, display_name, avatar_url, created_at
      ),
      tier:subscription_tiers(name, price)
    `)
    .eq('creator_id', user?.id)
    .order('created_at', { ascending: false });

  const activeSubscribers = subscriptions?.filter(s => s.status === 'active') || [];
  const expiredSubscribers = subscriptions?.filter(s => s.status === 'expired') || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Subscribers</h1>
        <p className="text-gray-400 mt-1">Manage your fan base</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <p className="text-2xl font-bold">{activeSubscribers.length}</p>
          <p className="text-sm text-gray-400">Active</p>
        </div>
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <p className="text-2xl font-bold">{expiredSubscribers.length}</p>
          <p className="text-sm text-gray-400">Expired</p>
        </div>
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <p className="text-2xl font-bold">
            £{(activeSubscribers.reduce((sum, s) => sum + (s.tier?.price || 0), 0) / 100).toFixed(0)}
          </p>
          <p className="text-sm text-gray-400">Monthly Revenue</p>
        </div>
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <p className="text-2xl font-bold">
            {subscriptions?.length ? Math.round((activeSubscribers.length / subscriptions.length) * 100) : 0}%
          </p>
          <p className="text-sm text-gray-400">Retention</p>
        </div>
      </div>

      {/* Subscribers list */}
      <div>
        <div className="flex items-center gap-4 mb-4">
          <h2 className="text-lg font-semibold">Active Subscribers</h2>
          <span className="px-2 py-0.5 text-xs bg-green-500/20 text-green-400 rounded">
            {activeSubscribers.length}
          </span>
        </div>

        {activeSubscribers.length > 0 ? (
          <div className="space-y-3">
            {activeSubscribers.map((sub) => (
              <div
                key={sub.id}
                className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10"
              >
                {/* Avatar */}
                <div className="w-12 h-12 rounded-full bg-white/10 overflow-hidden flex-shrink-0">
                  {sub.subscriber.avatar_url ? (
                    <img 
                      src={sub.subscriber.avatar_url} 
                      alt="" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xl">👤</div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {sub.subscriber.display_name || sub.subscriber.username}
                  </p>
                  <p className="text-sm text-gray-500">@{sub.subscriber.username}</p>
                </div>

                {/* Tier */}
                <div className="text-right">
                  <p className="font-medium">
                    {sub.tier?.name || 'Basic'}
                  </p>
                  <p className="text-sm text-gray-500">
                    £{((sub.tier?.price || 0) / 100).toFixed(2)}/mo
                  </p>
                </div>

                {/* Since */}
                <div className="hidden sm:block text-right text-sm text-gray-500">
                  <p>Since</p>
                  <p>{new Date(sub.created_at).toLocaleDateString()}</p>
                </div>

                {/* Actions */}
                <button className="p-2 rounded-lg hover:bg-white/5 transition-colors text-gray-400">
                  💬
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 rounded-xl bg-white/5 border border-white/10">
            <div className="text-4xl mb-3">👥</div>
            <p className="text-gray-400">No active subscribers yet</p>
            <p className="text-sm text-gray-500 mt-1">Share your profile to get fans!</p>
          </div>
        )}
      </div>

      {/* Expired subscribers */}
      {expiredSubscribers.length > 0 && (
        <div>
          <div className="flex items-center gap-4 mb-4">
            <h2 className="text-lg font-semibold">Expired</h2>
            <span className="px-2 py-0.5 text-xs bg-gray-500/20 text-gray-400 rounded">
              {expiredSubscribers.length}
            </span>
          </div>

          <div className="space-y-3 opacity-60">
            {expiredSubscribers.slice(0, 5).map((sub) => (
              <div
                key={sub.id}
                className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10"
              >
                <div className="w-10 h-10 rounded-full bg-white/10 overflow-hidden flex-shrink-0">
                  {sub.subscriber.avatar_url ? (
                    <img src={sub.subscriber.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">👤</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{sub.subscriber.display_name || sub.subscriber.username}</p>
                </div>
                <span className="text-xs text-gray-500">
                  Expired {new Date(sub.expires_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
