# Database Migrations

## Running Migrations

### Option 1: Via Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **SQL Editor** in the left sidebar
4. Copy the contents of the migration file
5. Paste into the SQL Editor and click **Run**

### Option 2: Via Supabase CLI

```bash
supabase db execute --file database/migrations/add_is_verified_to_creator_profiles.sql
```

## Available Migrations

### `add_is_verified_to_creator_profiles.sql`

**Purpose**: Adds the `is_verified` column to the `creator_profiles` table.

**What it does**:
- Adds `is_verified BOOLEAN DEFAULT FALSE` column
- Creates an index for performance
- Sets all existing creators to verified (backwards compatibility)
- Adds column comment for documentation

**When to run**: If you get the error "Could not find the 'is_verified' column" when accessing the creator dashboard.

**Verification**: After running, you should be able to access `/dev/verify` without errors.
