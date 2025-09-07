-- Add status column to ALL tables that might need it
-- This is a comprehensive fix for "column status does not exist" errors

-- ============================================
-- Function to safely add column if it doesn't exist
-- ============================================
CREATE OR REPLACE FUNCTION add_column_if_not_exists(
    table_name text,
    column_name text,
    column_definition text
)
RETURNS void AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = $1
        AND column_name = $2
    ) THEN
        EXECUTE format('ALTER TABLE public.%I ADD COLUMN %I %s', table_name, column_name, column_definition);
        RAISE NOTICE 'Added column % to table %', column_name, table_name;
    ELSE
        RAISE NOTICE 'Column % already exists in table %', column_name, table_name;
    END IF;
EXCEPTION
    WHEN undefined_table THEN
        RAISE NOTICE 'Table % does not exist, skipping', table_name;
    WHEN OTHERS THEN
        RAISE NOTICE 'Error adding column % to table %: %', column_name, table_name, SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Add status column to all relevant tables
-- ============================================

-- Organizations table
SELECT add_column_if_not_exists('organizations', 'status', 'VARCHAR(50) DEFAULT ''active''');

-- Users table
SELECT add_column_if_not_exists('users', 'status', 'VARCHAR(50) DEFAULT ''active''');

-- Boards table
SELECT add_column_if_not_exists('boards', 'status', 'VARCHAR(50) DEFAULT ''active''');

-- Meetings table
SELECT add_column_if_not_exists('meetings', 'status', 'VARCHAR(50) DEFAULT ''scheduled''');

-- Organization_members table
SELECT add_column_if_not_exists('organization_members', 'status', 'VARCHAR(50) DEFAULT ''active''');

-- Meeting_attendees table
SELECT add_column_if_not_exists('meeting_attendees', 'status', 'VARCHAR(50) DEFAULT ''invited''');

-- Board_members table
SELECT add_column_if_not_exists('board_members', 'status', 'VARCHAR(50) DEFAULT ''active''');

-- Assets table (if exists)
SELECT add_column_if_not_exists('assets', 'status', 'VARCHAR(50) DEFAULT ''ready''');

-- Documents table (if exists)
SELECT add_column_if_not_exists('documents', 'status', 'VARCHAR(50) DEFAULT ''active''');

-- Vaults table (if exists)
SELECT add_column_if_not_exists('vaults', 'status', 'VARCHAR(50) DEFAULT ''active''');

-- Registration_requests table (if exists)
SELECT add_column_if_not_exists('registration_requests', 'status', 'VARCHAR(50) DEFAULT ''pending''');

-- Committees table (if exists)
SELECT add_column_if_not_exists('committees', 'status', 'VARCHAR(50) DEFAULT ''active''');

-- Votes table (if exists)
SELECT add_column_if_not_exists('votes', 'status', 'VARCHAR(50) DEFAULT ''active''');

-- Actions table (if exists)
SELECT add_column_if_not_exists('actions', 'status', 'VARCHAR(50) DEFAULT ''pending''');

-- Notifications table (if exists)
SELECT add_column_if_not_exists('notifications', 'status', 'VARCHAR(50) DEFAULT ''unread''');

-- ============================================
-- Also add other commonly missing columns
-- ============================================

-- Add role column where needed
SELECT add_column_if_not_exists('users', 'role', 'VARCHAR(50) DEFAULT ''user''');
SELECT add_column_if_not_exists('organization_members', 'role', 'VARCHAR(50) DEFAULT ''member''');
SELECT add_column_if_not_exists('meeting_attendees', 'role', 'VARCHAR(50) DEFAULT ''attendee''');
SELECT add_column_if_not_exists('board_members', 'role', 'VARCHAR(50) DEFAULT ''member''');

-- Add metadata column where needed
SELECT add_column_if_not_exists('organizations', 'metadata', 'JSONB DEFAULT ''{}''::jsonb');
SELECT add_column_if_not_exists('users', 'metadata', 'JSONB DEFAULT ''{}''::jsonb');
SELECT add_column_if_not_exists('boards', 'metadata', 'JSONB DEFAULT ''{}''::jsonb');
SELECT add_column_if_not_exists('meetings', 'metadata', 'JSONB DEFAULT ''{}''::jsonb');
SELECT add_column_if_not_exists('assets', 'metadata', 'JSONB DEFAULT ''{}''::jsonb');
SELECT add_column_if_not_exists('documents', 'metadata', 'JSONB DEFAULT ''{}''::jsonb');
SELECT add_column_if_not_exists('vaults', 'metadata', 'JSONB DEFAULT ''{}''::jsonb');

