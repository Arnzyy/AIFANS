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


// ===========================================
// EXAMPLE: Chat Component Integration
// ===========================================

/*
'use client';

import { useEffect, useState, useRef } from 'react';
import { useWelcomeBack } from '@/lib/hooks/useWelcomeBack';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function ChatComponent({ creatorId }: { creatorId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const welcomeBackChecked = useRef(false);
  
  // Check for welcome-back message on mount
  const { message: welcomeMessage, shouldShow, isLoading } = useWelcomeBack(creatorId);
  
  // Handle welcome-back message
  useEffect(() => {
    if (!isLoading && shouldShow && welcomeMessage && !welcomeBackChecked.current) {
      welcomeBackChecked.current = true;
      
      // Show typing indicator briefly
      setIsTyping(true);
      
      // Then show the message (simulate typing delay)
      setTimeout(() => {
        setIsTyping(false);
        setMessages(prev => [...prev, { role: 'assistant', content: welcomeMessage }]);
      }, 1000 + Math.random() * 1000); // 1-2 second delay
    }
  }, [isLoading, shouldShow, welcomeMessage]);
  
  // ... rest of your chat component
  
  return (
    <div>
      {messages.map((msg, i) => (
        <div key={i} className={msg.role === 'user' ? 'user-msg' : 'ai-msg'}>
          {msg.content}
        </div>
      ))}
      
      {isTyping && (
        <div className="ai-msg typing">
          <span>●</span><span>●</span><span>●</span>
        </div>
      )}
    </div>
  );
}
*/


// ===========================================
// TYPING INDICATOR COMPONENT
// ===========================================

/*
export function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-4 py-3 bg-zinc-800 rounded-2xl rounded-bl-sm w-fit">
      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
    </div>
  );
}
*/
