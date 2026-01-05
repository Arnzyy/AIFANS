import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Bot, MessageSquare, DollarSign, Lock, Globe, BarChart3 } from 'lucide-react';

export default function HomePage() {
  // Redirect to explore by default
  redirect('/explore');

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-lg border-b border-white/10">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold gradient-text">
            AIFans
          </Link>
          <nav className="flex items-center gap-4">
            <Link
              href="/explore"
              className="text-gray-400 hover:text-white transition-colors"
            >
              Explore
            </Link>
            <Link
              href="/login"
              className="text-gray-400 hover:text-white transition-colors"
            >
              Log in
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full font-medium hover:opacity-90 transition-opacity"
            >
              Sign up
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            The #1 Platform for{' '}
            <span className="gradient-text">AI Models</span>
          </h1>
          <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
            Subscribe to exclusive AI-generated content from the world's most creative AI influencers.
            Chat, interact, and unlock premium content.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full font-medium text-lg hover:opacity-90 transition-opacity"
            >
              Start Exploring
            </Link>
            <Link
              href="/register?creator=true"
              className="px-8 py-4 border border-white/20 rounded-full font-medium text-lg hover:bg-white/5 transition-colors"
            >
              Become a Creator
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 border-t border-white/10">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            Why Choose AIFans?
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Bot className="w-8 h-8 text-purple-400" />}
              title="AI-First Platform"
              description="Built specifically for AI-generated content creators. No restrictions on synthetic media."
            />
            <FeatureCard
              icon={<MessageSquare className="w-8 h-8 text-blue-400" />}
              title="AI Chat"
              description="Chat with AI personalities. Creators can build custom AI companions for their subscribers."
            />
            <FeatureCard
              icon={<DollarSign className="w-8 h-8 text-green-400" />}
              title="Creator Economy"
              description="Keep 80% of your earnings. Multiple monetization options including subscriptions, PPV, and tips."
            />
            <FeatureCard
              icon={<Lock className="w-8 h-8 text-yellow-400" />}
              title="Privacy First"
              description="Discrete billing, secure payments, and complete anonymity for fans and creators."
            />
            <FeatureCard
              icon={<Globe className="w-8 h-8 text-cyan-400" />}
              title="Global Reach"
              description="Accept payments from fans worldwide. Support for multiple currencies."
            />
            <FeatureCard
              icon={<BarChart3 className="w-8 h-8 text-pink-400" />}
              title="Analytics"
              description="Deep insights into your audience, earnings, and content performance."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 border-t border-white/10">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-gray-400 mb-8 max-w-xl mx-auto">
            Join thousands of creators and fans on the leading platform for AI content.
          </p>
          <Link
            href="/register"
            className="inline-block px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full font-medium text-lg hover:opacity-90 transition-opacity"
          >
            Create Your Account
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-white/10">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-gray-500">
            © 2025 AIFans. All rights reserved.
          </p>
          <nav className="flex gap-6">
            <Link href="/terms" className="text-gray-500 hover:text-white transition-colors">
              Terms
            </Link>
            <Link href="/privacy" className="text-gray-500 hover:text-white transition-colors">
              Privacy
            </Link>
            <Link href="/support" className="text-gray-500 hover:text-white transition-colors">
              Support
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="p-6 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-400">{description}</p>
    </div>
  );
}
