import Link from 'next/link';
import Image from 'next/image';
import { Play, EyeOff } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-black flex flex-col">
      <div className="flex-1 flex flex-col lg:flex-row">
      {/* Left Side - Content Preview */}
      <div className="flex-1 p-6 lg:p-12 flex flex-col justify-center">
        {/* Logo for mobile */}
        <div className="lg:hidden text-center mb-8">
          <Link href="/">
            <Image src="/logo.png" alt="LYRA" width={150} height={50} className="mx-auto" />
          </Link>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3 max-w-3xl mx-auto">
          <PreviewCard type="blur" />
          <PreviewCard type="video" />
          <PreviewCard type="video" color="from-pink-500/30 to-purple-500/30" />
          <PreviewCard type="video" color="from-blue-500/30 to-cyan-500/30" />
          <PreviewCard type="blur" />
          <PreviewCard type="image" color="from-purple-500/30 to-pink-500/30" />
          <PreviewCard type="video" color="from-orange-500/30 to-red-500/30" />
          <PreviewCard type="image" color="from-green-500/30 to-teal-500/30" />
          <PreviewCard type="blur" color="from-indigo-500/30 to-purple-500/30" />
          <PreviewCard type="image" />
        </div>

        {/* Tagline */}
        <p className="text-center text-gray-400 mt-8 text-sm">
          Exclusive AI-generated content from top creators
        </p>
      </div>

      {/* Right Side - Auth */}
      <div className="w-full lg:w-[480px] bg-zinc-900/50 p-6 lg:p-12 flex flex-col justify-center border-t lg:border-t-0 lg:border-l border-white/10">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <Image src="/logo.png" alt="LYRA" width={200} height={70} className="mx-auto" />
          </Link>
        </div>

        {/* Auth Buttons */}
        <div className="space-y-3 mb-6">
          <Link
            href="/register"
            className="block w-full py-3 px-4 text-center font-medium rounded-full bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90 transition-opacity"
          >
            Sign up
          </Link>
          <Link
            href="/login"
            className="block w-full py-3 px-4 text-center font-medium rounded-full border border-white/20 hover:bg-white/5 transition-colors"
          >
            Login
          </Link>
        </div>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-zinc-900/50 text-gray-500">or continue with</span>
          </div>
        </div>

        {/* Social Login */}
        <div className="space-y-3 mb-8">
          <button className="w-full py-3 px-4 rounded-full bg-[#1DA1F2] hover:bg-[#1a8cd8] transition-colors flex items-center justify-center gap-3 font-medium">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
            Sign in with X
          </button>
          <button className="w-full py-3 px-4 rounded-full bg-white text-black hover:bg-gray-100 transition-colors flex items-center justify-center gap-3 font-medium">
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Sign in with Google
          </button>
          <button className="w-full py-3 px-4 rounded-full bg-[#9146FF] hover:bg-[#7c3aed] transition-colors flex items-center justify-center gap-3 font-medium">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/>
            </svg>
            Sign in with Twitch
          </button>
        </div>

        {/* Terms */}
        <p className="text-center text-sm text-gray-500 mb-4">
          By joining, you agree to our{' '}
          <Link href="/terms" className="text-purple-400 hover:underline">Terms & Conditions</Link>
          {' '}and{' '}
          <Link href="/privacy" className="text-purple-400 hover:underline">Privacy Policy</Link>
          , and confirm that you are at least 18 years old.
        </p>

        {/* Creator Link */}
        <div className="text-center pt-4 border-t border-white/10">
          <p className="text-gray-400 text-sm mb-2">Want to earn money?</p>
          <Link
            href="/become-creator"
            className="text-purple-400 hover:text-purple-300 font-medium"
          >
            Become a Creator
          </Link>
        </div>
      </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 py-4 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-gray-500 text-sm">
            © 2025 LYRA. All rights reserved.
          </p>
          <nav className="flex items-center gap-6 text-sm">
            <Link href="/terms" className="text-gray-500 hover:text-white transition-colors">
              Terms
            </Link>
            <Link href="/privacy" className="text-gray-500 hover:text-white transition-colors">
              Privacy
            </Link>
            <Link href="/support" className="text-gray-500 hover:text-white transition-colors">
              Support
            </Link>
            <Link href="/explore" className="text-gray-500 hover:text-white transition-colors">
              Explore
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

function PreviewCard({
  type = 'image',
  color = 'from-purple-500/20 to-pink-500/20'
}: {
  type?: 'image' | 'video' | 'blur';
  color?: string;
}) {
  return (
    <div className={`aspect-[3/4] rounded-lg bg-gradient-to-br ${color} relative overflow-hidden group cursor-pointer hover:scale-105 transition-transform`}>
      {type === 'blur' && (
        <div className="absolute inset-0 flex items-center justify-center backdrop-blur-sm bg-black/30">
          <EyeOff className="w-6 h-6 text-white/50" />
        </div>
      )}
      {type === 'video' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center">
            <Play className="w-5 h-5 text-white ml-0.5" fill="white" />
          </div>
        </div>
      )}
      {/* Shimmer effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
    </div>
  );
}
