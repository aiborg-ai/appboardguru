-- Virtual Board Room System Migration
-- Enterprise-grade secure virtual meeting platform

-- Board Room Sessions
CREATE TABLE IF NOT EXISTS board_room_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    created_by UUID NOT NULL,
    session_name VARCHAR(255) NOT NULL,
    session_type VARCHAR(50) NOT NULL CHECK (session_type IN ('board_meeting', 'committee_meeting', 'executive_session', 'special_meeting')),
    scheduled_start TIMESTAMPTZ NOT NULL,
    scheduled_end TIMESTAMPTZ NOT NULL,
    actual_start TIMESTAMPTZ NULL,
    actual_end TIMESTAMPTZ NULL,
    status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'active', 'paused', 'ended', 'cancelled')),
    encryption_key_id UUID NOT NULL,
    recording_enabled BOOLEAN DEFAULT false,
    recording_encryption_key UUID NULL,
    session_config JSONB NOT NULL DEFAULT '{}',
    security_level VARCHAR(20) DEFAULT 'high' CHECK (security_level IN ('standard', 'high', 'maximum')),
    max_participants INTEGER DEFAULT 50,
    require_device_attestation BOOLEAN DEFAULT true,
    require_mfa BOOLEAN DEFAULT true,
    allow_guest_access BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL,
    
    CONSTRAINT fk_board_room_sessions_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    CONSTRAINT fk_board_room_sessions_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
);

-- Session Participants
CREATE TABLE IF NOT EXISTS board_room_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL,
    user_id UUID NOT NULL,
    participant_role VARCHAR(50) NOT NULL CHECK (participant_role IN ('host', 'co_host', 'director', 'observer', 'secretary', 'legal_counsel')),
    join_time TIMESTAMPTZ NULL,
    leave_time TIMESTAMPTZ NULL,
    is_present BOOLEAN DEFAULT false,
    device_trusted BOOLEAN DEFAULT false,
    device_fingerprint VARCHAR(255) NULL,
    connection_quality JSONB DEFAULT '{}',
    voting_eligible BOOLEAN DEFAULT true,
    can_share_screen BOOLEAN DEFAULT false,
    can_record BOOLEAN DEFAULT false,
    access_level VARCHAR(20) DEFAULT 'standard' CHECK (access_level IN ('limited', 'standard', 'elevated', 'admin')),
    proxy_for UUID NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_board_room_participants_session FOREIGN KEY (session_id) REFERENCES board_room_sessions(id) ON DELETE CASCADE,
    CONSTRAINT fk_board_room_participants_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_board_room_participants_proxy FOREIGN KEY (proxy_for) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT unique_session_user UNIQUE (session_id, user_id)
);

-- WebRTC Connections
CREATE TABLE IF NOT EXISTS webrtc_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL,
    participant_id UUID NOT NULL,
    connection_id VARCHAR(255) NOT NULL,
    peer_id VARCHAR(255) NOT NULL,
    connection_type VARCHAR(20) NOT NULL CHECK (connection_type IN ('audio', 'video', 'screen_share', 'data')),
    ice_candidates JSONB DEFAULT '[]',
    sdp_offer JSONB NULL,
    sdp_answer JSONB NULL,
    connection_state VARCHAR(20) DEFAULT 'new' CHECK (connection_state IN ('new', 'connecting', 'connected', 'disconnected', 'failed', 'closed')),
    encryption_enabled BOOLEAN DEFAULT true,
    dtls_fingerprint VARCHAR(255) NULL,
    srtp_crypto_suite VARCHAR(50) NULL,
    bandwidth_limit INTEGER NULL,
    quality_settings JSONB DEFAULT '{}',
    stats JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_webrtc_session FOREIGN KEY (session_id) REFERENCES board_room_sessions(id) ON DELETE CASCADE,
    CONSTRAINT fk_webrtc_participant FOREIGN KEY (participant_id) REFERENCES board_room_participants(id) ON DELETE CASCADE
);

