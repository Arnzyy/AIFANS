'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/feed', label: 'Feed', icon: '🏠' },
  { href: '/explore', label: 'Explore', icon: '🔍' },
  { href: '/messages', label: 'Messages', icon: '💬' },
  { href: '/bookmarks', label: 'Saved', icon: '🔖' },
  { href: '/profile', label: 'Profile', icon: '👤' },
];

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-black">
      {/* Top navbar */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 h-16">
          <Link href="/" className="text-xl font-bold gradient-text">
            AIFans
          </Link>
          
          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 py-2 transition-colors ${
                    isActive ? 'text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            <Link 
              href="/wallet"
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              <span>💎</span>
              <span className="text-sm">0 credits</span>
            </Link>
            <Link 
              href="/notifications"
              className="relative p-2 rounded-lg hover:bg-white/5 transition-colors"
            >
              <span>🔔</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-black/90 backdrop-blur-xl safe-area-inset-bottom">
        <div className="flex justify-around py-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
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
      <main className="pb-20 md:pb-0">
        {children}
      </main>
    </div>
  );
}
