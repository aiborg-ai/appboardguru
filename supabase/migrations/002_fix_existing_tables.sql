-- Fix existing tables by adding missing columns
-- This migration safely adds columns only if they don't exist

-- ============================================
-- Add missing columns to organizations table
-- ============================================
DO $$ 
BEGIN
  -- Add status column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'organizations' 
                 AND column_name = 'status') THEN
    ALTER TABLE public.organizations ADD COLUMN status VARCHAR(50) DEFAULT 'active';
  END IF;

  -- Add slug column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'organizations' 
                 AND column_name = 'slug') THEN
    ALTER TABLE public.organizations ADD COLUMN slug VARCHAR(255);
    -- Generate slug from name for existing records
    UPDATE public.organizations 
    SET slug = LOWER(REGEXP_REPLACE(REGEXP_REPLACE(name, '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g'))
    WHERE slug IS NULL;
    -- Make it unique after populating
    ALTER TABLE public.organizations ADD CONSTRAINT organizations_slug_unique UNIQUE(slug);
  END IF;

  -- Add other potentially missing columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'organizations' 
                 AND column_name = 'type') THEN
    ALTER TABLE public.organizations ADD COLUMN type VARCHAR(50) DEFAULT 'corporate';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'organizations' 
                 AND column_name = 'settings') THEN
    ALTER TABLE public.organizations ADD COLUMN settings JSONB DEFAULT '{}';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'organizations' 
                 AND column_name = 'metadata') THEN
    ALTER TABLE public.organizations ADD COLUMN metadata JSONB DEFAULT '{}';
  END IF;
END $$;

-- ============================================
-- Add missing columns to users table
-- ============================================
DO $$ 
BEGIN
  -- Add status column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'users' 
                 AND column_name = 'status') THEN
    ALTER TABLE public.users ADD COLUMN status VARCHAR(50) DEFAULT 'active';
  END IF;

  -- Add password_set column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'users' 
                 AND column_name = 'password_set') THEN
    ALTER TABLE public.users ADD COLUMN password_set BOOLEAN DEFAULT true;
  END IF;

  -- Add role column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'users' 
                 AND column_name = 'role') THEN
    ALTER TABLE public.users ADD COLUMN role VARCHAR(50) DEFAULT 'user';
  END IF;

  -- Add metadata column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'users' 
                 AND column_name = 'metadata') THEN
    ALTER TABLE public.users ADD COLUMN metadata JSONB DEFAULT '{}';
  END IF;
END $$;

-- ============================================
-- Add missing columns to boards table
-- ============================================
DO $$ 
BEGIN
  -- Check if boards table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables 
             WHERE table_schema = 'public' 
             AND table_name = 'boards') THEN
    
    -- Add status column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'boards' 
                   AND column_name = 'status') THEN
      ALTER TABLE public.boards ADD COLUMN status VARCHAR(50) DEFAULT 'active';
    END IF;

    -- Add type column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'boards' 
                   AND column_name = 'type') THEN
      ALTER TABLE public.boards ADD COLUMN type VARCHAR(50) DEFAULT 'board';
    END IF;

    -- Add settings column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'boards' 
                   AND column_name = 'settings') THEN
      ALTER TABLE public.boards ADD COLUMN settings JSONB DEFAULT '{}';
    END IF;

    -- Add metadata column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'boards' 
                   AND column_name = 'metadata') THEN
      ALTER TABLE public.boards ADD COLUMN metadata JSONB DEFAULT '{}';
    END IF;
  END IF;
END $$;

