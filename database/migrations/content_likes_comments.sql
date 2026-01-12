-- ===========================================
-- Content Likes Table
-- ===========================================

CREATE TABLE IF NOT EXISTS content_likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content_id UUID NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(content_id, user_id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_content_likes_content_id ON content_likes(content_id);
CREATE INDEX IF NOT EXISTS idx_content_likes_user_id ON content_likes(user_id);

-- ===========================================
-- Content Comments Table
-- ===========================================

CREATE TABLE IF NOT EXISTS content_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content_id UUID NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_content_comments_content_id ON content_comments(content_id);
CREATE INDEX IF NOT EXISTS idx_content_comments_user_id ON content_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_content_comments_created_at ON content_comments(created_at);

-- ===========================================
-- Add like_count and comment_count to content_items
-- ===========================================

ALTER TABLE content_items
ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS comment_count INTEGER DEFAULT 0;

-- ===========================================
-- RPC Functions for incrementing/decrementing counts
-- ===========================================

CREATE OR REPLACE FUNCTION increment_content_likes(content_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE content_items
    SET like_count = COALESCE(like_count, 0) + 1
    WHERE id = content_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION decrement_content_likes(content_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE content_items
    SET like_count = GREATEST(COALESCE(like_count, 0) - 1, 0)
    WHERE id = content_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_content_comments(content_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE content_items
    SET comment_count = COALESCE(comment_count, 0) + 1
    WHERE id = content_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION decrement_content_comments(content_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE content_items
    SET comment_count = GREATEST(COALESCE(comment_count, 0) - 1, 0)
    WHERE id = content_id;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- Triggers to auto-update counts
-- ===========================================

CREATE OR REPLACE FUNCTION update_content_like_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE content_items SET like_count = COALESCE(like_count, 0) + 1 WHERE id = NEW.content_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE content_items SET like_count = GREATEST(COALESCE(like_count, 0) - 1, 0) WHERE id = OLD.content_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS content_likes_count_trigger ON content_likes;
CREATE TRIGGER content_likes_count_trigger
AFTER INSERT OR DELETE ON content_likes
FOR EACH ROW EXECUTE FUNCTION update_content_like_count();

CREATE OR REPLACE FUNCTION update_content_comment_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE content_items SET comment_count = COALESCE(comment_count, 0) + 1 WHERE id = NEW.content_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE content_items SET comment_count = GREATEST(COALESCE(comment_count, 0) - 1, 0) WHERE id = OLD.content_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS content_comments_count_trigger ON content_comments;
CREATE TRIGGER content_comments_count_trigger
AFTER INSERT OR DELETE ON content_comments
FOR EACH ROW EXECUTE FUNCTION update_content_comment_count();

-- ===========================================
-- RLS Policies
-- ===========================================

ALTER TABLE content_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_comments ENABLE ROW LEVEL SECURITY;

-- Anyone can view likes
CREATE POLICY "Anyone can view content likes" ON content_likes
    FOR SELECT USING (true);

-- Users can like content
CREATE POLICY "Users can like content" ON content_likes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can unlike their own likes
CREATE POLICY "Users can unlike content" ON content_likes
    FOR DELETE USING (auth.uid() = user_id);

-- Anyone can view comments
CREATE POLICY "Anyone can view content comments" ON content_comments
    FOR SELECT USING (true);

-- Users can comment
CREATE POLICY "Users can comment on content" ON content_comments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can delete their own comments
CREATE POLICY "Users can delete own comments" ON content_comments
    FOR DELETE USING (auth.uid() = user_id);
