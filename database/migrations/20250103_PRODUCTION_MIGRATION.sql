-- Production Migration for Documents Feature
-- This migration must be run in Supabase SQL Editor for production database
-- Date: 2025-01-03
-- Features: Documents with Annotations, Organization & Vault associations

-- ============================================
-- STEP 1: Add missing columns to assets table
-- ============================================

-- Add attribution_status column
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'assets' AND column_name = 'attribution_status'
  ) THEN
    ALTER TABLE assets ADD COLUMN attribution_status VARCHAR(20) DEFAULT 'pending';
    ALTER TABLE assets ADD CONSTRAINT check_attribution_status 
      CHECK (attribution_status IN ('pending', 'partial', 'complete'));
  END IF;
END $$;

-- Add document_type column
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'assets' AND column_name = 'document_type'
  ) THEN
    ALTER TABLE assets ADD COLUMN document_type VARCHAR(50) DEFAULT 'general';
  END IF;
END $$;

-- ============================================
-- STEP 2: Create annotations tables
-- ============================================

-- Create asset_annotations table
CREATE TABLE IF NOT EXISTS asset_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Annotation data
  annotation_type VARCHAR(50) NOT NULL DEFAULT 'highlight',
  page_number INTEGER,
  position JSONB,
  content JSONB,
  selected_text TEXT,
  comment_text TEXT,
  color VARCHAR(7) DEFAULT '#FFFF00',
  opacity DECIMAL(3, 2) DEFAULT 0.3,
  
  -- Visibility
  is_private BOOLEAN DEFAULT FALSE,
  is_resolved BOOLEAN DEFAULT FALSE,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Soft delete
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID REFERENCES auth.users(id)
);

-- Create annotation_replies table
CREATE TABLE IF NOT EXISTS annotation_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  annotation_id UUID NOT NULL REFERENCES asset_annotations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_reply_id UUID REFERENCES annotation_replies(id) ON DELETE CASCADE,
  
  -- Reply content
  reply_text TEXT NOT NULL,
  
  -- Status
  is_edited BOOLEAN DEFAULT FALSE,
  edited_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Soft delete
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  
  CHECK (id != parent_reply_id)
);

-- Create vault_assets table
CREATE TABLE IF NOT EXISTS vault_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vault_id UUID NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  added_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Metadata
  notes TEXT,
  position INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint
  UNIQUE(vault_id, asset_id)
);

