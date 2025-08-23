-- =====================================================
-- ADVANCED BOARD MEETING WORKFLOWS & VOTING SYSTEMS
-- Extension for enterprise-grade voting with proxy support
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- 1. MEETING ROLES - Participant role assignments
-- =====================================================

CREATE TYPE meeting_role AS ENUM (
  'chair', 'vice_chair', 'secretary', 'treasurer', 'parliamentarian',
  'board_member', 'observer', 'guest', 'advisor', 'legal_counsel'
);

CREATE TYPE role_status AS ENUM ('active', 'inactive', 'delegated', 'substituted');

CREATE TABLE meeting_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Meeting and User References
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  
  -- Role Details
  role meeting_role NOT NULL,
  role_title VARCHAR(100), -- Custom title override
  status role_status DEFAULT 'active',
  
  -- Permissions and Responsibilities
  can_start_voting BOOLEAN DEFAULT false,
  can_close_voting BOOLEAN DEFAULT false,
  can_assign_speakers BOOLEAN DEFAULT false,
  can_manage_agenda BOOLEAN DEFAULT false,
  can_declare_quorum BOOLEAN DEFAULT false,
  can_adjourn_meeting BOOLEAN DEFAULT false,
  voting_weight DECIMAL(5,2) DEFAULT 1.0 CHECK (voting_weight >= 0),
  
  -- Delegation
  delegated_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  delegation_start TIMESTAMPTZ,
  delegation_end TIMESTAMPTZ,
  delegation_reason TEXT,
  
  -- Substitution (temporary replacement)
  substituted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  substitution_reason TEXT,
  
  -- Timestamps
  appointed_at TIMESTAMPTZ DEFAULT NOW(),
  effective_from TIMESTAMPTZ DEFAULT NOW(),
  effective_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(meeting_id, user_id, role),
  CONSTRAINT valid_delegation_period CHECK (
    delegation_start IS NULL OR delegation_end IS NULL OR delegation_end > delegation_start
  ),
  CONSTRAINT valid_effective_period CHECK (
    effective_until IS NULL OR effective_until > effective_from
  )
);

-- =====================================================
-- 2. MEETING PROXIES - Proxy voting and delegation chains
-- =====================================================

CREATE TYPE proxy_type AS ENUM ('general', 'specific', 'instructed', 'discretionary');
CREATE TYPE proxy_status AS ENUM ('active', 'revoked', 'expired', 'executed', 'delegated');

CREATE TABLE meeting_proxies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Meeting Context
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  
  -- Proxy Participants
  grantor_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- Person giving proxy
  proxy_holder_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- Person receiving proxy
  
  -- Proxy Details
  proxy_type proxy_type NOT NULL DEFAULT 'general',
  status proxy_status DEFAULT 'active',
  
  -- Instructions and Limitations
  voting_instructions JSONB DEFAULT '{}', -- Specific voting instructions
  scope_limitations TEXT[], -- What the proxy can/cannot vote on
  resolution_restrictions UUID[], -- Specific resolutions this proxy applies to
  
  -- Delegation Chain Support
  can_sub_delegate BOOLEAN DEFAULT false,
  sub_delegated_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  delegation_chain_level INTEGER DEFAULT 1 CHECK (delegation_chain_level <= 5),
  parent_proxy_id UUID REFERENCES meeting_proxies(id) ON DELETE CASCADE,
  
  -- Authority and Weight
  voting_weight DECIMAL(5,2) DEFAULT 1.0 CHECK (voting_weight >= 0),
  max_votes_allowed INTEGER, -- Limit on number of votes
  votes_cast_count INTEGER DEFAULT 0,
  
  -- Validity Period
  effective_from TIMESTAMPTZ DEFAULT NOW(),
  effective_until TIMESTAMPTZ NOT NULL,
  
  -- Legal and Audit Trail
  witness_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  legal_document_path TEXT,
  notarization_required BOOLEAN DEFAULT false,
  notarized_at TIMESTAMPTZ,
  notarized_by TEXT,
  
  -- Revocation
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  revocation_reason TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(meeting_id, grantor_user_id), -- One proxy per grantor per meeting
  CONSTRAINT no_self_proxy CHECK (grantor_user_id != proxy_holder_user_id),
  CONSTRAINT valid_effective_period CHECK (effective_until > effective_from),
  CONSTRAINT valid_sub_delegation CHECK (
    (can_sub_delegate = false AND sub_delegated_to IS NULL) OR
    (can_sub_delegate = true)
  ),
  CONSTRAINT valid_delegation_chain CHECK (
    (parent_proxy_id IS NULL AND delegation_chain_level = 1) OR
    (parent_proxy_id IS NOT NULL AND delegation_chain_level > 1)
  ),
  CONSTRAINT valid_votes_count CHECK (
    max_votes_allowed IS NULL OR votes_cast_count <= max_votes_allowed
  )
);

