'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: '📊' },
  { href: '/dashboard/posts', label: 'Posts', icon: '📝' },
  { href: '/dashboard/subscribers', label: 'Subscribers', icon: '👥' },
  { href: '/dashboard/messages', label: 'Messages', icon: '💬' },
  { href: '/dashboard/ai-chat', label: 'AI Chat', icon: '🤖' },
  { href: '/dashboard/earnings', label: 'Earnings', icon: '💰' },
  { href: '/dashboard/settings', label: 'Settings', icon: '⚙️' },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-black">
      {/* Top navbar */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur-xl">
        <div className="flex items-center justify-between px-4 h-16">
          <Link href="/">
            <Image src="/logo.png" alt="LYRA" width={100} height={35} />
          </Link>
          
          <div className="flex items-center gap-4">
            <Link 
              href="/posts/new"
              className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
            >
              + New Post
            </Link>
            <Link href="/profile" className="w-8 h-8 rounded-full bg-white/10" />
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="hidden md:flex flex-col w-64 border-r border-white/10 min-h-[calc(100vh-4rem)] sticky top-16">
          <nav className="flex-1 p-4 space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href || 
                (item.href !== '/dashboard' && pathname.startsWith(item.href));
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive 
                      ? 'bg-purple-500/20 text-white' 
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
          
          <div className="p-4 border-t border-white/10">
            <Link 
              href="/profile"
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              View Public Profile →
            </Link>
          </div>
        </aside>

        {/* Mobile bottom nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-black/90 backdrop-blur-xl">
          <div className="flex justify-around py-2">
            {navItems.slice(0, 5).map((item) => {
              const isActive = pathname === item.href || 
                (item.href !== '/dashboard' && pathname.startsWith(item.href));
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center gap-1 p-2 ${
                    isActive ? 'text-purple-400' : 'text-gray-500'
                  }`}
                >
                  <span className="text-xl">{item.icon}</span>
                  <span className="text-xs">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Main content */}
        <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8">
          {children}
        </main>
      </div>
    </div>
  );
}
