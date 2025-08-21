-- Document Viewer Enhancements Migration
-- This migration adds all the necessary tables to support the enhanced document viewer features

-- Table for storing AI-generated table of contents
CREATE TABLE IF NOT EXISTS document_table_of_contents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    asset_id UUID NOT NULL REFERENCES vault_assets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content JSONB NOT NULL, -- Stores the hierarchical TOC structure
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes for performance
    UNIQUE(asset_id, created_at DESC)
);

-- Table for caching document search results
CREATE TABLE IF NOT EXISTS document_search_cache (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    asset_id UUID NOT NULL REFERENCES vault_assets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    query TEXT NOT NULL,
    results JSONB NOT NULL, -- Stores array of search results
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes for performance
    INDEX(asset_id, query),
    INDEX(created_at)
);

-- Table for storing AI-generated document summaries
CREATE TABLE IF NOT EXISTS document_summaries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    asset_id UUID NOT NULL REFERENCES vault_assets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    key_points TEXT[] NOT NULL, -- Array of key points
    word_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes for performance
    INDEX(asset_id, created_at DESC)
);

-- Table for storing AI-generated document podcasts
CREATE TABLE IF NOT EXISTS document_podcasts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    asset_id UUID NOT NULL REFERENCES vault_assets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    duration INTEGER NOT NULL, -- Duration in seconds
    audio_url TEXT NOT NULL, -- URL to the generated audio file
    transcript TEXT NOT NULL, -- Full transcript of the podcast
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes for performance
    INDEX(asset_id, created_at DESC)
);

-- Table for storing document annotations (notes, comments, questions, voice notes)
CREATE TABLE IF NOT EXISTS document_annotations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    asset_id UUID NOT NULL REFERENCES vault_assets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_name TEXT NOT NULL, -- Cached user display name for performance
    type TEXT NOT NULL CHECK (type IN ('comment', 'question', 'note', 'voice')),
    content TEXT NOT NULL,
    voice_url TEXT, -- URL to voice recording (for voice annotations)
    page INTEGER NOT NULL, -- Page number where annotation is located
    coordinates JSONB, -- x, y, width, height coordinates on the page
    reference_text TEXT, -- Text that was selected/referenced
    is_shared BOOLEAN NOT NULL DEFAULT FALSE,
    shared_with UUID[] DEFAULT '{}', -- Array of user IDs with whom annotation is shared
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes for performance
    INDEX(asset_id, page),
    INDEX(user_id, created_at DESC),
    INDEX(type),
    INDEX(is_shared)
);

-- Table for storing replies to annotations
CREATE TABLE IF NOT EXISTS document_annotation_replies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    annotation_id UUID NOT NULL REFERENCES document_annotations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_name TEXT NOT NULL, -- Cached user display name for performance
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes for performance
    INDEX(annotation_id, created_at),
    INDEX(user_id)
);

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE document_table_of_contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_search_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_podcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_annotation_replies ENABLE ROW LEVEL SECURITY;

-- Policies for document_table_of_contents
CREATE POLICY "Users can view TOC for assets they own" ON document_table_of_contents
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM vault_assets va
            JOIN vaults v ON va.vault_id = v.id
            WHERE va.id = asset_id AND v.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create TOC for assets they own" ON document_table_of_contents
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM vault_assets va
            JOIN vaults v ON va.vault_id = v.id
            WHERE va.id = asset_id AND v.user_id = auth.uid()
        )
    );

-- Policies for document_search_cache
CREATE POLICY "Users can view search cache for assets they own" ON document_search_cache
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM vault_assets va
            JOIN vaults v ON va.vault_id = v.id
            WHERE va.id = asset_id AND v.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create search cache for assets they own" ON document_search_cache
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM vault_assets va
            JOIN vaults v ON va.vault_id = v.id
            WHERE va.id = asset_id AND v.user_id = auth.uid()
        )
    );

