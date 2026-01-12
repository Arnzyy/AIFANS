-- Add model_id to posts table to link posts to specific models
-- This allows posts to be associated with AI models rather than just creators

-- Add model_id column
ALTER TABLE posts ADD COLUMN IF NOT EXISTS model_id UUID REFERENCES creator_models(id) ON DELETE SET NULL;

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_posts_model_id ON posts(model_id);

-- Comment
COMMENT ON COLUMN posts.model_id IS 'Links post to a specific creator model (AI persona)';
