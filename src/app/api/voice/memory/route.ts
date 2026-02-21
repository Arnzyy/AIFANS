// ===========================================
// VOICE MEMORY API
// Provides memory context to voice server
// Saves voice transcripts to chat_messages
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { MemoryService } from '@/lib/ai/enhanced-chat/memory-service';
import {
  getRelationshipStage,
  getStagePromptInstructions,
  incrementMessageCount,
} from '@/lib/ai/relationship-stage';

// ===========================================
// GET - Retrieve memories for voice session
// ===========================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const personaId = searchParams.get('personaId');
    const creatorId = searchParams.get('creatorId');

    if (!userId || !personaId || !creatorId) {
      return NextResponse.json(
        { error: 'Missing userId, personaId, or creatorId' },
        { status: 400 }
      );
    }

    // Create Supabase client with service role for server access
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Create memory service
    const memoryService = new MemoryService(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get relationship stage
    const stage = await getRelationshipStage(supabase, userId, creatorId);
    const stagePrompt = getStagePromptInstructions(stage);

    // Get relevant memories (using empty message for general retrieval)
    const memories = await memoryService.getRelevantMemories(
      userId,
      personaId,
      '', // No current message for initial fetch
      0,  // Message count not critical for initial fetch
      stage
    );

    // Format memories for prompt
    const memoryContext = memoryService.formatMemoriesForPrompt(memories);

    // Get or create conversation
    let conversationId: string | null = null;

    // Find existing conversation
    const { data: existingConv } = await supabase
      .from('conversations')
      .select('id')
      .or(
        `and(participant1_id.eq.${userId},participant2_id.eq.${creatorId}),` +
        `and(participant1_id.eq.${creatorId},participant2_id.eq.${userId})`
      )
      .maybeSingle();

    if (existingConv) {
      conversationId = existingConv.id;
    } else {
      // Create new conversation
      const { data: newConv } = await supabase
        .from('conversations')
        .insert({
          participant1_id: userId,
          participant2_id: creatorId,
        })
        .select('id')
        .single();

      conversationId = newConv?.id || null;
    }

    // Get recent chat history (last 10 messages for voice context)
    let recentHistory: Array<{ role: string; content: string }> = [];

    if (conversationId) {
      const { data: messages } = await supabase
        .from('chat_messages')
        .select('role, content')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (messages) {
        recentHistory = messages.reverse().map((m: any) => ({
          role: m.role,
          content: m.content,
        }));
      }
    }

    return NextResponse.json({
      memories: memoryContext,
      relationshipStage: stage,
      stagePrompt,
      recentHistory,
      conversationId,
    });
  } catch (error) {
    console.error('[VoiceMemory] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve memory context' },
      { status: 500 }
    );
  }
}

// ===========================================
// POST - Save voice transcript to chat_messages
// ===========================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, creatorId, personaId, conversationId, role, content, sessionId } = body;

    if (!userId || !creatorId || !role || !content) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create Supabase client with service role
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let convId = conversationId;

    // If no conversation ID, get or create one
    if (!convId) {
      const { data: existingConv } = await supabase
        .from('conversations')
        .select('id')
        .or(
          `and(participant1_id.eq.${userId},participant2_id.eq.${creatorId}),` +
          `and(participant1_id.eq.${creatorId},participant2_id.eq.${userId})`
        )
        .maybeSingle();

      if (existingConv) {
        convId = existingConv.id;
      } else {
        const { data: newConv } = await supabase
          .from('conversations')
          .insert({
            participant1_id: userId,
            participant2_id: creatorId,
          })
          .select('id')
          .single();

        convId = newConv?.id;
      }
    }

    if (!convId) {
      return NextResponse.json(
        { error: 'Failed to get or create conversation' },
        { status: 500 }
      );
    }

    // Save message to chat_messages (same as text chat)
    const { error: insertError } = await supabase
      .from('chat_messages')
      .insert({
        conversation_id: convId,
        creator_id: creatorId,
        subscriber_id: userId,
        role,
        content,
      });

    if (insertError) {
      console.error('[VoiceMemory] Insert error:', insertError);
      return NextResponse.json(
        { error: 'Failed to save message' },
        { status: 500 }
      );
    }

    // Update conversation timestamp
    await supabase
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', convId);

    // Increment message count for relationship tracking (only for user messages)
    if (role === 'user') {
      await incrementMessageCount(supabase, userId, creatorId);
    }

    // Extract and save memories from user messages (async, don't block response)
    if (role === 'user' && personaId) {
      extractAndSaveMemories(userId, personaId, content).catch((err) => {
        console.error('[VoiceMemory] Memory extraction error:', err);
      });
    }

    return NextResponse.json({
      success: true,
      conversationId: convId,
    });
  } catch (error) {
    console.error('[VoiceMemory] POST error:', error);
    return NextResponse.json(
      { error: 'Failed to save transcript' },
      { status: 500 }
    );
  }
}

// ===========================================
// MEMORY EXTRACTION HELPER
// ===========================================

async function extractAndSaveMemories(
  userId: string,
  personaId: string,
  content: string
): Promise<void> {
  const memoryService = new MemoryService(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Extract memories from the message
  const extractedMemories = memoryService.extractMemoriesFromMessage(content);

  // Save each extracted memory
  for (const memory of extractedMemories) {
    await memoryService.saveMemory(
      userId,
      personaId,
      memory.category,
      memory.fact,
      'user_stated'
    );
  }
}
