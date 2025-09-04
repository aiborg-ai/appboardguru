-- =====================================================
-- FIXED CONSOLIDATE ANNOTATION SYSTEMS
-- Migration: 20250904_consolidate_annotations_fixed
-- Description: Fixed migration that checks column existence
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

-- Step 3: Check which column exists and create appropriate view
DO $$
DECLARE
    v_column_exists BOOLEAN;
    v_user_column TEXT;
BEGIN
    -- Check if 'created_by' column exists
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'asset_annotations' 
        AND column_name = 'created_by'
    ) INTO v_column_exists;
    
    IF v_column_exists THEN
        v_user_column := 'created_by';
    ELSE
        -- Check for other possible column names
        SELECT column_name INTO v_user_column
        FROM information_schema.columns 
        WHERE table_name = 'asset_annotations' 
        AND column_name IN ('user_id', 'author_id', 'creator_id')
        LIMIT 1;
        
        IF v_user_column IS NULL THEN
            RAISE NOTICE 'No user column found, using NULL for user_id';
            v_user_column := 'NULL';
        END IF;
    END IF;
    
    -- Create view dynamically based on column existence
    IF v_user_column = 'created_by' THEN
        EXECUTE 'CREATE OR REPLACE VIEW document_annotations_compat AS
        SELECT
            aa.id,
            aa.asset_id,
            aa.created_by as user_id,
            NULL as user_name,
            COALESCE(
                aa.annotation_subtype,
                CASE aa.annotation_type
                    WHEN ''textbox'' THEN ''comment''
                    WHEN ''voice'' THEN ''voice''
                    WHEN ''highlight'' THEN ''note''
                    ELSE ''comment''
                END
            ) as type,
            aa.comment_text as content,
            aa.voice_url,
            aa.page_number as page,
            jsonb_build_object(
                ''x'', 0,
                ''y'', 0,
                ''width'', 100,
                ''height'', 30,
                ''rects'', ''[]''::jsonb
            ) as coordinates,
            aa.selected_text as reference_text,
            NOT aa.is_private as is_shared,
            aa.shared_with,
            aa.created_at,
            aa.updated_at
        FROM asset_annotations aa
        WHERE aa.is_deleted = false';
    ELSE
        RAISE NOTICE 'Created view with minimal column mapping';
        EXECUTE 'CREATE OR REPLACE VIEW document_annotations_compat AS
        SELECT
            aa.id,
            aa.asset_id,
            NULL::UUID as user_id,
            NULL as user_name,
            ''comment'' as type,
            aa.comment_text as content,
            aa.voice_url,
            aa.page_number as page,
            jsonb_build_object(
                ''x'', 0,
                ''y'', 0,
                ''width'', 100,
                ''height'', 30,
                ''rects'', ''[]''::jsonb
            ) as coordinates,
            aa.selected_text as reference_text,
            false as is_shared,
            aa.shared_with,
            aa.created_at,
            aa.updated_at
        FROM asset_annotations aa
        WHERE aa.is_deleted = false';
    END IF;
END$$;

-- Step 4: Grant permissions on the view
GRANT SELECT ON document_annotations_compat TO authenticated;

-- Step 5: Add new RLS policy for shared annotations (if doesn't exist)
DO $$
BEGIN
    -- Check if created_by column exists before creating policy
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'asset_annotations' 
        AND column_name = 'created_by'
    ) THEN
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
    ELSE
        RAISE NOTICE 'Skipping RLS policy - created_by column not found';
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

-- Success message
SELECT 'Migration completed successfully!' as message;