-- =====================================================
-- 3. ADVANCED MEETING VOTES - Enhanced voting records
-- =====================================================

CREATE TYPE vote_type AS ENUM ('resolution', 'motion', 'amendment', 'procedural', 'straw_poll');
CREATE TYPE vote_method AS ENUM ('voice', 'show_of_hands', 'secret_ballot', 'electronic', 'roll_call', 'written_ballot');
CREATE TYPE vote_anonymity AS ENUM ('public', 'anonymous', 'secret', 'confidential');

CREATE TABLE meeting_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Context References
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  resolution_id UUID REFERENCES meeting_resolutions(id) ON DELETE CASCADE,
  agenda_item_id UUID REFERENCES meeting_agenda_items(id) ON DELETE SET NULL,
  
  -- Voter Information
  voter_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID REFERENCES meeting_roles(id) ON DELETE SET NULL,
  proxy_id UUID REFERENCES meeting_proxies(id) ON DELETE SET NULL, -- If voting by proxy
  
  -- Vote Details
  vote_type vote_type NOT NULL DEFAULT 'resolution',
  vote_method vote_method NOT NULL,
  vote_choice VARCHAR(20) NOT NULL CHECK (vote_choice IN ('for', 'against', 'abstain', 'absent', 'present')),
  vote_weight DECIMAL(5,2) DEFAULT 1.0 CHECK (vote_weight >= 0),
  
  -- Anonymity and Privacy
  anonymity_level vote_anonymity DEFAULT 'public',
  is_anonymous BOOLEAN GENERATED ALWAYS AS (anonymity_level != 'public') STORED,
  
  -- Vote Metadata
  vote_sequence INTEGER, -- Order within the voting session
  vote_round INTEGER DEFAULT 1, -- For multiple rounds of voting
  is_final_vote BOOLEAN DEFAULT true,
  
  -- Rationale and Context
  vote_rationale TEXT,
  vote_confidence INTEGER CHECK (vote_confidence BETWEEN 1 AND 5),
  conditions_or_amendments TEXT, -- Any conditions attached to the vote
  
  -- Proxy Information (if applicable)
  voting_as_proxy_for UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  proxy_instructions_followed BOOLEAN,
  proxy_instruction_override_reason TEXT,
  
  -- Technical Metadata
  voting_device_info JSONB,
  ip_address INET,
  geolocation JSONB,
  voting_duration_seconds INTEGER, -- Time taken to cast vote
  
  -- Audit and Verification
  vote_hash TEXT, -- For cryptographic verification
  blockchain_transaction_id TEXT, -- If using blockchain verification
  verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  verification_timestamp TIMESTAMPTZ,
  
  -- Timestamps
  vote_timestamp TIMESTAMPTZ DEFAULT NOW(),
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(meeting_id, resolution_id, voter_user_id, vote_round), -- Prevent duplicate votes
  CONSTRAINT valid_proxy_vote CHECK (
    (proxy_id IS NULL AND voting_as_proxy_for IS NULL) OR
    (proxy_id IS NOT NULL AND voting_as_proxy_for IS NOT NULL)
  ),
  CONSTRAINT proxy_instruction_consistency CHECK (
    proxy_id IS NULL OR proxy_instructions_followed IS NOT NULL
  )
);

-- =====================================================
-- 4. MEETING WORKFLOWS - Process orchestration
-- =====================================================

CREATE TYPE workflow_type AS ENUM ('standard_board', 'agm', 'emergency', 'committee', 'custom');
CREATE TYPE workflow_stage AS ENUM (
  'pre_meeting', 'opening', 'roll_call', 'quorum_check', 'agenda_approval', 
  'regular_business', 'voting_session', 'new_business', 'executive_session', 
  'closing', 'post_meeting', 'completed', 'suspended', 'cancelled'
);
CREATE TYPE workflow_status AS ENUM ('not_started', 'in_progress', 'waiting', 'completed', 'failed', 'cancelled');

