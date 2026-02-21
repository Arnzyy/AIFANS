// ===========================================
// SMART MEMORY SERVICE
// Contextual memory injection based on conversation
// Enhanced with emotional weighting and relationship-based limits
// ===========================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { RelationshipStage, getMemoryLimitByStage } from '../relationship-stage';

// ===========================================
// TYPE DEFINITIONS
// ===========================================

export interface UserMemory {
  id: string;
  userId: string;
  personaId: string;
  category: MemoryCategory;
  fact: string;
  confidence: number; // 0-1, how confident we are this is accurate
  emotionalWeight: number; // 1-10, importance score for retrieval
  source: 'user_stated' | 'inferred' | 'corrected';
  recency: 'recent' | 'established' | 'old';
  lastMentioned: Date;
  mentionCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export type MemoryCategory =
  | 'name'
  | 'age'
  | 'location'
  | 'occupation'
  | 'interests'
  | 'physical'
  | 'pets'
  | 'favorites'
  | 'relationship'
  | 'goals'
  | 'routine'
  | 'preferences'
  | 'running_joke'
  | 'recent_event'
  | 'family'
  | 'education';

// Category keywords for relevance matching
const CATEGORY_KEYWORDS: Record<MemoryCategory, string[]> = {
  name: ['name', 'call me', 'i\'m', 'i am'],
  age: ['age', 'old', 'birthday', 'born'],
  location: ['live', 'from', 'city', 'country', 'moved', 'weather'],
  occupation: ['work', 'job', 'career', 'office', 'boss', 'colleague', 'meeting'],
  interests: ['hobby', 'hobbies', 'like', 'love', 'enjoy', 'into', 'fan'],
  physical: ['tall', 'height', 'weight', 'hair', 'eyes', 'fit', 'gym', 'body'],
  pets: ['dog', 'cat', 'pet', 'animal', 'puppy', 'kitten'],
  favorites: ['favorite', 'favourite', 'best', 'love', 'prefer'],
  relationship: ['single', 'dating', 'married', 'girlfriend', 'boyfriend', 'wife', 'husband'],
  goals: ['goal', 'dream', 'want to', 'planning', 'hope', 'someday'],
  routine: ['morning', 'night', 'daily', 'routine', 'schedule', 'usually'],
  preferences: ['prefer', 'like when', 'don\'t like', 'hate when'],
  running_joke: ['remember when', 'that time', 'joke', 'funny'],
  recent_event: ['today', 'yesterday', 'weekend', 'last night', 'earlier'],
  family: ['mom', 'dad', 'brother', 'sister', 'parent', 'family'],
  education: ['school', 'college', 'university', 'degree', 'study', 'studied'],
};

// ===========================================
// MEMORY SCORING WEIGHTS
// Based on spec: emotional_weight * recency_multiplier * frequency_boost
// ===========================================

const RECENCY_MULTIPLIERS = {
  recent: 1.5,      // Mentioned in last 7 days
  established: 1.0, // 7-30 days
  old: 0.5,         // 30+ days
};

const FREQUENCY_BOOST = {
  threshold: 3, // Memories mentioned 3+ times get boost
  multiplier: 1.2,
};

// Categories that should always be prioritized
const PRIORITY_CATEGORIES: MemoryCategory[] = ['name', 'recent_event', 'running_joke'];

// ===========================================
// MEMORY SERVICE
// ===========================================

export class MemoryService {
  private supabase: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  // ===========================================
  // GET ALL MEMORIES FOR USER/PERSONA
  // ===========================================

  async getAllMemories(userId: string, personaId: string): Promise<UserMemory[]> {
    const { data, error } = await this.supabase
      .from('user_memories_v2')
      .select('*')
      .eq('user_id', userId)
      .eq('persona_id', personaId)
      .order('mention_count', { ascending: false });

    if (error) {
      console.error('Error fetching memories:', error);
      return [];
    }

    return (data || []).map(this.deserializeMemory);
  }

  // ===========================================
  // GET RELEVANT MEMORIES FOR CONTEXT
  // Enhanced with emotional weighting and stage-based limits
  // ===========================================

