// ===========================================
// FRONTEND: useWelcomeBack Hook
// Call this when chat component mounts
// ===========================================

import { useState, useEffect, useCallback } from 'react';

interface WelcomeBackState {
  isLoading: boolean;
  message: string | null;
  shouldShow: boolean;
  error: string | null;
}

/**
 * Hook to fetch welcome-back message when chat opens
 *
 * Usage:
 * ```tsx
 * function ChatPage({ creatorId }) {
 *   const { message, shouldShow, isLoading } = useWelcomeBack(creatorId);
 *
 *   // The message will automatically be in chat history after fetch
 *   // But you might want to show a typing indicator first
 * }
 * ```
 */
export function useWelcomeBack(creatorId: string) {
  const [state, setState] = useState<WelcomeBackState>({
    isLoading: true,
    message: null,
    shouldShow: false,
    error: null,
  });

  const fetchWelcomeBack = useCallback(async () => {
    if (!creatorId) {
      setState(prev => ({ ...prev, isLoading: false }));
      return;
    }

    try {
      const response = await fetch(`/api/chat/${creatorId}/welcome-back`);
      const data = await response.json();

      setState({
        isLoading: false,
        message: data.message,
        shouldShow: data.shouldShow,
        error: null,
      });

      console.log('[useWelcomeBack] Result:', data);

    } catch (error) {
      console.error('[useWelcomeBack] Error:', error);
      setState({
        isLoading: false,
        message: null,
        shouldShow: false,
        error: 'Failed to check welcome back',
      });
    }
  }, [creatorId]);

  useEffect(() => {
    fetchWelcomeBack();
  }, [fetchWelcomeBack]);

  return state;
}


// ===========================================
// ALTERNATIVE: Simple fetch function
// Use this if you don't want a hook
// ===========================================

/**
 * Check for welcome-back message
 * Call when chat page loads
 */
export async function checkWelcomeBack(creatorId: string): Promise<{
  shouldShow: boolean;
  message: string | null;
}> {
  try {
    const response = await fetch(`/api/chat/${creatorId}/welcome-back`);
    const data = await response.json();
    return {
      shouldShow: data.shouldShow || false,
      message: data.message || null,
    };
  } catch (error) {
    console.error('Welcome back check failed:', error);
    return { shouldShow: false, message: null };
  }
}
