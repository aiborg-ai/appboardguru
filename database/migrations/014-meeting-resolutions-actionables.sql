-- =====================================================
-- MEETING RESOLUTIONS & ACTIONABLES SYSTEM
-- Extends meetings with post-meeting tracking
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. MEETING RESOLUTIONS - Decisions passed during meetings
-- =====================================================

CREATE TYPE resolution_type AS ENUM ('motion', 'amendment', 'policy', 'directive', 'appointment', 'financial', 'strategic', 'other');
CREATE TYPE resolution_status AS ENUM ('proposed', 'passed', 'rejected', 'tabled', 'withdrawn', 'amended');
CREATE TYPE voting_method AS ENUM ('voice', 'show_of_hands', 'secret_ballot', 'electronic', 'unanimous_consent', 'roll_call');

CREATE TABLE meeting_resolutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Meeting Reference
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  agenda_item_id UUID REFERENCES meeting_agenda_items(id) ON DELETE SET NULL,
  
  -- Resolution Details
  resolution_number VARCHAR(50), -- e.g., "R2024-001", "Resolution 12"
  title VARCHAR(500) NOT NULL CHECK (length(title) >= 1 AND length(title) <= 500),
  description TEXT NOT NULL,
  resolution_text TEXT NOT NULL, -- The formal resolution language
  
  -- Classification
  resolution_type resolution_type NOT NULL DEFAULT 'motion',
  category VARCHAR(100), -- Custom category for organization
  priority_level INTEGER DEFAULT 3 CHECK (priority_level BETWEEN 1 AND 5), -- 1=highest, 5=lowest
  
  -- Proposer & Seconder
  proposed_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  seconded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Voting & Status
  status resolution_status DEFAULT 'proposed',
  voting_method voting_method,
  votes_for INTEGER DEFAULT 0 CHECK (votes_for >= 0),
  votes_against INTEGER DEFAULT 0 CHECK (votes_against >= 0),
  votes_abstain INTEGER DEFAULT 0 CHECK (votes_abstain >= 0),
  total_eligible_voters INTEGER DEFAULT 0 CHECK (total_eligible_voters >= 0),
  
  -- Implementation
  effective_date TIMESTAMPTZ, -- When resolution takes effect
  expiry_date TIMESTAMPTZ, -- If resolution has expiry
  implementation_deadline TIMESTAMPTZ,
  implementation_notes TEXT,
  
  -- Compliance & Legal
  requires_board_approval BOOLEAN DEFAULT false,
  requires_shareholder_approval BOOLEAN DEFAULT false,
  legal_review_required BOOLEAN DEFAULT false,
  compliance_impact TEXT,
  
  -- Attachments & References
  supporting_documents TEXT[], -- File paths or document IDs
  related_resolutions UUID[], -- Array of related resolution IDs
  supersedes_resolution_id UUID REFERENCES meeting_resolutions(id) ON DELETE SET NULL,
  
  -- Tracking
  discussion_duration_minutes INTEGER DEFAULT 0,
  amendments_proposed INTEGER DEFAULT 0,
  was_amended BOOLEAN DEFAULT false,
  
  -- Timestamps
  proposed_at TIMESTAMPTZ DEFAULT NOW(),
  voted_at TIMESTAMPTZ,
  effective_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_voting_totals CHECK (
    votes_for + votes_against + votes_abstain <= total_eligible_voters
  ),
  CONSTRAINT valid_dates CHECK (
    expiry_date IS NULL OR effective_date IS NULL OR expiry_date > effective_date
  ),
  CONSTRAINT resolution_number_unique_per_meeting UNIQUE(meeting_id, resolution_number)
);

-- =====================================================
-- 2. MEETING ACTIONABLES - Tasks assigned to users
-- =====================================================

CREATE TYPE actionable_priority AS ENUM ('critical', 'high', 'medium', 'low');
CREATE TYPE actionable_status AS ENUM ('assigned', 'in_progress', 'blocked', 'under_review', 'completed', 'cancelled', 'overdue');
CREATE TYPE actionable_category AS ENUM ('follow_up', 'research', 'implementation', 'compliance', 'reporting', 'communication', 'approval', 'review', 'other');

