-- Add timezone field to profiles table
-- Users can set their timezone in settings for personalized greetings

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'UTC';

-- Create index for timezone lookups (optional, for analytics)
CREATE INDEX IF NOT EXISTS idx_profiles_timezone ON profiles(timezone);

-- Comment
COMMENT ON COLUMN profiles.timezone IS 'User timezone for personalized time-based greetings (e.g., America/New_York, Europe/London)';
