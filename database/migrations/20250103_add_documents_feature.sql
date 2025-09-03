-- Migration for Documents feature with collaborative annotations
-- This adds the necessary fields and tables for document management and annotations

-- Add document-specific fields to assets table
ALTER TABLE assets 
ADD COLUMN IF NOT EXISTS attribution_status VARCHAR(20) DEFAULT 'pending' 
  CHECK (attribution_status IN ('pending', 'partial', 'complete'));

ALTER TABLE assets 
ADD COLUMN IF NOT EXISTS document_type VARCHAR(50) DEFAULT 'general';

-- Create asset_annotations table for collaborative annotations
CREATE TABLE IF NOT EXISTS asset_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  vault_id UUID REFERENCES vaults(id) ON DELETE SET NULL,
  
  -- Annotation data
  annotation_type VARCHAR(50) NOT NULL DEFAULT 'highlight',
  page_number INTEGER,
  position JSONB, -- Stores x, y coordinates and dimensions
  content JSONB, -- Stores annotation content (text, drawing, etc.)
  selected_text TEXT, -- The actual text that was selected
  comment_text TEXT, -- User's comment on the annotation
  color VARCHAR(7) DEFAULT '#FFFF00', -- Hex color for highlights
  opacity DECIMAL(3, 2) DEFAULT 0.3,
  
  -- Visibility and permissions
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

-- Create annotation_replies table for threaded discussions
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

-- Create annotation_mentions table for @mentions in annotations
CREATE TABLE IF NOT EXISTS annotation_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  annotation_id UUID REFERENCES asset_annotations(id) ON DELETE CASCADE,
  reply_id UUID REFERENCES annotation_replies(id) ON DELETE CASCADE,
  mentioned_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mentioning_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Notification status
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Either annotation_id or reply_id must be set, but not both
  CHECK ((annotation_id IS NOT NULL AND reply_id IS NULL) OR (annotation_id IS NULL AND reply_id IS NOT NULL))
);

