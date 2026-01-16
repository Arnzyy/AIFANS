-- Reset password for admin@joinlyra.com to 'Password'
-- Run this in Supabase SQL Editor

UPDATE auth.users
SET
  encrypted_password = crypt('Password', gen_salt('bf')),
  updated_at = now()
WHERE email = 'admin@joinlyra.com';

-- If user doesn't exist, create them:
-- INSERT INTO auth.users (
--   instance_id,
--   id,
--   aud,
--   role,
--   email,
--   encrypted_password,
--   email_confirmed_at,
--   created_at,
--   updated_at
-- ) VALUES (
--   '00000000-0000-0000-0000-000000000000',
--   gen_random_uuid(),
--   'authenticated',
--   'authenticated',
--   'admin@joinlyra.com',
--   crypt('Password', gen_salt('bf')),
--   now(),
--   now(),
--   now()
-- );