-- ============================================
-- STEP 3: Create indexes for performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_asset_annotations_asset_id ON asset_annotations(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_annotations_user_id ON asset_annotations(user_id);
CREATE INDEX IF NOT EXISTS idx_asset_annotations_page ON asset_annotations(page_number);
CREATE INDEX IF NOT EXISTS idx_annotation_replies_annotation_id ON annotation_replies(annotation_id);
CREATE INDEX IF NOT EXISTS idx_vault_assets_vault_id ON vault_assets(vault_id);
CREATE INDEX IF NOT EXISTS idx_vault_assets_asset_id ON vault_assets(asset_id);
CREATE INDEX IF NOT EXISTS idx_assets_attribution_status ON assets(attribution_status);

-- ============================================
-- STEP 4: Enable Row Level Security
-- ============================================

ALTER TABLE asset_annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE annotation_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_assets ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 5: Create RLS Policies
-- ============================================

-- Policies for asset_annotations
DROP POLICY IF EXISTS "Users can view annotations on their assets" ON asset_annotations;
CREATE POLICY "Users can view annotations on their assets" ON asset_annotations
  FOR SELECT USING (
    asset_id IN (SELECT id FROM assets WHERE owner_id = auth.uid())
    OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Users can create annotations on accessible assets" ON asset_annotations;
CREATE POLICY "Users can create annotations on accessible assets" ON asset_annotations
  FOR INSERT WITH CHECK (
    user_id = auth.uid() 
    AND (
      asset_id IN (SELECT id FROM assets WHERE owner_id = auth.uid())
      OR asset_id IN (
        SELECT asset_id FROM vault_assets 
        WHERE vault_id IN (
          SELECT vault_id FROM vault_members 
          WHERE user_id = auth.uid()
        )
      )
    )
  );

DROP POLICY IF EXISTS "Users can update their own annotations" ON asset_annotations;
CREATE POLICY "Users can update their own annotations" ON asset_annotations
  FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own annotations" ON asset_annotations;
CREATE POLICY "Users can delete their own annotations" ON asset_annotations
  FOR DELETE USING (user_id = auth.uid());

-- Policies for annotation_replies
DROP POLICY IF EXISTS "Users can view replies on accessible annotations" ON annotation_replies;
CREATE POLICY "Users can view replies on accessible annotations" ON annotation_replies
  FOR SELECT USING (
    annotation_id IN (
      SELECT id FROM asset_annotations 
      WHERE asset_id IN (
        SELECT id FROM assets WHERE owner_id = auth.uid()
      ) OR user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create replies on accessible annotations" ON annotation_replies;
CREATE POLICY "Users can create replies on accessible annotations" ON annotation_replies
  FOR INSERT WITH CHECK (
    user_id = auth.uid() 
    AND annotation_id IN (
      SELECT id FROM asset_annotations 
      WHERE asset_id IN (
        SELECT id FROM assets WHERE owner_id = auth.uid()
      ) OR user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update their own replies" ON annotation_replies;
CREATE POLICY "Users can update their own replies" ON annotation_replies
  FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own replies" ON annotation_replies;
CREATE POLICY "Users can delete their own replies" ON annotation_replies
  FOR DELETE USING (user_id = auth.uid());

-- Policies for vault_assets
DROP POLICY IF EXISTS "Users can view vault assets" ON vault_assets;
CREATE POLICY "Users can view vault assets" ON vault_assets
  FOR SELECT USING (
    vault_id IN (
      SELECT vault_id FROM vault_members WHERE user_id = auth.uid()
    )
    OR vault_id IN (
      SELECT id FROM vaults WHERE created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can add assets to their vaults" ON vault_assets;
CREATE POLICY "Users can add assets to their vaults" ON vault_assets
  FOR INSERT WITH CHECK (
    added_by_user_id = auth.uid()
    AND (
      vault_id IN (SELECT id FROM vaults WHERE created_by = auth.uid())
      OR vault_id IN (
        SELECT vault_id FROM vault_members 
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'editor')
      )
    )
  );

DROP POLICY IF EXISTS "Users can remove assets from their vaults" ON vault_assets;
CREATE POLICY "Users can remove assets from their vaults" ON vault_assets
  FOR DELETE USING (
    vault_id IN (SELECT id FROM vaults WHERE created_by = auth.uid())
    OR vault_id IN (
      SELECT vault_id FROM vault_members 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- ============================================
-- STEP 6: Grant permissions
-- ============================================

GRANT ALL ON asset_annotations TO authenticated;
GRANT ALL ON annotation_replies TO authenticated;
GRANT ALL ON vault_assets TO authenticated;

-- ============================================
-- STEP 7: Create helper functions
-- ============================================

-- Function to get annotation count for an asset
CREATE OR REPLACE FUNCTION get_asset_annotation_count(asset_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*) 
    FROM asset_annotations 
    WHERE asset_id = asset_uuid 
    AND is_deleted = FALSE
  );
END;
$$ LANGUAGE plpgsql;

-- Function to check if user can annotate an asset
CREATE OR REPLACE FUNCTION can_user_annotate_asset(user_uuid UUID, asset_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    -- User owns the asset
    EXISTS (SELECT 1 FROM assets WHERE id = asset_uuid AND owner_id = user_uuid)
    OR
    -- User has access via vault membership
    EXISTS (
      SELECT 1 FROM vault_assets va
      JOIN vault_members vm ON va.vault_id = vm.vault_id
      WHERE va.asset_id = asset_uuid AND vm.user_id = user_uuid
    )
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Run these after migration to verify:
/*
-- Check if tables were created
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('asset_annotations', 'annotation_replies', 'vault_assets');

-- Check if columns were added to assets
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'assets' 
AND column_name IN ('attribution_status', 'document_type');

-- Check RLS policies
SELECT tablename, policyname FROM pg_policies 
WHERE tablename IN ('asset_annotations', 'annotation_replies', 'vault_assets')
ORDER BY tablename, policyname;
*/

-- ============================================
-- Migration completed successfully!
-- The Documents feature with annotations is now ready.
-- ============================================