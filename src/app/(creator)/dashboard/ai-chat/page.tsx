'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { AIPersonalityWizard } from '@/components/creator/ai-wizard/AIPersonalityWizard';
import { AIPersonalityFull } from '@/lib/ai/personality/types';

interface ModelData {
  id: string;
  name: string;
  bio: string | null;
  backstory: string | null;
  speaking_style: string | null;
  personality_traits: string[] | null;
  emoji_usage: string | null;
  interests: string[] | null;
  avatar_url: string | null;
}

export default function AIChatSetupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const modelId = searchParams.get('model');
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [existingPersonality, setExistingPersonality] = useState<AIPersonalityFull | undefined>();
  const [linkedModel, setLinkedModel] = useState<ModelData | null>(null);

  useEffect(() => {
    loadData();
  }, [modelId]);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      setUserId(user.id);

      // If model ID provided, fetch model data to pre-fill
      if (modelId) {
        const { data: model } = await supabase
          .from('creator_models')
          .select('id, name, bio, backstory, speaking_style, personality_traits, emoji_usage, interests, avatar_url')
          .eq('id', modelId)
          .single();

        if (model) {
          setLinkedModel(model);
        }
      }

      // Try to load existing personality for this model
      const { data: personality } = await supabase
        .from('ai_personalities')
        .select('*')
        .eq('creator_id', user.id)
        .eq('model_id', modelId || '')
        .single();

      if (personality) {
        setExistingPersonality(personality as AIPersonalityFull);
      }
    } catch (err) {
      console.error('Failed to load:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async (personality: AIPersonalityFull) => {
    // Update creator profile to enable AI chat
    await supabase
      .from('creator_profiles')
      .update({ ai_chat_enabled: personality.is_active })
      .eq('user_id', userId);

    // Redirect to dashboard
    router.push('/dashboard');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!userId) {
    return null;
  }

  return (
    <AIPersonalityWizard
      creatorId={userId}
      existingPersonality={existingPersonality}
      linkedModel={linkedModel}
      modelId={modelId}
      onComplete={handleComplete}
    />
  );
}
