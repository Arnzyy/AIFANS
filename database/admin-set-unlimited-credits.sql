-- Give billyarnold@gmail.com unlimited credits (999999999)
-- Run this in Supabase SQL Editor

-- First, find the user ID for billyarnold@gmail.com
DO $$
DECLARE
    target_user_id UUID;
BEGIN
    -- Get user ID from auth.users
    SELECT id INTO target_user_id
    FROM auth.users
    WHERE email = 'billyarnold@gmail.com';

    IF target_user_id IS NULL THEN
        RAISE EXCEPTION 'User billyarnold@gmail.com not found';
    END IF;

    -- Update or insert credit balance
    INSERT INTO credit_balances (user_id, balance, lifetime_purchased)
    VALUES (target_user_id, 999999999, 999999999)
    ON CONFLICT (user_id)
    DO UPDATE SET
        balance = 999999999,
        lifetime_purchased = credit_balances.lifetime_purchased + 999999999,
        updated_at = NOW();

    RAISE NOTICE 'Successfully set unlimited credits for user %', target_user_id;
END $$;
