'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Bot, Sparkles, Shield, Gem } from 'lucide-react';
import { useEffect, useRef } from 'react';

export default function HomePage() {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Scroll to center the middle card on mobile
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container && window.innerWidth < 1024) {
      // Wait for images to potentially load
      setTimeout(() => {
        const cards = container.children;
        if (cards.length >= 3) {
          const middleCard = cards[2] as HTMLElement; // 3rd card (index 2)
          const containerWidth = container.offsetWidth;
          const cardLeft = middleCard.offsetLeft;
          const cardWidth = middleCard.offsetWidth;
          // Center the card
          container.scrollLeft = cardLeft - (containerWidth / 2) + (cardWidth / 2);
        }
      }, 100);
    }
  }, []);

  return (
    <div className="min-h-screen lg:h-screen bg-black flex flex-col overflow-x-hidden">
      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row lg:min-h-0">
        {/* Left Side - Logo & Content Preview */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-8 overflow-hidden">
          {/* Logo - Centered */}
          <div className="mb-6 lg:mb-4">
            <Image
              src="/logo.png"
              alt="LYRA"
              width={280}
              height={100}
              className="mx-auto lg:w-[200px] xl:w-[240px]"
              priority
            />
          </div>

          {/* Content Grid - 5 across, responsive sizing */}
          <div className="w-full max-w-full">
            <div
              ref={scrollContainerRef}
              className="flex gap-3 lg:gap-3 overflow-x-auto pb-4 px-4 lg:overflow-visible lg:px-0 lg:justify-center scrollbar-hide snap-x snap-mandatory"
            >
              <PreviewCard image="/preview/1.png" username="luna_dark" />
              <PreviewCard image="/preview/2.png" username="chloe_belle" />
              <PreviewCard image="/preview/3.png" username="yuki_rose" />
              <PreviewCard image="/preview/4.png" username="mia_fresh" />
              <PreviewCard image="/preview/5.png" username="nova_night" />
            </div>
          </div>
        </div>

        {/* Right Side - Auth */}
        <div className="w-full lg:w-[380px] xl:w-[420px] flex flex-col justify-center p-6 lg:p-6 xl:p-8 border-t lg:border-t-0 lg:border-l border-white/10 lg:overflow-y-auto">
          <div className="max-w-sm mx-auto w-full">
            {/* Why LYRA - Top */}
            <div className="hidden lg:block pb-4 mb-4 border-b border-white/10">
              <h3 className="text-sm font-semibold text-gray-400 mb-3">WHY LYRA?</h3>
              <div className="space-y-2 text-xs text-gray-500">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-md bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-3 h-3 text-purple-400" />
                  </span>
                  <span>AI-powered chat companions</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-md bg-pink-500/20 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-3 h-3 text-pink-400" />
                  </span>
                  <span>Exclusive AI-generated content</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-md bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                    <Shield className="w-3 h-3 text-blue-400" />
                  </span>
                  <span>Private & secure platform</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-md bg-green-500/20 flex items-center justify-center flex-shrink-0">
                    <Gem className="w-3 h-3 text-green-400" />
                  </span>
                  <span>Support AI creators directly</span>
                </div>
              </div>
            </div>

            {/* Auth Buttons */}
            <div className="space-y-2 lg:space-y-2 mb-4">
              <Link
                href="/register"
                className="block w-full py-3 lg:py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90 rounded-lg text-center font-semibold transition-opacity"
              >
                Sign up
              </Link>
              <Link
                href="/login"
                className="block w-full py-3 lg:py-2.5 border border-purple-500 text-purple-400 rounded-lg text-center font-semibold hover:bg-purple-500/10 transition-colors"
              >
                Login
              </Link>
            </div>

            {/* Terms */}
            <p className="text-center text-xs lg:text-xs text-gray-400 mb-4 lg:mb-4">
              By joining, you agree to our{' '}
              <Link href="/terms" className="text-purple-400 hover:underline">Terms & Conditions</Link>
              {' '}and{' '}
              <Link href="/privacy" className="text-purple-400 hover:underline">Privacy Policy</Link>
              , and confirm that you are at least 18 years old.
            </p>

            {/* Social Login */}
            <div className="space-y-2 mb-4 lg:mb-4">
              <button className="w-full py-2.5 lg:py-2 bg-black border border-white/20 hover:bg-white/10 rounded-lg font-medium flex items-center justify-center gap-3 transition-colors text-sm">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
                Sign in with X
              </button>
              <button className="w-full py-2.5 lg:py-2 bg-white text-black hover:bg-gray-100 rounded-lg font-medium flex items-center justify-center gap-3 transition-colors text-sm">
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Sign in with Google
              </button>
              <button className="w-full py-2.5 lg:py-2 bg-[#9146FF] hover:bg-[#7c3aed] rounded-lg font-medium flex items-center justify-center gap-3 transition-colors text-sm">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/>
                </svg>
                Sign in with Twitch
              </button>
            </div>

            {/* Become a Creator */}
            <div className="pt-4 border-t border-white/10 text-center">
              <p className="text-gray-400 text-xs mb-1">Want to earn money?</p>
              <Link
                href="/become-creator"
                className="text-purple-400 hover:text-purple-300 font-medium"
              >
                Become a Creator
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 py-3 lg:py-2 px-6 flex-shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 lg:gap-4">
          <p className="text-gray-500 text-xs lg:text-sm">
            © 2025 LYRA
          </p>
          <nav className="flex flex-wrap items-center justify-center gap-x-4 lg:gap-x-6 gap-y-1 text-xs lg:text-sm">
            <Link href="/explore" className="text-gray-400 hover:text-white transition-colors">
              Explore LYRA
            </Link>
            <Link href="/become-creator" className="text-gray-400 hover:text-white transition-colors">
              Become A Creator
            </Link>
            <Link href="/support" className="text-gray-400 hover:text-white transition-colors">
              Contact Support
            </Link>
            <Link href="/terms" className="text-gray-400 hover:text-white transition-colors">
              Terms
            </Link>
            <Link href="/privacy" className="text-gray-400 hover:text-white transition-colors">
              Privacy
            </Link>
            <Link href="/dmca" className="text-gray-400 hover:text-white transition-colors">
              DMCA
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

function PreviewCard({
  image,
  username
}: {
  image: string;
  username: string;
}) {
  return (
    <Link
      href={`/${username}`}
      className="w-[55vw] sm:w-[200px] lg:w-[160px] xl:w-[180px] 2xl:w-[200px] aspect-[2/3] rounded-xl relative overflow-hidden group cursor-pointer hover:scale-105 transition-transform border border-white/10 flex-shrink-0 snap-center"
    >
      <img
        src={image}
        alt=""
        className="w-full h-full object-cover"
      />
      {/* Shimmer effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
    </Link>
  );
}