  async getRelevantMemories(
    userId: string,
    personaId: string,
    currentMessage: string,
    messageCount: number,
    relationshipStage: RelationshipStage = 'new'
  ): Promise<UserMemory[]> {
    // Apply lazy decay evaluation first
    await this.applyLazyDecay(userId, personaId);

    const allMemories = await this.getAllMemories(userId, personaId);

    if (allMemories.length === 0) {
      return [];
    }

    const messageLower = currentMessage.toLowerCase();

    // Calculate score for each memory
    const scoredMemories = allMemories.map(memory => ({
      memory,
      score: this.calculateMemoryScore(memory, messageLower, messageCount),
    }));

    // Sort by score descending
    scoredMemories.sort((a, b) => b.score - a.score);

    // Get stage-based limit
    const limit = getMemoryLimitByStage(relationshipStage);

    // Always include name if available (doesn't count against limit)
    const nameMemory = scoredMemories.find(sm => sm.memory.category === 'name');
    const others = scoredMemories.filter(sm => sm.memory.category !== 'name');

    const result: UserMemory[] = [];
    if (nameMemory) {
      result.push(nameMemory.memory);
    }

    // Add top-scored memories up to limit
    for (const { memory } of others) {
      if (result.length >= limit) break;
      result.push(memory);
    }

    console.log('[Memory] Retrieved memories:', {
      userId,
      stage: relationshipStage,
      limit,
      total: allMemories.length,
      retrieved: result.length,
      topScores: scoredMemories.slice(0, 5).map(sm => ({
        category: sm.memory.category,
        score: sm.score.toFixed(2),
      })),
    });

    return result;
  }

  /**
   * Calculate memory retrieval score
   * Formula: emotional_weight * recency_multiplier * frequency_boost * relevance_boost
   */
  private calculateMemoryScore(
    memory: UserMemory,
    currentMessage: string,
    messageCount: number
  ): number {
    // Base score from emotional weight (1-10)
    let score = memory.emotionalWeight;

    // Apply recency multiplier
    const recencyMultiplier = RECENCY_MULTIPLIERS[memory.recency] || 1.0;
    score *= recencyMultiplier;

    // Apply frequency boost if mentioned 3+ times
    if (memory.mentionCount >= FREQUENCY_BOOST.threshold) {
      score *= FREQUENCY_BOOST.multiplier;
    }

    // Relevance boost: check if current message relates to memory category
    const keywords = CATEGORY_KEYWORDS[memory.category] || [];
    const isRelevantToMessage = keywords.some(kw => currentMessage.includes(kw));
    if (isRelevantToMessage) {
      score *= 2.0; // Double score for relevant memories
    }

    // Priority category boost
    if (PRIORITY_CATEGORIES.includes(memory.category)) {
      score *= 1.3;
    }

    // Early conversation boost for recent memories
    if (messageCount < 5 && memory.recency === 'recent') {
      score *= 1.2;
    }

    return score;
  }

  /**
   * Apply lazy decay evaluation during retrieval
   * Calls database function to update stale memories
   */
  private async applyLazyDecay(userId: string, personaId: string): Promise<void> {
    try {
      const { data, error } = await this.supabase.rpc('apply_memory_decay', {
        p_user_id: userId,
        p_persona_id: personaId,
      });

      if (error) {
        // Non-fatal - RPC might not exist yet in some environments
        console.log('[Memory] Decay function not available:', error.message);
        return;
      }

      if (data && data > 0) {
        console.log('[Memory] Applied decay to', data, 'memories');
      }
    } catch (err) {
      // Silently fail - decay is optimization, not critical
    }
  }

  // ===========================================
  // FORMAT MEMORIES FOR PROMPT INJECTION
  // ===========================================

