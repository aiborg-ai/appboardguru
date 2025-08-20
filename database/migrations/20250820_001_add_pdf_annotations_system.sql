-- =====================================================
-- ADD PDF ANNOTATIONS SYSTEM
-- Migration: 20250820_001_add_pdf_annotations_system
-- Description: Migration: Add PDF annotations system
-- Author: vik
-- Created: 2025-08-20
-- =====================================================

-- =====================================================
-- UP MIGRATION
-- =====================================================

-- Create PDF annotations system for collaborative document annotation

-- 1. Asset Annotations Table - Core annotation data
CREATE TABLE asset_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Asset and Vault Context
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  vault_id UUID REFERENCES vaults(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- User and Attribution
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Annotation Type and Content
  annotation_type VARCHAR(50) NOT NULL CHECK (annotation_type IN ('highlight', 'area', 'textbox', 'drawing', 'stamp')),
  content JSONB NOT NULL, -- Stores highlight data, coordinates, text content
  
  -- PDF-specific positioning data
  page_number INTEGER NOT NULL CHECK (page_number > 0),
  position JSONB NOT NULL, -- Stores x, y, width, height, rects, boundingRect
  
  -- Text content for text-based annotations
  selected_text TEXT, -- The actual text that was highlighted/selected
  comment_text TEXT, -- User's comment/note on the annotation
  
  -- Visual properties
  color VARCHAR(20) DEFAULT '#FFFF00',
  opacity DECIMAL(3,2) DEFAULT 0.3 CHECK (opacity >= 0 AND opacity <= 1),
  
  -- Status and permissions
  is_private BOOLEAN DEFAULT false, -- Private annotations visible only to creator
  is_resolved BOOLEAN DEFAULT false, -- For comment threads that get resolved
  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMPTZ,
  
  -- Collaboration features
  is_anchored BOOLEAN DEFAULT true, -- Whether annotation is anchored to specific text
  anchor_text TEXT, -- Reference text for re-anchoring if PDF changes
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  -- Soft delete
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES users(id)
);

-- 2. Annotation Replies Table - For threaded discussions
CREATE TABLE annotation_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Parent annotation
  annotation_id UUID NOT NULL REFERENCES asset_annotations(id) ON DELETE CASCADE,
  parent_reply_id UUID REFERENCES annotation_replies(id) ON DELETE CASCADE, -- For nested replies
  
  -- Reply content and attribution
  reply_text TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Status
  is_edited BOOLEAN DEFAULT false,
  edited_at TIMESTAMPTZ,
  
  -- Soft delete
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES users(id)
);

-- 3. Annotation Reactions Table - For emoji reactions
CREATE TABLE annotation_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Target (annotation or reply)
  annotation_id UUID REFERENCES asset_annotations(id) ON DELETE CASCADE,
  reply_id UUID REFERENCES annotation_replies(id) ON DELETE CASCADE,
  
  -- User and reaction
  user_id UUID NOT NULL REFERENCES users(id),
  emoji VARCHAR(10) NOT NULL, -- Emoji character or code
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure user can only have one reaction per annotation/reply per emoji
  CONSTRAINT unique_user_reaction UNIQUE (user_id, annotation_id, reply_id, emoji),
  
  -- Ensure either annotation_id or reply_id is set, but not both
  CONSTRAINT annotation_or_reply_check CHECK (
    (annotation_id IS NOT NULL AND reply_id IS NULL) OR 
    (annotation_id IS NULL AND reply_id IS NOT NULL)
  )
);

-- 4. Annotation Mentions Table - For @mentions in comments
CREATE TABLE annotation_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Source (annotation or reply)
  annotation_id UUID REFERENCES asset_annotations(id) ON DELETE CASCADE,
  reply_id UUID REFERENCES annotation_replies(id) ON DELETE CASCADE,
  
  -- Mentioned user
  mentioned_user_id UUID NOT NULL REFERENCES users(id),
  mentioned_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Notification status
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  
  -- Ensure either annotation_id or reply_id is set, but not both
  CONSTRAINT mention_annotation_or_reply_check CHECK (
    (annotation_id IS NOT NULL AND reply_id IS NULL) OR 
    (annotation_id IS NULL AND reply_id IS NOT NULL)
  )
);