CREATE TABLE meeting_actionables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Meeting & Resolution Reference
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  agenda_item_id UUID REFERENCES meeting_agenda_items(id) ON DELETE SET NULL,
  resolution_id UUID REFERENCES meeting_resolutions(id) ON DELETE SET NULL,
  
  -- Assignment Details
  assigned_to UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  assigned_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT, -- Must be superuser or meeting organizer
  delegated_from UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- If task was delegated
  
  -- Actionable Details
  action_number VARCHAR(50), -- e.g., "A2024-001", "Action 5"
  title VARCHAR(500) NOT NULL CHECK (length(title) >= 1 AND length(title) <= 500),
  description TEXT NOT NULL,
  detailed_requirements TEXT, -- Specific requirements or success criteria
  
  -- Classification
  category actionable_category DEFAULT 'follow_up',
  priority actionable_priority DEFAULT 'medium',
  estimated_effort_hours DECIMAL(5,2) CHECK (estimated_effort_hours >= 0),
  actual_effort_hours DECIMAL(5,2) CHECK (actual_effort_hours >= 0),
  
  -- Timeline
  due_date TIMESTAMPTZ NOT NULL,
  reminder_intervals INTEGER[] DEFAULT ARRAY[7, 3, 1], -- Days before due date to send reminders
  last_reminder_sent TIMESTAMPTZ,
  
  -- Status & Progress
  status actionable_status DEFAULT 'assigned',
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage BETWEEN 0 AND 100),
  completion_notes TEXT,
  
  -- Dependencies
  depends_on_actionable_ids UUID[], -- Array of actionable IDs that must complete first
  blocks_actionable_ids UUID[], -- Array of actionable IDs that depend on this one
  
  -- Approval Workflow
  requires_approval BOOLEAN DEFAULT false,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  approval_notes TEXT,
  
  -- Deliverables & Results
  deliverable_type VARCHAR(100), -- 'report', 'document', 'presentation', 'decision', 'implementation'
  deliverable_location TEXT, -- File path, URL, or location of deliverable
  success_metrics TEXT,
  actual_results TEXT,
  
  -- Communication
  stakeholders_to_notify UUID[], -- Array of user IDs to notify on completion
  communication_required BOOLEAN DEFAULT false,
  communication_template VARCHAR(100),
  
  -- Escalation
  escalation_level INTEGER DEFAULT 1 CHECK (escalation_level BETWEEN 1 AND 5),
  escalation_path UUID[], -- Array of user IDs for escalation hierarchy
  escalated_at TIMESTAMPTZ,
  escalated_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  escalation_reason TEXT,
  
  -- Timestamps
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_completion_status CHECK (
    (status = 'completed' AND completed_at IS NOT NULL AND progress_percentage = 100) OR
    (status != 'completed')
  ),
  CONSTRAINT valid_dates CHECK (
    assigned_at <= due_date AND
    (started_at IS NULL OR started_at >= assigned_at) AND
    (completed_at IS NULL OR completed_at >= assigned_at)
  ),
  CONSTRAINT action_number_unique_per_meeting UNIQUE(meeting_id, action_number)
);

-- =====================================================
-- 3. ACTIONABLE UPDATES - Progress tracking
-- =====================================================

CREATE TABLE meeting_actionable_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Reference
  actionable_id UUID NOT NULL REFERENCES meeting_actionables(id) ON DELETE CASCADE,
  updated_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  
  -- Update Details
  update_type VARCHAR(50) NOT NULL DEFAULT 'progress', -- 'progress', 'status_change', 'deadline_extension', 'delegation', 'completion'
  previous_status actionable_status,
  new_status actionable_status,
  previous_progress INTEGER,
  new_progress INTEGER,
  
  -- Content
  update_notes TEXT,
  challenges_faced TEXT,
  next_steps TEXT,
  support_needed TEXT,
  
  -- Time Tracking
  hours_worked DECIMAL(5,2) CHECK (hours_worked >= 0),
  time_period_start TIMESTAMPTZ,
  time_period_end TIMESTAMPTZ,
  
  -- Attachments
  supporting_files TEXT[], -- File paths or document IDs
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_time_period CHECK (
    time_period_start IS NULL OR time_period_end IS NULL OR time_period_end >= time_period_start
  )
);

-- =====================================================
-- 4. RESOLUTION VOTING RECORDS - Individual votes
-- =====================================================

CREATE TABLE meeting_resolution_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Reference
  resolution_id UUID NOT NULL REFERENCES meeting_resolutions(id) ON DELETE CASCADE,
  voter_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Vote Details
  vote_choice VARCHAR(20) NOT NULL CHECK (vote_choice IN ('for', 'against', 'abstain', 'absent')),
  vote_weight DECIMAL(5,2) DEFAULT 1.0 CHECK (vote_weight >= 0), -- For weighted voting
  voting_method voting_method NOT NULL,
  
  -- Metadata
  vote_order INTEGER, -- Order in which vote was cast
  vote_rationale TEXT, -- Optional explanation for vote
  vote_confidence INTEGER CHECK (vote_confidence BETWEEN 1 AND 5), -- Confidence level
  
  -- Timing
  voted_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_vote_per_resolution UNIQUE(resolution_id, voter_user_id)
);