CREATE TABLE meeting_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Meeting Reference
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  
  -- Workflow Definition
  workflow_type workflow_type NOT NULL DEFAULT 'standard_board',
  workflow_name VARCHAR(200),
  workflow_description TEXT,
  
  -- Current State
  current_stage workflow_stage NOT NULL DEFAULT 'pre_meeting',
  status workflow_status DEFAULT 'not_started',
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage BETWEEN 0 AND 100),
  
  -- Stage Management
  stages_completed workflow_stage[] DEFAULT '{}',
  stages_sequence workflow_stage[] NOT NULL DEFAULT ARRAY[
    'pre_meeting', 'opening', 'roll_call', 'quorum_check', 'agenda_approval',
    'regular_business', 'voting_session', 'new_business', 'closing', 'post_meeting'
  ],
  current_stage_index INTEGER DEFAULT 0,
  
  -- Automation Settings
  auto_progression BOOLEAN DEFAULT false,
  require_chair_approval BOOLEAN DEFAULT true,
  stage_time_limits JSONB DEFAULT '{}', -- Time limits for each stage
  
  -- Process Control
  initiated_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  current_controller UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Who can advance workflow
  
  -- Quorum Management
  quorum_required INTEGER,
  quorum_achieved BOOLEAN DEFAULT false,
  quorum_checked_at TIMESTAMPTZ,
  attendance_count INTEGER DEFAULT 0,
  
  -- Voting Management
  active_voting_session BOOLEAN DEFAULT false,
  voting_method vote_method,
  votes_in_progress UUID[], -- Active resolution/motion IDs being voted on
  
  -- Robert's Rules Compliance
  roberts_rules_enabled BOOLEAN DEFAULT true,
  point_of_order_raised BOOLEAN DEFAULT false,
  motion_on_floor UUID REFERENCES meeting_resolutions(id) ON DELETE SET NULL,
  speaking_order UUID[], -- Queue of speakers
  current_speaker UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Stage Timing
  stage_started_at TIMESTAMPTZ,
  stage_deadline TIMESTAMPTZ,
  estimated_completion TIMESTAMPTZ,
  actual_completion TIMESTAMPTZ,
  
  -- Configuration
  allow_late_arrivals BOOLEAN DEFAULT true,
  require_unanimous_consent BOOLEAN DEFAULT false,
  enable_executive_session BOOLEAN DEFAULT true,
  
  -- Error Handling
  error_state BOOLEAN DEFAULT false,
  error_message TEXT,
  last_error_at TIMESTAMPTZ,
  recovery_attempted BOOLEAN DEFAULT false,
  
  -- Timestamps
  workflow_started_at TIMESTAMPTZ,
  workflow_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_stage_index CHECK (
    current_stage_index >= 0 AND current_stage_index < array_length(stages_sequence, 1)
  ),
  CONSTRAINT valid_completion_timing CHECK (
    workflow_completed_at IS NULL OR workflow_completed_at >= workflow_started_at
  )
);

-- =====================================================
-- 5. WORKFLOW STAGE TRANSITIONS - Audit trail
-- =====================================================

CREATE TABLE meeting_workflow_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References
  workflow_id UUID NOT NULL REFERENCES meeting_workflows(id) ON DELETE CASCADE,
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  
  -- Transition Details
  from_stage workflow_stage,
  to_stage workflow_stage NOT NULL,
  transition_type VARCHAR(50) DEFAULT 'manual', -- 'manual', 'automatic', 'timeout', 'error'
  
  -- User and Authorization
  triggered_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  authorized_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  requires_approval BOOLEAN DEFAULT false,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Conditions and Context
  conditions_met JSONB DEFAULT '{}', -- What conditions triggered this transition
  context_data JSONB DEFAULT '{}', -- Additional context
  
  -- Timing
  transition_duration INTEGER, -- Seconds spent in previous stage
  planned_at TIMESTAMPTZ,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Validation and Checks
  quorum_check_passed BOOLEAN,
  voting_completed BOOLEAN,
  required_approvals_received BOOLEAN,
  
  -- Notes and Comments
  transition_notes TEXT,
  system_notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 6. VOTING SESSIONS - Grouped voting management
