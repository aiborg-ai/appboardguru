-- Fix users table RLS policies
-- This fixes the 406 error when querying users

-- First ensure the users table exists and has proper structure
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255),
  avatar_url TEXT,
  role VARCHAR(50) DEFAULT 'user',
  status VARCHAR(50) DEFAULT 'active',
  password_set BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Users can view other users in same org" ON users;
DROP POLICY IF EXISTS "Public users table select" ON users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;

-- Create comprehensive policies

-- Allow users to view their own profile
CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- Allow users to view other users in their organizations
CREATE POLICY "Users can view users in their organizations"
  ON users FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM organization_members om1
      WHERE om1.user_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM organization_members om2
        WHERE om2.user_id = users.id
        AND om2.organization_id = om1.organization_id
      )
    )
  );

-- Allow users to update their own profile
CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow users to insert their own profile on signup
CREATE POLICY "Users can insert their own profile"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Allow service role full access
CREATE POLICY "Service role has full access to users"
  ON users FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Create or replace function to auto-create user profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url, status, password_set)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url',
    'active',
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for auto-creating user profiles
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant permissions
GRANT ALL ON users TO authenticated;
GRANT ALL ON users TO service_role;

-- Fix organization_members table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  status VARCHAR(50) DEFAULT 'active',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_organization_members_org_id ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_user_id ON organization_members(user_id);

-- Enable RLS for organization_members
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- RLS policies for organization_members
DROP POLICY IF EXISTS "Users can view members of their organizations" ON organization_members;
DROP POLICY IF EXISTS "Organization admins can manage members" ON organization_members;

CREATE POLICY "Users can view members of their organizations"
  ON organization_members FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND (
      user_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM organization_members om
        WHERE om.user_id = auth.uid()
        AND om.organization_id = organization_members.organization_id
      )
    )
  );

CREATE POLICY "Organization admins can manage members"
  ON organization_members FOR ALL
  USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.user_id = auth.uid()
      AND om.organization_id = organization_members.organization_id
      AND om.role IN ('admin', 'owner')
    )
  );

-- Grant permissions
GRANT ALL ON organization_members TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;