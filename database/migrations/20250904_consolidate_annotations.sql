-- =====================================================
-- CONSOLIDATE ANNOTATION SYSTEMS
-- Migration: 20250904_consolidate_annotations
-- Description: Consolidate document_annotations into asset_annotations
-- Author: System
-- Created: 2025-09-04
-- =====================================================

-- =====================================================
-- UP MIGRATION
-- =====================================================

BEGIN;

-- Step 1: Add voice support and shared permissions to asset_annotations
ALTER TABLE asset_annotations 
ADD COLUMN IF NOT EXISTS voice_url TEXT,
ADD COLUMN IF NOT EXISTS voice_transcription TEXT,
ADD COLUMN IF NOT EXISTS shared_with UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS annotation_subtype VARCHAR(50); -- To preserve original type

-- Add index for shared_with array
CREATE INDEX IF NOT EXISTS idx_asset_annotations_shared_with 
ON asset_annotations USING gin(shared_with);

-- Step 2: Check if document_annotations table exists and has data
DO $$
DECLARE
    v_table_exists BOOLEAN;
    v_has_data BOOLEAN;
BEGIN
    -- Check if table exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'document_annotations'
    ) INTO v_table_exists;

    IF v_table_exists THEN
        -- Check if table has data
        SELECT EXISTS (
            SELECT 1 FROM document_annotations LIMIT 1
        ) INTO v_has_data;

        IF v_has_data THEN
            RAISE NOTICE 'Migrating document_annotations to asset_annotations...';
            
            -- Step 3: Migrate annotations from document_annotations
            INSERT INTO asset_annotations (
                id,
                asset_id,
                vault_id,
                organization_id,
                created_by,
                created_at,
                updated_at,
                annotation_type,
                annotation_subtype,
                content,
                page_number,
                position,
                selected_text,
                comment_text,
                voice_url,
                voice_transcription,
                color,
                opacity,
                is_private,
                is_resolved,
                shared_with,
                metadata
            )
            SELECT 
                COALESCE(da.id, gen_random_uuid()),
                da.asset_id,
                va.vault_id, -- Get vault_id from vault_assets
                COALESCE(a.organization_id, v.organization_id), -- Get org from asset or vault
                da.user_id,
                da.created_at,
                da.updated_at,
                CASE 
                    WHEN da.type = 'voice' THEN 'voice'
                    WHEN da.type IN ('comment', 'question', 'note') THEN 'textbox'
                    ELSE 'textbox'
                END AS annotation_type,
                da.type AS annotation_subtype, -- Preserve original type
                jsonb_build_object(
                    'text', da.content,
                    'audioUrl', da.voice_url,
                    'originalType', da.type,
                    'userName', da.user_name
                ) AS content,
                da.page,
                jsonb_build_object(
                    'pageNumber', da.page,
                    'rects', CASE 
                        WHEN da.coordinates ? 'rects' THEN da.coordinates->'rects'
                        ELSE jsonb_build_array(
                            jsonb_build_object(
                                'x1', COALESCE((da.coordinates->>'x')::float, 0),
                                'y1', COALESCE((da.coordinates->>'y')::float, 0),
                                'x2', COALESCE((da.coordinates->>'x')::float, 0) + COALESCE((da.coordinates->>'width')::float, 100),
                                'y2', COALESCE((da.coordinates->>'y')::float, 0) + COALESCE((da.coordinates->>'height')::float, 30),
                                'width', COALESCE((da.coordinates->>'width')::float, 100),
                                'height', COALESCE((da.coordinates->>'height')::float, 30)
                            )
                        )
                    END,
                    'boundingRect', jsonb_build_object(
                        'x1', COALESCE((da.coordinates->>'x')::float, 0),
                        'y1', COALESCE((da.coordinates->>'y')::float, 0),
                        'x2', COALESCE((da.coordinates->>'x')::float, 0) + COALESCE((da.coordinates->>'width')::float, 100),
                        'y2', COALESCE((da.coordinates->>'y')::float, 0) + COALESCE((da.coordinates->>'height')::float, 30),
                        'width', COALESCE((da.coordinates->>'width')::float, 100),
                        'height', COALESCE((da.coordinates->>'height')::float, 30)
                    )
                ) AS position,
                da.reference_text,
                da.content,
                da.voice_url,
                NULL AS voice_transcription, -- Could be populated if needed
                COALESCE(da.color, '#FFFF00'),
                COALESCE(da.opacity, 0.3),
                NOT COALESCE(da.is_shared, true), -- Inverse logic
                false, -- Not resolved by default
                COALESCE(da.shared_with, ARRAY[]::UUID[]),
                jsonb_build_object(
                    'migrated_from', 'document_annotations',
                    'migrated_at', NOW(),
                    'original_type', da.type
                ) AS metadata
            FROM document_annotations da
            LEFT JOIN vault_assets va ON da.asset_id = va.id
            LEFT JOIN assets a ON da.asset_id = a.id
            LEFT JOIN vaults v ON va.vault_id = v.id
            WHERE NOT EXISTS (
                SELECT 1 FROM asset_annotations aa 
                WHERE aa.id = da.id
            );

            RAISE NOTICE 'Annotations migrated successfully';

            -- Step 4: Migrate annotation replies if table exists
            IF EXISTS (
                SELECT 1 FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'document_annotation_replies'
            ) THEN
                RAISE NOTICE 'Migrating annotation replies...';
                
                INSERT INTO annotation_replies (
                    id,
                    annotation_id,
                    parent_reply_id,
                    reply_text,
                    created_by,
                    created_at,
                    updated_at
                )
                SELECT
                    COALESCE(dar.id, gen_random_uuid()),
                    dar.annotation_id,
                    NULL, -- No parent reply tracking in old system
                    dar.content,
                    dar.user_id,
                    dar.created_at,
                    dar.updated_at
                FROM document_annotation_replies dar
                WHERE EXISTS (
                    SELECT 1 FROM asset_annotations aa
                    WHERE aa.id = dar.annotation_id
                )
                AND NOT EXISTS (
                    SELECT 1 FROM annotation_replies ar
                    WHERE ar.id = dar.id
                );
                
                RAISE NOTICE 'Annotation replies migrated successfully';
            END IF;
        ELSE
            RAISE NOTICE 'No data to migrate from document_annotations';
        END IF;
    ELSE
        RAISE NOTICE 'document_annotations table does not exist, skipping migration';
    END IF;
