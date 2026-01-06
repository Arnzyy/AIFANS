import { Bell } from 'lucide-react';

export default function NotificationsPage() {
  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Notifications</h1>
        <p className="text-gray-400 mt-1">Stay updated with your activity</p>
      </div>

      <div className="text-center py-12 bg-zinc-900 rounded-xl border border-white/10">
        <Bell className="w-12 h-12 mx-auto mb-3 text-gray-500" />
        <p className="text-gray-400">No notifications</p>
        <p className="text-sm text-gray-500 mt-1">
          You're all caught up!
        </p>
      </div>
    </div>
  );
}