-- 5. User Annotation Preferences Table
CREATE TABLE user_annotation_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  
  -- Default annotation settings
  default_color VARCHAR(20) DEFAULT '#FFFF00',
  default_opacity DECIMAL(3,2) DEFAULT 0.3,
  
  -- UI preferences
  show_all_annotations BOOLEAN DEFAULT true,
  show_own_only BOOLEAN DEFAULT false,
  auto_save_annotations BOOLEAN DEFAULT true,
  
  -- Notification preferences
  notify_on_mentions BOOLEAN DEFAULT true,
  notify_on_replies BOOLEAN DEFAULT true,
  notify_on_new_annotations BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_asset_annotations_asset_id ON asset_annotations(asset_id);
CREATE INDEX idx_asset_annotations_vault_id ON asset_annotations(vault_id);
CREATE INDEX idx_asset_annotations_organization_id ON asset_annotations(organization_id);
CREATE INDEX idx_asset_annotations_created_by ON asset_annotations(created_by);
CREATE INDEX idx_asset_annotations_page_number ON asset_annotations(page_number);
CREATE INDEX idx_asset_annotations_type ON asset_annotations(annotation_type);
CREATE INDEX idx_asset_annotations_created_at ON asset_annotations(created_at DESC);
CREATE INDEX idx_asset_annotations_is_deleted ON asset_annotations(is_deleted) WHERE is_deleted = false;

CREATE INDEX idx_annotation_replies_annotation_id ON annotation_replies(annotation_id);
CREATE INDEX idx_annotation_replies_parent_id ON annotation_replies(parent_reply_id);
CREATE INDEX idx_annotation_replies_created_by ON annotation_replies(created_by);
CREATE INDEX idx_annotation_replies_created_at ON annotation_replies(created_at);

CREATE INDEX idx_annotation_reactions_annotation_id ON annotation_reactions(annotation_id);
CREATE INDEX idx_annotation_reactions_reply_id ON annotation_reactions(reply_id);
CREATE INDEX idx_annotation_reactions_user_id ON annotation_reactions(user_id);

CREATE INDEX idx_annotation_mentions_mentioned_user ON annotation_mentions(mentioned_user_id);
CREATE INDEX idx_annotation_mentions_is_read ON annotation_mentions(is_read) WHERE is_read = false;

-- Composite indexes for common queries
CREATE INDEX idx_asset_annotations_asset_page ON asset_annotations(asset_id, page_number) WHERE is_deleted = false;
CREATE INDEX idx_asset_annotations_vault_user ON asset_annotations(vault_id, created_by) WHERE is_deleted = false;

-- Full-text search index for annotation content
CREATE INDEX idx_asset_annotations_search ON asset_annotations USING gin(
  (to_tsvector('english', coalesce(selected_text, '') || ' ' || coalesce(comment_text, '')))
) WHERE is_deleted = false;

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_annotation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_asset_annotations_updated_at
  BEFORE UPDATE ON asset_annotations
  FOR EACH ROW
  EXECUTE FUNCTION update_annotation_timestamp();

CREATE TRIGGER trigger_annotation_replies_updated_at
  BEFORE UPDATE ON annotation_replies
  FOR EACH ROW
  EXECUTE FUNCTION update_annotation_timestamp();

CREATE TRIGGER trigger_user_annotation_preferences_updated_at
  BEFORE UPDATE ON user_annotation_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_annotation_timestamp();

-- Enable Row Level Security
ALTER TABLE asset_annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE annotation_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE annotation_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE annotation_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_annotation_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for asset_annotations
CREATE POLICY "Users can view annotations in their organization's vaults" ON asset_annotations
  FOR SELECT USING (
    organization_id IN (
      SELECT om.organization_id FROM organization_members om 
      WHERE om.user_id = auth.uid() AND om.status = 'active'
    )
    AND (
      is_private = false OR created_by = auth.uid()
    )
    AND is_deleted = false
  );

CREATE POLICY "Users can create annotations in accessible vaults" ON asset_annotations
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT om.organization_id FROM organization_members om 
      WHERE om.user_id = auth.uid() AND om.status = 'active'
    )
    AND created_by = auth.uid()
  );