-- Digital Voting System
CREATE TABLE IF NOT EXISTS board_room_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL,
    motion_title VARCHAR(500) NOT NULL,
    motion_description TEXT,
    vote_type VARCHAR(50) NOT NULL CHECK (vote_type IN ('simple_majority', 'two_thirds_majority', 'unanimous', 'special_resolution')),
    is_anonymous BOOLEAN DEFAULT false,
    blockchain_enabled BOOLEAN DEFAULT true,
    blockchain_hash VARCHAR(255) NULL,
    blockchain_transaction_id VARCHAR(255) NULL,
    started_by UUID NOT NULL,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ends_at TIMESTAMPTZ NULL,
    ended_at TIMESTAMPTZ NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('draft', 'active', 'ended', 'cancelled')),
    required_votes INTEGER NOT NULL,
    votes_for INTEGER DEFAULT 0,
    votes_against INTEGER DEFAULT 0,
    abstentions INTEGER DEFAULT 0,
    quorum_required INTEGER NOT NULL,
    quorum_met BOOLEAN DEFAULT false,
    result VARCHAR(20) NULL CHECK (result IN ('passed', 'failed', 'no_quorum', 'cancelled')),
    audit_trail JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_board_room_votes_session FOREIGN KEY (session_id) REFERENCES board_room_sessions(id) ON DELETE CASCADE,
    CONSTRAINT fk_board_room_votes_starter FOREIGN KEY (started_by) REFERENCES users(id) ON DELETE RESTRICT
);

-- Individual Vote Records
CREATE TABLE IF NOT EXISTS board_room_vote_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vote_id UUID NOT NULL,
    voter_id UUID NOT NULL,
    vote_choice VARCHAR(20) NOT NULL CHECK (vote_choice IN ('for', 'against', 'abstain')),
    vote_weight DECIMAL(5,2) DEFAULT 1.0,
    is_proxy_vote BOOLEAN DEFAULT false,
    proxy_grantor_id UUID NULL,
    cast_at TIMESTAMPTZ DEFAULT NOW(),
    blockchain_hash VARCHAR(255) NULL,
    encrypted_vote_data TEXT NULL,
    vote_signature VARCHAR(500) NULL,
    device_attestation JSONB NULL,
    audit_trail JSONB DEFAULT '[]',
    
    CONSTRAINT fk_vote_records_vote FOREIGN KEY (vote_id) REFERENCES board_room_votes(id) ON DELETE CASCADE,
    CONSTRAINT fk_vote_records_voter FOREIGN KEY (voter_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_vote_records_proxy_grantor FOREIGN KEY (proxy_grantor_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT unique_voter_per_vote UNIQUE (vote_id, voter_id)
);

-- Breakout Rooms
CREATE TABLE IF NOT EXISTS board_room_breakouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_session_id UUID NOT NULL,
    breakout_name VARCHAR(255) NOT NULL,
    breakout_type VARCHAR(50) NOT NULL CHECK (breakout_type IN ('executive_session', 'committee_discussion', 'private_consultation', 'working_group')),
    created_by UUID NOT NULL,
    max_participants INTEGER DEFAULT 10,
    is_private BOOLEAN DEFAULT true,
    requires_approval BOOLEAN DEFAULT false,
    auto_return_time TIMESTAMPTZ NULL,
    encryption_key_id UUID NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'ended')),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_breakouts_parent_session FOREIGN KEY (parent_session_id) REFERENCES board_room_sessions(id) ON DELETE CASCADE,
    CONSTRAINT fk_breakouts_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
);

-- Breakout Room Participants
CREATE TABLE IF NOT EXISTS board_room_breakout_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    breakout_id UUID NOT NULL,
    participant_id UUID NOT NULL,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    left_at TIMESTAMPTZ NULL,
    is_present BOOLEAN DEFAULT true,
    role VARCHAR(50) DEFAULT 'participant' CHECK (role IN ('moderator', 'participant', 'observer')),
    
    CONSTRAINT fk_breakout_participants_breakout FOREIGN KEY (breakout_id) REFERENCES board_room_breakouts(id) ON DELETE CASCADE,
    CONSTRAINT fk_breakout_participants_participant FOREIGN KEY (participant_id) REFERENCES board_room_participants(id) ON DELETE CASCADE,
    CONSTRAINT unique_breakout_participant UNIQUE (breakout_id, participant_id)
);

