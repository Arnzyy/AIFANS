'use client';

import { useState, useEffect } from 'react';
import { useParams, notFound } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { BadgeCheck, MapPin, Grid3X3, MessageCircle, Lock, Heart } from 'lucide-react';
import { SubscribeModal } from '@/components/shared/SubscribeModal';

interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
}

interface CreatorProfile {
  bio: string | null;
  is_verified: boolean;
  subscription_price: number | null;
}

export default function UserProfilePage() {
  const params = useParams();
  const username = (params.username as string)?.toLowerCase();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [creatorProfile, setCreatorProfile] = useState<CreatorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFoundState, setNotFoundState] = useState(false);
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);

  useEffect(() => {
    loadProfile();
  }, [username]);

  const loadProfile = async () => {
    if (!username) return;

    try {
      // Get user profile
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, bio')
        .eq('username', username)
        .single();

      if (error || !profileData) {
        setNotFoundState(true);
        setLoading(false);
        return;
      }

      setProfile(profileData);

      // Check if they're a creator
      const { data: creatorData } = await supabase
        .from('creator_profiles')
        .select('bio, is_verified, subscription_price')
        .eq('user_id', profileData.id)
        .single();

      if (creatorData) {
        setCreatorProfile(creatorData);
      }
    } catch (err) {
      console.error('Error loading profile:', err);
      setNotFoundState(true);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (notFoundState || !profile) {
    notFound();
  }

  const isCreator = !!creatorProfile;
  const displayName = profile.display_name || profile.username;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Cover/Header */}
      <div className="h-32 md:h-48 bg-gradient-to-br from-purple-500/30 to-pink-500/30 rounded-b-xl" />

      {/* Profile Info */}
      <div className="px-4 md:px-6">
        <div className="relative -mt-16 md:-mt-20 mb-4">
          <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-black bg-zinc-900 overflow-hidden">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={displayName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl md:text-4xl font-bold bg-gradient-to-br from-purple-500 to-pink-500">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl md:text-3xl font-bold">{displayName}</h1>
              {creatorProfile?.is_verified && (
                <BadgeCheck className="w-6 h-6 text-purple-400" />
              )}
            </div>
            <p className="text-gray-400">@{profile.username}</p>

            {(profile.bio || creatorProfile?.bio) && (
              <p className="mt-3 text-gray-300 max-w-xl">
                {creatorProfile?.bio || profile.bio}
              </p>
            )}
          </div>

          {isCreator && (
            <div className="flex gap-3">
              <button
                onClick={() => setShowSubscribeModal(true)}
                className="px-6 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full font-medium hover:opacity-90 transition"
              >
                Subscribe
              </button>
              <Link
                href={`/messages`}
                className="px-6 py-2.5 bg-white/10 rounded-full font-medium hover:bg-white/20 transition flex items-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                Message
              </Link>
            </div>
          )}
        </div>

        {/* Stats for creators */}
        {isCreator && (
          <div className="flex gap-6 mt-6 py-4 border-t border-white/10">
            <div>
              <p className="text-xl font-bold">0</p>
              <p className="text-sm text-gray-400">Posts</p>
            </div>
            <div>
              <p className="text-xl font-bold">0</p>
              <p className="text-sm text-gray-400">Subscribers</p>
            </div>
          </div>
        )}

        {/* Content Grid */}
        {isCreator && (
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-4">
              <Grid3X3 className="w-5 h-5" />
              <span className="font-medium">Posts</span>
            </div>

            <div className="text-center py-12 bg-zinc-900/50 rounded-xl border border-white/10">
              <Lock className="w-8 h-8 mx-auto mb-3 text-gray-500" />
              <p className="text-gray-400">Subscribe to see posts</p>
              <button
                onClick={() => setShowSubscribeModal(true)}
                className="mt-4 px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full text-sm font-medium hover:opacity-90 transition"
              >
                Subscribe Now
              </button>
            </div>
          </div>
        )}

        {/* Non-creator profile */}
        {!isCreator && (
          <div className="mt-8 text-center py-12 bg-zinc-900/50 rounded-xl border border-white/10">
            <p className="text-gray-400">This user hasn't set up their creator profile yet.</p>
          </div>
        )}
      </div>

      {/* Subscribe Modal */}
      {isCreator && profile && showSubscribeModal && (
        <SubscribeModal
          creator={{
            id: profile.id,
            username: profile.username,
            display_name: displayName,
            avatar_url: profile.avatar_url || undefined,
          }}
          onClose={() => setShowSubscribeModal(false)}
          tiers={[
            {
              id: 'basic',
              name: 'Fan',
              description: 'Access to all posts and exclusive content',
              price: creatorProfile?.subscription_price || 999,
              duration_months: 1,
              is_featured: true,
            },
          ]}
        />
      )}
    </div>
  );
}
