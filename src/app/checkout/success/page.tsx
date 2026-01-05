'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle } from 'lucide-react';

export default function CheckoutSuccessPage() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  const sessionId = searchParams.get('session_id');
  const type = searchParams.get('type') || 'subscription';
  const postId = searchParams.get('post_id');

  useEffect(() => {
    if (sessionId) {
      setStatus('success');
    } else {
      setStatus('error');
    }
  }, [sessionId]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-400">Processing your payment...</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl">!</span>
          </div>
          <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
          <p className="text-gray-400 mb-6">We couldn&apos;t verify your payment.</p>
          <Link
            href="/"
            className="text-purple-400 hover:text-purple-300 transition-colors"
          >
            Return home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center max-w-md px-4">
        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-green-500" />
        </div>

        <h1 className="text-3xl font-bold mb-3">Payment Successful!</h1>

        {type === 'subscription' && (
          <p className="text-gray-400 mb-8">
            Your subscription is now active. Enjoy exclusive content from your favorite creators!
          </p>
        )}

        {type === 'tip' && (
          <p className="text-gray-400 mb-8">
            Your tip has been sent! The creator will be notified and appreciates your support.
          </p>
        )}

        {type === 'ppv' && (
          <p className="text-gray-400 mb-8">
            Content unlocked! You can now view the exclusive post.
          </p>
        )}

        <div className="flex flex-col gap-3">
          {type === 'ppv' && postId ? (
            <Link
              href={`/posts/${postId}`}
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg font-semibold hover:opacity-90 transition-opacity"
            >
              View Unlocked Content
            </Link>
          ) : (
            <Link
              href="/feed"
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg font-semibold hover:opacity-90 transition-opacity"
            >
              Go to Feed
            </Link>
          )}

          <Link
            href="/explore"
            className="px-6 py-3 bg-white/10 rounded-lg font-medium hover:bg-white/20 transition-colors"
          >
            Explore More Creators
          </Link>

          <Link
            href="/"
            className="text-gray-400 hover:text-white transition-colors mt-2"
          >
            Return home
          </Link>
        </div>
      </div>
    </div>
  );
}
