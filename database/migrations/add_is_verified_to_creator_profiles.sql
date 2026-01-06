-- Add is_verified column to creator_profiles table
-- This column controls access to the creator dashboard in the hybrid system

ALTER TABLE creator_profiles
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_creator_profiles_verified
ON creator_profiles(is_verified);

-- Update existing creator profiles to be verified (for backwards compatibility)
-- Comment out the next line if you want to manually verify each creator
UPDATE creator_profiles SET is_verified = TRUE WHERE is_verified IS NULL OR is_verified = FALSE;

COMMENT ON COLUMN creator_profiles.is_verified IS 'Whether the creator account is verified and can access creator dashboard features';