-- =====================================================

CREATE TYPE session_status AS ENUM ('preparing', 'open', 'closed', 'counting', 'completed', 'cancelled');

CREATE TABLE meeting_voting_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Context
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  workflow_id UUID REFERENCES meeting_workflows(id) ON DELETE SET NULL,
  
  -- Session Details
  session_name VARCHAR(200) NOT NULL,
  session_description TEXT,
  session_type VARCHAR(50) DEFAULT 'standard', -- 'standard', 'secret_ballot', 'roll_call', 'straw_poll'
  
  -- Status and Control
  status session_status DEFAULT 'preparing',
  controlled_by UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Session chair
  
  -- Voting Configuration
  voting_method vote_method NOT NULL DEFAULT 'electronic',
  anonymity_level vote_anonymity DEFAULT 'public',
  allow_abstentions BOOLEAN DEFAULT true,
  allow_proxy_voting BOOLEAN DEFAULT true,
  require_unanimous_consent BOOLEAN DEFAULT false,
  
  -- Timing
  scheduled_start TIMESTAMPTZ,
  actual_start TIMESTAMPTZ,
  scheduled_end TIMESTAMPTZ,
  actual_end TIMESTAMPTZ,
  voting_deadline TIMESTAMPTZ,
  
  -- Quorum and Participation
  required_quorum INTEGER,
  eligible_voters_count INTEGER DEFAULT 0,
  registered_voters_count INTEGER DEFAULT 0,
  actual_voters_count INTEGER DEFAULT 0,
  proxy_votes_count INTEGER DEFAULT 0,
  
  -- Results
  votes_for INTEGER DEFAULT 0,
  votes_against INTEGER DEFAULT 0,
  votes_abstain INTEGER DEFAULT 0,
  votes_absent INTEGER DEFAULT 0,
  total_votes INTEGER GENERATED ALWAYS AS (votes_for + votes_against + votes_abstain) STORED,
  
  -- Outcome
  quorum_achieved BOOLEAN DEFAULT false,
  session_passed BOOLEAN,
  pass_threshold DECIMAL(5,2) DEFAULT 50.0, -- Percentage required to pass
  actual_pass_percentage DECIMAL(5,2),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_timing CHECK (
    scheduled_start IS NULL OR scheduled_end IS NULL OR scheduled_end > scheduled_start
  ),
  CONSTRAINT valid_actual_timing CHECK (
    actual_start IS NULL OR actual_end IS NULL OR actual_end >= actual_start
  )
);

-- =====================================================
-- 7. VOTING SESSION ITEMS - Individual items in a session
-- =====================================================

CREATE TABLE meeting_voting_session_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References
  voting_session_id UUID NOT NULL REFERENCES meeting_voting_sessions(id) ON DELETE CASCADE,
  resolution_id UUID REFERENCES meeting_resolutions(id) ON DELETE CASCADE,
  motion_title VARCHAR(500) NOT NULL,
  motion_text TEXT NOT NULL,
  
  -- Item Configuration
  item_order INTEGER NOT NULL DEFAULT 1,
  voting_method_override vote_method, -- Override session default
  pass_threshold_override DECIMAL(5,2), -- Override session threshold
  
  -- Status and Results
  status session_status DEFAULT 'preparing',
  votes_for INTEGER DEFAULT 0,
  votes_against INTEGER DEFAULT 0,
  votes_abstain INTEGER DEFAULT 0,
  total_item_votes INTEGER GENERATED ALWAYS AS (votes_for + votes_against + votes_abstain) STORED,
  
  -- Outcome
  item_passed BOOLEAN,
  pass_percentage DECIMAL(5,2),
  
  -- Timing
  item_start TIMESTAMPTZ,
  item_end TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(voting_session_id, item_order)
);

-- =====================================================
-- 8. PERFORMANCE INDEXES
-- =====================================================

-- Meeting Roles
CREATE INDEX idx_meeting_roles_meeting ON meeting_roles(meeting_id, role, status);
CREATE INDEX idx_meeting_roles_user ON meeting_roles(user_id, status, effective_from DESC);
CREATE INDEX idx_meeting_roles_delegated ON meeting_roles(delegated_to) WHERE delegated_to IS NOT NULL;
CREATE INDEX idx_meeting_roles_substituted ON meeting_roles(substituted_by) WHERE substituted_by IS NOT NULL;

