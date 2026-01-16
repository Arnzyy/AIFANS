'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { AI_CHAT_DISCLOSURE } from '@/lib/compliance/constants';
import { getCreatorByUsername } from '@/lib/data/creators';
import { formatDistanceToNow } from 'date-fns';
import { Lock, Sparkles, LogIn, Heart, RotateCcw, Images } from 'lucide-react';
import { TipButton } from '@/components/tokens/TipButton';
import { ChatAccessGate } from '@/components/chat/ChatAccessGate';
import { PurchaseSessionModal } from '@/components/chat/PurchaseSessionModal';
import { InlineTokenBalance } from '@/components/chat/ChatTokenBalance';
import { SubscribeModal } from '@/components/shared/SubscribeModal';
import { InChatContentBrowser } from '@/components/chat/InChatContentBrowser';
import { isAdminUser } from '@/lib/auth/admin';
import type { ChatAccess, UnlockOption, MessagePack } from '@/lib/chat';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  receiver_id: string;
  created_at: string;
  is_ai_generated: boolean;
}

interface Creator {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  creator_profiles: {
    ai_chat_enabled: boolean;
    bio: string | null;
  } | null;
}

// Helper to check if a string is a UUID
function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// Helper to get/set chat cleared timestamp (persists visual clear across reloads)
function getChatClearedAt(conversationId: string): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(`chat_cleared_${conversationId}`);
}

function setChatClearedAt(conversationId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`chat_cleared_${conversationId}`, new Date().toISOString());
}

// Random fallback opening messages (used when API fails)
function getRandomFallbackOpener(name: string): string {
  const hour = new Date().getHours();
  const isNight = hour >= 21 || hour < 6;
  const isEvening = hour >= 18 && hour < 21;

  const nightOpeners = [
    `Can't sleep either? 🌙 I was hoping someone interesting would show up...`,
    `Late night thoughts hitting different... want to keep me company?`,
    `There's something about these quiet hours... glad you're here 💫`,
    `Mmm, a night owl like me? I like that already...`,
  ];

  const eveningOpeners = [
    `Perfect timing... I was just thinking about having some company 💕`,
    `The evening's young and so are we... what's on your mind?`,
    `I had a feeling someone interesting would show up tonight...`,
  ];

  const dayOpeners = [
    `Well well... you caught my attention 😏 What brings you here?`,
    `I don't usually say hi first, but something about you... 💫`,
    `Curiosity got the better of you? Same... tell me something about yourself`,
    `Finally, someone worth talking to. What's your story?`,
  ];

  const openers = isNight ? nightOpeners : isEvening ? eveningOpeners : dayOpeners;
  return openers[Math.floor(Math.random() * openers.length)];
}