-- Document Collaboration
CREATE TABLE IF NOT EXISTS board_room_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL,
    asset_id UUID NULL,
    document_title VARCHAR(500) NOT NULL,
    document_type VARCHAR(50) NOT NULL CHECK (document_type IN ('agenda', 'minutes', 'resolution', 'report', 'presentation', 'contract')),
    shared_by UUID NOT NULL,
    is_live_collaborative BOOLEAN DEFAULT true,
    version_locked BOOLEAN DEFAULT false,
    current_version INTEGER DEFAULT 1,
    encryption_key_id UUID NOT NULL,
    access_level VARCHAR(20) DEFAULT 'session_participants' CHECK (access_level IN ('session_participants', 'directors_only', 'committee_only', 'custom')),
    permissions JSONB NOT NULL DEFAULT '{"read": true, "comment": true, "edit": false, "download": false}',
    collaboration_data JSONB DEFAULT '{}',
    annotations JSONB DEFAULT '[]',
    decision_markers JSONB DEFAULT '[]',
    shared_at TIMESTAMPTZ DEFAULT NOW(),
    last_modified_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_board_room_documents_session FOREIGN KEY (session_id) REFERENCES board_room_sessions(id) ON DELETE CASCADE,
    CONSTRAINT fk_board_room_documents_asset FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE SET NULL,
    CONSTRAINT fk_board_room_documents_sharer FOREIGN KEY (shared_by) REFERENCES users(id) ON DELETE RESTRICT
);

-- Document Annotations (Real-time)
CREATE TABLE IF NOT EXISTS board_room_document_annotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL,
    annotator_id UUID NOT NULL,
    annotation_type VARCHAR(50) NOT NULL CHECK (annotation_type IN ('highlight', 'comment', 'question', 'concern', 'approval', 'suggestion')),
    content TEXT NOT NULL,
    position_data JSONB NOT NULL,
    page_number INTEGER NULL,
    is_resolved BOOLEAN DEFAULT false,
    resolved_by UUID NULL,
    resolved_at TIMESTAMPTZ NULL,
    thread_id UUID NULL,
    parent_annotation_id UUID NULL,
    priority_level VARCHAR(20) DEFAULT 'normal' CHECK (priority_level IN ('low', 'normal', 'high', 'urgent')),
    visibility VARCHAR(20) DEFAULT 'all' CHECK (visibility IN ('private', 'moderators', 'all')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_document_annotations_document FOREIGN KEY (document_id) REFERENCES board_room_documents(id) ON DELETE CASCADE,
    CONSTRAINT fk_document_annotations_annotator FOREIGN KEY (annotator_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_document_annotations_resolver FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_document_annotations_parent FOREIGN KEY (parent_annotation_id) REFERENCES board_room_document_annotations(id) ON DELETE CASCADE
);

-- Session Recordings
CREATE TABLE IF NOT EXISTS board_room_recordings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL,
    recording_type VARCHAR(50) NOT NULL CHECK (recording_type IN ('audio_only', 'video', 'screen_share', 'full_session')),
    file_path VARCHAR(1000) NOT NULL,
    encrypted_file_path VARCHAR(1000) NULL,
    encryption_key_id UUID NOT NULL,
    file_size_bytes BIGINT NULL,
    duration_seconds INTEGER NULL,
    started_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ NULL,
    started_by UUID NOT NULL,
    status VARCHAR(20) DEFAULT 'recording' CHECK (status IN ('recording', 'processing', 'completed', 'failed', 'deleted')),
    access_permissions JSONB NOT NULL DEFAULT '{"viewers": [], "access_level": "directors_only"}',
    retention_policy JSONB NOT NULL DEFAULT '{"retain_until": null, "auto_delete": false}',
    compliance_tags VARCHAR[] DEFAULT '{}',
    transcript_available BOOLEAN DEFAULT false,
    transcript_path VARCHAR(1000) NULL,
    processing_metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_recordings_session FOREIGN KEY (session_id) REFERENCES board_room_sessions(id) ON DELETE CASCADE,
    CONSTRAINT fk_recordings_starter FOREIGN KEY (started_by) REFERENCES users(id) ON DELETE RESTRICT
);

-- Security Monitoring
CREATE TABLE IF NOT EXISTS board_room_security_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NULL,
    user_id UUID NULL,
    event_type VARCHAR(100) NOT NULL,
    event_category VARCHAR(50) NOT NULL CHECK (event_category IN ('authentication', 'authorization', 'data_access', 'network', 'device', 'compliance')),
    severity_level VARCHAR(20) NOT NULL CHECK (severity_level IN ('info', 'warning', 'critical', 'alert')),
    event_description TEXT NOT NULL,
    source_ip INET NULL,
    user_agent TEXT NULL,
    device_fingerprint VARCHAR(255) NULL,
    event_data JSONB DEFAULT '{}',
    risk_score INTEGER DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
    resolved BOOLEAN DEFAULT false,
    resolved_by UUID NULL,
    resolved_at TIMESTAMPTZ NULL,
    resolution_notes TEXT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_security_events_session FOREIGN KEY (session_id) REFERENCES board_room_sessions(id) ON DELETE SET NULL,
    CONSTRAINT fk_security_events_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_security_events_resolver FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Device Trust Registry