-- Meeting Proxies
CREATE INDEX idx_meeting_proxies_meeting ON meeting_proxies(meeting_id, status);
CREATE INDEX idx_meeting_proxies_grantor ON meeting_proxies(grantor_user_id, status);
CREATE INDEX idx_meeting_proxies_holder ON meeting_proxies(proxy_holder_user_id, status);
CREATE INDEX idx_meeting_proxies_active ON meeting_proxies(meeting_id, status, effective_until) 
  WHERE status = 'active';
CREATE INDEX idx_meeting_proxies_chain ON meeting_proxies(parent_proxy_id) WHERE parent_proxy_id IS NOT NULL;

-- Meeting Votes
CREATE INDEX idx_meeting_votes_meeting ON meeting_votes(meeting_id, vote_timestamp DESC);
CREATE INDEX idx_meeting_votes_resolution ON meeting_votes(resolution_id, vote_choice);
CREATE INDEX idx_meeting_votes_voter ON meeting_votes(voter_user_id, vote_timestamp DESC);
CREATE INDEX idx_meeting_votes_proxy ON meeting_votes(proxy_id) WHERE proxy_id IS NOT NULL;
CREATE INDEX idx_meeting_votes_anonymous ON meeting_votes(meeting_id, anonymity_level) 
  WHERE anonymity_level != 'public';
CREATE INDEX idx_meeting_votes_method ON meeting_votes(vote_method, vote_timestamp DESC);

-- Meeting Workflows
CREATE INDEX idx_meeting_workflows_meeting ON meeting_workflows(meeting_id, status);
CREATE INDEX idx_meeting_workflows_stage ON meeting_workflows(current_stage, status);
CREATE INDEX idx_meeting_workflows_controller ON meeting_workflows(current_controller) 
  WHERE current_controller IS NOT NULL;
CREATE INDEX idx_meeting_workflows_active ON meeting_workflows(status, workflow_started_at DESC) 
  WHERE status IN ('not_started', 'in_progress', 'waiting');

-- Workflow Transitions
CREATE INDEX idx_workflow_transitions_workflow ON meeting_workflow_transitions(workflow_id, executed_at DESC);
CREATE INDEX idx_workflow_transitions_meeting ON meeting_workflow_transitions(meeting_id, executed_at DESC);
CREATE INDEX idx_workflow_transitions_stage ON meeting_workflow_transitions(from_stage, to_stage);

-- Voting Sessions
CREATE INDEX idx_voting_sessions_meeting ON meeting_voting_sessions(meeting_id, status, actual_start DESC);
CREATE INDEX idx_voting_sessions_controller ON meeting_voting_sessions(controlled_by) 
  WHERE controlled_by IS NOT NULL;
CREATE INDEX idx_voting_sessions_active ON meeting_voting_sessions(status, voting_deadline) 
  WHERE status IN ('open', 'preparing');

-- =====================================================
-- 9. ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE meeting_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_proxies ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_workflow_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_voting_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_voting_session_items ENABLE ROW LEVEL SECURITY;

-- Meeting Roles Policies
CREATE POLICY "meeting_roles_view_policy" ON meeting_roles
  FOR SELECT USING (
    meeting_id IN (
      SELECT m.id FROM meetings m
      JOIN organization_members om ON m.organization_id = om.organization_id
      WHERE om.user_id = auth.uid() AND om.status = 'active'
    )
  );

CREATE POLICY "meeting_roles_manage_policy" ON meeting_roles
  FOR ALL USING (
    meeting_id IN (
      SELECT m.id FROM meetings m
      JOIN organization_members om ON m.organization_id = om.organization_id
      WHERE om.user_id = auth.uid() AND om.status = 'active'
      AND om.role IN ('owner', 'admin')
    ) OR
    meeting_id IN (
      SELECT id FROM meetings WHERE created_by = auth.uid()
    )
  );

-- Meeting Proxies Policies
CREATE POLICY "meeting_proxies_view_policy" ON meeting_proxies
  FOR SELECT USING (
    grantor_user_id = auth.uid() OR
    proxy_holder_user_id = auth.uid() OR
    meeting_id IN (
      SELECT m.id FROM meetings m
      JOIN organization_members om ON m.organization_id = om.organization_id
      WHERE om.user_id = auth.uid() AND om.status = 'active'
    )
  );

