-- Fix Meetings System Migration (Handles Existing Types)
-- This migration safely creates the meetings system tables, checking for existing objects

-- Check and create meeting_type enum if it doesn't exist
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'meeting_type') THEN
        CREATE TYPE meeting_type AS ENUM ('agm', 'board', 'committee', 'other');
    END IF;
END $$;

-- Check and create meeting_status enum if it doesn't exist
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'meeting_status') THEN
        CREATE TYPE meeting_status AS ENUM ('draft', 'scheduled', 'in_progress', 'completed', 'cancelled', 'postponed');
    END IF;
END $$;

-- Check and create attendee_role enum if it doesn't exist
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'attendee_role') THEN
        CREATE TYPE attendee_role AS ENUM ('board_member', 'guest', 'presenter', 'observer', 'secretary', 'facilitator');
    END IF;
END $$;

-- Check and create rsvp_status enum if it doesn't exist
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'rsvp_status') THEN
        CREATE TYPE rsvp_status AS ENUM ('pending', 'accepted', 'declined', 'tentative');
    END IF;
END $$;

-- Check and create agenda_item_type enum if it doesn't exist
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'agenda_item_type') THEN
        CREATE TYPE agenda_item_type AS ENUM ('presentation', 'discussion', 'decision', 'information', 'break');
    END IF;
END $$;

-- Check and create resolution_status enum if it doesn't exist
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'resolution_status') THEN
        CREATE TYPE resolution_status AS ENUM ('proposed', 'approved', 'rejected', 'tabled', 'withdrawn');
    END IF;
END $$;

-- Check and create action_item_status enum if it doesn't exist
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'action_item_status') THEN
        CREATE TYPE action_item_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled', 'overdue');
    END IF;
END $$;

-- Drop existing tables if they exist (be careful with this in production!)
DROP TABLE IF EXISTS meeting_action_items CASCADE;
DROP TABLE IF EXISTS meeting_resolutions CASCADE;
DROP TABLE IF EXISTS meeting_documents CASCADE;
DROP TABLE IF EXISTS meeting_agenda_items CASCADE;
DROP TABLE IF EXISTS meeting_attendees CASCADE;
DROP TABLE IF EXISTS meetings CASCADE;

-- Create meetings table
CREATE TABLE IF NOT EXISTS meetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    board_id UUID REFERENCES boards(id) ON DELETE SET NULL,
    committee_id UUID REFERENCES committees(id) ON DELETE SET NULL,
    meeting_number VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    meeting_type meeting_type NOT NULL DEFAULT 'other',
    status meeting_status DEFAULT 'draft',
    scheduled_start TIMESTAMPTZ,
    scheduled_end TIMESTAMPTZ,
    actual_start TIMESTAMPTZ,
    actual_end TIMESTAMPTZ,
    timezone VARCHAR(100) DEFAULT 'UTC',
    location TEXT,
    virtual_meeting_url TEXT,
    is_hybrid BOOLEAN DEFAULT false,
    quorum_required INTEGER,
    quorum_met BOOLEAN,
    attendee_count INTEGER DEFAULT 0,
    rsvp_count INTEGER DEFAULT 0,
    agenda_item_count INTEGER DEFAULT 0,
    document_count INTEGER DEFAULT 0,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, meeting_number),
    CONSTRAINT valid_meeting_times CHECK (
        (scheduled_end IS NULL OR scheduled_start IS NULL OR scheduled_end > scheduled_start) AND
        (actual_end IS NULL OR actual_start IS NULL OR actual_end > actual_start)
    )
);

-- Create meeting_attendees table
CREATE TABLE IF NOT EXISTS meeting_attendees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    role attendee_role DEFAULT 'guest',
    rsvp_status rsvp_status DEFAULT 'pending',
    rsvp_date TIMESTAMPTZ,
    attendance_confirmed BOOLEAN DEFAULT false,
    attendance_time TIMESTAMPTZ,
    is_organizer BOOLEAN DEFAULT false,
    is_required BOOLEAN DEFAULT false,
    can_vote BOOLEAN DEFAULT false,
    voted BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(meeting_id, email)
);

