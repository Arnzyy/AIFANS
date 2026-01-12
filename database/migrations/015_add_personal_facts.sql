-- ============================================
-- ADD PERSONAL_FACTS COLUMN TO USER_MEMORY
-- Stores personal details users share (shoe size, job, pets, etc.)
-- ============================================

-- Add personal_facts column to user_memory table
ALTER TABLE user_memory
ADD COLUMN IF NOT EXISTS personal_facts TEXT[] DEFAULT '{}';

-- Comment for documentation
COMMENT ON COLUMN user_memory.personal_facts IS 'Personal details user shared: shoe size, job, pets, favorites, etc.';
