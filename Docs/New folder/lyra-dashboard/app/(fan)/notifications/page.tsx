'use client';

import { Bell, MessageCircle, Heart, DollarSign, User } from 'lucide-react';

export default function NotificationsPage() {
  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Notifications</h1>
        <p className="text-gray-400 mt-1">Stay updated on activity</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {[
          { label: 'All', active: true },
          { label: 'Messages', icon: MessageCircle },
          { label: 'Likes', icon: Heart },
          { label: 'Payments', icon: DollarSign },
          { label: 'New Fans', icon: User },
        ].map((filter, i) => (
          <button
            key={filter.label}
            className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition ${
              filter.active
                ? 'bg-purple-500 text-white'
                : 'bg-zinc-900 text-gray-400 hover:text-white'
            }`}
          >
            {filter.icon && <filter.icon className="w-4 h-4" />}
            {filter.label}
          </button>
        ))}
      </div>

      {/* Empty State */}
      <div className="bg-zinc-900 rounded-xl p-12 text-center">
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
          <Bell className="w-10 h-10 text-gray-500" />
        </div>
        <h2 className="text-xl font-bold mb-2">No notifications</h2>
        <p className="text-gray-400">You're all caught up!</p>
      </div>
    </div>
  );
}
