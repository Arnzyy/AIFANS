import { createServerClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function DashboardPostsPage() {
  const supabase = await createServerClient();
  
  const { data: { user } } = await supabase.auth.getUser();

  const { data: posts } = await supabase
    .from('posts')
    .select('*')
    .eq('creator_id', user?.id)
    .order('created_at', { ascending: false });

  const publishedCount = posts?.filter(p => p.is_published).length || 0;
  const scheduledCount = posts?.filter(p => !p.is_published && p.scheduled_at).length || 0;
  const draftCount = posts?.filter(p => !p.is_published && !p.scheduled_at).length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Posts</h1>
          <p className="text-gray-400 mt-1">Manage your content</p>
        </div>
        <Link
          href="/posts/new"
          className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg font-medium hover:opacity-90 transition-opacity"
        >
          + New Post
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <p className="text-2xl font-bold">{publishedCount}</p>
          <p className="text-sm text-gray-400">Published</p>
        </div>
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <p className="text-2xl font-bold">{scheduledCount}</p>
          <p className="text-sm text-gray-400">Scheduled</p>
        </div>
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <p className="text-2xl font-bold">{draftCount}</p>
          <p className="text-sm text-gray-400">Drafts</p>
        </div>
      </div>

      {/* Posts list */}
      {posts && posts.length > 0 ? (
        <div className="space-y-3">
          {posts.map((post) => (
            <div
              key={post.id}
              className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors"
            >
              {/* Thumbnail */}
              <div className="w-20 h-20 rounded-lg bg-white/10 flex-shrink-0 overflow-hidden">
                {post.media_url ? (
                  <img 
                    src={post.media_url} 
                    alt="" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl">📝</div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">
                  {post.text_content?.slice(0, 60) || 'Untitled post'}
                  {post.text_content?.length > 60 ? '...' : ''}
                </p>
                
                <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
                  {/* Status badge */}
                  {post.is_published ? (
                    <span className="px-2 py-0.5 rounded bg-green-500/20 text-green-400 text-xs">
                      Published
                    </span>
                  ) : post.scheduled_at ? (
                    <span className="px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400 text-xs">
                      Scheduled
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-gray-500/20 text-gray-400 text-xs">
                      Draft
                    </span>
                  )}

                  {post.is_ppv && (
                    <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 text-xs">
                      PPV £{((post.ppv_price || 0) / 100).toFixed(2)}
                    </span>
                  )}

                  <span>•</span>
                  <span>{new Date(post.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Stats */}
              <div className="hidden sm:flex items-center gap-6 text-sm text-gray-400">
                <div className="text-center">
                  <p className="font-medium text-white">{post.likes_count || 0}</p>
                  <p className="text-xs">Likes</p>
                </div>
                <div className="text-center">
                  <p className="font-medium text-white">{post.comments_count || 0}</p>
                  <p className="text-xs">Comments</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button className="p-2 rounded-lg hover:bg-white/5 transition-colors text-gray-400 hover:text-white">
                  ✏️
                </button>
                <button className="p-2 rounded-lg hover:bg-white/5 transition-colors text-gray-400 hover:text-red-400">
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 rounded-xl bg-white/5 border border-white/10">
          <div className="text-5xl mb-4">📭</div>
          <h3 className="text-xl font-semibold mb-2">No posts yet</h3>
          <p className="text-gray-400 mb-6">Create your first post to start engaging with fans</p>
          <Link
            href="/posts/new"
            className="inline-block px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-medium hover:opacity-90 transition-opacity"
          >
            Create Post
          </Link>
        </div>
      )}
    </div>
  );
}
