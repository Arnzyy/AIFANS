import Link from 'next/link';
import { XCircle } from 'lucide-react';

export default function CheckoutCancelPage() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center max-w-md px-4">
        <div className="w-20 h-20 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <XCircle className="w-10 h-10 text-yellow-500" />
        </div>

        <h1 className="text-3xl font-bold mb-3">Payment Cancelled</h1>
        <p className="text-gray-400 mb-8">
          Your payment was cancelled. No charges were made to your account.
        </p>

        <div className="flex flex-col gap-3">
          <Link
            href="/explore"
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg font-semibold hover:opacity-90 transition-opacity"
          >
            Continue Browsing
          </Link>

          <Link
            href="/"
            className="px-6 py-3 bg-white/10 rounded-lg font-medium hover:bg-white/20 transition-colors"
          >
            Return Home
          </Link>
        </div>

        <p className="text-gray-500 text-sm mt-8">
          Changed your mind? You can subscribe anytime from the creator&apos;s profile.
        </p>
      </div>
    </div>
  );
}
