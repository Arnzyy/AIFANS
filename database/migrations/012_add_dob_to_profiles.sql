-- Add date_of_birth field to profiles table
-- Used for birthday wishes from AI chat models

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS date_of_birth DATE;

-- Create index for birthday lookups (for birthday notification cron jobs)
CREATE INDEX IF NOT EXISTS idx_profiles_date_of_birth ON profiles(date_of_birth);

-- Comment
COMMENT ON COLUMN profiles.date_of_birth IS 'User date of birth for AI birthday greetings (only month/day used, year optional)';