-- =====================================================
-- 5. PERFORMANCE INDEXES
-- =====================================================

-- Resolutions indexes
CREATE INDEX idx_resolutions_meeting ON meeting_resolutions(meeting_id, status, proposed_at DESC);
CREATE INDEX idx_resolutions_proposed_by ON meeting_resolutions(proposed_by, created_at DESC);
CREATE INDEX idx_resolutions_status ON meeting_resolutions(status, effective_date) WHERE status IN ('passed', 'proposed');
CREATE INDEX idx_resolutions_type ON meeting_resolutions(resolution_type, meeting_id);
CREATE INDEX idx_resolutions_effective_date ON meeting_resolutions(effective_date DESC) WHERE effective_date IS NOT NULL;
CREATE INDEX idx_resolutions_implementation ON meeting_resolutions(implementation_deadline) WHERE implementation_deadline IS NOT NULL;
CREATE INDEX idx_resolutions_search ON meeting_resolutions USING gin(to_tsvector('english', title || ' ' || description || ' ' || resolution_text));

-- Actionables indexes
CREATE INDEX idx_actionables_meeting ON meeting_actionables(meeting_id, status, due_date);
CREATE INDEX idx_actionables_assigned_to ON meeting_actionables(assigned_to, status, due_date);
CREATE INDEX idx_actionables_assigned_by ON meeting_actionables(assigned_by, created_at DESC);
CREATE INDEX idx_actionables_due_date ON meeting_actionables(due_date) WHERE status NOT IN ('completed', 'cancelled');
CREATE INDEX idx_actionables_status ON meeting_actionables(status, priority) WHERE status != 'completed';
CREATE INDEX idx_actionables_priority ON meeting_actionables(priority, due_date) WHERE status NOT IN ('completed', 'cancelled');
CREATE INDEX idx_actionables_overdue ON meeting_actionables(due_date, status) WHERE status NOT IN ('completed', 'cancelled') AND due_date < NOW();
CREATE INDEX idx_actionables_search ON meeting_actionables USING gin(to_tsvector('english', title || ' ' || description));

-- Updates indexes
CREATE INDEX idx_actionable_updates_actionable ON meeting_actionable_updates(actionable_id, created_at DESC);
CREATE INDEX idx_actionable_updates_user ON meeting_actionable_updates(updated_by, created_at DESC);

-- Votes indexes
CREATE INDEX idx_resolution_votes_resolution ON meeting_resolution_votes(resolution_id, vote_choice);
CREATE INDEX idx_resolution_votes_voter ON meeting_resolution_votes(voter_user_id, voted_at DESC);

-- =====================================================
-- 6. ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE meeting_resolutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_actionables ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_actionable_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_resolution_votes ENABLE ROW LEVEL SECURITY;

-- Resolutions RLS Policies
CREATE POLICY "Users can view resolutions from their organization meetings" ON meeting_resolutions
  FOR SELECT USING (
    meeting_id IN (
      SELECT m.id FROM meetings m
      JOIN organization_members om ON m.organization_id = om.organization_id
      WHERE om.user_id = auth.uid() AND om.status = 'active'
    )
  );

CREATE POLICY "Meeting organizers and superusers can manage resolutions" ON meeting_resolutions
  FOR ALL USING (
    meeting_id IN (
      SELECT id FROM meetings WHERE created_by = auth.uid()
    ) OR
    meeting_id IN (
      SELECT m.id FROM meetings m
      JOIN organization_members om ON m.organization_id = om.organization_id
      WHERE om.user_id = auth.uid() AND om.status = 'active' 
      AND om.role IN ('owner', 'admin', 'superuser')
    )
  );

-- Actionables RLS Policies
CREATE POLICY "Users can view actionables from their organization meetings" ON meeting_actionables
  FOR SELECT USING (
    meeting_id IN (
      SELECT m.id FROM meetings m
      JOIN organization_members om ON m.organization_id = om.organization_id
      WHERE om.user_id = auth.uid() AND om.status = 'active'
    ) OR assigned_to = auth.uid()
  );

