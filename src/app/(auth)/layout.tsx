import Link from 'next/link';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Header */}
      <header className="p-4">
        <Link href="/" className="text-2xl font-bold gradient-text">
          LYRA
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
