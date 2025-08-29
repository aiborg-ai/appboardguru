-- FIX RLS POLICIES FOR APPBOARDGURU
-- Run this entire script in Supabase SQL Editor to fix 406 errors

-- 1. Enable RLS on tables if not already enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE registration_requests ENABLE ROW LEVEL SECURITY;

-- 2. Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can view all users" ON users;
DROP POLICY IF EXISTS "Users can update own record" ON users;
DROP POLICY IF EXISTS "Users can insert own record" ON users;
DROP POLICY IF EXISTS "Enable read access for all users" ON users;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON users;
DROP POLICY IF EXISTS "Enable update for users based on id" ON users;

DROP POLICY IF EXISTS "Anyone can view registration requests" ON registration_requests;
DROP POLICY IF EXISTS "Anyone can create registration requests" ON registration_requests;
DROP POLICY IF EXISTS "Service role can update registration requests" ON registration_requests;
DROP POLICY IF EXISTS "Enable read access for all users" ON registration_requests;
DROP POLICY IF EXISTS "Enable insert for all users" ON registration_requests;
DROP POLICY IF EXISTS "Enable update for all users" ON registration_requests;

-- 3. Create new comprehensive policies for users table
-- Allow anyone (including anon) to read users - needed for registration checks
CREATE POLICY "Enable read for all" ON users
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Allow authenticated users to insert their own record
CREATE POLICY "Enable insert for authenticated" ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Allow users to update their own record
CREATE POLICY "Enable update own record" ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 4. Create new comprehensive policies for registration_requests table
-- Allow anyone to view registration requests (needed for approval links)
CREATE POLICY "Enable read for all" ON registration_requests
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Allow anyone to create registration requests
CREATE POLICY "Enable insert for all" ON registration_requests
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Allow anyone to update registration requests (for approval process)
CREATE POLICY "Enable update for all" ON registration_requests
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 5. Verify RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('users', 'registration_requests');

-- 6. List all policies to confirm they're created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('users', 'registration_requests')
ORDER BY tablename, policyname;