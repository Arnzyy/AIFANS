'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  Users,
  MessageCircle,
  Bot,
  PoundSterling,
  Settings,
  Heart,
  CreditCard,
  Wallet,
  Search,
  Bell,
  LogOut,
  ChevronDown,
  Plus,
  Sparkles,
  Crown,
  X,
  Image as ImageIcon,
  UserCircle,
  Lock,
} from 'lucide-react';

// ===========================================
// TYPES
// ===========================================

interface User {
  id: string;
  name: string;
  username: string;
  avatar?: string;
  isCreator: boolean;
  isVerifiedCreator: boolean;
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  user: User;
}

// ===========================================
// NAV ITEMS
// ===========================================

const FAN_NAV_ITEMS = [
  { href: '/browse', icon: Search, label: 'Browse' },
  { href: '/subscriptions', icon: Heart, label: 'Subscriptions' },
  { href: '/messages', icon: MessageCircle, label: 'Messages' },
  { href: '/notifications', icon: Bell, label: 'Notifications' },
  { href: '/wallet', icon: Wallet, label: 'Wallet' },
];

const CREATOR_NAV_ITEMS = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Overview' },
  { href: '/dashboard/models', icon: UserCircle, label: 'Models' },
  { href: '/dashboard/content', icon: ImageIcon, label: 'Content' },
  { href: '/dashboard/ppv', icon: Lock, label: 'PPV' },
  { href: '/dashboard/posts', icon: FileText, label: 'Posts' },
  { href: '/dashboard/subscribers', icon: Users, label: 'Subscribers' },
  { href: '/dashboard/messages', icon: MessageCircle, label: 'Messages' },
  { href: '/dashboard/chat-modes', icon: Bot, label: 'Chat Modes' },
  { href: '/dashboard/earnings', icon: PoundSterling, label: 'Earnings' },
  { href: '/dashboard/settings', icon: Settings, label: 'Settings' },
];

// ===========================================
// MAIN COMPONENT
// ===========================================

export function DashboardLayout({ children, user }: DashboardLayoutProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showBecomeCreator, setShowBecomeCreator] = useState(false);

  // Determine if we're in creator mode
  const isCreatorSection = pathname?.startsWith('/dashboard');
  const navItems = isCreatorSection ? CREATOR_NAV_ITEMS : FAN_NAV_ITEMS;

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-zinc-950 border-b border-white/10 z-50 flex items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.png" alt="LYRA" width={100} height={35} />
        </Link>

        {/* Right Side */}
        <div className="flex items-center gap-4">
          {/* New Post Button (Creator only) */}
          {user.isVerifiedCreator && isCreatorSection && (
            <Link
              href="/posts/new"
              className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg font-medium flex items-center gap-2 hover:opacity-90 transition"
            >
              <Plus className="w-4 h-4" />
              New Post
            </Link>
          )}

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 transition"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-sm font-bold">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-zinc-900 border border-white/10 rounded-xl shadow-xl overflow-hidden">
                {/* User Info */}
                <div className="p-4 border-b border-white/10">
                  <p className="font-medium">{user.name}</p>
                  <p className="text-sm text-gray-400">@{user.username}</p>
                </div>

                {/* Menu Items */}
                <div className="p-2">
                  <Link
                    href={`/@${user.username}`}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition"
                  >
                    <Settings className="w-4 h-4" />
                    My Profile
                  </Link>

                  {user.isVerifiedCreator ? (
                    <>
                      <Link
                        href="/dashboard"
                        className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition"
                      >
                        <Crown className="w-4 h-4 text-yellow-500" />
                        Creator Dashboard
                      </Link>
                      <Link
                        href="/subscriptions"
                        className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition"
                      >
                        <Heart className="w-4 h-4" />
                        My Subscriptions
                      </Link>
                    </>
                  ) : (
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        setShowBecomeCreator(true);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition text-purple-400"
                    >
                      <Sparkles className="w-4 h-4" />
                      Become a Creator
                    </button>
                  )}

                  <Link
                    href="/wallet"
                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition"
                  >
                    <CreditCard className="w-4 h-4" />
                    Your Cards
                  </Link>

                  <Link
                    href="/settings"
                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition"
                  >
                    <Settings className="w-4 h-4" />
                    Settings
                  </Link>
                </div>

                {/* Logout */}
                <div className="p-2 border-t border-white/10">
                  <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition text-red-400">
                    <LogOut className="w-4 h-4" />
                    Log out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <aside className="fixed left-0 top-16 bottom-0 w-60 bg-zinc-950 border-r border-white/10 p-4 flex flex-col">
        {/* Mode Switcher */}
        {user.isVerifiedCreator && (
          <div className="mb-6 p-1 bg-white/5 rounded-lg flex">
            <Link
              href="/browse"
              className={`flex-1 py-2 px-3 rounded-md text-center text-sm font-medium transition ${
                !isCreatorSection
                  ? 'bg-white/10 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Fan Mode
            </Link>
            <Link
              href="/dashboard"
              className={`flex-1 py-2 px-3 rounded-md text-center text-sm font-medium transition ${
                isCreatorSection
                  ? 'bg-white/10 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Creator
            </Link>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/dashboard' && pathname?.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition ${
                  isActive
                    ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <item.icon className={`w-5 h-5 ${isActive ? 'text-purple-400' : ''}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Links */}
        <div className="pt-4 border-t border-white/10 space-y-1">
          {user.isVerifiedCreator && isCreatorSection && (
            <Link
              href={`/@${user.username}`}
              className="flex items-center gap-3 px-3 py-2 text-sm text-gray-400 hover:text-white transition"
            >
              View Public Profile →
            </Link>
          )}
          <button className="flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:text-red-300 transition">
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-60 pt-16 min-h-screen">
        <div className="p-8">{children}</div>
      </main>

      {/* Become Creator Modal */}
      {showBecomeCreator && (
        <BecomeCreatorModal onClose={() => setShowBecomeCreator(false)} />
      )}

      {/* Click outside to close user menu */}
      {showUserMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowUserMenu(false)}
        />
      )}
    </div>
  );
}

// ===========================================
// BECOME CREATOR MODAL
// ===========================================

function BecomeCreatorModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />
      <div className="relative bg-zinc-900 rounded-2xl max-w-md w-full p-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Become a Creator</h2>
          <p className="text-gray-400">
            Start earning by sharing content and chatting with fans
          </p>
        </div>

        <div className="space-y-4 mb-6">
          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
            <Bot className="w-5 h-5 text-purple-400" />
            <div>
              <p className="font-medium">AI Chat</p>
              <p className="text-sm text-gray-400">Let AI chat with fans 24/7</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
            <PoundSterling className="w-5 h-5 text-green-400" />
            <div>
              <p className="font-medium">Keep 80%</p>
              <p className="text-sm text-gray-400">Of all earnings</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
            <FileText className="w-5 h-5 text-blue-400" />
            <div>
              <p className="font-medium">PPV Content</p>
              <p className="text-sm text-gray-400">Sell exclusive posts</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <Link
            href="/become-creator"
            className="block w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg font-medium text-center hover:opacity-90 transition"
          >
            Get Started
          </Link>
          <button
            onClick={onClose}
            className="block w-full py-3 bg-white/5 rounded-lg font-medium text-center hover:bg-white/10 transition"
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
}