CREATE POLICY "Superusers and meeting organizers can create actionables" ON meeting_actionables
  FOR INSERT WITH CHECK (
    meeting_id IN (
      SELECT m.id FROM meetings m
      JOIN organization_members om ON m.organization_id = om.organization_id
      WHERE om.user_id = auth.uid() AND om.status = 'active' 
      AND om.role IN ('owner', 'admin', 'superuser')
    ) OR
    meeting_id IN (
      SELECT id FROM meetings WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Assigned users can update their actionables" ON meeting_actionables
  FOR UPDATE USING (assigned_to = auth.uid()) 
  WITH CHECK (assigned_to = auth.uid());

CREATE POLICY "Superusers can manage all actionables" ON meeting_actionables
  FOR ALL USING (
    meeting_id IN (
      SELECT m.id FROM meetings m
      JOIN organization_members om ON m.organization_id = om.organization_id
      WHERE om.user_id = auth.uid() AND om.status = 'active' 
      AND om.role IN ('owner', 'admin', 'superuser')
    )
  );

-- Actionable Updates RLS Policies
CREATE POLICY "Users can view updates for accessible actionables" ON meeting_actionable_updates
  FOR SELECT USING (
    actionable_id IN (
      SELECT id FROM meeting_actionables WHERE assigned_to = auth.uid()
    ) OR
    actionable_id IN (
      SELECT ma.id FROM meeting_actionables ma
      JOIN meetings m ON ma.meeting_id = m.id
      JOIN organization_members om ON m.organization_id = om.organization_id
      WHERE om.user_id = auth.uid() AND om.status = 'active'
    )
  );

CREATE POLICY "Assigned users can create updates for their actionables" ON meeting_actionable_updates
  FOR INSERT WITH CHECK (
    actionable_id IN (
      SELECT id FROM meeting_actionables WHERE assigned_to = auth.uid()
    )
  );

-- =====================================================
-- 7. TRIGGERS AND FUNCTIONS
-- =====================================================

-- Auto-generate resolution numbers
CREATE OR REPLACE FUNCTION generate_resolution_number()
RETURNS TRIGGER AS $$
DECLARE
  year_prefix VARCHAR(4);
  seq_num INTEGER;
  new_number VARCHAR(50);
BEGIN
  IF NEW.resolution_number IS NULL THEN
    year_prefix := EXTRACT(YEAR FROM NEW.created_at)::VARCHAR;
    
    SELECT COALESCE(MAX(
      CASE 
        WHEN resolution_number ~ ('^R' || year_prefix || '-[0-9]+$') 
        THEN SUBSTRING(resolution_number FROM '[0-9]+$')::INTEGER
        ELSE 0
      END
    ), 0) + 1 INTO seq_num
    FROM meeting_resolutions 
    WHERE meeting_id = NEW.meeting_id;
    
    NEW.resolution_number := 'R' || year_prefix || '-' || LPAD(seq_num::VARCHAR, 3, '0');
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER generate_resolution_number_trigger
  BEFORE INSERT ON meeting_resolutions
  FOR EACH ROW EXECUTE FUNCTION generate_resolution_number();

-- Auto-generate actionable numbers
CREATE OR REPLACE FUNCTION generate_actionable_number()
RETURNS TRIGGER AS $$
DECLARE
  year_prefix VARCHAR(4);
  seq_num INTEGER;
  new_number VARCHAR(50);
BEGIN
  IF NEW.action_number IS NULL THEN
    year_prefix := EXTRACT(YEAR FROM NEW.created_at)::VARCHAR;
    
    SELECT COALESCE(MAX(
      CASE 
        WHEN action_number ~ ('^A' || year_prefix || '-[0-9]+$') 
        THEN SUBSTRING(action_number FROM '[0-9]+$')::INTEGER
        ELSE 0
      END
    ), 0) + 1 INTO seq_num
    FROM meeting_actionables 
    WHERE meeting_id = NEW.meeting_id;
    
    NEW.action_number := 'A' || year_prefix || '-' || LPAD(seq_num::VARCHAR, 3, '0');
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER generate_actionable_number_trigger
  BEFORE INSERT ON meeting_actionables
  FOR EACH ROW EXECUTE FUNCTION generate_actionable_number();

-- Update actionable status based on due date
CREATE OR REPLACE FUNCTION update_overdue_actionables()
RETURNS void AS $$
BEGIN
  UPDATE meeting_actionables 
  SET status = 'overdue'
  WHERE due_date < NOW() 
    AND status NOT IN ('completed', 'cancelled', 'overdue');
END;
$$ language 'plpgsql';

-- Auto-update timestamps
CREATE TRIGGER update_resolutions_updated_at 
  BEFORE UPDATE ON meeting_resolutions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_actionables_updated_at 
  BEFORE UPDATE ON meeting_actionables 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 8. MIGRATION COMPLETION
-- =====================================================

INSERT INTO _migrations (name, executed_at) 
VALUES ('014-meeting-resolutions-actionables', NOW())
ON CONFLICT (name) DO UPDATE SET executed_at = NOW();

-- Success confirmation
SELECT 'Meeting Resolutions & Actionables system created successfully!' as message;