END$$;

-- Step 5: Create backwards compatibility view
CREATE OR REPLACE VIEW document_annotations_compat AS
SELECT
    aa.id,
    aa.asset_id,
    aa.created_by as user_id,
    u.full_name as user_name,
    COALESCE(
        aa.annotation_subtype,
        CASE aa.annotation_type
            WHEN 'textbox' THEN 'comment'
            WHEN 'voice' THEN 'voice'
            WHEN 'highlight' THEN 'note'
            ELSE 'comment'
        END
    ) as type,
    aa.comment_text as content,
    aa.voice_url,
    aa.page_number as page,
    jsonb_build_object(
        'x', (aa.position->'boundingRect'->>'x1')::float,
        'y', (aa.position->'boundingRect'->>'y1')::float,
        'width', (aa.position->'boundingRect'->>'width')::float,
        'height', (aa.position->'boundingRect'->>'height')::float,
        'rects', aa.position->'rects'
    ) as coordinates,
    aa.selected_text as reference_text,
    NOT aa.is_private as is_shared,
    aa.shared_with,
    aa.created_at,
    aa.updated_at
FROM asset_annotations aa
LEFT JOIN users u ON aa.created_by = u.id
WHERE aa.is_deleted = false;

-- Grant permissions on the view
GRANT SELECT ON document_annotations_compat TO authenticated;

-- Step 6: Update RLS policies for shared_with support
CREATE POLICY "Users can view shared annotations" ON asset_annotations
    FOR SELECT USING (
        auth.uid() = ANY(shared_with) OR
        created_by = auth.uid() OR
        NOT is_private
    );

-- Step 7: Create function to handle voice annotation uploads
CREATE OR REPLACE FUNCTION process_voice_annotation(
    p_annotation_id UUID,
    p_audio_data TEXT,
    p_transcribe BOOLEAN DEFAULT false
) RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
BEGIN
    -- Update the annotation with voice data
    UPDATE asset_annotations
    SET 
        voice_url = p_audio_data,
        voice_transcription = CASE 
            WHEN p_transcribe THEN 'Transcription pending...'
            ELSE NULL
        END,
        updated_at = NOW()
    WHERE id = p_annotation_id;

    -- Return success result
    v_result := jsonb_build_object(
        'success', true,
        'annotation_id', p_annotation_id,
        'voice_url', p_audio_data
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION process_voice_annotation TO authenticated;

COMMIT;

-- =====================================================
-- DOWN MIGRATION (Rollback)
-- =====================================================

/*
BEGIN;

-- Remove backwards compatibility view
DROP VIEW IF EXISTS document_annotations_compat;

-- Remove voice annotation function
DROP FUNCTION IF EXISTS process_voice_annotation;

-- Remove new RLS policy
DROP POLICY IF EXISTS "Users can view shared annotations" ON asset_annotations;

-- Remove migrated records (if we can identify them)
DELETE FROM asset_annotations 
WHERE metadata->>'migrated_from' = 'document_annotations';

-- Remove added columns
ALTER TABLE asset_annotations 
DROP COLUMN IF EXISTS voice_url,
DROP COLUMN IF EXISTS voice_transcription,
DROP COLUMN IF EXISTS shared_with,
DROP COLUMN IF EXISTS annotation_subtype;

-- Drop index
DROP INDEX IF EXISTS idx_asset_annotations_shared_with;

COMMIT;
*/

-- =====================================================
-- MIGRATION NOTES
-- =====================================================

-- Additional notes about this migration:
-- 
-- PROBLEM SOLVED:
-- - Consolidates two parallel annotation systems into one
-- - Preserves all features from both systems
-- - Adds voice annotation support to main system
-- - Maintains backwards compatibility
-- 
-- SPECIAL CONSIDERATIONS:
-- - document_annotations table is NOT dropped (preserved for rollback)
-- - Backwards compatibility view allows gradual migration
-- - Original annotation types preserved in annotation_subtype
-- - Voice URLs stored both in column and content JSONB
-- 
-- BREAKING CHANGES:
-- - None - backwards compatibility view maintains old interface
-- 
-- PERFORMANCE IMPACT:
-- - New GIN index on shared_with array
-- - Compatibility view may have slight overhead
-- 
-- REQUIRED APPLICATION CHANGES:
-- - Update collaborative document service to use asset_annotations
-- - Update annotation stores to use consolidated table
-- - Test voice annotation functionality
-- - Update TypeScript types to include new fields

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================