CREATE POLICY "meeting_proxies_create_policy" ON meeting_proxies
  FOR INSERT WITH CHECK (grantor_user_id = auth.uid());

CREATE POLICY "meeting_proxies_update_policy" ON meeting_proxies
  FOR UPDATE USING (
    grantor_user_id = auth.uid() OR
    meeting_id IN (
      SELECT m.id FROM meetings m
      JOIN organization_members om ON m.organization_id = om.organization_id
      WHERE om.user_id = auth.uid() AND om.status = 'active'
      AND om.role IN ('owner', 'admin')
    )
  );

-- Meeting Votes Policies (with anonymity protection)
CREATE POLICY "meeting_votes_view_policy" ON meeting_votes
  FOR SELECT USING (
    -- Can see own votes
    voter_user_id = auth.uid() OR
    -- Can see public votes in accessible meetings
    (
      anonymity_level = 'public' AND
      meeting_id IN (
        SELECT m.id FROM meetings m
        JOIN organization_members om ON m.organization_id = om.organization_id
        WHERE om.user_id = auth.uid() AND om.status = 'active'
      )
    ) OR
    -- Admins can see aggregated data but not individual anonymous votes
    (
      anonymity_level != 'secret' AND
      meeting_id IN (
        SELECT m.id FROM meetings m
        JOIN organization_members om ON m.organization_id = om.organization_id
        WHERE om.user_id = auth.uid() AND om.status = 'active'
        AND om.role IN ('owner', 'admin')
      )
    )
  );

CREATE POLICY "meeting_votes_create_policy" ON meeting_votes
  FOR INSERT WITH CHECK (voter_user_id = auth.uid());

-- =====================================================
-- 10. TRIGGERS AND FUNCTIONS
-- =====================================================

-- Update workflow progress when stage transitions occur
CREATE OR REPLACE FUNCTION update_workflow_progress()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE meeting_workflows 
  SET 
    progress_percentage = (
      (NEW.current_stage_index::float / GREATEST(array_length(stages_sequence, 1) - 1, 1)) * 100
    )::int,
    updated_at = NOW()
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER workflow_progress_update_trigger
  AFTER UPDATE OF current_stage_index ON meeting_workflows
  FOR EACH ROW EXECUTE FUNCTION update_workflow_progress();

-- Auto-update voting session totals
CREATE OR REPLACE FUNCTION update_voting_session_totals()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the voting session totals
  UPDATE meeting_voting_sessions 
  SET 
    actual_voters_count = (
      SELECT COUNT(DISTINCT voter_user_id) 
      FROM meeting_votes 
      WHERE meeting_id = NEW.meeting_id
    ),
    votes_for = COALESCE((
      SELECT SUM(CASE WHEN vote_choice = 'for' THEN vote_weight ELSE 0 END)
      FROM meeting_votes 
      WHERE meeting_id = NEW.meeting_id
    ), 0),
    votes_against = COALESCE((
      SELECT SUM(CASE WHEN vote_choice = 'against' THEN vote_weight ELSE 0 END)
      FROM meeting_votes 
      WHERE meeting_id = NEW.meeting_id
    ), 0),
    votes_abstain = COALESCE((
      SELECT SUM(CASE WHEN vote_choice = 'abstain' THEN vote_weight ELSE 0 END)
      FROM meeting_votes 
      WHERE meeting_id = NEW.meeting_id
    ), 0),
    proxy_votes_count = (
      SELECT COUNT(*) 
      FROM meeting_votes 
      WHERE meeting_id = NEW.meeting_id AND proxy_id IS NOT NULL
    ),
    updated_at = NOW()
  WHERE meeting_id = NEW.meeting_id;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER voting_session_totals_trigger
  AFTER INSERT OR UPDATE ON meeting_votes
  FOR EACH ROW EXECUTE FUNCTION update_voting_session_totals();

-- Auto-revoke conflicting proxies
CREATE OR REPLACE FUNCTION check_proxy_conflicts()
RETURNS TRIGGER AS $$
BEGIN
  -- Revoke any existing active proxies for the same grantor in the same meeting
  UPDATE meeting_proxies 
  SET 
    status = 'revoked',
    revoked_at = NOW(),
    revoked_by = NEW.grantor_user_id,
    revocation_reason = 'Superseded by new proxy appointment',
    updated_at = NOW()
  WHERE meeting_id = NEW.meeting_id 
    AND grantor_user_id = NEW.grantor_user_id 
    AND id != NEW.id 
    AND status = 'active';
    
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER proxy_conflict_check_trigger
  BEFORE INSERT ON meeting_proxies
  FOR EACH ROW EXECUTE FUNCTION check_proxy_conflicts();

