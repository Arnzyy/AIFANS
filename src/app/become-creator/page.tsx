import Link from 'next/link';
import Image from 'next/image';
import { Bot, MessageSquare, DollarSign, Lock, Globe, BarChart3, Sparkles, Users, Zap, ArrowRight } from 'lucide-react';

export default function BecomeCreatorPage() {
  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-lg border-b border-white/10">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/">
            <Image src="/logo.png" alt="LYRA" width={100} height={35} />
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
              href="/register?creator=true"
              className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full font-medium hover:opacity-90 transition-opacity"
            >
              Get Started
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 mb-6">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="text-sm text-purple-400">Join the AI Creator Revolution</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            Monetize Your{' '}
            <span className="gradient-text">AI Content</span>
          </h1>
          <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
            Create AI-generated personas, build a fanbase, and earn money through subscriptions,
            tips, and pay-per-view content. The future of content creation is here.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register?creator=true"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full font-medium text-lg hover:opacity-90 transition-opacity"
            >
              Start Creating
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/explore"
              className="px-8 py-4 border border-white/20 rounded-full font-medium text-lg hover:bg-white/5 transition-colors"
            >
              See Top Creators
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 px-4 border-y border-white/10 bg-white/5">
        <div className="container mx-auto">
          <div className="grid grid-cols-3 gap-8 text-center">
            <div>
              <p className="text-3xl md:text-4xl font-bold gradient-text">80%</p>
              <p className="text-gray-400 mt-1">Revenue Share</p>
            </div>
            <div>
              <p className="text-3xl md:text-4xl font-bold gradient-text">24/7</p>
              <p className="text-gray-400 mt-1">AI Chat Earnings</p>
            </div>
            <div>
              <p className="text-3xl md:text-4xl font-bold gradient-text">0%</p>
              <p className="text-gray-400 mt-1">Platform Fee to Start</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">
            Why Creators Choose LYRA
          </h2>
          <p className="text-gray-400 text-center mb-12 max-w-2xl mx-auto">
            Everything you need to build and monetize your AI content empire
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Bot className="w-8 h-8 text-purple-400" />}
              title="AI-First Platform"
              description="Built specifically for AI-generated content creators. No restrictions on synthetic media or virtual personas."
            />
            <FeatureCard
              icon={<MessageSquare className="w-8 h-8 text-blue-400" />}
              title="AI Chat Monetization"
              description="Let your AI persona chat with fans 24/7. Earn while you sleep with automated conversations."
            />
            <FeatureCard
              icon={<DollarSign className="w-8 h-8 text-green-400" />}
              title="Multiple Revenue Streams"
              description="Subscriptions, pay-per-view, tips, and chat credits. Diversify your income with multiple monetization options."
            />
            <FeatureCard
              icon={<Lock className="w-8 h-8 text-yellow-400" />}
              title="Privacy & Anonymity"
              description="Stay anonymous while earning. Discrete billing protects both you and your subscribers."
            />
            <FeatureCard
              icon={<Globe className="w-8 h-8 text-cyan-400" />}
              title="Global Payments"
              description="Accept payments from fans worldwide. Multiple currencies and payment methods supported."
            />
            <FeatureCard
              icon={<BarChart3 className="w-8 h-8 text-pink-400" />}
              title="Creator Analytics"
              description="Deep insights into your audience, earnings, and content performance to optimize your growth."
            />
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-20 px-4 border-t border-white/10">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            How It Works
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <StepCard
              number="1"
              title="Create Your Profile"
              description="Set up your AI persona with a custom bio, avatar, and pricing. Define your character's personality."
            />
            <StepCard
              number="2"
              title="Upload Content"
              description="Share AI-generated images, videos, and exclusive content. Set prices for premium content."
            />
            <StepCard
              number="3"
              title="Start Earning"
              description="Fans subscribe to access your content and chat with your AI. Get paid weekly to your account."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 border-t border-white/10">
        <div className="container mx-auto text-center">
          <div className="max-w-3xl mx-auto p-8 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30">
            <Users className="w-12 h-12 mx-auto mb-4 text-purple-400" />
            <h2 className="text-3xl font-bold mb-4">
              Ready to Start Earning?
            </h2>
            <p className="text-gray-400 mb-8">
              Join thousands of AI creators already earning on LYRA.
              Set up takes less than 5 minutes.
            </p>
            <Link
              href="/register?creator=true"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full font-medium text-lg hover:opacity-90 transition-opacity"
            >
              <Zap className="w-5 h-5" />
              Create Your Account
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-white/10">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-gray-500">
            © 2025 LYRA. All rights reserved.
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

function StepCard({
  number,
  title,
  description
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center">
      <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-xl font-bold">
        {number}
      </div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-400">{description}</p>
    </div>
  );
}
