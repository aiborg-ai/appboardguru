-- =====================================================
-- ENHANCE ANNOTATION RLS FOR VAULT-BASED ACCESS
-- Migration: 20250103_enhance_annotation_rls_vault_access
-- Description: Update RLS policies to allow vault members to collaborate on annotations
-- Author: system
-- Created: 2025-01-03
-- =====================================================

-- =====================================================
-- UP MIGRATION
-- =====================================================

-- Drop existing RLS policies on asset_annotations to replace them
DROP POLICY IF EXISTS "Users can view annotations in their organization" ON asset_annotations;
DROP POLICY IF EXISTS "Users can create annotations in their organization" ON asset_annotations;
DROP POLICY IF EXISTS "Users can update their own annotations" ON asset_annotations;
DROP POLICY IF EXISTS "Users can delete their own annotations" ON asset_annotations;

-- Create new RLS policies for vault-based access

-- 1. View Policy: Users can view annotations in vaults they're members of
CREATE POLICY "Vault members can view annotations" ON asset_annotations
  FOR SELECT
  USING (
    -- User can see annotations if they're a member of the vault
    EXISTS (
      SELECT 1 FROM vault_members vm
      WHERE vm.vault_id = asset_annotations.vault_id
        AND vm.user_id = auth.uid()
        AND vm.status = 'active'
    )
    OR
    -- Or if they're in the same organization (for legacy support)
    organization_id IN (
      SELECT organization_id FROM users
      WHERE id = auth.uid()
    )
    OR
    -- Creator can always see their own annotations
    created_by = auth.uid()
  );

-- 2. Create Policy: Active vault members can create annotations
CREATE POLICY "Active vault members can create annotations" ON asset_annotations
  FOR INSERT
  WITH CHECK (
    -- User must be an active member of the vault with appropriate role
    EXISTS (
      SELECT 1 FROM vault_members vm
      WHERE vm.vault_id = asset_annotations.vault_id
        AND vm.user_id = auth.uid()
        AND vm.status = 'active'
        AND vm.role IN ('contributor', 'moderator', 'admin', 'owner')
    )
    AND
    -- Must be creating annotation as themselves
    created_by = auth.uid()
  );

-- 3. Update Policy: Users can update their own annotations or moderators/admins can update any
CREATE POLICY "Users can update annotations based on role" ON asset_annotations
  FOR UPDATE
  USING (
    -- Creator can update their own annotation
    created_by = auth.uid()
    OR
    -- Moderators and admins can update any annotation in their vault
    EXISTS (
      SELECT 1 FROM vault_members vm
      WHERE vm.vault_id = asset_annotations.vault_id
        AND vm.user_id = auth.uid()
        AND vm.status = 'active'
        AND vm.role IN ('moderator', 'admin', 'owner')
    )
  );

-- 4. Delete Policy: Soft delete by creator or vault admins
CREATE POLICY "Users can delete annotations based on role" ON asset_annotations
  FOR DELETE
  USING (
    -- Creator can delete their own annotation
    created_by = auth.uid()
    OR
    -- Admins and owners can delete any annotation in their vault
    EXISTS (
      SELECT 1 FROM vault_members vm
      WHERE vm.vault_id = asset_annotations.vault_id
        AND vm.user_id = auth.uid()
        AND vm.status = 'active'
        AND vm.role IN ('admin', 'owner')
    )
  );

-- Update RLS policies for annotation_replies table

DROP POLICY IF EXISTS "Users can view replies in their organization" ON annotation_replies;
DROP POLICY IF EXISTS "Users can create replies to visible annotations" ON annotation_replies;
DROP POLICY IF EXISTS "Users can update their own replies" ON annotation_replies;
DROP POLICY IF EXISTS "Users can delete their own replies" ON annotation_replies;

-- 1. View replies policy
CREATE POLICY "Vault members can view replies" ON annotation_replies
  FOR SELECT
  USING (
    -- User can see replies if they can see the parent annotation
    EXISTS (
      SELECT 1 FROM asset_annotations aa
      JOIN vault_members vm ON vm.vault_id = aa.vault_id
      WHERE aa.id = annotation_replies.annotation_id
        AND vm.user_id = auth.uid()
        AND vm.status = 'active'
    )
  );

-- 2. Create replies policy - all active vault members can reply
CREATE POLICY "Active vault members can create replies" ON annotation_replies
  FOR INSERT
  WITH CHECK (
    -- User must be able to see the parent annotation
    EXISTS (
      SELECT 1 FROM asset_annotations aa
      JOIN vault_members vm ON vm.vault_id = aa.vault_id
      WHERE aa.id = annotation_replies.annotation_id
        AND vm.user_id = auth.uid()
        AND vm.status = 'active'
    )
    AND
    -- Must be creating reply as themselves
    created_by = auth.uid()
  );

-- 3. Update replies policy
CREATE POLICY "Users can update their own replies" ON annotation_replies
  FOR UPDATE
  USING (created_by = auth.uid());