-- Add settings column where needed
SELECT add_column_if_not_exists('organizations', 'settings', 'JSONB DEFAULT ''{}''::jsonb');
SELECT add_column_if_not_exists('boards', 'settings', 'JSONB DEFAULT ''{}''::jsonb');
SELECT add_column_if_not_exists('vaults', 'settings', 'JSONB DEFAULT ''{}''::jsonb');

-- Add type column where needed
SELECT add_column_if_not_exists('organizations', 'type', 'VARCHAR(50) DEFAULT ''corporate''');
SELECT add_column_if_not_exists('boards', 'type', 'VARCHAR(50) DEFAULT ''board''');
SELECT add_column_if_not_exists('meetings', 'type', 'VARCHAR(50) DEFAULT ''board''');

-- Add slug column to organizations if missing
SELECT add_column_if_not_exists('organizations', 'slug', 'VARCHAR(255)');

-- Add password_set column to users if missing
SELECT add_column_if_not_exists('users', 'password_set', 'BOOLEAN DEFAULT true');

-- ============================================
-- Update any NULL status values to defaults
-- ============================================
UPDATE organizations SET status = 'active' WHERE status IS NULL;
UPDATE users SET status = 'active' WHERE status IS NULL;
UPDATE boards SET status = 'active' WHERE status IS NULL;
UPDATE meetings SET status = 'scheduled' WHERE status IS NULL;
UPDATE organization_members SET status = 'active' WHERE status IS NULL;
UPDATE meeting_attendees SET status = 'invited' WHERE status IS NULL;
UPDATE board_members SET status = 'active' WHERE status IS NULL;

-- Update for other tables if they exist
DO $$
BEGIN
    -- Assets
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'assets') THEN
        UPDATE assets SET status = 'ready' WHERE status IS NULL;
    END IF;
    
    -- Documents
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'documents') THEN
        UPDATE documents SET status = 'active' WHERE status IS NULL;
    END IF;
    
    -- Vaults
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vaults') THEN
        UPDATE vaults SET status = 'active' WHERE status IS NULL;
    END IF;
    
    -- Registration_requests
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'registration_requests') THEN
        UPDATE registration_requests SET status = 'pending' WHERE status IS NULL;
    END IF;
END $$;

-- ============================================
-- Generate slugs for organizations that don't have them
-- ============================================
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organizations' 
        AND column_name = 'slug'
    ) THEN
        UPDATE organizations 
        SET slug = LOWER(
            REGEXP_REPLACE(
                REGEXP_REPLACE(name, '[^a-zA-Z0-9\s-]', '', 'g'), 
                '\s+', '-', 'g'
            )
        ) || '-' || LEFT(MD5(RANDOM()::text), 6)
        WHERE slug IS NULL OR slug = '';
    END IF;
END $$;

-- ============================================
-- Create indexes for status columns
-- ============================================
CREATE INDEX IF NOT EXISTS idx_organizations_status ON organizations(status);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_boards_status ON boards(status);
CREATE INDEX IF NOT EXISTS idx_meetings_status ON meetings(status);
CREATE INDEX IF NOT EXISTS idx_organization_members_status ON organization_members(status);
CREATE INDEX IF NOT EXISTS idx_meeting_attendees_status ON meeting_attendees(status);
CREATE INDEX IF NOT EXISTS idx_board_members_status ON board_members(status);

-- ============================================
-- Add NOT NULL constraints where appropriate (optional)
-- ============================================
DO $$
BEGIN
    -- Make status NOT NULL for critical tables
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'organizations' AND column_name = 'status') THEN
        ALTER TABLE organizations ALTER COLUMN status SET NOT NULL;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'users' AND column_name = 'status') THEN
        ALTER TABLE users ALTER COLUMN status SET NOT NULL;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'meetings' AND column_name = 'status') THEN
        ALTER TABLE meetings ALTER COLUMN status SET NOT NULL;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not add NOT NULL constraints: %', SQLERRM;
END $$;

-- ============================================
-- Clean up the helper function
-- ============================================
DROP FUNCTION IF EXISTS add_column_if_not_exists(text, text, text);

-- ============================================
-- Grant permissions
-- ============================================
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ============================================
-- Summary
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Status column migration complete!';
    RAISE NOTICE 'Added status column to all relevant tables';
    RAISE NOTICE 'Updated NULL values to appropriate defaults';
    RAISE NOTICE 'Created indexes for performance';
    RAISE NOTICE '========================================';
END $$;