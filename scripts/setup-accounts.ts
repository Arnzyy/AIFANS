// Run this script with: npx tsx scripts/setup-accounts.ts

import { createClient } from '@supabase/supabase-js';

// Hardcoded for setup - these are public keys
const supabaseUrl = 'https://ctjmilgkefwffpxtpsci.supabase.co';
const supabaseAnonKey = 'sb_publishable_EjFr8IG0bcKO6BNUdv4zxw_lOjxh1-R';

console.log('Using Supabase URL:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createAccounts() {
  console.log('Creating accounts...\n');

  // 1. Create Creator Account
  console.log('1. Creating creator account: billy@gmail.com');
  const { data: creatorAuth, error: creatorError } = await supabase.auth.signUp({
    email: 'billy@gmail.com',
    password: 'Claudia.5',
    options: {
      data: {
        username: 'billy',
        role: 'creator',
      },
    },
  });

  if (creatorError) {
    console.error('Error creating creator:', creatorError.message);
  } else {
    console.log('✓ Creator auth created:', creatorAuth.user?.id);
  }

  // 2. Create Normal User Account
  console.log('\n2. Creating user account: billyarnold@gmail.com');
  const { data: userAuth, error: userError } = await supabase.auth.signUp({
    email: 'billyarnold@gmail.com',
    password: 'Claudia.5',
    options: {
      data: {
        username: 'billyarnold',
        role: 'fan',
      },
    },
  });

  if (userError) {
    console.error('Error creating user:', userError.message);
  } else {
    console.log('✓ User auth created:', userAuth.user?.id);
  }

  console.log('\n-------------------');
  console.log('IMPORTANT: Check your Supabase dashboard for email confirmation settings.');
  console.log('You may need to:');
  console.log('1. Disable email confirmation in Supabase Auth settings, OR');
  console.log('2. Manually confirm the emails in the Supabase dashboard');
  console.log('-------------------\n');

  console.log('After confirming emails, run the SQL below in Supabase SQL Editor to set up creator profile:\n');

  console.log(`
-- Run this SQL in Supabase SQL Editor AFTER the accounts are created and confirmed

-- Update billy's role to creator
UPDATE profiles
SET role = 'creator', display_name = 'Billy'
WHERE username = 'billy';

-- Create creator profile for billy
INSERT INTO creator_profiles (user_id, bio, ai_chat_enabled)
SELECT id, 'AI content creator', true
FROM profiles
WHERE username = 'billy'
ON CONFLICT (user_id) DO NOTHING;

-- Update billyarnold's display name
UPDATE profiles
SET display_name = 'Billy Arnold'
WHERE username = 'billyarnold';

-- Verify
SELECT username, display_name, role FROM profiles WHERE username IN ('billy', 'billyarnold');
  `);
}

createAccounts().catch(console.error);
