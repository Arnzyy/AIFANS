-- Add simpler columns for posts that the app expects
-- This allows storing media URLs as a JSON array directly on posts

-- Add text_content column (maps to content in original schema)
ALTER TABLE posts ADD COLUMN IF NOT EXISTS text_content TEXT;

-- Add media_urls column as a JSON array
ALTER TABLE posts ADD COLUMN IF NOT EXISTS media_urls JSONB DEFAULT '[]'::jsonb;

-- Add scheduled_at column (maps to scheduled_for)
ALTER TABLE posts ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;

-- Add is_ppv column for easier querying
ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_ppv BOOLEAN DEFAULT FALSE;

-- Add comment counts columns if missing
ALTER TABLE posts ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS comments_count INTEGER DEFAULT 0;

-- Create index for creator posts
CREATE INDEX IF NOT EXISTS idx_posts_creator_id ON posts(creator_id);
CREATE INDEX IF NOT EXISTS idx_posts_is_published ON posts(is_published);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
