-- Comprehensive Fix for Users Table Population Issue
-- Run this in your Supabase SQL Editor

-- ==================================================
-- STEP 1: Add Missing INSERT Policy for Users Table
-- ==================================================

-- Add INSERT policy that allows service role and triggers to create users
CREATE POLICY "Service role can insert users" ON users
  FOR INSERT WITH CHECK (true);

-- Allow system operations (like triggers) to insert users
CREATE POLICY "System can insert users" ON users
  FOR INSERT WITH CHECK (current_user = 'postgres');

-- ==================================================
-- STEP 2: Grant Necessary Permissions to Service Role
-- ==================================================

-- Grant INSERT and UPDATE permissions to service role
GRANT INSERT, UPDATE, SELECT ON users TO service_role;
GRANT INSERT, UPDATE, SELECT ON registration_requests TO service_role;

-- Grant permissions on sequences (for ID generation)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- ==================================================
-- STEP 3: Update Trigger Function with Password Set Handling
-- ==================================================

-- Drop existing trigger and function to recreate properly
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create improved trigger function that handles password_set properly
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_password_set BOOLEAN := false;
  user_full_name TEXT := '';
  user_status TEXT := 'approved';
  user_role TEXT := 'director';
BEGIN
  -- Extract metadata safely
  IF NEW.raw_user_meta_data IS NOT NULL THEN
    user_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', '');
    user_password_set := COALESCE((NEW.raw_user_meta_data->>'password_set')::boolean, false);
  END IF;
  
  -- Log the operation for debugging
  RAISE NOTICE 'Creating user record for %: password_set=%, full_name=%', NEW.email, user_password_set, user_full_name;
  
  -- Insert into users table with proper conflict handling
  INSERT INTO public.users (
    id, 
    email, 
    full_name, 
    password_set, 
    status, 
    role,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id, 
    NEW.email, 
    user_full_name,
    user_password_set,
    user_status,
    user_role,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    password_set = user_password_set,
    full_name = EXCLUDED.full_name,
    status = EXCLUDED.status,
    role = EXCLUDED.role,
    updated_at = NOW();
    
  RAISE NOTICE 'Successfully created/updated user record for %', NEW.email;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to create user record for %: %', NEW.email, SQLERRM;
    RETURN NEW; -- Don't fail the auth user creation
END;
$$ language plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==================================================
-- STEP 4: Add Function to Manually Create User Records
-- ==================================================

-- Create a function that can be called manually to ensure user records exist
CREATE OR REPLACE FUNCTION public.ensure_user_record(
  user_id UUID,
  user_email TEXT,
  user_full_name TEXT DEFAULT '',
  user_password_set BOOLEAN DEFAULT false
)
RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO public.users (
    id, 
    email, 
    full_name, 
    password_set, 
    status, 
    role,
    created_at,
    updated_at
  )
  VALUES (
    user_id, 
    user_email, 
    user_full_name,
    user_password_set,
    'approved',
    'director',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    password_set = user_password_set,
    full_name = EXCLUDED.full_name,
    updated_at = NOW();
    
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to ensure user record for %: %', user_email, SQLERRM;
    RETURN false;
END;
$$ language plpgsql SECURITY DEFINER;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION public.ensure_user_record TO service_role;

-- ==================================================
-- STEP 5: Fix Any Existing Approved Users Missing Records
-- ==================================================

-- Find approved registrations that don't have corresponding user records
-- and create them (if the auth users exist)
DO $$
DECLARE
  reg_record RECORD;
  auth_user_record RECORD;
BEGIN
  FOR reg_record IN 
    SELECT rr.* 
    FROM registration_requests rr
    LEFT JOIN users u ON u.email = rr.email
    WHERE rr.status = 'approved' AND u.id IS NULL
  LOOP
    -- Check if auth user exists for this email
    SELECT * INTO auth_user_record
    FROM auth.users
    WHERE email = reg_record.email;
    
    IF FOUND THEN
      -- Create the user record
      PERFORM public.ensure_user_record(
        auth_user_record.id,
        reg_record.email,
        reg_record.full_name,
        false  -- password_set = false for approved registrations
      );
      
      RAISE NOTICE 'Fixed missing user record for approved registration: %', reg_record.email;
    END IF;
  END LOOP;
END;
$$;

-- ==================================================
-- STEP 6: Add Indexes for Better Performance
-- ==================================================

-- Add index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email_status ON users(email, status);
CREATE INDEX IF NOT EXISTS idx_users_password_set_status ON users(password_set, status);

-- ==================================================
-- VERIFICATION
-- ==================================================

-- Display current user count and status distribution
DO $$
BEGIN
  RAISE NOTICE '=== USERS TABLE STATUS ===';
  RAISE NOTICE 'Total users: %', (SELECT COUNT(*) FROM users);
  RAISE NOTICE 'Approved users: %', (SELECT COUNT(*) FROM users WHERE status = 'approved');
  RAISE NOTICE 'Users needing password setup: %', (SELECT COUNT(*) FROM users WHERE password_set = false);
  RAISE NOTICE 'Approved registrations: %', (SELECT COUNT(*) FROM registration_requests WHERE status = 'approved');
END;
$$;