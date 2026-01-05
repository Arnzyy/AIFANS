import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Bookmark, Heart, MessageCircle, User } from 'lucide-react';

export default async function BookmarksPage() {
  const supabase = await createServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login?redirect=/bookmarks');
  }

  // Fetch bookmarked posts
  const { data: bookmarks } = await supabase
    .from('bookmarks')
    .select(`
      id,
      created_at,
      post:posts(
        id,
        text_content,
        media_url,
        likes_count,
        comments_count,
        created_at,
        creator:profiles!posts_creator_id_fkey(
          id,
          username,
          display_name,
          avatar_url
        )
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Saved Posts</h1>
        <p className="text-gray-400 mt-1">Posts you've bookmarked for later</p>
      </div>

      {bookmarks && bookmarks.length > 0 ? (
        <div className="space-y-4">
          {bookmarks.map((bookmark) => {
            const post = bookmark.post as any;
            if (!post) return null;

            return (
              <div
                key={bookmark.id}
                className="p-4 rounded-xl bg-white/5 border border-white/10"
              >
                {/* Creator info */}
                <Link
                  href={`/${post.creator?.username}`}
                  className="flex items-center gap-3 mb-3"
                >
                  <div className="w-10 h-10 rounded-full bg-white/10 overflow-hidden">
                    {post.creator?.avatar_url ? (
                      <img
                        src={post.creator.avatar_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <User className="w-5 h-5 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-medium hover:text-purple-400 transition-colors">
                      {post.creator?.display_name || post.creator?.username}
                    </p>
                    <p className="text-sm text-gray-500">@{post.creator?.username}</p>
                  </div>
                </Link>

                {/* Content */}
                {post.text_content && (
                  <p className="text-gray-300 mb-3">{post.text_content}</p>
                )}

                {post.media_url && (
                  <div className="rounded-lg overflow-hidden mb-3">
                    <img
                      src={post.media_url}
                      alt=""
                      className="w-full h-auto"
                    />
                  </div>
                )}

                {/* Stats */}
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <Heart className="w-4 h-4" />
                    {post.likes_count || 0}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageCircle className="w-4 h-4" />
                    {post.comments_count || 0}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 rounded-xl bg-white/5 border border-white/10">
          <Bookmark className="w-12 h-12 mx-auto mb-4 text-gray-500" />
          <h3 className="text-xl font-semibold mb-2">No saved posts yet</h3>
          <p className="text-gray-400 mb-4">
            Bookmark posts to save them for later
          </p>
          <Link
            href="/explore"
            className="inline-block px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-medium hover:opacity-90 transition-opacity"
          >
            Explore Creators
          </Link>
        </div>
      )}
    </div>
  );
}
