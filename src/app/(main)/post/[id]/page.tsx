import { createServerClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { PostDetailClient } from './PostDetailClient';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PostPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createServerClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirect=/post/${id}`);
  }

  // Fetch the post with creator and model info
  const { data: post, error } = await supabase
    .from('posts')
    .select(`
      *,
      creator:profiles!posts_creator_id_fkey(
        id,
        username,
        display_name,
        avatar_url
      ),
      model:creator_models(
        id,
        name,
        avatar_url
      )
    `)
    .eq('id', id)
    .single();

  if (error || !post) {
    notFound();
  }

  // Check if user has access (is subscribed to creator)
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('subscriber_id', user.id)
    .eq('creator_id', post.creator_id)
    .eq('status', 'active')
    .maybeSingle();

  const hasAccess = !!subscription || post.creator_id === user.id;

  // Check if PPV post is unlocked
  let isUnlocked = false;
  if (post.is_ppv && hasAccess) {
    const { data: purchase } = await supabase
      .from('post_purchases')
      .select('id')
      .eq('post_id', id)
      .eq('buyer_id', user.id)
      .maybeSingle();
    
    isUnlocked = !!purchase;
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur-xl">
        <div className="max-w-2xl mx-auto flex items-center gap-4 px-4 h-14">
          <Link href="/feed" className="p-2 -ml-2 hover:bg-white/10 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-semibold">Post</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto">
        <PostDetailClient
          post={post}
          currentUserId={user.id}
          hasAccess={hasAccess}
          isUnlocked={isUnlocked || !post.is_ppv}
        />
      </main>
    </div>
  );
}