-- 4. Delete replies policy
CREATE POLICY "Users can delete their own replies or admins can delete any" ON annotation_replies
  FOR DELETE
  USING (
    created_by = auth.uid()
    OR
    -- Vault admins can delete any reply
    EXISTS (
      SELECT 1 FROM asset_annotations aa
      JOIN vault_members vm ON vm.vault_id = aa.vault_id
      WHERE aa.id = annotation_replies.annotation_id
        AND vm.user_id = auth.uid()
        AND vm.status = 'active'
        AND vm.role IN ('admin', 'owner')
    )
  );

-- Update RLS policies for annotation_reactions table

DROP POLICY IF EXISTS "Users can view reactions" ON annotation_reactions;
DROP POLICY IF EXISTS "Users can add reactions" ON annotation_reactions;
DROP POLICY IF EXISTS "Users can remove their reactions" ON annotation_reactions;

-- 1. View reactions policy
CREATE POLICY "Vault members can view reactions" ON annotation_reactions
  FOR SELECT
  USING (
    -- User can see reactions on annotations they can see
    CASE 
      WHEN annotation_id IS NOT NULL THEN
        EXISTS (
          SELECT 1 FROM asset_annotations aa
          JOIN vault_members vm ON vm.vault_id = aa.vault_id
          WHERE aa.id = annotation_reactions.annotation_id
            AND vm.user_id = auth.uid()
            AND vm.status = 'active'
        )
      WHEN reply_id IS NOT NULL THEN
        EXISTS (
          SELECT 1 FROM annotation_replies ar
          JOIN asset_annotations aa ON aa.id = ar.annotation_id
          JOIN vault_members vm ON vm.vault_id = aa.vault_id
          WHERE ar.id = annotation_reactions.reply_id
            AND vm.user_id = auth.uid()
            AND vm.status = 'active'
        )
      ELSE FALSE
    END
  );

-- 2. Create reactions policy
CREATE POLICY "Active vault members can add reactions" ON annotation_reactions
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND
    CASE 
      WHEN annotation_id IS NOT NULL THEN
        EXISTS (
          SELECT 1 FROM asset_annotations aa
          JOIN vault_members vm ON vm.vault_id = aa.vault_id
          WHERE aa.id = annotation_reactions.annotation_id
            AND vm.user_id = auth.uid()
            AND vm.status = 'active'
        )
      WHEN reply_id IS NOT NULL THEN
        EXISTS (
          SELECT 1 FROM annotation_replies ar
          JOIN asset_annotations aa ON aa.id = ar.annotation_id
          JOIN vault_members vm ON vm.vault_id = aa.vault_id
          WHERE ar.id = annotation_reactions.reply_id
            AND vm.user_id = auth.uid()
            AND vm.status = 'active'
        )
      ELSE FALSE
    END
  );

-- 3. Delete reactions policy
CREATE POLICY "Users can remove their own reactions" ON annotation_reactions
  FOR DELETE
  USING (user_id = auth.uid());

-- Update RLS policies for annotation_mentions table

DROP POLICY IF EXISTS "Users can view their mentions" ON annotation_mentions;
DROP POLICY IF EXISTS "Users can create mentions" ON annotation_mentions;

-- 1. View mentions policy
CREATE POLICY "Users can view mentions in their vaults" ON annotation_mentions
  FOR SELECT
  USING (
    -- User can see mentions if they're mentioned or in the same vault
    mentioned_user_id = auth.uid()
    OR
    CASE 
      WHEN annotation_id IS NOT NULL THEN
        EXISTS (
          SELECT 1 FROM asset_annotations aa
          JOIN vault_members vm ON vm.vault_id = aa.vault_id
          WHERE aa.id = annotation_mentions.annotation_id
            AND vm.user_id = auth.uid()
            AND vm.status = 'active'
        )
      WHEN reply_id IS NOT NULL THEN
        EXISTS (
          SELECT 1 FROM annotation_replies ar
          JOIN asset_annotations aa ON aa.id = ar.annotation_id
          JOIN vault_members vm ON vm.vault_id = aa.vault_id
          WHERE ar.id = annotation_mentions.reply_id
            AND vm.user_id = auth.uid()
            AND vm.status = 'active'
        )
      ELSE FALSE
    END
  );

-- 2. Create mentions policy
CREATE POLICY "Active vault members can create mentions" ON annotation_mentions
  FOR INSERT
  WITH CHECK (
    mentioned_by = auth.uid()
    AND
    -- Can only mention users who are also vault members
    EXISTS (
      SELECT 1 FROM vault_members vm1
      JOIN vault_members vm2 ON vm1.vault_id = vm2.vault_id
      WHERE vm1.user_id = auth.uid()
        AND vm2.user_id = mentioned_user_id
        AND vm1.status = 'active'
        AND vm2.status = 'active'
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_asset_annotations_vault_id ON asset_annotations(vault_id);
CREATE INDEX IF NOT EXISTS idx_asset_annotations_vault_created ON asset_annotations(vault_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_asset_annotations_vault_resolved ON asset_annotations(vault_id, is_resolved);
CREATE INDEX IF NOT EXISTS idx_annotation_replies_annotation_created ON annotation_replies(annotation_id, created_at);

-- =====================================================
-- DOWN MIGRATION (Commented out for safety)
-- =====================================================
-- To rollback, you would need to:
-- 1. Drop the new policies
-- 2. Recreate the old policies
-- 3. Drop the new indexes