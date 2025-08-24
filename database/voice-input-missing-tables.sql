-- =====================================================
-- VOICE INPUT MISSING TABLES ONLY
-- Creates only tables that don't exist in the current schema
-- Run this in Supabase SQL Editor after checking existing schema
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- CREATE MISSING ENUMS
-- =====================================================

-- Create meeting-related enums (only if they don't exist)
DO $$ BEGIN
    CREATE TYPE meeting_type AS ENUM ('agm', 'board', 'committee', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE meeting_status AS ENUM ('draft', 'scheduled', 'in_progress', 'completed', 'cancelled', 'postponed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE meeting_visibility AS ENUM ('public', 'organization', 'private');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- CREATE MEETINGS TABLE (if it doesn't exist)
-- =====================================================

CREATE TABLE IF NOT EXISTS meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  title VARCHAR(255) NOT NULL CHECK (length(title) >= 1 AND length(title) <= 255),
  description TEXT CHECK (length(description) <= 2000),
  meeting_type meeting_type NOT NULL DEFAULT 'board',
  status meeting_status DEFAULT 'draft',
  visibility meeting_visibility DEFAULT 'organization',
  scheduled_start TIMESTAMPTZ NOT NULL,
  scheduled_end TIMESTAMPTZ NOT NULL,
  timezone VARCHAR(50) DEFAULT 'UTC',
  location TEXT,
  virtual_meeting_url TEXT,
  is_recurring BOOLEAN DEFAULT false,
  agenda_finalized BOOLEAN DEFAULT false,
  invitations_sent BOOLEAN DEFAULT false,
  documents_locked BOOLEAN DEFAULT false,
  estimated_duration_minutes INTEGER DEFAULT 60,
  actual_start TIMESTAMPTZ,
  actual_end TIMESTAMPTZ,
  settings JSONB DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  category VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ,
  cancelled_reason TEXT
);

-- =====================================================
-- CREATE DOCUMENTS TABLE (if it doesn't exist)
-- =====================================================

CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT,
    summary TEXT,
    asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id),
    document_type TEXT DEFAULT 'general',
    status TEXT DEFAULT 'draft',
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- CREATE MISSING INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_meetings_organization ON meetings(organization_id);
CREATE INDEX IF NOT EXISTS idx_meetings_created_by ON meetings(created_by);
CREATE INDEX IF NOT EXISTS idx_meetings_status ON meetings(status);
CREATE INDEX IF NOT EXISTS idx_meetings_scheduled_start ON meetings(scheduled_start);
CREATE INDEX IF NOT EXISTS idx_meetings_meeting_type ON meetings(meeting_type);

CREATE INDEX IF NOT EXISTS idx_documents_organization ON documents(organization_id);
CREATE INDEX IF NOT EXISTS idx_documents_created_by ON documents(created_by);
CREATE INDEX IF NOT EXISTS idx_documents_asset_id ON documents(asset_id);
CREATE INDEX IF NOT EXISTS idx_documents_title ON documents USING gin(to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_documents_content ON documents USING gin(to_tsvector('english', content));

-- =====================================================
-- ENABLE ROW LEVEL SECURITY ON NEW TABLES
-- =====================================================

ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- CREATE RLS POLICIES FOR NEW TABLES
-- =====================================================

-- Meetings table policies
CREATE POLICY "Users can view meetings in their organizations" ON meetings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM organization_members 
            WHERE organization_id = meetings.organization_id 
            AND user_id = auth.uid()
            AND status = 'active'
        )
    );

CREATE POLICY "Users can insert meetings in their organizations" ON meetings
    FOR INSERT WITH CHECK (
        created_by = auth.uid() AND
        EXISTS (
            SELECT 1 FROM organization_members 
            WHERE organization_id = meetings.organization_id 
            AND user_id = auth.uid()
            AND status = 'active'
        )
    );

CREATE POLICY "Users can update meetings they created" ON meetings
    FOR UPDATE USING (created_by = auth.uid());

-- Documents table policies
CREATE POLICY "Users can view documents in their organizations" ON documents
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM organization_members 
            WHERE organization_id = documents.organization_id 
            AND user_id = auth.uid()
            AND status = 'active'
        )
    );

CREATE POLICY "Users can insert documents in their organizations" ON documents
    FOR INSERT WITH CHECK (
        created_by = auth.uid() AND
        EXISTS (
            SELECT 1 FROM organization_members 
            WHERE organization_id = documents.organization_id 
            AND user_id = auth.uid()
            AND status = 'active'
        )
    );

CREATE POLICY "Users can update documents they created" ON documents
    FOR UPDATE USING (created_by = auth.uid());

-- =====================================================
-- CREATE UPDATED_AT TRIGGERS FOR NEW TABLES
-- =====================================================

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for tables with updated_at
CREATE TRIGGER update_meetings_updated_at 
    BEFORE UPDATE ON meetings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at 
    BEFORE UPDATE ON documents 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$ 
BEGIN 
    RAISE NOTICE 'SUCCESS: Missing tables for voice input functionality have been created!';
    RAISE NOTICE 'Tables created: meetings, documents (if they did not exist)';
    RAISE NOTICE 'Next: Run voice-input-test-data-fixed.sql to populate with test data';
END $$;