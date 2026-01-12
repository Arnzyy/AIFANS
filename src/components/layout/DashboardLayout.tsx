'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
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
  Menu,
  Home,
  MoreHorizontal,
  Compass,
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
  { href: '/explore', icon: Compass, label: 'Explore' },
  { href: '/subscriptions', icon: Heart, label: 'Subscriptions' },
  { href: '/messages', icon: MessageCircle, label: 'Messages' },
  { href: '/wallet', icon: Wallet, label: 'Wallet' },
];

const CREATOR_NAV_ITEMS = [
  { href: '/explore', icon: Compass, label: 'Explore' },
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

// Mobile bottom nav - creator key actions
const CREATOR_MOBILE_BOTTOM_NAV = [
  { href: '/dashboard', icon: Home, label: 'Home' },
  { href: '/dashboard/posts', icon: FileText, label: 'Posts' },
  { href: '/posts/new', icon: Plus, label: 'New', isAction: true },
  { href: '/dashboard/messages', icon: MessageCircle, label: 'Messages' },
  { href: '/dashboard/earnings', icon: PoundSterling, label: 'Earnings' },
];

// Mobile bottom nav - fan navigation (no notifications - that's for creators)
const FAN_MOBILE_BOTTOM_NAV = [
  { href: '/explore', icon: Compass, label: 'Explore' },
  { href: '/subscriptions', icon: Heart, label: 'Subs' },
  { href: '/messages', icon: MessageCircle, label: 'Messages' },
  { href: '/wallet', icon: Wallet, label: 'Wallet' },
];

// ===========================================
// MAIN COMPONENT
// ===========================================

export function DashboardLayout({ children, user }: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showBecomeCreator, setShowBecomeCreator] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
    setShowUserMenu(false);
  }, [pathname]);

  // Determine if we're in creator mode
  const isCreatorSection = pathname?.startsWith('/dashboard');
  const navItems = isCreatorSection ? CREATOR_NAV_ITEMS : FAN_NAV_ITEMS;

  // Logout handler
  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await supabase.auth.signOut();
      router.push('/login');
      router.refresh();
    } catch (error) {
      console.error('Logout error:', error);
      setLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white pb-16 md:pb-0">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-14 md:h-16 bg-zinc-950 border-b border-white/10 z-50 flex items-center justify-between px-3 md:px-4">
        {/* Left: Menu + Logo */}
        <div className="flex items-center gap-2">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 -ml-2 rounded-lg hover:bg-white/5 active:bg-white/10 transition"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <Link href="/" className="flex items-center">
            <Image src="/logo.png" alt="LYRA" width={80} height={28} className="md:w-[100px] md:h-[35px]" />
          </Link>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-2 md:gap-4">
          {/* New Post Button (Creator only) - hidden on mobile */}
          {user.isVerifiedCreator && isCreatorSection && (
            <Link
              href="/posts/new"
              className="hidden md:flex px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg font-medium items-center gap-2 hover:opacity-90 transition"
            >
              <Plus className="w-4 h-4" />
              New Post
            </Link>
          )}

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-1 md:gap-2 p-1.5 md:p-2 rounded-lg hover:bg-white/5 active:bg-white/10 transition"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-sm font-bold">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400 hidden md:block" />
            </button>

            {showUserMenu && (
              <>
                {/* Backdrop for mobile */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowUserMenu(false)}
                />
                <div className="absolute right-0 top-full mt-2 w-64 bg-zinc-900 border border-white/10 rounded-xl shadow-xl overflow-hidden z-50">
                  {/* User Info */}
                  <div className="p-4 border-b border-white/10">
                    <p className="font-medium">{user.name}</p>
                    <p className="text-sm text-gray-400">@{user.username}</p>
                  </div>

                  {/* Menu Items */}
                  <div className="p-2">
                    <Link
                      href="/settings"
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 active:bg-white/10 transition"
                    >
                      <UserCircle className="w-4 h-4" />
                      Edit Profile
                    </Link>

                    {user.isVerifiedCreator ? (
                      <>
                        <Link
                          href="/dashboard"
                          className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 active:bg-white/10 transition"
                        >
                          <Crown className="w-4 h-4 text-yellow-500" />
                          Creator Dashboard
                        </Link>
                        <Link
                          href="/subscriptions"
                          className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 active:bg-white/10 transition"
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
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 active:bg-white/10 transition text-purple-400"
                      >
                        <Sparkles className="w-4 h-4" />
                        Become a Creator
                      </button>
                    )}

                    <Link
                      href="/wallet"
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 active:bg-white/10 transition"
                    >
                      <Wallet className="w-4 h-4" />
                      Wallet
                    </Link>

                    <Link
                      href="/settings"
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 active:bg-white/10 transition"
                    >
                      <Settings className="w-4 h-4" />
                      Settings
                    </Link>
                  </div>

                  {/* Logout */}
                  <div className="p-2 border-t border-white/10">
                    <button
                      onClick={handleLogout}
                      disabled={loggingOut}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 active:bg-red-500/20 transition text-red-400 disabled:opacity-50"
                    >
                      <LogOut className="w-4 h-4" />
                      {loggingOut ? 'Logging out...' : 'Log out'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Desktop fixed, Mobile slide-in */}
      <aside className={`
        fixed top-14 md:top-16 bottom-16 md:bottom-0 w-72 md:w-60 bg-zinc-950 border-r border-white/10 flex flex-col z-40
        transform transition-transform duration-200 ease-in-out
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Mode Switcher / Explore Link */}
        {user.isVerifiedCreator ? (
          <div className="p-4 border-b border-white/10">
            <div className="p-1 bg-white/5 rounded-lg flex">
              <Link
                href="/explore"
                className={`flex-1 py-2.5 px-3 rounded-md text-center text-sm font-medium transition ${
                  !isCreatorSection
                    ? 'bg-white/10 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Fan Mode
              </Link>
              <Link
                href="/dashboard"
                className={`flex-1 py-2.5 px-3 rounded-md text-center text-sm font-medium transition ${
                  isCreatorSection
                    ? 'bg-white/10 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Creator
              </Link>
            </div>
          </div>
        ) : isCreatorSection && (
          <div className="p-4 border-b border-white/10">
            <Link
              href="/explore"
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-white font-medium transition hover:from-purple-500/30 hover:to-pink-500/30"
            >
              <Compass className="w-4 h-4" />
              Explore Creators
            </Link>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/dashboard' && pathname?.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition ${
                  isActive
                    ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-white/5 active:bg-white/10'
                }`}
              >
                <item.icon className={`w-5 h-5 ${isActive ? 'text-purple-400' : ''}`} />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Section in Sidebar (Mobile) */}
        <div className="p-4 border-t border-white/10 md:hidden">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center font-bold">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{user.name}</p>
              <p className="text-xs text-gray-400 truncate">@{user.username}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 text-red-400 font-medium hover:bg-red-500/20 active:bg-red-500/30 transition disabled:opacity-50"
          >
            <LogOut className="w-4 h-4" />
            {loggingOut ? 'Logging out...' : 'Log out'}
          </button>
        </div>

        {/* Bottom Links (Desktop only) */}
        <div className="hidden md:block p-4 border-t border-white/10">
          {user.isVerifiedCreator && isCreatorSection && (
            <Link
              href={`/u/${user.username}`}
              className="flex items-center gap-3 px-3 py-2 text-sm text-gray-400 hover:text-white transition"
            >
              View Public Profile →
            </Link>
          )}
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:text-red-300 transition disabled:opacity-50"
          >
            <LogOut className="w-4 h-4" />
            {loggingOut ? 'Logging out...' : 'Logout'}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="md:ml-60 pt-14 md:pt-16 min-h-screen">
        <div className="p-4 md:p-6 lg:p-8">{children}</div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-zinc-950 border-t border-white/10 z-50 safe-area-inset-bottom">
        <div className={`grid ${isCreatorSection ? 'grid-cols-5' : 'grid-cols-4'} items-center h-full`}>
          {(isCreatorSection ? CREATOR_MOBILE_BOTTOM_NAV : FAN_MOBILE_BOTTOM_NAV).map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/dashboard' && item.href !== '/posts/new' && pathname?.startsWith(item.href));

            if ('isAction' in item && item.isAction) {
              return (
                <div key={item.href} className="flex justify-center">
                  <Link
                    href={item.href}
                    className="flex items-center justify-center w-14 h-14 -mt-4 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 shadow-lg shadow-purple-500/30"
                  >
                    <item.icon className="w-6 h-6 text-white" />
                  </Link>
                </div>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center gap-0.5 py-2 transition ${
                  isActive ? 'text-purple-400' : 'text-gray-500'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Become Creator Modal */}
      {showBecomeCreator && (
        <BecomeCreatorModal onClose={() => setShowBecomeCreator(false)} />
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
      <div className="relative bg-zinc-900 rounded-2xl max-w-md w-full p-6 mx-4">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5"
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

        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl">
            <Bot className="w-5 h-5 text-purple-400" />
            <div>
              <p className="font-medium">AI Chat</p>
              <p className="text-sm text-gray-400">Let AI chat with fans 24/7</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl">
            <PoundSterling className="w-5 h-5 text-green-400" />
            <div>
              <p className="font-medium">Keep 80%</p>
              <p className="text-sm text-gray-400">Of all earnings</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl">
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
            className="block w-full py-3.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-medium text-center hover:opacity-90 active:opacity-80 transition"
          >
            Get Started
          </Link>
          <button
            onClick={onClose}
            className="block w-full py-3.5 bg-white/5 rounded-xl font-medium text-center hover:bg-white/10 active:bg-white/15 transition"
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
}
