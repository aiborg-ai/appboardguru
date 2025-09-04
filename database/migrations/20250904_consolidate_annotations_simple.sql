-- =====================================================
-- SIMPLIFIED CONSOLIDATE ANNOTATION SYSTEMS
-- Migration: 20250904_consolidate_annotations_simple
-- Description: Simplified migration for Supabase Dashboard
-- =====================================================

-- Step 1: Add new columns to asset_annotations if they don't exist
ALTER TABLE asset_annotations 
ADD COLUMN IF NOT EXISTS voice_url TEXT;

ALTER TABLE asset_annotations 
ADD COLUMN IF NOT EXISTS voice_transcription TEXT;

ALTER TABLE asset_annotations 
ADD COLUMN IF NOT EXISTS shared_with UUID[] DEFAULT '{}';

ALTER TABLE asset_annotations 
ADD COLUMN IF NOT EXISTS annotation_subtype VARCHAR(50);

-- Step 2: Add index for shared_with array
CREATE INDEX IF NOT EXISTS idx_asset_annotations_shared_with 
ON asset_annotations USING gin(shared_with);

-- Step 3: Create backwards compatibility view (safe to replace)
CREATE OR REPLACE VIEW document_annotations_compat AS
SELECT
    aa.id,
    aa.asset_id,
    aa.created_by as user_id,
    (SELECT full_name FROM users u WHERE u.id = aa.created_by) as user_name,
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
        'x', CASE 
            WHEN aa.position IS NOT NULL AND aa.position->'boundingRect' IS NOT NULL 
            THEN (aa.position->'boundingRect'->>'x1')::float 
            ELSE 0 
        END,
        'y', CASE 
            WHEN aa.position IS NOT NULL AND aa.position->'boundingRect' IS NOT NULL 
            THEN (aa.position->'boundingRect'->>'y1')::float 
            ELSE 0 
        END,
        'width', CASE 
            WHEN aa.position IS NOT NULL AND aa.position->'boundingRect' IS NOT NULL 
            THEN (aa.position->'boundingRect'->>'width')::float 
            ELSE 100 
        END,
        'height', CASE 
            WHEN aa.position IS NOT NULL AND aa.position->'boundingRect' IS NOT NULL 
            THEN (aa.position->'boundingRect'->>'height')::float 
            ELSE 30 
        END,
        'rects', CASE 
            WHEN aa.position IS NOT NULL AND aa.position->'rects' IS NOT NULL 
            THEN aa.position->'rects' 
            ELSE '[]'::jsonb 
        END
    ) as coordinates,
    aa.selected_text as reference_text,
    NOT aa.is_private as is_shared,
    aa.shared_with,
    aa.created_at,
    aa.updated_at
FROM asset_annotations aa
WHERE aa.is_deleted = false;

-- Step 4: Grant permissions on the view
GRANT SELECT ON document_annotations_compat TO authenticated;

-- Step 5: Add new RLS policy for shared annotations (if doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'asset_annotations' 
        AND policyname = 'Users can view shared annotations'
    ) THEN
        CREATE POLICY "Users can view shared annotations" ON asset_annotations
            FOR SELECT USING (
                auth.uid() = ANY(shared_with) OR
                created_by = auth.uid() OR
                NOT is_private
            );
    END IF;
END$$;

-- Step 6: Create simple function for voice annotations
CREATE OR REPLACE FUNCTION process_voice_annotation(
    p_annotation_id UUID,
    p_audio_data TEXT,
    p_transcribe BOOLEAN DEFAULT false
) RETURNS JSONB 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
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
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION process_voice_annotation TO authenticated;

-- Step 7: Check if document_annotations table exists and migrate data
DO $$
DECLARE
    v_table_exists BOOLEAN;
BEGIN
    -- Check if table exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'document_annotations'
    ) INTO v_table_exists;

    IF v_table_exists THEN
        RAISE NOTICE 'document_annotations table exists, attempting migration...';
        
        -- Simple migration without complex joins
        INSERT INTO asset_annotations (
            id,
            asset_id,
            created_by,
            annotation_type,
            annotation_subtype,
            content,
            page_number,
            position,
            selected_text,
            comment_text,
            voice_url,
            color,
            opacity,
            is_private,
            shared_with,
            created_at,
            updated_at
        )
        SELECT 
            da.id,
            da.asset_id,
            da.user_id,
            CASE 
                WHEN da.type = 'voice' THEN 'voice'::annotation_type
                ELSE 'textbox'::annotation_type
            END,
            da.type,
            jsonb_build_object(
                'text', da.content,
                'audioUrl', da.voice_url,
                'originalType', da.type
            ),
            COALESCE(da.page, 1),
            jsonb_build_object(
                'pageNumber', COALESCE(da.page, 1),
                'rects', '[]'::jsonb,
                'boundingRect', jsonb_build_object(
                    'x1', 0,
                    'y1', 0,
                    'x2', 100,
                    'y2', 30,
                    'width', 100,
                    'height', 30
                )
            ),
            da.reference_text,
            da.content,
            da.voice_url,
            '#FFFF00',
            0.3,
            NOT COALESCE(da.is_shared, true),
            COALESCE(da.shared_with, ARRAY[]::UUID[]),
            da.created_at,
            da.updated_at
        FROM document_annotations da
        WHERE NOT EXISTS (
            SELECT 1 FROM asset_annotations aa 
            WHERE aa.id = da.id
        );
        
        RAISE NOTICE 'Migration completed';
    ELSE
        RAISE NOTICE 'document_annotations table does not exist, skipping migration';
    END IF;
END$$;

-- Success message
SELECT 'Migration completed successfully!' as message;