-- Create meeting_agenda_items table
CREATE TABLE IF NOT EXISTS meeting_agenda_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    parent_item_id UUID REFERENCES meeting_agenda_items(id) ON DELETE CASCADE,
    item_number VARCHAR(20),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    type agenda_item_type DEFAULT 'discussion',
    presenter VARCHAR(255),
    estimated_duration INTEGER, -- in minutes
    actual_duration INTEGER, -- in minutes
    order_index INTEGER NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    resolution TEXT,
    attachments JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create meeting_documents table
CREATE TABLE IF NOT EXISTS meeting_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    agenda_item_id UUID REFERENCES meeting_agenda_items(id) ON DELETE CASCADE,
    document_name VARCHAR(255) NOT NULL,
    document_type VARCHAR(100),
    file_path TEXT,
    file_size INTEGER,
    category VARCHAR(50), -- 'agenda', 'minutes', 'presentation', 'report', 'other'
    is_confidential BOOLEAN DEFAULT false,
    uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create meeting_resolutions table
CREATE TABLE IF NOT EXISTS meeting_resolutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    agenda_item_id UUID REFERENCES meeting_agenda_items(id) ON DELETE CASCADE,
    resolution_number VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    proposed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    seconded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    status resolution_status DEFAULT 'proposed',
    voting_result JSONB, -- Store detailed voting results
    votes_for INTEGER DEFAULT 0,
    votes_against INTEGER DEFAULT 0,
    votes_abstain INTEGER DEFAULT 0,
    passed BOOLEAN,
    effective_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(meeting_id, resolution_number)
);

