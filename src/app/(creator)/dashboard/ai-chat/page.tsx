'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { AIPersonalityWizard } from '@/components/creator/ai-wizard/AIPersonalityWizard';
import { AIPersonalityFull } from '@/lib/ai/personality/types';

export default function AIChatSetupPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [existingPersonality, setExistingPersonality] = useState<AIPersonalityFull | undefined>();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      setUserId(user.id);

      // Try to load existing personality
      const { data: personality } = await supabase
        .from('ai_personalities')
        .select('*')
        .eq('creator_id', user.id)
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
      onComplete={handleComplete}
    />
  );
}
