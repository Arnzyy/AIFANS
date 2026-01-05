import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Header */}
      <header className="p-4 flex items-center gap-4">
        <Link
          href="/"
          className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <Link href="/" className="flex items-center">
          <Image
            src="/logo.png"
            alt="LYRA"
            width={120}
            height={40}
            className="h-8 w-auto"
          />
        </Link>
      </header>
      
      {/* Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {children}
        </div>
      </main>
      
      {/* Footer */}
      <footer className="p-4 text-center text-sm text-gray-500">
        <p>
          By continuing, you agree to our{' '}
          <Link href="/terms" className="underline hover:text-white">Terms</Link>
          {' '}and{' '}
          <Link href="/privacy" className="underline hover:text-white">Privacy Policy</Link>
        </p>
      </footer>
    </div>
  );
}