CREATE POLICY "Users can update their own annotations" ON asset_annotations
  FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own annotations" ON asset_annotations
  FOR DELETE USING (created_by = auth.uid());

-- RLS Policies for annotation_replies
CREATE POLICY "Users can view replies to accessible annotations" ON annotation_replies
  FOR SELECT USING (
    annotation_id IN (
      SELECT id FROM asset_annotations 
      WHERE organization_id IN (
        SELECT om.organization_id FROM organization_members om 
        WHERE om.user_id = auth.uid() AND om.status = 'active'
      )
      AND (is_private = false OR created_by = auth.uid())
      AND is_deleted = false
    )
    AND is_deleted = false
  );

CREATE POLICY "Users can create replies to accessible annotations" ON annotation_replies
  FOR INSERT WITH CHECK (
    annotation_id IN (
      SELECT id FROM asset_annotations 
      WHERE organization_id IN (
        SELECT om.organization_id FROM organization_members om 
        WHERE om.user_id = auth.uid() AND om.status = 'active'
      )
      AND (is_private = false OR created_by = auth.uid())
      AND is_deleted = false
    )
    AND created_by = auth.uid()
  );

CREATE POLICY "Users can update their own replies" ON annotation_replies
  FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own replies" ON annotation_replies
  FOR DELETE USING (created_by = auth.uid());

-- RLS Policies for annotation_reactions
CREATE POLICY "Users can view reactions on accessible annotations" ON annotation_reactions
  FOR SELECT USING (
    (annotation_id IS NOT NULL AND annotation_id IN (
      SELECT id FROM asset_annotations 
      WHERE organization_id IN (
        SELECT om.organization_id FROM organization_members om 
        WHERE om.user_id = auth.uid() AND om.status = 'active'
      )
      AND (is_private = false OR created_by = auth.uid())
      AND is_deleted = false
    ))
    OR
    (reply_id IS NOT NULL AND reply_id IN (
      SELECT ar.id FROM annotation_replies ar
      JOIN asset_annotations aa ON ar.annotation_id = aa.id
      WHERE aa.organization_id IN (
        SELECT om.organization_id FROM organization_members om 
        WHERE om.user_id = auth.uid() AND om.status = 'active'
      )
      AND (aa.is_private = false OR aa.created_by = auth.uid())
      AND aa.is_deleted = false AND ar.is_deleted = false
    ))
  );

CREATE POLICY "Users can add reactions to accessible content" ON annotation_reactions
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can remove their own reactions" ON annotation_reactions
  FOR DELETE USING (user_id = auth.uid());

-- RLS Policies for annotation_mentions
CREATE POLICY "Users can view their own mentions" ON annotation_mentions
  FOR SELECT USING (mentioned_user_id = auth.uid());

CREATE POLICY "Users can create mentions in accessible content" ON annotation_mentions
  FOR INSERT WITH CHECK (mentioned_by = auth.uid());

-- RLS Policies for user_annotation_preferences
CREATE POLICY "Users can manage their own annotation preferences" ON user_annotation_preferences
  FOR ALL USING (user_id = auth.uid());

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON asset_annotations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON annotation_replies TO authenticated;
GRANT SELECT, INSERT, DELETE ON annotation_reactions TO authenticated;
GRANT SELECT, INSERT ON annotation_mentions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_annotation_preferences TO authenticated;

-- Grant sequence permissions if any
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;



-- =====================================================
-- DOWN MIGRATION (Rollback)
-- =====================================================

-- Add rollback instructions here (reverse of UP migration)
-- IMPORTANT: Test your rollback thoroughly!
-- WARNING: This will remove all annotation data permanently!

