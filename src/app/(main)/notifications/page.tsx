import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

export default async function NotificationsPage() {
  const supabase = await createServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login?redirect=/notifications');
  }

  // Fetch notifications
  const { data: notifications } = await supabase
    .from('notifications')
    .select(`
      *,
      actor:profiles!notifications_actor_id_fkey(
        id, username, display_name, avatar_url
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  // Mark all as read
  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', user.id)
    .eq('is_read', false);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'new_subscriber': return '🎉';
      case 'new_like': return '❤️';
      case 'new_comment': return '💬';
      case 'new_message': return '✉️';
      case 'new_tip': return '💰';
      case 'subscription_expiring': return '⚠️';
      case 'payout_sent': return '💳';
      default: return '🔔';
    }
  };

  const getNotificationText = (notification: any) => {
    const actorName = notification.actor?.display_name || notification.actor?.username || 'Someone';

    switch (notification.type) {
      case 'new_subscriber':
        return `${actorName} subscribed to you`;
      case 'new_like':
        return `${actorName} liked your post`;
      case 'new_comment':
        return `${actorName} commented on your post`;
      case 'new_message':
        return `${actorName} sent you a message`;
      case 'new_tip':
        return `${actorName} sent you a tip of £${((notification.metadata?.amount || 0) / 100).toFixed(2)}`;
      case 'subscription_expiring':
        return `Your subscription to ${actorName} expires soon`;
      case 'payout_sent':
        return `Your payout of £${((notification.metadata?.amount || 0) / 100).toFixed(2)} has been sent`;
      default:
        return notification.message || 'You have a new notification';
    }
  };

  const getNotificationLink = (notification: any) => {
    switch (notification.type) {
      case 'new_subscriber':
        return '/dashboard/subscribers';
      case 'new_like':
      case 'new_comment':
        return notification.metadata?.post_id ? `/post/${notification.metadata.post_id}` : '/dashboard/posts';
      case 'new_message':
        return notification.actor ? `/messages/${notification.actor.username}` : '/messages';
      case 'new_tip':
        return '/dashboard/earnings';
      case 'payout_sent':
        return '/dashboard/earnings';
      default:
        return '#';
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Notifications</h1>
        <p className="text-gray-400 mt-1">Stay updated on your activity</p>
      </div>

      {/* Notifications list */}
      {notifications && notifications.length > 0 ? (
        <div className="space-y-2">
          {notifications.map((notification) => (
            <Link
              key={notification.id}
              href={getNotificationLink(notification)}
              className={`flex items-start gap-4 p-4 rounded-xl border transition-colors ${
                notification.is_read
                  ? 'bg-white/5 border-white/10 hover:border-white/20'
                  : 'bg-purple-500/10 border-purple-500/30 hover:border-purple-500/50'
              }`}
            >
              {/* Actor avatar or icon */}
              <div className="flex-shrink-0">
                {notification.actor?.avatar_url ? (
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full overflow-hidden">
                      <img
                        src={notification.actor.avatar_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className="absolute -bottom-1 -right-1 text-lg">
                      {getNotificationIcon(notification.type)}
                    </span>
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-2xl">
                    {getNotificationIcon(notification.type)}
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className={`${notification.is_read ? 'text-gray-300' : 'text-white'}`}>
                  {getNotificationText(notification)}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                </p>
              </div>

              {/* Unread indicator */}
              {!notification.is_read && (
                <div className="w-3 h-3 bg-purple-500 rounded-full flex-shrink-0" />
              )}
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 rounded-xl bg-white/5 border border-white/10">
          <div className="text-5xl mb-4">🔔</div>
          <h3 className="text-xl font-semibold mb-2">No notifications yet</h3>
          <p className="text-gray-400">
            When you get subscribers, likes, or messages, they&apos;ll show up here
          </p>
        </div>
      )}
    </div>
  );
}