-- ============================================
-- Add missing columns to meetings table
-- ============================================
DO $$ 
BEGIN
  -- Check if meetings table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables 
             WHERE table_schema = 'public' 
             AND table_name = 'meetings') THEN
    
    -- Add status column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'meetings' 
                   AND column_name = 'status') THEN
      ALTER TABLE public.meetings ADD COLUMN status VARCHAR(50) DEFAULT 'scheduled';
    END IF;

    -- Add other potentially missing columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'meetings' 
                   AND column_name = 'metadata') THEN
      ALTER TABLE public.meetings ADD COLUMN metadata JSONB DEFAULT '{}';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'meetings' 
                   AND column_name = 'attendees') THEN
      ALTER TABLE public.meetings ADD COLUMN attendees JSONB DEFAULT '[]';
    END IF;
  END IF;
END $$;

-- ============================================
-- Add missing columns to organization_members table
-- ============================================
DO $$ 
BEGIN
  -- Check if organization_members table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables 
             WHERE table_schema = 'public' 
             AND table_name = 'organization_members') THEN
    
    -- Add status column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'organization_members' 
                   AND column_name = 'status') THEN
      ALTER TABLE public.organization_members ADD COLUMN status VARCHAR(50) DEFAULT 'active';
    END IF;

    -- Add role column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'organization_members' 
                   AND column_name = 'role') THEN
      ALTER TABLE public.organization_members ADD COLUMN role VARCHAR(50) DEFAULT 'member';
    END IF;
  END IF;
END $$;

-- ============================================
-- Add missing columns to meeting_attendees table
-- ============================================
DO $$ 
BEGIN
  -- Check if meeting_attendees table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables 
             WHERE table_schema = 'public' 
             AND table_name = 'meeting_attendees') THEN
    
    -- Add status column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'meeting_attendees' 
                   AND column_name = 'status') THEN
      ALTER TABLE public.meeting_attendees ADD COLUMN status VARCHAR(50) DEFAULT 'invited';
    END IF;

    -- Add role column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'meeting_attendees' 
                   AND column_name = 'role') THEN
      ALTER TABLE public.meeting_attendees ADD COLUMN role VARCHAR(50) DEFAULT 'attendee';
    END IF;
  END IF;
END $$;

-- ============================================
-- Add missing columns to board_members table
-- ============================================
DO $$ 
BEGIN
  -- Check if board_members table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables 
             WHERE table_schema = 'public' 
             AND table_name = 'board_members') THEN
    
    -- Add status column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'board_members' 
                   AND column_name = 'status') THEN
      ALTER TABLE public.board_members ADD COLUMN status VARCHAR(50) DEFAULT 'active';
    END IF;

    -- Add role column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'board_members' 
                   AND column_name = 'role') THEN
      ALTER TABLE public.board_members ADD COLUMN role VARCHAR(50) DEFAULT 'member';
    END IF;
  END IF;
END $$;

-- ============================================
-- Create missing indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_organizations_status ON organizations(status);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_boards_status ON boards(status) WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'boards');
CREATE INDEX IF NOT EXISTS idx_meetings_status ON meetings(status) WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'meetings');

-- ============================================
-- Ensure RLS is enabled on all tables
-- ============================================
DO $$ 
BEGIN
  -- Enable RLS on organizations if it exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'organizations') THEN
    ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
  END IF;

  -- Enable RLS on users if it exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
    ALTER TABLE users ENABLE ROW LEVEL SECURITY;
  END IF;

  -- Enable RLS on boards if it exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'boards') THEN
    ALTER TABLE boards ENABLE ROW LEVEL SECURITY;
  END IF;

  -- Enable RLS on meetings if it exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'meetings') THEN
    ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
  END IF;

  -- Enable RLS on organization_members if it exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'organization_members') THEN
    ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
  END IF;

  -- Enable RLS on meeting_attendees if it exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'meeting_attendees') THEN
    ALTER TABLE meeting_attendees ENABLE ROW LEVEL SECURITY;
  END IF;

  -- Enable RLS on board_members if it exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'board_members') THEN
    ALTER TABLE board_members ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- ============================================
-- Grant permissions
-- ============================================
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ============================================
-- Migration complete - this fixes missing status columns
-- ============================================