  /**
   * Format memories for prompt injection
   * @param memories - Array of memories to format
   * @param compressed - If true, use token-efficient compact format
   */
  formatMemoriesForPrompt(memories: UserMemory[], compressed: boolean = false): string {
    if (memories.length === 0) {
      return 'No memory context available yet. This may be a new user.';
    }

    if (compressed) {
      return this.formatCompressed(memories);
    }

    // Standard format: grouped by category
    const grouped: Record<string, string[]> = {};

    for (const memory of memories) {
      const category = this.getCategoryLabel(memory.category);
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(memory.fact);
    }

    const lines: string[] = [];

    for (const [category, facts] of Object.entries(grouped)) {
      if (facts.length === 1) {
        lines.push(`• ${facts[0]}`);
      } else {
        lines.push(`• ${category}: ${facts.join(', ')}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Compressed format for token efficiency
   * Uses shorthand notation: "category:fact|category:fact"
   */
  private formatCompressed(memories: UserMemory[]): string {
    const shortCategories: Record<MemoryCategory, string> = {
      name: 'N',
      age: 'A',
      location: 'L',
      occupation: 'W',
      interests: 'I',
      physical: 'P',
      pets: 'PT',
      favorites: 'F',
      relationship: 'R',
      goals: 'G',
      routine: 'RO',
      preferences: 'PR',
      running_joke: 'J',
      recent_event: 'RE',
      family: 'FA',
      education: 'ED',
    };

    return memories
      .map(m => `${shortCategories[m.category] || m.category}:${m.fact}`)
      .join('|');
  }

  private getCategoryLabel(category: MemoryCategory): string {
    const labels: Record<MemoryCategory, string> = {
      name: 'Name',
      age: 'Age',
      location: 'Location',
      occupation: 'Work',
      interests: 'Interests',
      physical: 'Physical',
      pets: 'Pets',
      favorites: 'Favorites',
      relationship: 'Relationship',
      goals: 'Goals',
      routine: 'Routine',
      preferences: 'Preferences',
      running_joke: 'Running joke',
      recent_event: 'Recent',
      family: 'Family',
      education: 'Education',
    };
    return labels[category] || category;
  }

  // ===========================================
  // SAVE NEW MEMORY
  // ===========================================

  async saveMemory(
    userId: string,
    personaId: string,
    category: MemoryCategory,
    fact: string,
    source: 'user_stated' | 'inferred' = 'user_stated',
    emotionalWeight?: number
  ): Promise<UserMemory | null> {
    const now = new Date();

    // Calculate initial emotional weight if not provided
    const weight = emotionalWeight ?? this.calculateInitialWeight(category, source);

    // Check for existing memory in same category
    const { data: existing } = await this.supabase
      .from('user_memories_v2')
      .select('*')
      .eq('user_id', userId)
      .eq('persona_id', personaId)
      .eq('category', category)
      .single();

    if (existing) {
      // Update existing memory - boost weight slightly when reinforced
      const newWeight = Math.min(10, (existing.emotional_weight || 5) + (source === 'user_stated' ? 1 : 0));

      const { data, error } = await this.supabase
        .from('user_memories_v2')
        .update({
          fact,
          source,
          recency: 'recent',
          last_mentioned: now.toISOString(),
          mention_count: existing.mention_count + 1,
          confidence: source === 'user_stated' ? 1.0 : Math.min(existing.confidence + 0.1, 1.0),
          emotional_weight: newWeight,
          updated_at: now.toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating memory:', error);
        return null;
      }

      return this.deserializeMemory(data);
    }

    // Create new memory
    const { data, error } = await this.supabase
      .from('user_memories_v2')
      .insert({
        user_id: userId,
        persona_id: personaId,
        category,
        fact,
        confidence: source === 'user_stated' ? 1.0 : 0.7,
        emotional_weight: weight,
        source,
        recency: 'recent',
        last_mentioned: now.toISOString(),
        mention_count: 1,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving memory:', error);
      return null;
    }

    return this.deserializeMemory(data);
  }

  /**
   * Calculate initial emotional weight based on category and source
   * Higher weights for identity/relationship facts
   */
  private calculateInitialWeight(category: MemoryCategory, source: string): number {
    // Base weight by category importance
    const categoryWeights: Record<MemoryCategory, number> = {
      name: 9,           // Identity - very important
      running_joke: 8,   // Relationship bonding
      pets: 7,           // Personal attachment
      relationship: 7,   // Personal info
      family: 7,         // Personal info
      goals: 6,          // Aspirations
      favorites: 6,      // Preferences
      occupation: 5,     // Regular info
      interests: 5,      // Regular info
      physical: 5,       // Physical traits
      routine: 4,        // Habits
      preferences: 4,    // General preferences
      location: 4,       // Geography
      age: 4,            // Basic info
      education: 4,      // Background
      recent_event: 3,   // Temporary
    };

    let weight = categoryWeights[category] ?? 5;

    // Boost if user explicitly stated (not inferred)
    if (source === 'user_stated') {
      weight = Math.min(10, weight + 1);
    }

    return weight;
  }

  // ===========================================
  // UPDATE MEMORY RECENCY
  // ===========================================

  async updateRecency(userId: string, personaId: string): Promise<void> {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Update to 'established' if last mentioned more than a week ago
    await this.supabase
      .from('user_memories_v2')
      .update({ recency: 'established' })
      .eq('user_id', userId)
      .eq('persona_id', personaId)
      .eq('recency', 'recent')
      .lt('last_mentioned', oneWeekAgo.toISOString());

    // Update to 'old' if last mentioned more than a month ago
    await this.supabase
      .from('user_memories_v2')
      .update({ recency: 'old' })
      .eq('user_id', userId)
      .eq('persona_id', personaId)
      .eq('recency', 'established')
      .lt('last_mentioned', oneMonthAgo.toISOString());
  }

  // ===========================================
  // MEMORY EXTRACTION FROM MESSAGE
  // ===========================================

  extractMemoriesFromMessage(message: string): Array<{ category: MemoryCategory; fact: string }> {
    const extracted: Array<{ category: MemoryCategory; fact: string }> = [];
    const messageLower = message.toLowerCase();

    // Name extraction
    const namePatterns = [
      /my name is (\w+)/i,
      /i'm (\w+)/i,
      /call me (\w+)/i,
      /name's (\w+)/i,
    ];

    for (const pattern of namePatterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        extracted.push({ category: 'name', fact: `Name is ${match[1]}` });
        break;
      }
    }

    // Age extraction
    const agePatterns = [
      /i'm (\d{2}) years old/i,
      /i am (\d{2})/i,
      /(\d{2}) years old/i,
    ];

    for (const pattern of agePatterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        const age = parseInt(match[1]);
        if (age >= 18 && age <= 100) {
          extracted.push({ category: 'age', fact: `Is ${age} years old` });
          break;
        }
      }
    }

    // Job extraction
    const jobPatterns = [
      /i work as a (.+?)(?:\.|,|$)/i,
      /i'm a (.+?)(?:\.|,|$)/i,
      /my job is (.+?)(?:\.|,|$)/i,
    ];

    for (const pattern of jobPatterns) {
      const match = message.match(pattern);
      if (match && match[1] && match[1].length < 50) {
        extracted.push({ category: 'occupation', fact: `Works as ${match[1].trim()}` });
        break;
      }
    }

    // Pet extraction
    if (messageLower.includes('dog') || messageLower.includes('cat') || messageLower.includes('pet')) {
      const petPatterns = [
        /my (dog|cat|pet)('s| is)? (named |called )?(\w+)/i,
        /(\w+),? my (dog|cat|pet)/i,
      ];

      for (const pattern of petPatterns) {
        const match = message.match(pattern);
        if (match) {
          const petName = match[4] || match[1];
          const petType = match[1] || match[2];
          if (petName && petName.length < 20) {
            extracted.push({ category: 'pets', fact: `Has a ${petType} named ${petName}` });
            break;
          }
        }
      }
    }

    // Gym/fitness extraction
    if (messageLower.includes('gym') || messageLower.includes('workout') || messageLower.includes('lift')) {
      extracted.push({ category: 'routine', fact: 'Works out / goes to the gym' });
    }

    return extracted;
  }

  // ===========================================
  // SERIALIZATION
  // ===========================================

  private deserializeMemory(data: any): UserMemory {
    return {
      id: data.id,
      userId: data.user_id,
      personaId: data.persona_id,
      category: data.category,
      fact: data.fact,
      confidence: data.confidence,
      emotionalWeight: data.emotional_weight ?? 5, // Default to 5 if not set
      source: data.source,
      recency: data.recency,
      lastMentioned: new Date(data.last_mentioned),
      mentionCount: data.mention_count,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }
}

// ===========================================
// SINGLETON EXPORT
// ===========================================

let memoryService: MemoryService | null = null;

export function getMemoryService(
  supabaseUrl?: string,
  supabaseKey?: string
): MemoryService {
  if (!memoryService) {
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials required for first initialization');
    }
    memoryService = new MemoryService(supabaseUrl, supabaseKey);
  }
  return memoryService;
}
