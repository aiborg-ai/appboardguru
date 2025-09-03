-- Safe migration for Documents feature (works with existing data)
-- This migration can be run without breaking existing assets

-- Add attribution_status to assets table if it doesn't exist
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

-- Add document_type to assets table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'assets' AND column_name = 'document_type'
  ) THEN
    ALTER TABLE assets ADD COLUMN document_type VARCHAR(50) DEFAULT 'general';
  END IF;
END $$;

-- Create asset_annotations table if it doesn't exist
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

-- Create annotation_replies table if it doesn't exist
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

-- Create vault_assets table if it doesn't exist
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

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_asset_annotations_asset_id ON asset_annotations(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_annotations_user_id ON asset_annotations(user_id);
CREATE INDEX IF NOT EXISTS idx_asset_annotations_page ON asset_annotations(page_number);
CREATE INDEX IF NOT EXISTS idx_annotation_replies_annotation_id ON annotation_replies(annotation_id);
CREATE INDEX IF NOT EXISTS idx_vault_assets_vault_id ON vault_assets(vault_id);
CREATE INDEX IF NOT EXISTS idx_vault_assets_asset_id ON vault_assets(asset_id);
CREATE INDEX IF NOT EXISTS idx_assets_attribution_status ON assets(attribution_status);

-- Enable RLS if not already enabled
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'asset_annotations' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE asset_annotations ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'annotation_replies' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE annotation_replies ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'vault_assets' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE vault_assets ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Basic RLS policies (only create if they don't exist)
DO $$
BEGIN
  -- Policy for asset_annotations
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'asset_annotations' 
    AND policyname = 'Users can view annotations on their assets'
  ) THEN
    CREATE POLICY "Users can view annotations on their assets" ON asset_annotations
      FOR SELECT USING (
        asset_id IN (SELECT id FROM assets WHERE owner_id = auth.uid())
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'asset_annotations' 
    AND policyname = 'Users can create annotations on their assets'
  ) THEN
    CREATE POLICY "Users can create annotations on their assets" ON asset_annotations
      FOR INSERT WITH CHECK (user_id = auth.uid());
  END IF;

  -- Policy for annotation_replies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'annotation_replies' 
    AND policyname = 'Users can view replies'
  ) THEN
    CREATE POLICY "Users can view replies" ON annotation_replies
      FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'annotation_replies' 
    AND policyname = 'Users can create replies'
  ) THEN
    CREATE POLICY "Users can create replies" ON annotation_replies
      FOR INSERT WITH CHECK (user_id = auth.uid());
  END IF;

  -- Policy for vault_assets
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'vault_assets' 
    AND policyname = 'Users can view vault assets'
  ) THEN
    CREATE POLICY "Users can view vault assets" ON vault_assets
      FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'vault_assets' 
    AND policyname = 'Users can manage vault assets'
  ) THEN
    CREATE POLICY "Users can manage vault assets" ON vault_assets
      FOR ALL USING (added_by_user_id = auth.uid());
  END IF;
END $$;

-- Grant permissions
GRANT ALL ON asset_annotations TO authenticated;
GRANT ALL ON annotation_replies TO authenticated;
GRANT ALL ON vault_assets TO authenticated;