-- =====================================================
-- BOARDS AND COMMITTEES SYSTEM
-- Database Schema for Board and Committee Management
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. BOARDS TABLE - Corporate Boards
-- =====================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'board_type') THEN
        CREATE TYPE board_type AS ENUM ('main_board', 'advisory_board', 'subsidiary_board', 'committee_board');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'board_status') THEN
        CREATE TYPE board_status AS ENUM ('active', 'inactive', 'dissolved');
    END IF;
END $$;

CREATE TABLE boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic Information
  name VARCHAR(255) NOT NULL CHECK (length(name) >= 1 AND length(name) <= 255),
  description TEXT CHECK (length(description) <= 2000),
  board_type board_type DEFAULT 'main_board',
  
  -- Organization Context
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  parent_board_id UUID REFERENCES boards(id) ON DELETE SET NULL,
  
  -- Status & Lifecycle
  status board_status DEFAULT 'active',
  established_date DATE,
  dissolution_date DATE,
  
  -- Meeting Information
  meeting_frequency VARCHAR(50), -- e.g., 'quarterly', 'monthly', 'bi-annual'
  next_meeting_date TIMESTAMPTZ,
  meeting_location TEXT,
  
  -- Management
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Settings
  settings JSONB DEFAULT '{
    "quorum_requirement": 50,
    "voting_threshold": 50,
    "allow_virtual_meetings": true,
    "require_unanimous_decisions": [],
    "notification_settings": {
      "notify_before_meetings": true,
      "days_before_notification": 7
    }
  }'::jsonb,
  
  -- Metadata
  tags TEXT[] DEFAULT '{}',
  
  -- Constraints
  CONSTRAINT valid_dissolution_date CHECK (
    dissolution_date IS NULL OR dissolution_date >= established_date
  ),
  CONSTRAINT valid_board_hierarchy CHECK (
    parent_board_id IS NULL OR parent_board_id != id
  )
);

-- =====================================================
-- 2. COMMITTEES TABLE - Board Committees
-- =====================================================

CREATE TYPE committee_type AS ENUM (
  'audit', 'compensation', 'governance', 'risk', 'nomination', 
  'strategy', 'technology', 'investment', 'ethics', 'executive', 'other'
);
CREATE TYPE committee_status AS ENUM ('active', 'inactive', 'dissolved', 'temporary');

CREATE TABLE committees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic Information
  name VARCHAR(255) NOT NULL CHECK (length(name) >= 1 AND length(name) <= 255),
  description TEXT CHECK (length(description) <= 2000),
  committee_type committee_type DEFAULT 'other',
  
  -- Organization & Board Context
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  
  -- Status & Lifecycle
  status committee_status DEFAULT 'active',
  established_date DATE,
  dissolution_date DATE,
  is_permanent BOOLEAN DEFAULT true,
  
  -- Charter & Responsibilities
  charter_document_url TEXT,
  responsibilities TEXT[],
  authority_level VARCHAR(50), -- e.g., 'advisory', 'decision_making', 'oversight'
  
  -- Meeting Information
  meeting_frequency VARCHAR(50),
  next_meeting_date TIMESTAMPTZ,
  meeting_location TEXT,
  
  -- Management
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Settings
  settings JSONB DEFAULT '{
    "quorum_requirement": 50,
    "voting_threshold": 50,
    "allow_virtual_meetings": true,
    "reporting_frequency": "quarterly",
    "notification_settings": {
      "notify_before_meetings": true,
      "days_before_notification": 5
    }
  }'::jsonb,
  
  -- Metadata
  tags TEXT[] DEFAULT '{}',
  
  -- Constraints
  CONSTRAINT valid_committee_dissolution_date CHECK (
    dissolution_date IS NULL OR dissolution_date >= established_date
  )
);

-- =====================================================
-- 3. BOARD_MEMBERS TABLE - Board Membership
-- =====================================================

CREATE TYPE board_member_role AS ENUM (
  'chairman', 'vice_chairman', 'ceo', 'cfo', 'cto', 'independent_director', 
  'executive_director', 'non_executive_director', 'board_member', 'board_observer'
);
CREATE TYPE board_member_status AS ENUM ('active', 'inactive', 'resigned', 'terminated');

CREATE TABLE board_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Core Relationships
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Role & Status
  role board_member_role DEFAULT 'board_member',
  status board_member_status DEFAULT 'active',
  is_voting_member BOOLEAN DEFAULT true,
  
  -- Appointment Details
  appointed_date DATE NOT NULL DEFAULT CURRENT_DATE,
  appointed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  term_start_date DATE,
  term_end_date DATE,
  term_length_months INTEGER,
  
  -- Resignation/Termination
  resigned_date DATE,
  termination_date DATE,
  termination_reason TEXT,
  
  -- Compensation (if applicable)
  annual_compensation DECIMAL(12,2),
  compensation_currency VARCHAR(3) DEFAULT 'USD',
  equity_compensation JSONB,
  
  -- Attendance & Performance
  meetings_attended INTEGER DEFAULT 0,
  meetings_total INTEGER DEFAULT 0,
  attendance_rate DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE 
      WHEN meetings_total > 0 THEN (meetings_attended::decimal / meetings_total::decimal * 100)
      ELSE NULL 
    END
  ) STORED,
  
  -- Skills & Expertise
  expertise_areas TEXT[],
  skills JSONB,
  
  -- Management
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(board_id, user_id, status) DEFERRABLE,
  CONSTRAINT valid_term_dates CHECK (
    term_end_date IS NULL OR term_end_date >= term_start_date
  ),
  CONSTRAINT valid_resignation_date CHECK (
    resigned_date IS NULL OR resigned_date >= appointed_date
  ),
  CONSTRAINT valid_termination_date CHECK (
    termination_date IS NULL OR termination_date >= appointed_date
  ),
  CONSTRAINT valid_attendance_numbers CHECK (
    meetings_attended >= 0 AND meetings_total >= 0 AND meetings_attended <= meetings_total
  )
);