-- Create meeting_action_items table
CREATE TABLE IF NOT EXISTS meeting_action_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    agenda_item_id UUID REFERENCES meeting_agenda_items(id) ON DELETE CASCADE,
    resolution_id UUID REFERENCES meeting_resolutions(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    assigned_to_email VARCHAR(255),
    due_date DATE,
    status action_item_status DEFAULT 'pending',
    priority VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    completed_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_meetings_org_id ON meetings(organization_id);
CREATE INDEX IF NOT EXISTS idx_meetings_board_id ON meetings(board_id);
CREATE INDEX IF NOT EXISTS idx_meetings_committee_id ON meetings(committee_id);
CREATE INDEX IF NOT EXISTS idx_meetings_status ON meetings(status);
CREATE INDEX IF NOT EXISTS idx_meetings_scheduled_start ON meetings(scheduled_start);
CREATE INDEX IF NOT EXISTS idx_meeting_attendees_meeting_id ON meeting_attendees(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_attendees_user_id ON meeting_attendees(user_id);
CREATE INDEX IF NOT EXISTS idx_meeting_agenda_items_meeting_id ON meeting_agenda_items(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_documents_meeting_id ON meeting_documents(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_resolutions_meeting_id ON meeting_resolutions(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_action_items_meeting_id ON meeting_action_items(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_action_items_assigned_to ON meeting_action_items(assigned_to);

-- Enable Row Level Security
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_agenda_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_resolutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_action_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view meetings for their organizations" ON meetings;
DROP POLICY IF EXISTS "Users can create meetings for their organizations" ON meetings;
DROP POLICY IF EXISTS "Users can update meetings for their organizations" ON meetings;
DROP POLICY IF EXISTS "Users can delete meetings for their organizations" ON meetings;

-- Create RLS policies for meetings
CREATE POLICY "Users can view meetings for their organizations"
    ON meetings FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM user_organizations
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create meetings for their organizations"
    ON meetings FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM user_organizations
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update meetings for their organizations"
    ON meetings FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id FROM user_organizations
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete meetings for their organizations"
    ON meetings FOR DELETE
    USING (
        organization_id IN (
            SELECT organization_id FROM user_organizations
            WHERE user_id = auth.uid()
        )
    );

-- Similar policies for other tables
-- Meeting attendees policies
DROP POLICY IF EXISTS "Users can view attendees for meetings they can access" ON meeting_attendees;
DROP POLICY IF EXISTS "Users can manage attendees for meetings they can access" ON meeting_attendees;

CREATE POLICY "Users can view attendees for meetings they can access"
    ON meeting_attendees FOR SELECT
    USING (
        meeting_id IN (
            SELECT id FROM meetings
            WHERE organization_id IN (
                SELECT organization_id FROM user_organizations
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can manage attendees for meetings they can access"
    ON meeting_attendees FOR ALL
    USING (
        meeting_id IN (
            SELECT id FROM meetings
            WHERE organization_id IN (
                SELECT organization_id FROM user_organizations
                WHERE user_id = auth.uid()
            )
        )
    );

-- Agenda items policies
DROP POLICY IF EXISTS "Users can view agenda items for meetings they can access" ON meeting_agenda_items;
DROP POLICY IF EXISTS "Users can manage agenda items for meetings they can access" ON meeting_agenda_items;

CREATE POLICY "Users can view agenda items for meetings they can access"
    ON meeting_agenda_items FOR SELECT
    USING (
        meeting_id IN (
            SELECT id FROM meetings
            WHERE organization_id IN (
                SELECT organization_id FROM user_organizations
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can manage agenda items for meetings they can access"
    ON meeting_agenda_items FOR ALL
    USING (
        meeting_id IN (
            SELECT id FROM meetings
            WHERE organization_id IN (
                SELECT organization_id FROM user_organizations
                WHERE user_id = auth.uid()
            )
        )
    );

-- Similar policies for documents, resolutions, and action items
DROP POLICY IF EXISTS "Users can view documents for meetings they can access" ON meeting_documents;
DROP POLICY IF EXISTS "Users can manage documents for meetings they can access" ON meeting_documents;

CREATE POLICY "Users can view documents for meetings they can access"
    ON meeting_documents FOR SELECT
    USING (
        meeting_id IN (
            SELECT id FROM meetings
            WHERE organization_id IN (
                SELECT organization_id FROM user_organizations
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can manage documents for meetings they can access"
    ON meeting_documents FOR ALL
    USING (
        meeting_id IN (
            SELECT id FROM meetings
            WHERE organization_id IN (
                SELECT organization_id FROM user_organizations
                WHERE user_id = auth.uid()
            )
        )
    );

-- Resolutions policies
DROP POLICY IF EXISTS "Users can view resolutions for meetings they can access" ON meeting_resolutions;
DROP POLICY IF EXISTS "Users can manage resolutions for meetings they can access" ON meeting_resolutions;

CREATE POLICY "Users can view resolutions for meetings they can access"
    ON meeting_resolutions FOR SELECT
    USING (
        meeting_id IN (
            SELECT id FROM meetings
            WHERE organization_id IN (
                SELECT organization_id FROM user_organizations
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can manage resolutions for meetings they can access"
    ON meeting_resolutions FOR ALL
    USING (
        meeting_id IN (
            SELECT id FROM meetings
            WHERE organization_id IN (
                SELECT organization_id FROM user_organizations
                WHERE user_id = auth.uid()
            )
        )
    );

-- Action items policies
DROP POLICY IF EXISTS "Users can view action items for meetings they can access" ON meeting_action_items;
DROP POLICY IF EXISTS "Users can manage action items for meetings they can access" ON meeting_action_items;

CREATE POLICY "Users can view action items for meetings they can access"
    ON meeting_action_items FOR SELECT
    USING (
        meeting_id IN (
            SELECT id FROM meetings
            WHERE organization_id IN (
                SELECT organization_id FROM user_organizations
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can manage action items for meetings they can access"
    ON meeting_action_items FOR ALL
    USING (
        meeting_id IN (
            SELECT id FROM meetings
            WHERE organization_id IN (
                SELECT organization_id FROM user_organizations
                WHERE user_id = auth.uid()
            )
        )
    );

-- Create or replace function to update meeting counts
CREATE OR REPLACE FUNCTION update_meeting_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_TABLE_NAME = 'meeting_attendees' THEN
        UPDATE meetings
        SET attendee_count = (
            SELECT COUNT(*) FROM meeting_attendees WHERE meeting_id = COALESCE(NEW.meeting_id, OLD.meeting_id)
        ),
        rsvp_count = (
            SELECT COUNT(*) FROM meeting_attendees 
            WHERE meeting_id = COALESCE(NEW.meeting_id, OLD.meeting_id) 
            AND rsvp_status = 'accepted'
        )
        WHERE id = COALESCE(NEW.meeting_id, OLD.meeting_id);
    ELSIF TG_TABLE_NAME = 'meeting_agenda_items' THEN
        UPDATE meetings
        SET agenda_item_count = (
            SELECT COUNT(*) FROM meeting_agenda_items WHERE meeting_id = COALESCE(NEW.meeting_id, OLD.meeting_id)
        )
        WHERE id = COALESCE(NEW.meeting_id, OLD.meeting_id);
    ELSIF TG_TABLE_NAME = 'meeting_documents' THEN
        UPDATE meetings
        SET document_count = (
            SELECT COUNT(*) FROM meeting_documents WHERE meeting_id = COALESCE(NEW.meeting_id, OLD.meeting_id)
        )
        WHERE id = COALESCE(NEW.meeting_id, OLD.meeting_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_meeting_attendee_count ON meeting_attendees;
DROP TRIGGER IF EXISTS update_meeting_agenda_count ON meeting_agenda_items;
DROP TRIGGER IF EXISTS update_meeting_document_count ON meeting_documents;

-- Create triggers to update counts
CREATE TRIGGER update_meeting_attendee_count
    AFTER INSERT OR UPDATE OR DELETE ON meeting_attendees
    FOR EACH ROW
    EXECUTE FUNCTION update_meeting_counts();

CREATE TRIGGER update_meeting_agenda_count
    AFTER INSERT OR UPDATE OR DELETE ON meeting_agenda_items
    FOR EACH ROW
    EXECUTE FUNCTION update_meeting_counts();

CREATE TRIGGER update_meeting_document_count
    AFTER INSERT OR UPDATE OR DELETE ON meeting_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_meeting_counts();

-- Create or replace function to generate meeting numbers
CREATE OR REPLACE FUNCTION generate_meeting_number(
    p_organization_id UUID,
    p_meeting_type meeting_type
)
RETURNS VARCHAR AS $$
DECLARE
    v_prefix VARCHAR(10);
    v_year VARCHAR(4);
    v_count INTEGER;
    v_number VARCHAR(50);
BEGIN
    -- Set prefix based on meeting type
    CASE p_meeting_type
        WHEN 'agm' THEN v_prefix := 'AGM';
        WHEN 'board' THEN v_prefix := 'BRD';
        WHEN 'committee' THEN v_prefix := 'COM';
        ELSE v_prefix := 'MTG';
    END CASE;
    
    -- Get current year
    v_year := TO_CHAR(CURRENT_DATE, 'YYYY');
    
    -- Get count of meetings for this organization and type this year
    SELECT COUNT(*) + 1 INTO v_count
    FROM meetings
    WHERE organization_id = p_organization_id
    AND meeting_type = p_meeting_type
    AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE);
    
    -- Generate meeting number
    v_number := v_prefix || '-' || v_year || '-' || LPAD(v_count::TEXT, 4, '0');
    
    RETURN v_number;
END;
$$ LANGUAGE plpgsql;

-- Update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing update triggers if they exist
DROP TRIGGER IF EXISTS update_meetings_updated_at ON meetings;
DROP TRIGGER IF EXISTS update_meeting_attendees_updated_at ON meeting_attendees;
DROP TRIGGER IF EXISTS update_meeting_agenda_items_updated_at ON meeting_agenda_items;
DROP TRIGGER IF EXISTS update_meeting_documents_updated_at ON meeting_documents;
DROP TRIGGER IF EXISTS update_meeting_resolutions_updated_at ON meeting_resolutions;
DROP TRIGGER IF EXISTS update_meeting_action_items_updated_at ON meeting_action_items;

-- Create update triggers
CREATE TRIGGER update_meetings_updated_at
    BEFORE UPDATE ON meetings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meeting_attendees_updated_at
    BEFORE UPDATE ON meeting_attendees
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meeting_agenda_items_updated_at
    BEFORE UPDATE ON meeting_agenda_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meeting_documents_updated_at
    BEFORE UPDATE ON meeting_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meeting_resolutions_updated_at
    BEFORE UPDATE ON meeting_resolutions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meeting_action_items_updated_at
    BEFORE UPDATE ON meeting_action_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL ON meetings TO authenticated;
GRANT ALL ON meeting_attendees TO authenticated;
GRANT ALL ON meeting_agenda_items TO authenticated;
GRANT ALL ON meeting_documents TO authenticated;
GRANT ALL ON meeting_resolutions TO authenticated;
GRANT ALL ON meeting_action_items TO authenticated;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Meetings system tables created successfully!';
END $$;