-- Create vault_assets table for associating documents with vaults
CREATE TABLE IF NOT EXISTS vault_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vault_id UUID NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  added_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Metadata
  notes TEXT,
  position INTEGER DEFAULT 0, -- For ordering within vault
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint to prevent duplicate associations
  UNIQUE(vault_id, asset_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_asset_annotations_asset_id ON asset_annotations(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_annotations_user_id ON asset_annotations(user_id);
CREATE INDEX IF NOT EXISTS idx_asset_annotations_page ON asset_annotations(page_number);
CREATE INDEX IF NOT EXISTS idx_asset_annotations_created_at ON asset_annotations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_asset_annotations_is_deleted ON asset_annotations(is_deleted) WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_annotation_replies_annotation_id ON annotation_replies(annotation_id);
CREATE INDEX IF NOT EXISTS idx_annotation_replies_user_id ON annotation_replies(user_id);
CREATE INDEX IF NOT EXISTS idx_annotation_replies_parent ON annotation_replies(parent_reply_id);
CREATE INDEX IF NOT EXISTS idx_annotation_replies_created_at ON annotation_replies(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_annotation_mentions_mentioned_user ON annotation_mentions(mentioned_user_id);
CREATE INDEX IF NOT EXISTS idx_annotation_mentions_is_read ON annotation_mentions(is_read) WHERE is_read = FALSE;

CREATE INDEX IF NOT EXISTS idx_vault_assets_vault_id ON vault_assets(vault_id);
CREATE INDEX IF NOT EXISTS idx_vault_assets_asset_id ON vault_assets(asset_id);

CREATE INDEX IF NOT EXISTS idx_assets_attribution_status ON assets(attribution_status);
CREATE INDEX IF NOT EXISTS idx_assets_document_type ON assets(document_type);

-- Row Level Security (RLS) policies
ALTER TABLE asset_annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE annotation_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE annotation_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_assets ENABLE ROW LEVEL SECURITY;

-- Policies for asset_annotations
CREATE POLICY "Users can view annotations on accessible assets" ON asset_annotations
  FOR SELECT USING (
    -- User can see annotations on assets they own or have been shared with
    asset_id IN (
      SELECT id FROM assets 
      WHERE owner_id = auth.uid() OR
      id IN (
        SELECT asset_id FROM asset_shares 
        WHERE shared_with_user_id = auth.uid() AND is_active = TRUE
      )
    ) AND is_deleted = FALSE
  );

CREATE POLICY "Users can create annotations on accessible assets" ON asset_annotations
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    asset_id IN (
      SELECT id FROM assets 
      WHERE owner_id = auth.uid() OR
      id IN (
        SELECT asset_id FROM asset_shares 
        WHERE shared_with_user_id = auth.uid() AND is_active = TRUE
      )
    )
  );

CREATE POLICY "Users can update their own annotations" ON asset_annotations
  FOR UPDATE USING (user_id = auth.uid() AND is_deleted = FALSE);

CREATE POLICY "Users can soft delete their own annotations" ON asset_annotations
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Policies for annotation_replies
CREATE POLICY "Users can view replies on accessible annotations" ON annotation_replies
  FOR SELECT USING (
    annotation_id IN (
      SELECT id FROM asset_annotations 
      WHERE asset_id IN (
        SELECT id FROM assets 
        WHERE owner_id = auth.uid() OR
        id IN (
          SELECT asset_id FROM asset_shares 
          WHERE shared_with_user_id = auth.uid() AND is_active = TRUE
        )
      )
    ) AND is_deleted = FALSE
  );

CREATE POLICY "Users can create replies on accessible annotations" ON annotation_replies
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    annotation_id IN (
      SELECT id FROM asset_annotations 
      WHERE asset_id IN (
        SELECT id FROM assets 
        WHERE owner_id = auth.uid() OR
        id IN (
          SELECT asset_id FROM asset_shares 
          WHERE shared_with_user_id = auth.uid() AND is_active = TRUE
        )
      )
    )
  );

CREATE POLICY "Users can update their own replies" ON annotation_replies
  FOR UPDATE USING (user_id = auth.uid() AND is_deleted = FALSE);

-- Policies for annotation_mentions
CREATE POLICY "Users can view their mentions" ON annotation_mentions
  FOR SELECT USING (mentioned_user_id = auth.uid() OR mentioning_user_id = auth.uid());

CREATE POLICY "Users can create mentions" ON annotation_mentions
  FOR INSERT WITH CHECK (mentioning_user_id = auth.uid());

CREATE POLICY "Users can mark their mentions as read" ON annotation_mentions
  FOR UPDATE USING (mentioned_user_id = auth.uid());

-- Policies for vault_assets
CREATE POLICY "Vault members can view vault assets" ON vault_assets
  FOR SELECT USING (
    vault_id IN (
      SELECT vault_id FROM vault_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Vault admins can manage vault assets" ON vault_assets
  FOR ALL USING (
    vault_id IN (
      SELECT vault_id FROM vault_members 
      WHERE user_id = auth.uid() 
      AND status = 'active' 
      AND role IN ('admin', 'owner', 'moderator')
    )
  );

-- Trigger functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_asset_annotations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_asset_annotations_updated_at
  BEFORE UPDATE ON asset_annotations
  FOR EACH ROW
  EXECUTE FUNCTION update_asset_annotations_updated_at();

CREATE OR REPLACE FUNCTION update_annotation_replies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_annotation_replies_updated_at
  BEFORE UPDATE ON annotation_replies
  FOR EACH ROW
  EXECUTE FUNCTION update_annotation_replies_updated_at();

CREATE OR REPLACE FUNCTION update_vault_assets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_vault_assets_updated_at
  BEFORE UPDATE ON vault_assets
  FOR EACH ROW
  EXECUTE FUNCTION update_vault_assets_updated_at();

-- Function to count annotations for an asset
CREATE OR REPLACE FUNCTION get_asset_annotation_count(p_asset_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*) 
    FROM asset_annotations 
    WHERE asset_id = p_asset_id 
    AND is_deleted = FALSE
  );
END;
$$ LANGUAGE plpgsql;

-- Function to check if user can annotate an asset
CREATE OR REPLACE FUNCTION can_user_annotate_asset(p_user_id UUID, p_asset_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM assets 
    WHERE id = p_asset_id 
    AND (
      owner_id = p_user_id OR
      id IN (
        SELECT asset_id FROM asset_shares 
        WHERE shared_with_user_id = p_user_id 
        AND is_active = TRUE
        AND permission_level IN ('edit', 'admin')
      )
    )
  );
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT ALL ON asset_annotations TO authenticated;
GRANT ALL ON annotation_replies TO authenticated;
GRANT ALL ON annotation_mentions TO authenticated;
GRANT ALL ON vault_assets TO authenticated;