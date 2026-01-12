'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

interface Post {
  id: string;
  text_content: string | null;
  media_urls: string[];
  is_ppv: boolean;
  ppv_price: number | null;
  is_published: boolean;
  scheduled_at: string | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
}

export default function DashboardPostsPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const res = await fetch('/api/posts?type=mine');
      const data = await res.json();
      setPosts(data.posts || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (postId: string) => {
    router.push(`/posts/${postId}/edit`);
  };

  const handleDelete = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return;

    setDeletingId(postId);
    try {
      const res = await fetch(`/api/posts?id=${postId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setPosts(posts.filter(p => p.id !== postId));
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete post');
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('Failed to delete post');
    } finally {
      setDeletingId(null);
    }
  };

  const publishedCount = posts.filter(p => p.is_published).length;
  const scheduledCount = posts.filter(p => !p.is_published && p.scheduled_at).length;
  const draftCount = posts.filter(p => !p.is_published && !p.scheduled_at).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

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
      {posts.length > 0 ? (
        <div className="space-y-3">
          {posts.map((post) => (
            <div
              key={post.id}
              className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors"
            >
              {/* Thumbnail */}
              <div className="w-20 h-20 rounded-lg bg-white/10 flex-shrink-0 overflow-hidden">
                {post.media_urls?.[0] ? (
                  <img
                    src={post.media_urls[0]}
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
                  {(post.text_content?.length || 0) > 60 ? '...' : ''}
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
                <button
                  onClick={() => handleEdit(post.id)}
                  className="p-2 rounded-lg hover:bg-white/5 transition-colors text-gray-400 hover:text-white"
                  title="Edit post"
                >
                  ✏️
                </button>
                <button
                  onClick={() => handleDelete(post.id)}
                  disabled={deletingId === post.id}
                  className="p-2 rounded-lg hover:bg-white/5 transition-colors text-gray-400 hover:text-red-400 disabled:opacity-50"
                  title="Delete post"
                >
                  {deletingId === post.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    '🗑️'
                  )}
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
