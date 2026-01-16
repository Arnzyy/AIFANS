// ===========================================
// SMART MEMORY SERVICE
// Contextual memory injection based on conversation
// ===========================================

import { SupabaseClient } from '@supabase/supabase-js';

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
// MEMORY SERVICE
// ===========================================

export class EnhancedMemoryService {
  constructor(private supabase: SupabaseClient) {}

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
  // ===========================================

  async getRelevantMemories(
    userId: string,
    personaId: string,
    currentMessage: string,
    messageCount: number
  ): Promise<UserMemory[]> {
    const allMemories = await this.getAllMemories(userId, personaId);

    if (allMemories.length === 0) {
      return [];
    }

    const messageLower = currentMessage.toLowerCase();
    const relevant: UserMemory[] = [];

    // Always include name if we have it
    const nameMemory = allMemories.find(m => m.category === 'name');
    if (nameMemory) {
      relevant.push(nameMemory);
    }

    // Check for category relevance based on keywords
    for (const memory of allMemories) {
      if (memory.category === 'name') continue; // Already added

      const keywords = CATEGORY_KEYWORDS[memory.category] || [];
      const isRelevant = keywords.some(keyword => messageLower.includes(keyword));

      if (isRelevant) {
        relevant.push(memory);
      }
    }

    // In early messages (< 5), include recent facts to establish familiarity
    if (messageCount < 5) {
      const recentMemories = allMemories
        .filter(m => m.recency === 'recent' && !relevant.includes(m))
        .slice(0, 2);
      relevant.push(...recentMemories);
    }

    // Include high-confidence, frequently mentioned facts
    const importantMemories = allMemories
      .filter(m => m.mentionCount >= 3 && m.confidence >= 0.8 && !relevant.includes(m))
      .slice(0, 2);
    relevant.push(...importantMemories);

    // Limit to prevent context bloat
    return relevant.slice(0, 8);
  }

  // ===========================================
  // FORMAT MEMORIES FOR PROMPT INJECTION
  // ===========================================

  formatMemoriesForPrompt(memories: UserMemory[]): string {
    if (memories.length === 0) {
      return 'No memory context available yet. This may be a new user.';
    }

    // Group by category for cleaner presentation
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
        lines.push(`- ${facts[0]}`);
      } else {
        lines.push(`- ${category}: ${facts.join(', ')}`);
      }
    }

    return lines.join('\n');
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
    source: 'user_stated' | 'inferred' = 'user_stated'
  ): Promise<UserMemory | null> {
    const now = new Date();

    // Check for existing memory in same category
    const { data: existing } = await this.supabase
      .from('user_memories_v2')
      .select('*')
      .eq('user_id', userId)
      .eq('persona_id', personaId)
      .eq('category', category)
      .single();

    if (existing) {
      // Update existing memory
      const { data, error } = await this.supabase
        .from('user_memories_v2')
        .update({
          fact,
          source,
          recency: 'recent',
          last_mentioned: now.toISOString(),
          mention_count: existing.mention_count + 1,
          confidence: source === 'user_stated' ? 1.0 : Math.min(existing.confidence + 0.1, 1.0),
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
      if (match && match[1] && match[1].length > 1 && match[1].length < 20) {
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
      source: data.source,
      recency: data.recency,
      lastMentioned: new Date(data.last_mentioned),
      mentionCount: data.mention_count,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }
}
