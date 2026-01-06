'use client';

import { useState } from 'react';
import { AIPersonalityFull } from '@/lib/ai/personality/types';
import {
  BODY_TYPES,
  PERSONALITY_TRAITS,
  FLIRTING_STYLES,
  VIBES_CREATES,
  WHEN_HEATED,
} from '@/lib/ai/personality/options';

interface Step7Props {
  personality: AIPersonalityFull;
  onEdit: (step: number) => void;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export function Step7Preview({ personality, onEdit }: Step7Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const sendTestMessage = async () => {
    if (!input.trim()) return;

    const userMessage: ChatMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Call test endpoint
      const response = await fetch('/api/creator/ai-personality/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personality,
          messages: [...messages, userMessage],
        }),
      });

      const data = await response.json();
      const aiMessage: ChatMessage = {
        role: 'assistant',
        content: data.response || "Hey! 💕 I'm still being set up, but I can't wait to chat with you..."
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Test chat error:', error);
      // Fallback response
      const fallback: ChatMessage = {
        role: 'assistant',
        content: `Hey there! 💕 This is a preview of how ${personality.persona_name || 'I'} will respond. Save to test the full AI chat!`
      };
      setMessages(prev => [...prev, fallback]);
    } finally {
      setIsLoading(false);
    }
  };

  const resetChat = () => {
    setMessages([]);
  };

  // Summary sections
  const getSummarySection = (title: string, items: string[], step: number) => (
    <div className="bg-zinc-900 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium text-white">{title}</h4>
        <button
          onClick={() => onEdit(step)}
          className="text-xs text-purple-400 hover:text-purple-300"
        >
          Edit →
        </button>
      </div>
      <p className="text-sm text-gray-400">
        {items.filter(Boolean).join(', ') || 'Not configured'}
      </p>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Character Summary */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span>📋</span> Character Summary
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Identity */}
          <div className="bg-zinc-900 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-white">Identity</h4>
              <button onClick={() => onEdit(1)} className="text-xs text-purple-400 hover:text-purple-300">
                Edit →
              </button>
            </div>
            <div className="text-sm text-gray-400 space-y-1">
              <p><span className="text-white">{personality.persona_name || 'Unnamed'}</span>, {personality.age} years old</p>
              <p>{personality.hair_color} hair, {personality.eye_color} eyes</p>
              <p>{BODY_TYPES.find(b => b.id === personality.body_type)?.label || personality.body_type} build</p>
              <p>Vibes: {personality.style_vibes.join(', ') || 'None'}</p>
            </div>
          </div>

          {/* Personality */}
          {getSummarySection(
            'Personality',
            personality.personality_traits.map(t =>
              PERSONALITY_TRAITS.find(p => p.id === t)?.label || t
            ),
            2
          )}

          {/* Background */}
          <div className="bg-zinc-900 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-white">Background</h4>
              <button onClick={() => onEdit(3)} className="text-xs text-purple-400 hover:text-purple-300">
                Edit →
              </button>
            </div>
            <div className="text-sm text-gray-400 space-y-1">
              <p>Occupation: <span className="text-white">{personality.occupation || 'Not set'}</span></p>
              <p>Interests: {personality.interests.slice(0, 4).join(', ') || 'None'}</p>
              <p>Music: {personality.music_taste.join(', ') || 'None'}</p>
            </div>
          </div>

          {/* Romantic Style */}
          <div className="bg-zinc-900 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-white">Romantic Style</h4>
              <button onClick={() => onEdit(4)} className="text-xs text-purple-400 hover:text-purple-300">
                Edit →
              </button>
            </div>
            <div className="text-sm text-gray-400 space-y-1">
              <p>Flirting: {personality.flirting_style.map(s =>
                FLIRTING_STYLES.find(f => f.id === s)?.label || s
              ).join(', ') || 'Not set'}</p>
              <p>Dynamic: <span className="text-white capitalize">{personality.dynamic}</span></p>
              <p>Vibe: {VIBES_CREATES.find(v => v.id === personality.vibe_creates)?.label || personality.vibe_creates}</p>
            </div>
          </div>

          {/* Voice */}
          <div className="bg-zinc-900 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-white">Voice & Speech</h4>
              <button onClick={() => onEdit(5)} className="text-xs text-purple-400 hover:text-purple-300">
                Edit →
              </button>
            </div>
            <div className="text-sm text-gray-400 space-y-1">
              <p>Emojis: <span className="text-white capitalize">{personality.emoji_usage}</span></p>
              <p>Length: <span className="text-white capitalize">{personality.response_length}</span></p>
              <p>Accent: <span className="text-white capitalize">{personality.accent_flavor}</span></p>
            </div>
          </div>

          {/* Behavior */}
          <div className="bg-zinc-900 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-white">Behavior</h4>
              <button onClick={() => onEdit(6)} className="text-xs text-purple-400 hover:text-purple-300">
                Edit →
              </button>
            </div>
            <div className="text-sm text-gray-400 space-y-1">
              <p>Loves: {personality.topics_loves.slice(0, 3).join(', ') || 'Not set'}</p>
              <p>When heated: {WHEN_HEATED.find(w => w.id === personality.when_heated)?.label || 'Not set'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Test Chat */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <span>💬</span> Test Chat
          </h3>
          {messages.length > 0 && (
            <button
              onClick={resetChat}
              className="text-sm text-gray-400 hover:text-white"
            >
              Reset Chat
            </button>
          )}
        </div>

        <div className="bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden">
          {/* Chat Header */}
          <div className="bg-white/5 px-4 py-3 border-b border-white/10 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center font-medium">
              {personality.persona_name?.charAt(0) || '?'}
            </div>
            <div>
              <div className="font-medium">{personality.persona_name || 'Your AI'}</div>
              <div className="text-xs text-green-400">● Online - Test Mode</div>
            </div>
          </div>

          {/* Messages */}
          <div className="h-80 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                <p className="mb-2">Send a message to test your AI persona!</p>
                <p className="text-xs">Try: &quot;Hey&quot;, &quot;You look amazing&quot;, or something flirty 😏</p>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                    msg.role === 'user'
                      ? 'bg-purple-500 text-white'
                      : 'bg-white/10 text-white'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white/10 rounded-2xl px-4 py-2 text-gray-400">
                  <span className="animate-pulse">Typing...</span>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-white/10 p-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendTestMessage()}
                placeholder="Type a test message..."
                className="flex-1 px-4 py-2 bg-zinc-800 border border-white/10 rounded-full focus:outline-none focus:border-purple-500 text-white placeholder-gray-500 text-base"
              />
              <button
                onClick={sendTestMessage}
                disabled={!input.trim() || isLoading}
                className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                Send
              </button>
            </div>
          </div>
        </div>

        <p className="text-xs text-gray-500 mt-2 text-center">
          This is a preview. Save your personality to enable full AI chat with your subscribers.
        </p>
      </div>

      {/* Validation Warnings */}
      {(!personality.persona_name || personality.personality_traits.length === 0) && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
          <h4 className="font-medium text-yellow-400 mb-2">⚠️ Missing Required Fields</h4>
          <ul className="text-sm text-yellow-300/80 space-y-1">
            {!personality.persona_name && <li>• Persona name is required (Step 1)</li>}
            {personality.personality_traits.length === 0 && <li>• Select at least one personality trait (Step 2)</li>}
            {personality.flirting_style.length === 0 && <li>• Select a flirting style (Step 4)</li>}
          </ul>
        </div>
      )}

      {/* Ready Message */}
      {personality.persona_name && personality.personality_traits.length > 0 && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-center">
          <div className="text-2xl mb-2">✨</div>
          <h4 className="font-medium text-green-400 mb-1">
            {personality.persona_name} is ready!
          </h4>
          <p className="text-sm text-green-300/80">
            Click &quot;Save & Activate&quot; to enable AI chat with this personality.
          </p>
        </div>
      )}
    </div>
  );
}