/*

-- Drop RLS policies
DROP POLICY IF EXISTS "Users can manage their own annotation preferences" ON user_annotation_preferences;
DROP POLICY IF EXISTS "Users can create mentions in accessible content" ON annotation_mentions;
DROP POLICY IF EXISTS "Users can view their own mentions" ON annotation_mentions;
DROP POLICY IF EXISTS "Users can remove their own reactions" ON annotation_reactions;
DROP POLICY IF EXISTS "Users can add reactions to accessible content" ON annotation_reactions;
DROP POLICY IF EXISTS "Users can view reactions on accessible annotations" ON annotation_reactions;
DROP POLICY IF EXISTS "Users can delete their own replies" ON annotation_replies;
DROP POLICY IF EXISTS "Users can update their own replies" ON annotation_replies;
DROP POLICY IF EXISTS "Users can create replies to accessible annotations" ON annotation_replies;
DROP POLICY IF EXISTS "Users can view replies to accessible annotations" ON annotation_replies;
DROP POLICY IF EXISTS "Users can delete their own annotations" ON asset_annotations;
DROP POLICY IF EXISTS "Users can update their own annotations" ON asset_annotations;
DROP POLICY IF EXISTS "Users can create annotations in accessible vaults" ON asset_annotations;
DROP POLICY IF EXISTS "Users can view annotations in their organization's vaults" ON asset_annotations;

-- Drop triggers
DROP TRIGGER IF EXISTS trigger_user_annotation_preferences_updated_at ON user_annotation_preferences;
DROP TRIGGER IF EXISTS trigger_annotation_replies_updated_at ON annotation_replies;
DROP TRIGGER IF EXISTS trigger_asset_annotations_updated_at ON asset_annotations;

-- Drop function
DROP FUNCTION IF EXISTS update_annotation_timestamp();

-- Drop indexes
DROP INDEX IF EXISTS idx_asset_annotations_search;
DROP INDEX IF EXISTS idx_asset_annotations_vault_user;
DROP INDEX IF EXISTS idx_asset_annotations_asset_page;
DROP INDEX IF EXISTS idx_annotation_mentions_is_read;
DROP INDEX IF EXISTS idx_annotation_mentions_mentioned_user;
DROP INDEX IF EXISTS idx_annotation_reactions_user_id;
DROP INDEX IF EXISTS idx_annotation_reactions_reply_id;
DROP INDEX IF EXISTS idx_annotation_reactions_annotation_id;
DROP INDEX IF EXISTS idx_annotation_replies_created_at;
DROP INDEX IF EXISTS idx_annotation_replies_created_by;
DROP INDEX IF EXISTS idx_annotation_replies_parent_id;
DROP INDEX IF EXISTS idx_annotation_replies_annotation_id;
DROP INDEX IF EXISTS idx_asset_annotations_is_deleted;
DROP INDEX IF EXISTS idx_asset_annotations_created_at;
DROP INDEX IF EXISTS idx_asset_annotations_type;
DROP INDEX IF EXISTS idx_asset_annotations_page_number;
DROP INDEX IF EXISTS idx_asset_annotations_created_by;
DROP INDEX IF EXISTS idx_asset_annotations_organization_id;
DROP INDEX IF EXISTS idx_asset_annotations_vault_id;
DROP INDEX IF EXISTS idx_asset_annotations_asset_id;

-- Drop tables (in reverse dependency order)
DROP TABLE IF EXISTS user_annotation_preferences;
DROP TABLE IF EXISTS annotation_mentions;
DROP TABLE IF EXISTS annotation_reactions;
DROP TABLE IF EXISTS annotation_replies;
DROP TABLE IF EXISTS asset_annotations;

*/

-- =====================================================
-- MIGRATION NOTES
-- =====================================================

-- Additional notes about this migration:
-- 
-- PROBLEM SOLVED:
-- - Enables collaborative PDF annotation with highlights and comments
-- - Supports multi-user annotation viewing in same vault
-- - Provides threaded discussions on annotations
-- - Enables real-time collaboration features
-- 
-- SPECIAL CONSIDERATIONS:
-- - Uses JSONB for flexible annotation position data compatible with react-pdf-highlighter
-- - Implements soft delete for data recovery
-- - Full-text search enabled on annotation content
-- - RLS policies ensure vault-based access control
-- 
-- BREAKING CHANGES:
-- - None (new feature addition)
-- 
-- PERFORMANCE IMPACT:
-- - Optimized indexes for common queries (asset + page, vault + user)
-- - Full-text search index for annotation content search
-- - Composite indexes for multi-column queries
-- 
-- REQUIRED APPLICATION CHANGES:
-- - Need to install react-pdf-highlighter-extended package
-- - Implement PDF viewer component with annotation support
-- - Create annotation API endpoints
-- - Add real-time sync for collaborative features
-- - Update TypeScript types to include new tables

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
