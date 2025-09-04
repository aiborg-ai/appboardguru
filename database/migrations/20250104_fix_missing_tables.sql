-- Migration: Fix missing tables and columns for document upload functionality
-- Date: 2025-01-04
-- Purpose: Add missing user_profiles, user_preferences tables and is_primary column

-- ============================================================================
-- PART 1: Create user_profiles table
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    phone TEXT,
    company TEXT,
    job_title TEXT,
    location TEXT,
    website TEXT,
    linkedin_url TEXT,
    twitter_handle TEXT,
    timezone TEXT DEFAULT 'UTC',
    language TEXT DEFAULT 'en',
    date_format TEXT DEFAULT 'MM/DD/YYYY',
    time_format TEXT DEFAULT '12h',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- PART 2: Create user_preferences table
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    email_notifications BOOLEAN DEFAULT true,
    push_notifications BOOLEAN DEFAULT false,
    sms_notifications BOOLEAN DEFAULT false,
    notification_frequency TEXT DEFAULT 'instant',
    meeting_reminders BOOLEAN DEFAULT true,
    document_updates BOOLEAN DEFAULT true,
    task_assignments BOOLEAN DEFAULT true,
    comment_replies BOOLEAN DEFAULT true,
    weekly_summary BOOLEAN DEFAULT true,
    theme TEXT DEFAULT 'light',
    sidebar_collapsed BOOLEAN DEFAULT false,
    default_organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- Enable RLS
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_preferences
CREATE POLICY "Users can view own preferences" ON user_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences" ON user_preferences
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences" ON user_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- PART 3: Add is_primary column to organization_members
-- ============================================================================

-- Add is_primary column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organization_members' 
        AND column_name = 'is_primary'
    ) THEN
        ALTER TABLE organization_members 
        ADD COLUMN is_primary BOOLEAN DEFAULT false;
        
        -- Update the first organization for each user to be primary
        UPDATE organization_members om1
        SET is_primary = true
        WHERE om1.id = (
            SELECT id FROM organization_members om2
            WHERE om2.user_id = om1.user_id
            AND om2.status = 'active'
            ORDER BY om2.joined_at ASC
            LIMIT 1
        );
    END IF;
END $$;

-- Create index for primary organization lookups
CREATE INDEX IF NOT EXISTS idx_organization_members_primary 
ON organization_members(user_id, is_primary) 
WHERE is_primary = true;

-- ============================================================================
-- PART 4: Create trigger to auto-create user profile
-- ============================================================================

-- Function to auto-create user profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
    -- Create user profile
    INSERT INTO public.user_profiles (user_id, full_name, created_at, updated_at)
    VALUES (
        NEW.id, 
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        NOW(),
        NOW()
    );
    
    -- Create user preferences
    INSERT INTO public.user_preferences (user_id, created_at, updated_at)
    VALUES (NEW.id, NOW(), NOW());
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'on_auth_user_created'
    ) THEN
        CREATE TRIGGER on_auth_user_created 
        AFTER INSERT ON auth.users 
        FOR EACH ROW 
        EXECUTE FUNCTION public.handle_new_user();
    END IF;
END $$;

-- ============================================================================
-- PART 5: Populate profiles for existing users
-- ============================================================================

-- Create profiles for existing users who don't have one
INSERT INTO user_profiles (user_id, full_name, created_at, updated_at)
SELECT 
    u.id,
    COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
    NOW(),
    NOW()
FROM auth.users u
LEFT JOIN user_profiles p ON p.user_id = u.id
WHERE p.id IS NULL;

-- Create preferences for existing users who don't have one
INSERT INTO user_preferences (user_id, created_at, updated_at)
SELECT 
    u.id,
    NOW(),
    NOW()
FROM auth.users u
LEFT JOIN user_preferences p ON p.user_id = u.id
WHERE p.id IS NULL;

-- ============================================================================
-- PART 6: Update functions that reference these tables
-- ============================================================================

-- Update or create function to get user profile with preferences
CREATE OR REPLACE FUNCTION get_user_profile_with_preferences(p_user_id UUID)
RETURNS TABLE (
    user_id UUID,
    full_name TEXT,
    avatar_url TEXT,
    email TEXT,
    theme TEXT,
    email_notifications BOOLEAN,
    default_organization_id UUID
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id as user_id,
        p.full_name,
        p.avatar_url,
        u.email,
        pref.theme,
        pref.email_notifications,
        pref.default_organization_id
    FROM auth.users u
    LEFT JOIN user_profiles p ON p.user_id = u.id
    LEFT JOIN user_preferences pref ON pref.user_id = u.id
    WHERE u.id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_profile_with_preferences TO authenticated;

-- ============================================================================
-- Verification Queries (run these to verify migration success)
-- ============================================================================

-- These are commented out but can be run to verify:
-- SELECT COUNT(*) FROM user_profiles;
-- SELECT COUNT(*) FROM user_preferences;
-- SELECT COUNT(*) FROM organization_members WHERE is_primary = true;
-- SELECT * FROM information_schema.columns WHERE table_name = 'organization_members' AND column_name = 'is_primary';