-- Policies for document_summaries
CREATE POLICY "Users can view summaries for assets they own" ON document_summaries
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM vault_assets va
            JOIN vaults v ON va.vault_id = v.id
            WHERE va.id = asset_id AND v.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create summaries for assets they own" ON document_summaries
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM vault_assets va
            JOIN vaults v ON va.vault_id = v.id
            WHERE va.id = asset_id AND v.user_id = auth.uid()
        )
    );

-- Policies for document_podcasts
CREATE POLICY "Users can view podcasts for assets they own" ON document_podcasts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM vault_assets va
            JOIN vaults v ON va.vault_id = v.id
            WHERE va.id = asset_id AND v.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create podcasts for assets they own" ON document_podcasts
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM vault_assets va
            JOIN vaults v ON va.vault_id = v.id
            WHERE va.id = asset_id AND v.user_id = auth.uid()
        )
    );

-- Policies for document_annotations
CREATE POLICY "Users can view annotations for assets they own or shared annotations" ON document_annotations
    FOR SELECT USING (
        -- Own annotations
        auth.uid() = user_id OR
        -- Shared annotations
        (is_shared = true AND auth.uid() = ANY(shared_with)) OR
        -- Asset owner can see all annotations
        EXISTS (
            SELECT 1 FROM vault_assets va
            JOIN vaults v ON va.vault_id = v.id
            WHERE va.id = asset_id AND v.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create annotations for assets they own" ON document_annotations
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM vault_assets va
            JOIN vaults v ON va.vault_id = v.id
            WHERE va.id = asset_id AND v.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own annotations" ON document_annotations
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own annotations" ON document_annotations
    FOR DELETE USING (auth.uid() = user_id);

-- Policies for document_annotation_replies
CREATE POLICY "Users can view replies for annotations they can see" ON document_annotation_replies
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM document_annotations da
            WHERE da.id = annotation_id AND (
                -- Own annotations
                auth.uid() = da.user_id OR
                -- Shared annotations
                (da.is_shared = true AND auth.uid() = ANY(da.shared_with)) OR
                -- Asset owner can see all annotation replies
                EXISTS (
                    SELECT 1 FROM vault_assets va
                    JOIN vaults v ON va.vault_id = v.id
                    WHERE va.id = da.asset_id AND v.user_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "Users can create replies for annotations they can see" ON document_annotation_replies
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM document_annotations da
            WHERE da.id = annotation_id AND (
                -- Own annotations
                auth.uid() = da.user_id OR
                -- Shared annotations
                (da.is_shared = true AND auth.uid() = ANY(da.shared_with)) OR
                -- Asset owner can reply to all annotations
                EXISTS (
                    SELECT 1 FROM vault_assets va
                    JOIN vaults v ON va.vault_id = v.id
                    WHERE va.id = da.asset_id AND v.user_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "Users can update their own replies" ON document_annotation_replies
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own replies" ON document_annotation_replies
    FOR DELETE USING (auth.uid() = user_id);

-- Functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_document_table_of_contents_updated_at 
    BEFORE UPDATE ON document_table_of_contents 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_document_summaries_updated_at 
    BEFORE UPDATE ON document_summaries 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_document_podcasts_updated_at 
    BEFORE UPDATE ON document_podcasts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_document_annotations_updated_at 
    BEFORE UPDATE ON document_annotations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_document_annotation_replies_updated_at 
    BEFORE UPDATE ON document_annotation_replies 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE document_table_of_contents IS 'Stores AI-generated table of contents for documents';
COMMENT ON TABLE document_search_cache IS 'Caches search results for document content to improve performance';
COMMENT ON TABLE document_summaries IS 'Stores AI-generated summaries of documents';
COMMENT ON TABLE document_podcasts IS 'Stores AI-generated podcast versions of documents';
COMMENT ON TABLE document_annotations IS 'Stores user annotations including notes, comments, questions, and voice notes';
COMMENT ON TABLE document_annotation_replies IS 'Stores replies to document annotations for threaded conversations';

-- Grant permissions for authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;