CREATE TABLE IF NOT EXISTS trusted_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    device_fingerprint VARCHAR(255) NOT NULL,
    device_name VARCHAR(255) NOT NULL,
    device_type VARCHAR(50) NOT NULL CHECK (device_type IN ('desktop', 'laptop', 'tablet', 'mobile', 'browser')),
    operating_system VARCHAR(100) NULL,
    browser_info JSONB NULL,
    attestation_data JSONB NOT NULL DEFAULT '{}',
    trust_level VARCHAR(20) DEFAULT 'basic' CHECK (trust_level IN ('basic', 'verified', 'high_trust', 'enterprise')),
    is_active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMPTZ NULL,
    expires_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_trusted_devices_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT unique_user_device_fingerprint UNIQUE (user_id, device_fingerprint)
);

-- Encryption Key Management
CREATE TABLE IF NOT EXISTS board_room_encryption_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key_purpose VARCHAR(50) NOT NULL CHECK (key_purpose IN ('session', 'recording', 'document', 'vote')),
    key_algorithm VARCHAR(50) NOT NULL DEFAULT 'AES-256-GCM',
    key_data_encrypted TEXT NOT NULL,
    key_version INTEGER DEFAULT 1,
    created_by UUID NOT NULL,
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMPTZ NULL,
    rotation_required_at TIMESTAMPTZ NULL,
    last_rotated_at TIMESTAMPTZ NULL,
    usage_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_encryption_keys_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
);

-- Meeting Templates
CREATE TABLE IF NOT EXISTS board_room_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    template_name VARCHAR(255) NOT NULL,
    template_type VARCHAR(50) NOT NULL CHECK (template_type IN ('board_meeting', 'committee_meeting', 'executive_session', 'annual_meeting')),
    default_settings JSONB NOT NULL DEFAULT '{}',
    security_profile JSONB NOT NULL DEFAULT '{}',
    participant_roles JSONB NOT NULL DEFAULT '[]',
    document_templates UUID[] DEFAULT '{}',
    voting_templates JSONB DEFAULT '[]',
    compliance_requirements JSONB DEFAULT '{}',
    is_default BOOLEAN DEFAULT false,
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_board_room_templates_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    CONSTRAINT fk_board_room_templates_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_board_room_sessions_org_id ON board_room_sessions(organization_id);
CREATE INDEX IF NOT EXISTS idx_board_room_sessions_status ON board_room_sessions(status);
CREATE INDEX IF NOT EXISTS idx_board_room_sessions_scheduled_start ON board_room_sessions(scheduled_start);
CREATE INDEX IF NOT EXISTS idx_board_room_participants_session_id ON board_room_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_board_room_participants_user_id ON board_room_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_webrtc_connections_session_id ON webrtc_connections(session_id);
CREATE INDEX IF NOT EXISTS idx_board_room_votes_session_id ON board_room_votes(session_id);
CREATE INDEX IF NOT EXISTS idx_board_room_votes_status ON board_room_votes(status);
CREATE INDEX IF NOT EXISTS idx_vote_records_vote_id ON board_room_vote_records(vote_id);
CREATE INDEX IF NOT EXISTS idx_breakouts_parent_session ON board_room_breakouts(parent_session_id);
CREATE INDEX IF NOT EXISTS idx_documents_session_id ON board_room_documents(session_id);
CREATE INDEX IF NOT EXISTS idx_document_annotations_document_id ON board_room_document_annotations(document_id);
CREATE INDEX IF NOT EXISTS idx_recordings_session_id ON board_room_recordings(session_id);
CREATE INDEX IF NOT EXISTS idx_security_events_session_id ON board_room_security_events(session_id);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON board_room_security_events(severity_level);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON board_room_security_events(created_at);
CREATE INDEX IF NOT EXISTS idx_trusted_devices_user_id ON trusted_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_trusted_devices_fingerprint ON trusted_devices(device_fingerprint);

-- Row Level Security
ALTER TABLE board_room_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_room_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE webrtc_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_room_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_room_vote_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_room_breakouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_room_breakout_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_room_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_room_document_annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_room_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_room_security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE trusted_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_room_encryption_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_room_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can access sessions in their organization" ON board_room_sessions
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );

CREATE POLICY "Users can access their participation records" ON board_room_participants
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can access their WebRTC connections" ON webrtc_connections
    FOR ALL USING (
        participant_id IN (
            SELECT id FROM board_room_participants WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can access votes in their sessions" ON board_room_votes
    FOR SELECT USING (
        session_id IN (
            SELECT session_id FROM board_room_participants WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can access their own vote records" ON board_room_vote_records
    FOR ALL USING (voter_id = auth.uid());

CREATE POLICY "Users can access their trusted devices" ON trusted_devices
    FOR ALL USING (user_id = auth.uid());

-- Trigger Functions for Updated At
CREATE OR REPLACE FUNCTION update_board_room_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply Update Triggers
CREATE TRIGGER update_board_room_sessions_updated_at
    BEFORE UPDATE ON board_room_sessions
    FOR EACH ROW EXECUTE FUNCTION update_board_room_updated_at();

CREATE TRIGGER update_board_room_participants_updated_at
    BEFORE UPDATE ON board_room_participants
    FOR EACH ROW EXECUTE FUNCTION update_board_room_updated_at();

CREATE TRIGGER update_webrtc_connections_updated_at
    BEFORE UPDATE ON webrtc_connections
    FOR EACH ROW EXECUTE FUNCTION update_board_room_updated_at();

CREATE TRIGGER update_board_room_votes_updated_at
    BEFORE UPDATE ON board_room_votes
    FOR EACH ROW EXECUTE FUNCTION update_board_room_updated_at();

CREATE TRIGGER update_board_room_breakouts_updated_at
    BEFORE UPDATE ON board_room_breakouts
    FOR EACH ROW EXECUTE FUNCTION update_board_room_updated_at();

CREATE TRIGGER update_board_room_documents_updated_at
    BEFORE UPDATE ON board_room_documents
    FOR EACH ROW EXECUTE FUNCTION update_board_room_updated_at();

CREATE TRIGGER update_board_room_document_annotations_updated_at
    BEFORE UPDATE ON board_room_document_annotations
    FOR EACH ROW EXECUTE FUNCTION update_board_room_updated_at();

CREATE TRIGGER update_board_room_recordings_updated_at
    BEFORE UPDATE ON board_room_recordings
    FOR EACH ROW EXECUTE FUNCTION update_board_room_updated_at();

CREATE TRIGGER update_trusted_devices_updated_at
    BEFORE UPDATE ON trusted_devices
    FOR EACH ROW EXECUTE FUNCTION update_board_room_updated_at();

CREATE TRIGGER update_board_room_encryption_keys_updated_at
    BEFORE UPDATE ON board_room_encryption_keys
    FOR EACH ROW EXECUTE FUNCTION update_board_room_updated_at();

CREATE TRIGGER update_board_room_templates_updated_at
    BEFORE UPDATE ON board_room_templates
    FOR EACH ROW EXECUTE FUNCTION update_board_room_updated_at();

-- Blockchain voting trigger function
CREATE OR REPLACE FUNCTION process_blockchain_vote()
RETURNS TRIGGER AS $$
BEGIN
    -- Update vote counts
    UPDATE board_room_votes 
    SET 
        votes_for = (SELECT COUNT(*) FROM board_room_vote_records WHERE vote_id = NEW.vote_id AND vote_choice = 'for'),
        votes_against = (SELECT COUNT(*) FROM board_room_vote_records WHERE vote_id = NEW.vote_id AND vote_choice = 'against'),
        abstentions = (SELECT COUNT(*) FROM board_room_vote_records WHERE vote_id = NEW.vote_id AND vote_choice = 'abstain'),
        updated_at = NOW()
    WHERE id = NEW.vote_id;
    
    -- Check quorum and auto-complete if reached
    UPDATE board_room_votes 
    SET quorum_met = true
    WHERE id = NEW.vote_id 
    AND (votes_for + votes_against + abstentions) >= quorum_required;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_blockchain_vote_processing
    AFTER INSERT ON board_room_vote_records
    FOR EACH ROW EXECUTE FUNCTION process_blockchain_vote();

COMMENT ON TABLE board_room_sessions IS 'Enterprise virtual board room sessions with end-to-end encryption';
COMMENT ON TABLE board_room_votes IS 'Blockchain-verified digital voting system for board decisions';
COMMENT ON TABLE webrtc_connections IS 'Encrypted WebRTC peer-to-peer connections for audio/video';
COMMENT ON TABLE board_room_security_events IS 'Security monitoring and audit trail for board room activities';
COMMENT ON TABLE trusted_devices IS 'Device attestation and trust management for secure access';