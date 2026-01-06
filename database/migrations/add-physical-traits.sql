-- Add physical_traits field to ai_personalities table
-- This field stores optional physical and style trait configurations

ALTER TABLE ai_personalities
ADD COLUMN IF NOT EXISTS physical_traits JSONB DEFAULT '{}';

-- Add a comment explaining the field
COMMENT ON COLUMN ai_personalities.physical_traits IS 'Optional physical and style traits (body type, height, fashion preferences, etc.) stored as JSONB';
