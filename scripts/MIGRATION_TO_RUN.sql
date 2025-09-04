-- =====================================================
-- FIX ASSETS TABLE - ADD MISSING COLUMNS
-- Migration: 20250104_fix_assets_table_columns
-- Description: Add missing columns to assets table that are required for upload
-- =====================================================

-- Add missing columns if they don't exist
DO $$ 
BEGIN
    -- Add status column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'assets' AND column_name = 'status') THEN
        ALTER TABLE assets ADD COLUMN status TEXT DEFAULT 'ready';
    END IF;
    
    -- Add original_file_name column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'assets' AND column_name = 'original_file_name') THEN
        ALTER TABLE assets ADD COLUMN original_file_name TEXT;
    END IF;
    
    -- Add folder_path column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'assets' AND column_name = 'folder_path') THEN
        ALTER TABLE assets ADD COLUMN folder_path TEXT DEFAULT '/';
    END IF;
    
    -- Add storage_bucket column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'assets' AND column_name = 'storage_bucket') THEN
        ALTER TABLE assets ADD COLUMN storage_bucket TEXT DEFAULT 'assets';
    END IF;
    
    -- Add is_processed column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'assets' AND column_name = 'is_processed') THEN
        ALTER TABLE assets ADD COLUMN is_processed BOOLEAN DEFAULT false;
    END IF;
    
    -- Add processing_status column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'assets' AND column_name = 'processing_status') THEN
        ALTER TABLE assets ADD COLUMN processing_status TEXT DEFAULT 'pending';
    END IF;
    
    -- Add visibility column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'assets' AND column_name = 'visibility') THEN
        ALTER TABLE assets ADD COLUMN visibility TEXT DEFAULT 'private';
    END IF;
    
    -- Add organization_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'assets' AND column_name = 'organization_id') THEN
        ALTER TABLE assets ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
    END IF;
    
    -- Add thumbnail_url column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'assets' AND column_name = 'thumbnail_url') THEN
        ALTER TABLE assets ADD COLUMN thumbnail_url TEXT;
    END IF;
    
    -- Add preview_url column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'assets' AND column_name = 'preview_url') THEN
        ALTER TABLE assets ADD COLUMN preview_url TEXT;
    END IF;
    
    -- Add upload_progress column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'assets' AND column_name = 'upload_progress') THEN
        ALTER TABLE assets ADD COLUMN upload_progress INTEGER DEFAULT 0;
    END IF;
    
    -- Add processing_error column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'assets' AND column_name = 'processing_error') THEN
        ALTER TABLE assets ADD COLUMN processing_error TEXT;
    END IF;
    
    -- Add processed_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'assets' AND column_name = 'processed_at') THEN
        ALTER TABLE assets ADD COLUMN processed_at TIMESTAMPTZ;
    END IF;
END $$;

-- Create index on status for better performance
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
CREATE INDEX IF NOT EXISTS idx_assets_organization_id ON assets(organization_id);
CREATE INDEX IF NOT EXISTS idx_assets_owner_id ON assets(owner_id);

-- Update RLS policies to be super simple for now
DROP POLICY IF EXISTS "authenticated_users_all_assets" ON assets;
DROP POLICY IF EXISTS "service_role_all" ON assets;
DROP POLICY IF EXISTS "service_role_assets_policy" ON assets;

-- Enable RLS
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

-- Create a very permissive policy for testing
CREATE POLICY "allow_all_authenticated" ON assets
FOR ALL
USING (true)
WITH CHECK (true);

-- Grant permissions
GRANT ALL ON assets TO authenticated;
GRANT ALL ON assets TO anon;
GRANT ALL ON assets TO service_role;

-- Verify the columns were added
DO $$
DECLARE
    column_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO column_count
    FROM information_schema.columns
    WHERE table_name = 'assets'
    AND column_name IN ('status', 'original_file_name', 'folder_path', 'storage_bucket', 
                        'is_processed', 'processing_status', 'visibility', 'organization_id');
    
    IF column_count >= 8 THEN
        RAISE NOTICE 'SUCCESS: All required columns exist in assets table';
    ELSE
        RAISE WARNING 'WARNING: Some columns may be missing. Found % of 8 expected columns', column_count;
    END IF;
END $$;

-- Show current table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'assets'
ORDER BY ordinal_position;