-- ===========================================
-- LYRA CONTENT METADATA SCHEMA
-- For AI to reference creator content in chat
-- ===========================================

-- Content metadata table
CREATE TABLE IF NOT EXISTS content_metadata (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_type VARCHAR(10) NOT NULL CHECK (content_type IN ('image', 'video')),
  file_url TEXT NOT NULL,
  
  -- AI-generated analysis
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  outfit_type VARCHAR(30),
  mood VARCHAR(30),
  colors TEXT[] DEFAULT '{}',
  pose VARCHAR(100),
  setting VARCHAR(50),
  
  -- For search/matching
  searchable_text TEXT,
  
  -- PPV info
  is_ppv BOOLEAN DEFAULT false,
  price DECIMAL(10,2),
  
  -- Meta
  created_at TIMESTAMPTZ DEFAULT NOW(),
  analyzed_at TIMESTAMPTZ,
  
  -- Indexing
  CONSTRAINT valid_price CHECK (price IS NULL OR price >= 0)
);

-- Indexes for fast lookup
CREATE INDEX idx_content_metadata_creator ON content_metadata(creator_id);
CREATE INDEX idx_content_metadata_type ON content_metadata(content_type);
CREATE INDEX idx_content_metadata_created ON content_metadata(created_at DESC);
CREATE INDEX idx_content_metadata_searchable ON content_metadata USING gin(to_tsvector('english', searchable_text));

-- RLS
ALTER TABLE content_metadata ENABLE ROW LEVEL SECURITY;

-- Creators can manage their own content
CREATE POLICY "Creators manage own content metadata"
  ON content_metadata FOR ALL
  USING (auth.uid() = creator_id);

-- Subscribers can view content metadata (for chat context)
CREATE POLICY "Subscribers can view content metadata"
  ON content_metadata FOR SELECT
  USING (true);

-- Function to search content by text
CREATE OR REPLACE FUNCTION search_content_metadata(
  p_creator_id UUID,
  p_search_text TEXT,
  p_limit INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  description TEXT,
  tags TEXT[],
  outfit_type VARCHAR,
  mood VARCHAR,
  is_ppv BOOLEAN,
  price DECIMAL,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cm.id,
    cm.description,
    cm.tags,
    cm.outfit_type,
    cm.mood,
    cm.is_ppv,
    cm.price,
    ts_rank(to_tsvector('english', cm.searchable_text), plainto_tsquery('english', p_search_text)) as rank
  FROM content_metadata cm
  WHERE cm.creator_id = p_creator_id
    AND to_tsvector('english', cm.searchable_text) @@ plainto_tsquery('english', p_search_text)
  ORDER BY rank DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;