-- Auto-expire proxies
CREATE OR REPLACE FUNCTION expire_proxies()
RETURNS void AS $$
BEGIN
  UPDATE meeting_proxies 
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'active' AND effective_until < NOW();
END;
$$ language 'plpgsql';

-- Schedule function to run periodically (would be called by scheduler)
-- SELECT expire_proxies();

-- Update timestamps trigger
CREATE TRIGGER update_meeting_roles_updated_at 
  BEFORE UPDATE ON meeting_roles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meeting_proxies_updated_at 
  BEFORE UPDATE ON meeting_proxies 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meeting_workflows_updated_at 
  BEFORE UPDATE ON meeting_workflows 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_voting_sessions_updated_at 
  BEFORE UPDATE ON meeting_voting_sessions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_voting_session_items_updated_at 
  BEFORE UPDATE ON meeting_voting_session_items 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 11. VIEWS FOR COMMON QUERIES
-- =====================================================

-- Active proxies with delegation chain
CREATE VIEW active_proxy_chains AS
WITH RECURSIVE proxy_chain AS (
  -- Base case: direct proxies
  SELECT 
    id,
    meeting_id,
    grantor_user_id,
    proxy_holder_user_id,
    delegation_chain_level,
    parent_proxy_id,
    ARRAY[id] as chain_path,
    ARRAY[grantor_user_id, proxy_holder_user_id] as user_chain
  FROM meeting_proxies 
  WHERE status = 'active' AND parent_proxy_id IS NULL
  
  UNION ALL
  
  -- Recursive case: sub-delegated proxies
  SELECT 
    p.id,
    p.meeting_id,
    pc.grantor_user_id, -- Original grantor
    p.proxy_holder_user_id,
    p.delegation_chain_level,
    p.parent_proxy_id,
    pc.chain_path || p.id,
    pc.user_chain || p.proxy_holder_user_id
  FROM meeting_proxies p
  JOIN proxy_chain pc ON p.parent_proxy_id = pc.id
  WHERE p.status = 'active' AND p.delegation_chain_level <= 5
)
SELECT * FROM proxy_chain;

-- Current meeting status with workflow
CREATE VIEW meeting_status_with_workflow AS
SELECT 
  m.id,
  m.title,
  m.status as meeting_status,
  m.scheduled_start,
  m.scheduled_end,
  w.id as workflow_id,
  w.current_stage,
  w.status as workflow_status,
  w.progress_percentage,
  w.quorum_achieved,
  w.attendance_count,
  w.active_voting_session
FROM meetings m
LEFT JOIN meeting_workflows w ON m.id = w.meeting_id;

-- Voting participation summary
CREATE VIEW voting_participation_summary AS
SELECT 
  mv.meeting_id,
  mv.resolution_id,
  COUNT(*) as total_votes,
  COUNT(DISTINCT mv.voter_user_id) as unique_voters,
  COUNT(*) FILTER (WHERE mv.proxy_id IS NOT NULL) as proxy_votes,
  COUNT(*) FILTER (WHERE mv.vote_choice = 'for') as votes_for,
  COUNT(*) FILTER (WHERE mv.vote_choice = 'against') as votes_against,
  COUNT(*) FILTER (WHERE mv.vote_choice = 'abstain') as votes_abstain,
  ROUND(AVG(mv.vote_confidence), 2) as avg_confidence,
  COUNT(*) FILTER (WHERE mv.anonymity_level != 'public') as anonymous_votes
FROM meeting_votes mv
GROUP BY mv.meeting_id, mv.resolution_id;

-- =====================================================
-- 12. MIGRATION COMPLETION
-- =====================================================

INSERT INTO _migrations (name, executed_at) 
VALUES ('015-advanced-voting-workflows', NOW())
ON CONFLICT (name) DO UPDATE SET executed_at = NOW();

-- Success confirmation
SELECT 'Advanced Board Meeting Workflows & Voting Systems created successfully!' as message;