-- =====================================================
-- 4. COMMITTEE_MEMBERS TABLE - Committee Membership
-- =====================================================

CREATE TYPE committee_member_role AS ENUM (
  'chair', 'vice_chair', 'member', 'secretary', 'advisor', 'observer'
);
CREATE TYPE committee_member_status AS ENUM ('active', 'inactive', 'resigned', 'terminated');

CREATE TABLE committee_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Core Relationships
  committee_id UUID NOT NULL REFERENCES committees(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Role & Status
  role committee_member_role DEFAULT 'member',
  status committee_member_status DEFAULT 'active',
  is_voting_member BOOLEAN DEFAULT true,
  
  -- Appointment Details
  appointed_date DATE NOT NULL DEFAULT CURRENT_DATE,
  appointed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  term_start_date DATE,
  term_end_date DATE,
  
  -- Resignation/Termination
  resigned_date DATE,
  termination_date DATE,
  termination_reason TEXT,
  
  -- Attendance & Performance
  meetings_attended INTEGER DEFAULT 0,
  meetings_total INTEGER DEFAULT 0,
  attendance_rate DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE 
      WHEN meetings_total > 0 THEN (meetings_attended::decimal / meetings_total::decimal * 100)
      ELSE NULL 
    END
  ) STORED,
  
  -- Expertise for this committee
  relevant_expertise TEXT[],
  contributions TEXT[],
  
  -- Management
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(committee_id, user_id, status) DEFERRABLE,
  CONSTRAINT valid_committee_term_dates CHECK (
    term_end_date IS NULL OR term_end_date >= term_start_date
  ),
  CONSTRAINT valid_committee_resignation_date CHECK (
    resigned_date IS NULL OR resigned_date >= appointed_date
  ),
  CONSTRAINT valid_committee_termination_date CHECK (
    termination_date IS NULL OR termination_date >= appointed_date
  ),
  CONSTRAINT valid_committee_attendance_numbers CHECK (
    meetings_attended >= 0 AND meetings_total >= 0 AND meetings_attended <= meetings_total
  )
);

-- =====================================================
-- 5. INDEXES FOR PERFORMANCE
-- =====================================================

-- Boards indexes
CREATE INDEX idx_boards_organization_id ON boards(organization_id);
CREATE INDEX idx_boards_status ON boards(status);
CREATE INDEX idx_boards_type ON boards(board_type);
CREATE INDEX idx_boards_parent_board_id ON boards(parent_board_id);

-- Committees indexes
CREATE INDEX idx_committees_organization_id ON committees(organization_id);
CREATE INDEX idx_committees_board_id ON committees(board_id);
CREATE INDEX idx_committees_status ON committees(status);
CREATE INDEX idx_committees_type ON committees(committee_type);

-- Board members indexes
CREATE INDEX idx_board_members_board_id ON board_members(board_id);
CREATE INDEX idx_board_members_user_id ON board_members(user_id);
CREATE INDEX idx_board_members_organization_id ON board_members(organization_id);
CREATE INDEX idx_board_members_status ON board_members(status);
CREATE INDEX idx_board_members_role ON board_members(role);

-- Committee members indexes
CREATE INDEX idx_committee_members_committee_id ON committee_members(committee_id);
CREATE INDEX idx_committee_members_user_id ON committee_members(user_id);
CREATE INDEX idx_committee_members_board_id ON committee_members(board_id);
CREATE INDEX idx_committee_members_organization_id ON committee_members(organization_id);
CREATE INDEX idx_committee_members_status ON committee_members(status);
CREATE INDEX idx_committee_members_role ON committee_members(role);

-- =====================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE committees ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE committee_members ENABLE ROW LEVEL SECURITY;

-- Boards policies
CREATE POLICY "Users can view boards in their organization" ON boards
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage boards" ON boards
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Committees policies
CREATE POLICY "Users can view committees in their organization" ON committees
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage committees" ON committees
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Board members policies
CREATE POLICY "Users can view board members in their organization" ON board_members
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage board members" ON board_members
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Committee members policies
CREATE POLICY "Users can view committee members in their organization" ON committee_members
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage committee members" ON committee_members
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- =====================================================
-- 7. TRIGGERS FOR UPDATED_AT
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
CREATE TRIGGER update_boards_updated_at BEFORE UPDATE ON boards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_committees_updated_at BEFORE UPDATE ON committees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_board_members_updated_at BEFORE UPDATE ON board_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_committee_members_updated_at BEFORE UPDATE ON committee_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();