export default function AIChatPage() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [creator, setCreator] = useState<Creator | null>(null);
  const [isModelChat, setIsModelChat] = useState(false); // True if chatting with a database model
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);
  const [showDisclosure, setShowDisclosure] = useState(true);

  // Chat access state
  const [chatAccess, setChatAccess] = useState<ChatAccess | null>(null);
  const [tokenBalance, setTokenBalance] = useState(0);
  const [openingMessage, setOpeningMessage] = useState<string | null>(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const [subscriptionTiers, setSubscriptionTiers] = useState<any[]>([]);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [accessLoading, setAccessLoading] = useState(false);

  // Quick tip state
  const [quickTipSending, setQuickTipSending] = useState<number | null>(null);
  const [quickTipSuccess, setQuickTipSuccess] = useState<number | null>(null);

  // Content browser state
  const [showContentBrowser, setShowContentBrowser] = useState(false);

  // iOS viewport height fix - handles keyboard dismiss properly
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle iOS visual viewport changes (keyboard show/hide)
  useEffect(() => {
    const updateViewportHeight = () => {
      // Use visualViewport if available (handles iOS keyboard properly)
      const vh = window.visualViewport?.height || window.innerHeight;
      setViewportHeight(vh);

      // Also update CSS variable for any child elements that need it
      document.documentElement.style.setProperty('--chat-vh', `${vh}px`);
    };

    // Initial set
    updateViewportHeight();

    // Listen to visual viewport changes (keyboard, zoom, etc.)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateViewportHeight);
      window.visualViewport.addEventListener('scroll', updateViewportHeight);
    }

    // Fallback for browsers without visualViewport
    window.addEventListener('resize', updateViewportHeight);

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', updateViewportHeight);
        window.visualViewport.removeEventListener('scroll', updateViewportHeight);
      }
      window.removeEventListener('resize', updateViewportHeight);
    };
  }, []);

  useEffect(() => {
    loadChat();
  }, [username]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  const loadChat = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Allow viewing even without login (for opening message)
      // Only redirect if trying to send messages
      setCurrentUser(user);

      // Set default guest access immediately for non-logged-in users
      // This ensures the access gate shows while API loads
      if (!user) {
        setChatAccess({
          hasAccess: false,
          accessType: 'guest',
          messagesRemaining: null,
          canSendMessage: false,
          requiresUnlock: true,
          unlockOptions: [
            { type: 'login', label: 'Log in to chat', recommended: true },
            { type: 'subscribe', label: 'Subscribe' },
            { type: 'paid_session', label: 'Try 5 messages', cost: 125, costDisplay: '£0.50', messages: 5 },
          ],
          isLowMessages: false,
        });
      }

      let creatorId: string;

      // Check if the username is actually a model ID (UUID)
      if (isUUID(username)) {
        // This is a model ID, fetch the model directly
        console.log('[AIChatPage] Detected UUID, fetching model:', username);
        try {
          const modelRes = await fetch(`/api/models/${username}`);
          if (modelRes.ok) {
            const modelData = await modelRes.json();
            const model = modelData.model;

            if (model) {
              // Check if AI chat is actually configured for this model
              if (!model.hasAiChat) {
                // No AI chat configured, redirect to model profile
                router.push(`/model/${username}`);
                return;
              }

              const modelName = model.displayName || model.name;
              // Create a clean username from model name (lowercase, no spaces)
              const modelUsername = modelName.toLowerCase().replace(/\s+/g, '_');

              // Use model data as the "creator" for chat purposes
              setCreator({
                id: model.id,
                username: modelUsername,
                display_name: modelName,
                avatar_url: model.avatar,
                creator_profiles: {
                  ai_chat_enabled: true,
                  bio: model.bio,
                },
              } as Creator);
              setIsModelChat(true); // This is a database model chat

              // Check subscription status - admin email gets full access
              const isAdmin = isAdminUser(user?.email);
              const isSubscribedToModel = modelData.isSubscribed || isAdmin;

              if (user && isSubscribedToModel) {
                // User is subscribed or admin - grant access
                setChatAccess({
                  hasAccess: true,
                  accessType: 'subscription',
                  messagesRemaining: null,
                  canSendMessage: true,
                  requiresUnlock: false,
                  unlockOptions: [],
                  isLowMessages: false,
                });

                // Fetch token balance for header display
                try {
                  const walletRes = await fetch('/api/wallet');
                  if (walletRes.ok) {
                    const walletData = await walletRes.json();
                    setTokenBalance(walletData.balance || 0);
                  }
                } catch (walletErr) {
                  console.error('[AIChatPage] Error fetching wallet:', walletErr);
                }

                // Get or create conversation for this model chat
                let hasExistingMessages = false;
                try {
                  // First check if conversation exists
                  const { data: existingConv } = await supabase
                    .from('conversations')
                    .select('id')
                    .or(
                      `and(participant1_id.eq.${user.id},participant2_id.eq.${model.id}),` +
                      `and(participant1_id.eq.${model.id},participant2_id.eq.${user.id})`
                    )
                    .maybeSingle();

                  let conv = existingConv;
                  if (!conv) {
                    // Create new conversation
                    const { data: newConv } = await supabase
                      .from('conversations')
                      .insert({
                        participant1_id: user.id,
                        participant2_id: model.id,
                      })
                      .select('id')
                      .single();
                    conv = newConv;
                  }

                  if (conv?.id) {
                    setConversationId(conv.id);

                    // Load existing messages (limit to last 50 for performance)
                    const { data: existingMessages } = await supabase
                      .from('chat_messages')
                      .select('*')
                      .eq('conversation_id', conv.id)
                      .order('created_at', { ascending: false })
                      .limit(50);

                    // Reverse to show in chronological order (oldest first)
                    if (existingMessages) existingMessages.reverse();

                    // Check if user has ANY message history (before filtering)
                    // This determines if they're a returning user (don't show opening message)
                    const hasAnyHistory = existingMessages && existingMessages.length > 0;
                    if (hasAnyHistory) {
                      hasExistingMessages = true;
                      setShowDisclosure(false); // Already chatted before
                      setOpeningMessage(''); // Don't show opening message for returning users
                    }

                    // Filter out messages before the "cleared at" timestamp (visual clear persistence)
                    const clearedAt = getChatClearedAt(conv.id);
                    let filteredMessages = existingMessages || [];
                    if (clearedAt && filteredMessages.length > 0) {
                      const clearedTime = new Date(clearedAt).getTime();
                      filteredMessages = filteredMessages.filter(
                        (m: any) => new Date(m.created_at).getTime() > clearedTime
                      );
                    }

                    // Only show filtered messages in UI
                    if (filteredMessages.length > 0) {
                      // Transform to Message format
                      const msgs = filteredMessages.map((m: any) => ({
                        id: m.id,
                        content: m.content,
                        sender_id: m.role === 'user' ? user.id : model.id,
                        receiver_id: m.role === 'user' ? model.id : user.id,
                        created_at: m.created_at,
                        is_ai_generated: m.role === 'assistant',
                      }));
                      setMessages(msgs);
                      setShowDisclosure(false); // Already chatted before
                      setOpeningMessage(''); // Clear opening message for returning users

                      // Check if we should generate a welcome back message
                      // Only if the last message was more than 1 hour ago
                      const lastMsg = filteredMessages[filteredMessages.length - 1];
                      const lastMsgTime = new Date(lastMsg.created_at).getTime();
                      const oneHourAgo = Date.now() - (60 * 60 * 1000);

                      if (lastMsgTime < oneHourAgo) {
                        // Generate welcome back message
                        try {
                          const welcomeRes = await fetch(`/api/chat/${model.id}/welcome-back`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              conversationId: conv.id,
                              creatorName: modelName,
                            }),
                          });

                          if (welcomeRes.ok) {
                            const { welcomeMessage } = await welcomeRes.json();
                            if (welcomeMessage) {
                              // Add welcome back message to the conversation
                              const welcomeMsg: Message = {
                                id: `welcome-${Date.now()}`,
                                content: welcomeMessage,
                                sender_id: model.id,
                                receiver_id: user.id,
                                created_at: new Date().toISOString(),
                                is_ai_generated: true,
                              };
                              setMessages(prev => [...prev, welcomeMsg]);
                            }
                          }
                        } catch (welcomeErr) {
                          console.error('[AIChatPage] Welcome back error:', welcomeErr);
                        }
                      }
                    }
                  }
                } catch (convErr) {
                  console.error('[AIChatPage] Error loading conversation:', convErr);
                }

                // Only fetch opening message for NEW conversations (no history)
                if (!hasExistingMessages) {
                  try {
                    const openingRes = await fetch(`/api/models/${username}/opening-message`);
                    if (openingRes.ok) {
                      const { openingMessage: aiMessage } = await openingRes.json();
                      setOpeningMessage(aiMessage);
                    } else {
                      // Fallback if API fails - still varied by time of day
                      setOpeningMessage(getRandomFallbackOpener(modelName));
                    }
                  } catch {
                    setOpeningMessage(getRandomFallbackOpener(modelName));
                  }
                }
              } else if (user) {
                // User is logged in but NOT subscribed - show subscription paywall
                setChatAccess({
                  hasAccess: false,
                  accessType: 'none',
                  messagesRemaining: null,
                  canSendMessage: false,
                  requiresUnlock: true,
                  unlockOptions: [
                    { type: 'subscribe', label: `Subscribe to ${modelName}`, recommended: true },
                  ],
                  isLowMessages: false,
                });

                // Fetch token balance for display in paywall
                try {
                  const walletRes = await fetch('/api/wallet');
                  if (walletRes.ok) {
                    const walletData = await walletRes.json();
                    setTokenBalance(walletData.balance || 0);
                  }
                } catch (walletErr) {
                  console.error('[AIChatPage] Error fetching wallet:', walletErr);
                }

                // Show AI-generated opening message as preview
                try {
                  const openingRes = await fetch(`/api/models/${username}/opening-message`);
                  if (openingRes.ok) {
                    const { openingMessage: aiMessage } = await openingRes.json();
                    setOpeningMessage(aiMessage);
                  } else {
                    setOpeningMessage(getRandomFallbackOpener(modelName));
                  }
                } catch {
                  setOpeningMessage(getRandomFallbackOpener(modelName));
                }
              } else {
                // Guest user (not logged in) - show AI-generated opening as teaser
                try {
                  const openingRes = await fetch(`/api/models/${username}/opening-message`);
                  if (openingRes.ok) {
                    const { openingMessage: aiMessage } = await openingRes.json();
                    setOpeningMessage(aiMessage);
                  } else {
                    setOpeningMessage(getRandomFallbackOpener(modelName));
                  }
                } catch {
                  setOpeningMessage(getRandomFallbackOpener(modelName));
                }
              }
              // For model chats, we're done loading
              setLoading(false);
              return;
            } else {
              // Model not found
              router.push('/explore');
              return;
            }
          } else {
            // API error, redirect to explore
            router.push('/explore');
            return;
          }
        } catch (err) {
          console.error('[AIChatPage] Error fetching model:', err);
          router.push('/explore');
          return;
        }
      } else {
        // Try to fetch the creator from database first
        const { data: creatorData } = await supabase
          .from('profiles')
          .select(`
            id, username, display_name, avatar_url,
            creator_profiles(ai_chat_enabled, bio)
          `)
          .eq('username', username.toLowerCase())
          .eq('role', 'creator')
          .single();

        // Handle creator_profiles which may be array or object from Supabase
        const creatorProfiles = Array.isArray(creatorData?.creator_profiles)
          ? creatorData.creator_profiles[0]
          : creatorData?.creator_profiles;

        if (creatorData && creatorProfiles?.ai_chat_enabled) {
          // Real creator from database
          setCreator({
            ...creatorData,
            creator_profiles: creatorProfiles,
          } as Creator);
          creatorId = creatorData.id;

          // Set a default opening message for guests while API loads
          const creatorName = creatorData.display_name || creatorData.username;
          if (!user) {
            setOpeningMessage(`Hey there... I'm ${creatorName} 💋\n\nI've been waiting for someone like you to show up. There's so much I want to share with you - my thoughts, my day, maybe some things I don't tell just anyone...\n\nSubscribe to unlock our private conversations and get to know the real me 💕`);
          }
        } else {
          // Try mock creators
          const mockCreator = getCreatorByUsername(username.toLowerCase());
          if (!mockCreator || !mockCreator.hasAiChat) {
            router.push(`/${username}`);
            return;
          }
          // Use mock creator data
          setCreator({
            id: mockCreator.id,
            username: mockCreator.username,
            display_name: mockCreator.displayName,
            avatar_url: mockCreator.avatar,
            creator_profiles: {
              ai_chat_enabled: true,
              bio: mockCreator.bio,
            },
          } as Creator);

          // For mock creators: logged-in users get free access, guests see paywall demo
          if (user) {
            // Logged-in users can chat freely with mock creators
            setChatAccess({
              hasAccess: true,
              accessType: 'subscription',
              messagesRemaining: null,
              canSendMessage: true,
              requiresUnlock: false,
              unlockOptions: [],
              isLowMessages: false,
            });
          } else {
            // Guests see the access gate (demo the paywall experience)
            setOpeningMessage(`Hey there... I'm ${mockCreator.displayName} 💋\n\nI've been waiting for someone like you to show up. There's so much I want to share with you - my thoughts, my day, maybe some things I don't tell just anyone...\n\nSubscribe to unlock our private conversations and get to know the real me 💕`);
            // Guest access already set above, don't overwrite
          }
          setLoading(false);
          return; // Skip conversation creation for mock creators
        }
      }

      // Call start chat endpoint to get opening message and access status
      try {
        const startResponse = await fetch(`/api/chat/${creatorId}/start`);
        const startData = await startResponse.json();

        if (startData.openingMessage) {
          setOpeningMessage(startData.openingMessage.content);
        }
        if (startData.access) {
          setChatAccess(startData.access);
        } else if (!user) {
          // Fallback guest access if endpoint doesn't return access
          setChatAccess({
            hasAccess: false,
            accessType: 'guest',
            messagesRemaining: null,
            canSendMessage: false,
            requiresUnlock: true,
            unlockOptions: [
              { type: 'login', label: 'Log in to chat', recommended: true },
              { type: 'subscribe', label: 'Subscribe' },
              { type: 'paid_session', label: 'Try 5 messages', cost: 125, costDisplay: '£0.50', messages: 5 },
            ],
            isLowMessages: false,
          });
        }
        if (startData.tokenBalance !== undefined) {
          setTokenBalance(startData.tokenBalance);
        }
        if (startData.conversationId) {
          setConversationId(startData.conversationId);
        }

        // If user is logged in, fetch existing messages
        if (user && startData.conversationId) {
          const { data: messagesData } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', startData.conversationId)
            .order('created_at', { ascending: true });

          setMessages(messagesData || []);
          if (messagesData && messagesData.length > 0) {
            setShowDisclosure(false); // Already chatted before
          }
        }
      } catch (startError) {
        console.error('Error calling start endpoint:', startError);
        // Set fallback access for guests
        if (!user) {
          setChatAccess({
            hasAccess: false,
            accessType: 'guest',
            messagesRemaining: null,
            canSendMessage: false,
            requiresUnlock: true,
            unlockOptions: [
              { type: 'login', label: 'Log in to chat', recommended: true },
              { type: 'subscribe', label: 'Subscribe' },
              { type: 'paid_session', label: 'Try 5 messages', cost: 125, costDisplay: '£0.50', messages: 5 },
            ],
            isLowMessages: false,
          });
        }
      }

    } catch (error) {
      console.error('Error loading chat:', error);
    } finally {
      setLoading(false);
    }
  };

  // Purchase session handler
  const handlePurchaseSession = useCallback(async (pack: MessagePack) => {
    if (!creator) return;
    setAccessLoading(true);
    setPurchaseError(null);

    try {
      const response = await fetch(`/api/chat/${creator.id}/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: pack.messages }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to purchase session');
      }

      // Update state with new access and balance
      if (data.access) {
        setChatAccess(data.access);
      }
      if (data.new_balance !== undefined) {
        setTokenBalance(data.new_balance);
      }

      setShowPurchaseModal(false);
    } catch (error: any) {
      setPurchaseError(error.message);
    } finally {
      setAccessLoading(false);
    }
  }, [creator]);

  // Extend messages handler
  const handleExtendMessages = useCallback(async (option: UnlockOption) => {
    if (!creator || !option.messages) return;
    setAccessLoading(true);

    try {
      const response = await fetch(`/api/chat/${creator.id}/extend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: option.messages }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to extend messages');
      }

      if (data.access) {
        setChatAccess(data.access);
      }
      if (data.new_balance !== undefined) {
        setTokenBalance(data.new_balance);
      }
    } catch (error: any) {
      console.error('Extend error:', error);
    } finally {
      setAccessLoading(false);
    }
  }, [creator]);

  // Subscribe handler - show modal with FAN/CHAT/BUNDLE options
  const handleSubscribe = useCallback(async () => {
    if (!creator) return;

    const defaultTier = {
      id: 'default',
      name: 'Fan Access',
      description: 'Access to all posts and content',
      price: 999, // £9.99 in cents
      duration_months: 1,
      is_featured: true,
    };

    // Fetch subscription tiers for this creator
    try {
      const tiersRes = await fetch(`/api/creators/${creator.id}/tiers`);
      if (tiersRes.ok) {
        const tiersData = await tiersRes.json();
        const fetchedTiers = tiersData.tiers || [];
        // Use default tier if none found
        setSubscriptionTiers(fetchedTiers.length > 0 ? fetchedTiers : [defaultTier]);
      } else {
        setSubscriptionTiers([defaultTier]);
      }
    } catch (err) {
      setSubscriptionTiers([defaultTier]);
    }

    setShowSubscribeModal(true);
  }, [creator]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !creator || sending) return;

    // Check if user is logged in
    if (!currentUser) {
      router.push('/login?redirect=/chat/' + username);
      return;
    }

    // Check access
    if (chatAccess && !chatAccess.canSendMessage) {
      setShowPurchaseModal(true);
      return;
    }

    setShowDisclosure(false);
    setSending(true);
    setTyping(true);

    const messageContent = newMessage.trim();
    setNewMessage('');

    // Optimistically add user message
    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`,
      content: messageContent,
      sender_id: currentUser.id,
      receiver_id: creator.id,
      created_at: new Date().toISOString(),
      is_ai_generated: false
    };
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      // Check if this is a mock creator (ID doesn't look like UUID)
      const isMockCreator = !creator.id.includes('-') || creator.id.length < 30;

      if (isMockCreator) {
        // For mock creators only, call the mock AI endpoint (no memory)
        const response = await fetch('/api/ai-chat/mock', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            creatorUsername: creator.username,
            creatorName: creator.display_name,
            message: messageContent,
            modelId: isModelChat ? creator.id : undefined,
            conversationHistory: messages.slice(-10).map(m => ({
              role: m.sender_id === currentUser.id ? 'user' : 'assistant',
              content: m.content
            }))
          })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to send message');
        }

        // Add AI response
        const aiMsg: Message = {
          id: `ai-${Date.now()}`,
          content: data.response,
          sender_id: creator.id,
          receiver_id: currentUser.id,
          created_at: new Date().toISOString(),
          is_ai_generated: true
        };
        setMessages(prev => [...prev, aiMsg]);
      } else {
        // Call real AI chat API for database creators (with access control)
        const response = await fetch(`/api/chat/${creator.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: messageContent,
            conversationId
          })
        });

        const data = await response.json();

        if (!response.ok) {
          // Handle access denied
          if (response.status === 403 && data.access) {
            setChatAccess(data.access);
            setShowPurchaseModal(true);
            throw new Error('Chat access required');
          }
          throw new Error(data.error || 'Failed to send message');
        }

        // Update conversation ID if new
        if (data.conversationId && !conversationId) {
          setConversationId(data.conversationId);
        }

        // Update access state from response
        if (data.access) {
          setChatAccess(prevAccess => prevAccess ? {
            ...prevAccess,
            messagesRemaining: data.access.messagesRemaining,
            canSendMessage: data.access.canSendMessage,
            isLowMessages: data.access.isLowMessages,
            warningMessage: data.access.warningMessage,
          } : null);
        }

        // Add AI response
        const aiMsg: Message = {
          id: `ai-${Date.now()}`,
          content: data.response,
          sender_id: creator.id,
          receiver_id: currentUser.id,
          created_at: new Date().toISOString(),
          is_ai_generated: true
        };
        setMessages(prev => [...prev, aiMsg]);
      }

    } catch (error: any) {
      console.error('Error sending message:', error);
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== tempUserMsg.id));
      setNewMessage(messageContent);

      if (error.message.includes('Insufficient balance')) {
        // Show wallet prompt
        router.push('/wallet?add=true&return=/chat/' + username);
      }
    } finally {
      setSending(false);
      setTyping(false);
    }
  };

  // Handle tip sent - generate AI acknowledgement based on tip amount and personality
  const handleTipSent = async (amount: number, newBalance: number) => {
    if (!creator) return;

    // Update header balance immediately
    setTokenBalance(newBalance);

    // Show typing indicator while generating acknowledgement
    setTyping(true);

    try {
      // Call API to generate AI acknowledgement based on tip amount + personality
      const response = await fetch(`/api/chat/${creator.id}/tip-ack`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipAmount: amount,
          conversationId,
          creatorName: creator.display_name || creator.username,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.acknowledgement) {
          const tipAckMsg: Message = {
            id: `tip-ack-${Date.now()}`,
            content: data.acknowledgement,
            sender_id: creator.id,
            receiver_id: currentUser?.id || '',
            created_at: new Date().toISOString(),
            is_ai_generated: true
          };
          setMessages(prev => [...prev, tipAckMsg]);
        }
      } else {
        // Fallback if API fails - simple thank you
        const fallbackMsg: Message = {
          id: `tip-ack-${Date.now()}`,
          content: `Thank you so much for the ${amount} tokens! You're amazing 💕`,
          sender_id: creator.id,
          receiver_id: currentUser?.id || '',
          created_at: new Date().toISOString(),
          is_ai_generated: true
        };
        setMessages(prev => [...prev, fallbackMsg]);
      }
    } catch (error) {
      console.error('Failed to generate tip acknowledgement:', error);
      // Fallback message
      const fallbackMsg: Message = {
        id: `tip-ack-${Date.now()}`,
        content: `Thank you for the ${amount} tokens! 💖`,
        sender_id: creator.id,
        receiver_id: currentUser?.id || '',
        created_at: new Date().toISOString(),
        is_ai_generated: true
      };
      setMessages(prev => [...prev, fallbackMsg]);
    } finally {
      setTyping(false);
    }
  };

  // Send quick tip directly without modal
  const sendQuickTip = async (amount: number) => {
    if (!creator || quickTipSending) return;

    // Check balance first
    if (amount > tokenBalance) {
      router.push('/wallet?add=true&return=/chat/' + username);
      return;
    }

    setQuickTipSending(amount);

    try {
      const res = await fetch('/api/tips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creator_id: creator.id,
          amount_tokens: amount,
          thread_id: conversationId,
          chat_mode: 'nsfw',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error?.includes('Insufficient')) {
          router.push('/wallet?add=true&return=/chat/' + username);
        }
        return;
      }

      // Show success briefly
      setQuickTipSuccess(amount);
      setTimeout(() => setQuickTipSuccess(null), 2000);

      // Trigger AI acknowledgement
      handleTipSent(amount, data.new_balance);

    } catch (error) {
      console.error('Quick tip failed:', error);
    } finally {
      setQuickTipSending(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex flex-col bg-black overflow-hidden"
      style={{ height: viewportHeight ? `${viewportHeight}px` : '100dvh' }}
    >
      {/* Quick Tip Success Toast */}
      {quickTipSuccess && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none">
          <div className="bg-zinc-900 border border-green-500/30 rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center">
                <svg className="w-7 h-7 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="text-center">
                <p className="font-bold text-lg">Tip Sent!</p>
                <p className="text-gray-400 text-sm">{creator?.display_name || creator?.username} will love it 💕</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header - Fixed for iOS compatibility */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-black/95 backdrop-blur-xl">
        <div className="flex items-center gap-3 px-3 md:px-4 h-14 md:h-16">
          <Link
            href={isModelChat ? `/model/${creator?.id}` : `/${creator?.username}`}
            className="p-1.5 md:p-2 -ml-1 text-gray-400 hover:text-white transition-colors text-sm md:text-base"
          >
            ←
          </Link>

          {creator && (
            <Link href={isModelChat ? `/model/${username}` : `/${creator.username}`} className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
              <div className="relative flex-shrink-0">
                <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-white/10 overflow-hidden">
                  {creator.avatar_url ? (
                    <img
                      src={creator.avatar_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-base md:text-lg">
                      {(creator.display_name || creator.username).charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 md:w-5 md:h-5 bg-purple-500 rounded-full flex items-center justify-center text-[10px] md:text-xs">
                  AI
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium flex items-center gap-1.5 md:gap-2 text-sm md:text-base truncate">
                  <span className="truncate">{creator.display_name || creator.username}</span>
                  <span className="text-[10px] md:text-xs px-1 md:px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded flex-shrink-0">
                    AI
                  </span>
                </p>
                <p className="text-[10px] md:text-xs text-gray-500 truncate">@{creator.username}</p>
              </div>
            </Link>
          )}

          {/* Token balance (only for logged in users with real creators) */}
          {currentUser && creator && creator.id.includes('-') && creator.id.length >= 30 && (
            <InlineTokenBalance balance={tokenBalance} />
          )}

          {/* Tip Button - only for real creators */}
          {creator && creator.id.includes('-') && creator.id.length >= 30 && (
            <TipButton
              creatorId={creator.id}
              creatorName={creator.display_name || creator.username}
              threadId={conversationId || undefined}
              chatMode="nsfw"
              variant="icon"
              onTipSent={handleTipSent}
            />
          )}

          {/* Gallery Button - view creator's content */}
          {creator && creator.id.includes('-') && creator.id.length >= 30 && (
            <button
              onClick={() => setShowContentBrowser(true)}
              className="p-2.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 transition"
              title="View content"
            >
              <Images className="w-5 h-5 text-purple-400" />
            </button>
          )}

          {/* Clear chat button (visual only - keeps history & memories) */}
          {messages.length > 0 && (
            <button
              onClick={() => {
                // Save clear timestamp so it persists across page reloads
                if (conversationId) {
                  setChatClearedAt(conversationId);
                }
                setMessages([]);
                setOpeningMessage('');
              }}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition"
              title="Clear chat window (memories are preserved)"
            >
              <RotateCcw className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>
      </header>

      {/* AI Disclosure Banner - Fixed below header */}
      {showDisclosure && (
        <div className="fixed top-14 md:top-16 left-0 right-0 z-40 px-3 md:px-4 py-2 md:py-3 bg-purple-500/10 border-b border-purple-500/20">
          <p className="text-xs md:text-sm text-center text-purple-200">
            {AI_CHAT_DISCLOSURE.medium}
          </p>
        </div>
      )}

      {/* Messages - pt accounts for fixed header + disclosure, pb-48 for fixed input area */}
      <div className={`flex-1 min-h-0 overflow-y-auto px-4 pb-48 ${showDisclosure ? 'pt-28 md:pt-32' : 'pt-16 md:pt-20'}`}>
        <div className="max-w-2xl mx-auto space-y-4">
          {messages.length === 0 && !openingMessage ? (
            <div className="text-center py-6 md:py-12">
              <div className="mb-3 md:mb-4">
                {creator?.avatar_url ? (
                  <img
                    src={creator.avatar_url}
                    alt=""
                    className="w-16 h-16 md:w-20 md:h-20 rounded-full mx-auto object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-full mx-auto bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-2xl md:text-3xl">
                    {(creator?.display_name || creator?.username || '?').charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <h3 className="text-lg md:text-xl font-semibold mb-1 md:mb-2">
                Chat with {creator?.display_name || creator?.username}
              </h3>
              <p className="text-sm md:text-base text-gray-400 max-w-sm mx-auto px-4">
                Start a conversation! AI-powered chat available 24/7.
              </p>
            </div>
          ) : messages.length === 0 && openingMessage ? (
            /* Opening message for new conversations */
            <div className="flex justify-start">
              {creator && (
                <div className="w-8 h-8 rounded-full mr-2 flex-shrink-0 overflow-hidden">
                  {creator.avatar_url ? (
                    <img
                      src={creator.avatar_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-sm">
                      {(creator.display_name || creator.username).charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              )}
              <div className="max-w-[75%] px-4 py-2.5 rounded-2xl bg-white/10 rounded-bl-md">
                <p className="whitespace-pre-wrap break-words">{openingMessage}</p>
                <p className="text-xs mt-1 text-gray-500">Just now</p>
              </div>
            </div>
          ) : (
            messages.map((message) => {
              const isOwn = message.sender_id === currentUser?.id;
              return (
                <div
                  key={message.id}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                >
                  {!isOwn && creator && (
                    <div className="w-8 h-8 rounded-full mr-2 flex-shrink-0 overflow-hidden">
                      {creator.avatar_url ? (
                        <img
                          src={creator.avatar_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-sm">
                          {(creator.display_name || creator.username).charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                  )}
                  <div
                    className={`max-w-[75%] px-4 py-2.5 rounded-2xl ${
                      isOwn
                        ? 'bg-purple-500 text-white rounded-br-md'
                        : 'bg-white/10 rounded-bl-md'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{message.content}</p>
                    <p className={`text-xs mt-1 ${isOwn ? 'text-purple-200' : 'text-gray-500'}`}>
                      {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              );
            })
          )}

          {/* Typing indicator */}
          {typing && (
            <div className="flex justify-start">
              <div className="w-8 h-8 rounded-full mr-2 flex-shrink-0 overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500">
                {creator?.avatar_url && (
                  <img src={creator.avatar_url} alt="" className="w-full h-full object-cover" />
                )}
              </div>
              <div className="px-4 py-3 rounded-2xl bg-white/10 rounded-bl-md">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area with Tip Bar - Fixed for iOS keyboard compatibility */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-black pb-[env(safe-area-inset-bottom)]">
        {/* Quick Tip Bar - Mobile Optimized */}
        {creator && creator.id.includes('-') && creator.id.length >= 30 && (
          <div className="px-2 md:px-4 py-1.5 md:py-2 bg-gradient-to-r from-pink-500/10 to-purple-500/10 border-b border-white/5">
            <div className="max-w-2xl mx-auto flex items-center gap-1 md:gap-2">
              <span className="text-[10px] md:text-xs text-pink-400 font-medium whitespace-nowrap">💝</span>
              <div className="flex items-center gap-1 md:gap-2 flex-1 overflow-x-auto scrollbar-hide">
                {[25, 50, 100, 250].map((amount) => (
                  <button
                    key={amount}
                    onClick={() => sendQuickTip(amount)}
                    disabled={quickTipSending === amount}
                    className={`px-2 md:px-3 py-1 md:py-1.5 rounded-lg text-[11px] md:text-sm font-medium transition whitespace-nowrap flex items-center gap-0.5 md:gap-1 flex-shrink-0 ${
                      quickTipSuccess === amount
                        ? 'bg-green-500/30 text-green-300'
                        : quickTipSending === amount
                        ? 'bg-pink-500/30 text-pink-200 animate-pulse'
                        : 'bg-pink-500/20 hover:bg-pink-500/40 active:bg-pink-500/50 text-pink-300'
                    }`}
                  >
                    {quickTipSuccess === amount ? '✓' : quickTipSending === amount ? '...' : '🪙'}{amount}
                  </button>
                ))}
              </div>
              <TipButton
                creatorId={creator.id}
                creatorName={creator.display_name || creator.username}
                threadId={conversationId || undefined}
                chatMode="nsfw"
                variant="custom"
                className="flex-shrink-0"
                onTipSent={handleTipSent}
              />
            </div>
          </div>
        )}

        {/* Message Input with Access Gate */}
        <div className="p-2 md:p-4">
          <div className="max-w-2xl mx-auto">
            {chatAccess ? (
              <ChatAccessGate
                access={chatAccess}
                onSubscribe={handleSubscribe}
                onPurchaseSession={(option) => {
                  if (option.messages) {
                    const pack = { messages: option.messages, tokens: option.cost || 0, label: option.label };
                    handlePurchaseSession(pack);
                  } else {
                    setShowPurchaseModal(true);
                  }
                }}
                onExtendMessages={handleExtendMessages}
                tokenBalance={tokenBalance}
                isLoading={accessLoading}
                creatorUsername={creator?.username}
              >
                <form onSubmit={sendMessage} className="flex gap-2 md:gap-3">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={currentUser ? "Type a message..." : "Log in to chat..."}
                    className="flex-1 px-3 md:px-4 py-2.5 md:py-3 rounded-xl bg-white/5 border border-white/10 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-colors text-base"
                    disabled={sending || !currentUser}
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || sending || !currentUser}
                    className="px-4 md:px-6 py-2.5 md:py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base"
                  >
                    {sending ? '...' : 'Send'}
                  </button>
                </form>
              </ChatAccessGate>
            ) : !currentUser ? (
              // Guest fallback - show login CTA
              <div className="space-y-4">
                <div className="relative">
                  <div className="opacity-50 pointer-events-none">
                    <div className="flex gap-2 md:gap-3">
                      <input
                        type="text"
                        placeholder="Log in to chat..."
                        className="flex-1 px-3 md:px-4 py-2.5 md:py-3 rounded-xl bg-white/5 border border-white/10 outline-none text-base"
                        disabled
                      />
                      <button
                        disabled
                        className="px-4 md:px-6 py-2.5 md:py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 font-medium opacity-50 text-sm md:text-base"
                      >
                        Send
                      </button>
                    </div>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl">
                    <Lock className="w-6 h-6 text-gray-400" />
                  </div>
                </div>
                <div className="bg-zinc-900/80 border border-white/10 rounded-xl p-4 space-y-4">
                  <div className="text-center">
                    <div className="flex justify-center mb-2">
                      <Sparkles className="w-6 h-6 text-purple-400" />
                    </div>
                    <h3 className="font-semibold text-white">Ready to chat?</h3>
                    <p className="text-sm text-gray-400 mt-1">
                      Log in to start chatting or subscribe for full access
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Link
                      href={`/login?redirect=/chat/${username}`}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-lg font-medium bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90 transition"
                    >
                      <LogIn className="w-4 h-4" />
                      Log in to chat
                    </Link>
                    <button
                      onClick={handleSubscribe}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-lg font-medium bg-white/10 text-white hover:bg-white/20 transition"
                    >
                      <Heart className="w-4 h-4" />
                      Subscribe
                    </button>
                  </div>
                  <div className="text-center text-sm text-gray-500">
                    <span>Don&apos;t have an account? </span>
                    <Link
                      href={`/register?redirect=/chat/${username}`}
                      className="text-purple-400 hover:text-purple-300 font-medium"
                    >
                      Sign up free
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              // Logged in but access not yet loaded
              <form onSubmit={sendMessage} className="flex gap-2 md:gap-3">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 px-3 md:px-4 py-2.5 md:py-3 rounded-xl bg-white/5 border border-white/10 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-colors text-base"
                  disabled={sending}
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || sending}
                  className="px-4 md:px-6 py-2.5 md:py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base"
                >
                  {sending ? '...' : 'Send'}
                </button>
              </form>
            )}
          </div>
          <p className="text-center text-[10px] md:text-xs text-gray-500 mt-1.5 md:mt-2">
            AI responses may not reflect the creator&apos;s actual views
          </p>
        </div>
      </div>

      {/* Purchase Session Modal */}
      <PurchaseSessionModal
        isOpen={showPurchaseModal}
        onClose={() => {
          setShowPurchaseModal(false);
          setPurchaseError(null);
        }}
        onPurchase={handlePurchaseSession}
        tokenBalance={tokenBalance}
        modelName={creator?.display_name || creator?.username}
        isLoading={accessLoading}
        error={purchaseError}
      />

      {/* Subscribe Modal with FAN/CHAT/BUNDLE options */}
      {showSubscribeModal && creator && (
        <SubscribeModal
          creator={{
            id: creator.id,
            username: creator.username,
            display_name: creator.display_name || undefined,
            avatar_url: creator.avatar_url || undefined,
          }}
          tiers={subscriptionTiers}
          chatPrice={999} // £9.99 for chat
          onClose={() => setShowSubscribeModal(false)}
          onSuccess={() => {
            setShowSubscribeModal(false);
            // Reload to refresh access
            loadChat();
          }}
          defaultType="chat"
          isGuest={!currentUser}
          redirectPath={`/chat/${username}`}
        />
      )}

      {/* In-Chat Content Browser */}
      {creator && (
        <InChatContentBrowser
          creatorId={creator.id}
          creatorName={creator.display_name || creator.username}
          creatorAvatar={creator.avatar_url || undefined}
          isOpen={showContentBrowser}
          onClose={() => setShowContentBrowser(false)}
          onSubscribe={() => {
            setShowContentBrowser(false);
            setShowSubscribeModal(true);
          }}
        />
      )}
    </div>
  );
}
