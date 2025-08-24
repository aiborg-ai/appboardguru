-- Enterprise Push Notification System Migration
-- Version: 1.0
-- Description: Comprehensive push notification system for urgent board governance matters
-- Features: Multi-platform support, intelligent routing, rich notifications, enterprise security

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- =============================================
-- PUSH NOTIFICATION DEVICE MANAGEMENT
-- =============================================

-- Device platforms enum
CREATE TYPE notification_platform AS ENUM ('ios', 'android', 'web');

-- Push notification devices table
CREATE TABLE IF NOT EXISTS push_devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- User and device identification
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform notification_platform NOT NULL,
    device_token TEXT NOT NULL, -- FCM token, APNS token, or WebPush endpoint
    device_name TEXT,
    device_model TEXT,
    app_version TEXT,
    os_version TEXT,
    
    -- Device metadata
    device_fingerprint TEXT, -- Unique device identifier
    user_agent TEXT, -- For web devices
    ip_address INET,
    
    -- Status and activity
    is_active BOOLEAN DEFAULT true,
    last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    registration_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Preferences (JSONB for flexible device-specific settings)
    preferences JSONB DEFAULT '{
        "enabled": true,
        "do_not_disturb_start": null,
        "do_not_disturb_end": null,
        "allow_critical_override": true,
        "categories": {
            "emergency_board_matter": {"enabled": true, "sound": true, "vibration": true, "badge": true},
            "time_sensitive_voting": {"enabled": true, "sound": true, "vibration": true, "badge": true},
            "compliance_alert": {"enabled": true, "sound": true, "vibration": false, "badge": true},
            "meeting_notification": {"enabled": true, "sound": false, "vibration": false, "badge": true},
            "governance_update": {"enabled": true, "sound": false, "vibration": false, "badge": true},
            "security_alert": {"enabled": true, "sound": true, "vibration": true, "badge": true}
        }
    }'::jsonb,
    
    -- Security and audit
    encrypted_token TEXT, -- Encrypted device token for security
    token_expires_at TIMESTAMP WITH TIME ZONE,
    security_hash TEXT, -- Hash for token validation
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(user_id, device_token, platform),
    CONSTRAINT valid_token_expiry CHECK (
        token_expires_at IS NULL OR token_expires_at > created_at
    )
);

-- =============================================
-- NOTIFICATION ROUTING RULES
-- =============================================

-- Routing contexts for different governance scenarios
CREATE TYPE routing_context AS ENUM (
    'meeting', 'voting', 'compliance', 'emergency', 'governance'
);

-- Delivery channels enum
CREATE TYPE delivery_channel AS ENUM (
    'push', 'email', 'sms', 'in_app', 'webhook'
);

-- Escalation triggers
CREATE TYPE escalation_trigger AS ENUM (
    'unread', 'undelivered', 'no_action', 'time_critical'
);

-- Notification routing rules table
CREATE TABLE IF NOT EXISTS notification_routing_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Rule identification
    name VARCHAR(255) NOT NULL,
    description TEXT,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Rule matching criteria
    category notification_category NOT NULL,
    priority notification_priority NOT NULL,
    routing_context routing_context NOT NULL,
    
    -- Delivery preferences
    primary_channels delivery_channel[] DEFAULT ARRAY['push'],
    fallback_channels delivery_channel[] DEFAULT ARRAY['email'],
    
    -- Time-based routing
    immediate_delivery BOOLEAN DEFAULT false,
    respect_dnd BOOLEAN DEFAULT true,
    timezone_aware BOOLEAN DEFAULT true,
    business_hours_only BOOLEAN DEFAULT false,
    
    -- Escalation settings
    escalation_enabled BOOLEAN DEFAULT false,
    escalation_delay_minutes INTEGER DEFAULT 15,
    escalation_trigger escalation_trigger DEFAULT 'unread',
    escalation_channels delivery_channel[] DEFAULT ARRAY['email'],
    escalation_recipients UUID[], -- Array of user IDs
    
    -- Rule conditions (JSONB for flexible conditions)
    conditions JSONB DEFAULT '[]'::jsonb,
    
    -- Rule metadata
    created_by UUID NOT NULL REFERENCES users(id),
    is_active BOOLEAN DEFAULT true,
    rule_priority INTEGER DEFAULT 100, -- Lower number = higher priority
    
    -- Usage statistics
    usage_count INTEGER DEFAULT 0,
    last_used TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_escalation_delay CHECK (escalation_delay_minutes > 0 AND escalation_delay_minutes <= 1440),
    CONSTRAINT valid_rule_priority CHECK (rule_priority >= 1 AND rule_priority <= 1000)
);

-- =============================================
-- PUSH NOTIFICATION DELIVERIES
-- =============================================

-- Delivery status enum
CREATE TYPE delivery_status AS ENUM (
    'pending', 'sent', 'delivered', 'failed', 'expired'
);

-- Push notification deliveries table
CREATE TABLE IF NOT EXISTS push_notification_deliveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Associated notification
    notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Notification details
    category notification_category NOT NULL,
    priority notification_priority NOT NULL,
    routing_context routing_context,
    
    -- Delivery statistics
    total_devices INTEGER DEFAULT 0,
    successful_deliveries INTEGER DEFAULT 0,
    failed_deliveries INTEGER DEFAULT 0,
    
    -- Detailed delivery results (JSONB array)
    delivery_results JSONB DEFAULT '[]'::jsonb,
    
    -- Performance metrics
    delivery_time_ms INTEGER, -- Time taken to deliver to all devices
    first_delivery_at TIMESTAMP WITH TIME ZONE,
    last_delivery_at TIMESTAMP WITH TIME ZONE,
    
    -- Routing information
    applied_rules UUID[], -- Array of routing rule IDs used
    routing_decision JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    delivered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- NOTIFICATION ESCALATIONS
-- =============================================

-- Escalation status enum
CREATE TYPE escalation_status AS ENUM (
    'scheduled', 'triggered', 'completed', 'cancelled'
);

-- Notification escalations table
CREATE TABLE IF NOT EXISTS notification_escalations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Original notification
    original_notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Escalation configuration
    trigger escalation_trigger NOT NULL,
    delay_minutes INTEGER NOT NULL,
    escalation_channels delivery_channel[] NOT NULL,
    escalation_recipients UUID[] NOT NULL, -- User IDs to escalate to
    
    -- Escalation status and timing
    status escalation_status DEFAULT 'scheduled',
    scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
    triggered_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Escalation results
    escalation_sent BOOLEAN DEFAULT false,
    escalation_results JSONB DEFAULT '[]'::jsonb,
    
    -- Error handling
    retry_count INTEGER DEFAULT 0,
    last_error TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_escalation_timing CHECK (
        (status = 'scheduled' AND triggered_at IS NULL) OR
        (status != 'scheduled' AND triggered_at IS NOT NULL)
    ),
    CONSTRAINT valid_completion_timing CHECK (
        (status != 'completed' AND completed_at IS NULL) OR
        (status = 'completed' AND completed_at IS NOT NULL)
    )
);

-- =============================================
-- USER ROUTING PROFILES
-- =============================================

-- User routing profiles table
CREATE TABLE IF NOT EXISTS user_routing_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Time zone and availability
    timezone VARCHAR(255) DEFAULT 'UTC',
    business_hours_start TIME DEFAULT '09:00',
    business_hours_end TIME DEFAULT '17:00',
    business_days TEXT[] DEFAULT ARRAY['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    
    -- Channel preferences (JSONB for flexible configuration)
    channel_preferences JSONB DEFAULT '{
        "push": {"enabled": true, "priority": 1, "dnd_override_allowed": true},
        "email": {"enabled": true, "priority": 2, "dnd_override_allowed": false},
        "sms": {"enabled": false, "priority": 3, "dnd_override_allowed": true},
        "in_app": {"enabled": true, "priority": 4, "dnd_override_allowed": false},
        "webhook": {"enabled": false, "priority": 5, "dnd_override_allowed": false}
    }'::jsonb,
    
    -- Category-specific routing preferences
    category_routing JSONB DEFAULT '{
        "emergency_board_matter": {
            "preferred_channels": ["push", "email"],
            "escalation_threshold_minutes": 5,
            "auto_escalate_to_manager": true
        },
        "time_sensitive_voting": {
            "preferred_channels": ["push", "in_app"],
            "escalation_threshold_minutes": 15,
            "auto_escalate_to_manager": false
        },
        "compliance_alert": {
            "preferred_channels": ["push", "email"],
            "escalation_threshold_minutes": 30,
            "auto_escalate_to_manager": true
        },
        "meeting_notification": {
            "preferred_channels": ["push", "in_app"],
            "escalation_threshold_minutes": 60,
            "auto_escalate_to_manager": false
        },
        "governance_update": {
            "preferred_channels": ["in_app", "email"],
            "escalation_threshold_minutes": 240,
            "auto_escalate_to_manager": false
        },
        "security_alert": {
            "preferred_channels": ["push", "email", "sms"],
            "escalation_threshold_minutes": 2,
            "auto_escalate_to_manager": true
        }
    }'::jsonb,
    
    -- Context-specific settings
    context_settings JSONB DEFAULT '{
        "meeting": {
            "immediate_alerts": true,
            "aggregation_window_minutes": 5,
            "max_notifications_per_hour": 10
        },
        "voting": {
            "immediate_alerts": true,
            "aggregation_window_minutes": 0,
            "max_notifications_per_hour": 5
        },
        "compliance": {
            "immediate_alerts": true,
            "aggregation_window_minutes": 15,
            "max_notifications_per_hour": 3
        },
        "emergency": {
            "immediate_alerts": true,
            "aggregation_window_minutes": 0,
            "max_notifications_per_hour": 50
        },
        "governance": {
            "immediate_alerts": false,
            "aggregation_window_minutes": 60,
            "max_notifications_per_hour": 10
        }
    }'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(user_id, organization_id)
);

-- =============================================
-- ROUTING DECISIONS LOG
-- =============================================

-- Routing decisions table (for analytics and debugging)
CREATE TABLE IF NOT EXISTS routing_decisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Decision context
    notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Decision outcome
    should_deliver BOOLEAN NOT NULL,
    delivery_channels delivery_channel[] DEFAULT ARRAY[],
    delivery_time TIMESTAMP WITH TIME ZONE NOT NULL,
    escalation_scheduled BOOLEAN DEFAULT false,
    
    -- Decision reasoning
    applied_rules UUID[] DEFAULT ARRAY[], -- Routing rule IDs
    routing_context routing_context,
    decision_factors JSONB DEFAULT '{}'::jsonb,
    
    -- Performance tracking
    decision_time_ms INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- PUSH NOTIFICATION ANALYTICS
-- =============================================

-- Push notification metrics table (aggregated data for performance)
CREATE TABLE IF NOT EXISTS push_notification_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Metric context
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    category notification_category,
    platform notification_platform,
    
    -- Time period
    metric_date DATE NOT NULL,
    metric_hour INTEGER CHECK (metric_hour >= 0 AND metric_hour <= 23),
    
    -- Delivery metrics
    notifications_sent INTEGER DEFAULT 0,
    notifications_delivered INTEGER DEFAULT 0,
    notifications_failed INTEGER DEFAULT 0,
    notifications_opened INTEGER DEFAULT 0,
    notifications_acted_upon INTEGER DEFAULT 0,
    
    -- Performance metrics
    avg_delivery_time_ms INTEGER DEFAULT 0,
    max_delivery_time_ms INTEGER DEFAULT 0,
    min_delivery_time_ms INTEGER DEFAULT 0,
    
    -- Error tracking
    error_count INTEGER DEFAULT 0,
    error_types JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(organization_id, user_id, category, platform, metric_date, metric_hour)
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Push devices indexes
CREATE INDEX IF NOT EXISTS idx_push_devices_user_active 
    ON push_devices(user_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_push_devices_platform 
    ON push_devices(platform, is_active);
CREATE INDEX IF NOT EXISTS idx_push_devices_last_active 
    ON push_devices(last_active DESC);
CREATE INDEX IF NOT EXISTS idx_push_devices_token_hash 
    ON push_devices USING HASH(device_token);

-- Routing rules indexes
CREATE INDEX IF NOT EXISTS idx_routing_rules_category_priority 
    ON notification_routing_rules(category, priority, is_active);
CREATE INDEX IF NOT EXISTS idx_routing_rules_organization 
    ON notification_routing_rules(organization_id, is_active) 
    WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_routing_rules_context 
    ON notification_routing_rules(routing_context, is_active);
CREATE INDEX IF NOT EXISTS idx_routing_rules_priority 
    ON notification_routing_rules(rule_priority ASC) WHERE is_active = true;

-- Deliveries indexes
CREATE INDEX IF NOT EXISTS idx_push_deliveries_notification 
    ON push_notification_deliveries(notification_id);
CREATE INDEX IF NOT EXISTS idx_push_deliveries_user_date 
    ON push_notification_deliveries(user_id, delivered_at DESC);
CREATE INDEX IF NOT EXISTS idx_push_deliveries_category_priority 
    ON push_notification_deliveries(category, priority, delivered_at DESC);
CREATE INDEX IF NOT EXISTS idx_push_deliveries_org_date 
    ON push_notification_deliveries(organization_id, delivered_at DESC) 
    WHERE organization_id IS NOT NULL;

-- Escalations indexes
CREATE INDEX IF NOT EXISTS idx_escalations_scheduled 
    ON notification_escalations(status, scheduled_for) 
    WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_escalations_user_status 
    ON notification_escalations(user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_escalations_original_notification 
    ON notification_escalations(original_notification_id);

-- User routing profiles indexes
CREATE INDEX IF NOT EXISTS idx_user_routing_profiles_user 
    ON user_routing_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_routing_profiles_org_user 
    ON user_routing_profiles(organization_id, user_id) 
    WHERE organization_id IS NOT NULL;

-- Routing decisions indexes
CREATE INDEX IF NOT EXISTS idx_routing_decisions_notification 
    ON routing_decisions(notification_id);
CREATE INDEX IF NOT EXISTS idx_routing_decisions_user_date 
    ON routing_decisions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_routing_decisions_context 
    ON routing_decisions(routing_context, created_at DESC);

-- Analytics indexes
CREATE INDEX IF NOT EXISTS idx_push_metrics_org_date 
    ON push_notification_metrics(organization_id, metric_date DESC, metric_hour) 
    WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_push_metrics_user_date 
    ON push_notification_metrics(user_id, metric_date DESC, metric_hour) 
    WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_push_metrics_category_platform 
    ON push_notification_metrics(category, platform, metric_date DESC);

-- =============================================
-- TRIGGERS FOR AUTOMATED FUNCTIONALITY
-- =============================================

-- Update timestamps trigger function
CREATE OR REPLACE FUNCTION update_push_notification_timestamps()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update triggers
CREATE TRIGGER push_devices_updated_at
    BEFORE UPDATE ON push_devices
    FOR EACH ROW EXECUTE FUNCTION update_push_notification_timestamps();

CREATE TRIGGER routing_rules_updated_at
    BEFORE UPDATE ON notification_routing_rules
    FOR EACH ROW EXECUTE FUNCTION update_push_notification_timestamps();

CREATE TRIGGER escalations_updated_at
    BEFORE UPDATE ON notification_escalations
    FOR EACH ROW EXECUTE FUNCTION update_push_notification_timestamps();

CREATE TRIGGER user_routing_profiles_updated_at
    BEFORE UPDATE ON user_routing_profiles
    FOR EACH ROW EXECUTE FUNCTION update_push_notification_timestamps();

CREATE TRIGGER push_metrics_updated_at
    BEFORE UPDATE ON push_notification_metrics
    FOR EACH ROW EXECUTE FUNCTION update_push_notification_timestamps();

-- =============================================
-- SECURITY POLICIES (RLS)
-- =============================================

-- Enable RLS on all tables
ALTER TABLE push_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_routing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_notification_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_escalations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_routing_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE routing_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_notification_metrics ENABLE ROW LEVEL SECURITY;

-- Push devices policies
CREATE POLICY "Users can manage their own devices" 
    ON push_devices FOR ALL 
    USING (auth.uid() = user_id);

CREATE POLICY "Organization admins can view member devices" 
    ON push_devices FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM organization_members om 
            WHERE om.user_id = auth.uid() 
            AND om.organization_id IN (
                SELECT om2.organization_id 
                FROM organization_members om2 
                WHERE om2.user_id = push_devices.user_id
            )
            AND om.role IN ('owner', 'admin')
        )
    );

-- Routing rules policies
CREATE POLICY "Users can view applicable routing rules" 
    ON notification_routing_rules FOR SELECT 
    USING (
        organization_id IS NULL OR 
        EXISTS (
            SELECT 1 FROM organization_members om 
            WHERE om.user_id = auth.uid() 
            AND om.organization_id = notification_routing_rules.organization_id
        )
    );

CREATE POLICY "Organization admins can manage routing rules" 
    ON notification_routing_rules FOR ALL 
    USING (
        organization_id IS NULL AND auth.uid() IN (
            SELECT user_id FROM users WHERE role = 'admin'
        ) OR
        EXISTS (
            SELECT 1 FROM organization_members om 
            WHERE om.user_id = auth.uid() 
            AND om.organization_id = notification_routing_rules.organization_id 
            AND om.role IN ('owner', 'admin')
        )
    );

-- Delivery records policies
CREATE POLICY "Users can view their own delivery records" 
    ON push_notification_deliveries FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Organization admins can view organization delivery records" 
    ON push_notification_deliveries FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM organization_members om 
            WHERE om.user_id = auth.uid() 
            AND om.organization_id = push_notification_deliveries.organization_id 
            AND om.role IN ('owner', 'admin')
        )
    );

-- System can insert delivery records
CREATE POLICY "System can insert delivery records" 
    ON push_notification_deliveries FOR INSERT 
    WITH CHECK (true);

-- Escalations policies
CREATE POLICY "Users can view their own escalations" 
    ON notification_escalations FOR SELECT 
    USING (
        auth.uid() = user_id OR 
        auth.uid() = ANY(escalation_recipients)
    );

CREATE POLICY "System can manage escalations" 
    ON notification_escalations FOR ALL 
    USING (true);

-- User routing profiles policies
CREATE POLICY "Users can manage their own routing profile" 
    ON user_routing_profiles FOR ALL 
    USING (auth.uid() = user_id);

CREATE POLICY "Organization admins can view member profiles" 
    ON user_routing_profiles FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM organization_members om 
            WHERE om.user_id = auth.uid() 
            AND om.organization_id = user_routing_profiles.organization_id 
            AND om.role IN ('owner', 'admin')
        )
    );

-- Routing decisions policies (for analytics)
CREATE POLICY "Users can view their own routing decisions" 
    ON routing_decisions FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Organization admins can view organization routing decisions" 
    ON routing_decisions FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM organization_members om 
            WHERE om.user_id = auth.uid() 
            AND om.organization_id = routing_decisions.organization_id 
            AND om.role IN ('owner', 'admin')
        )
    );

-- System can insert routing decisions
CREATE POLICY "System can insert routing decisions" 
    ON routing_decisions FOR INSERT 
    WITH CHECK (true);

-- Metrics policies
CREATE POLICY "Organization admins can view organization metrics" 
    ON push_notification_metrics FOR SELECT 
    USING (
        organization_id IS NULL AND auth.uid() IN (
            SELECT user_id FROM users WHERE role = 'admin'
        ) OR
        EXISTS (
            SELECT 1 FROM organization_members om 
            WHERE om.user_id = auth.uid() 
            AND om.organization_id = push_notification_metrics.organization_id 
            AND om.role IN ('owner', 'admin')
        )
    );

-- System can manage metrics
CREATE POLICY "System can manage metrics" 
    ON push_notification_metrics FOR ALL 
    USING (true);

-- =============================================
-- UTILITY FUNCTIONS
-- =============================================

-- Function to get active devices for a user
CREATE OR REPLACE FUNCTION get_user_active_devices(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    platform notification_platform,
    device_token TEXT,
    preferences JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT d.id, d.platform, d.device_token, d.preferences
    FROM push_devices d
    WHERE d.user_id = p_user_id 
    AND d.is_active = true
    AND d.last_active > NOW() - INTERVAL '30 days'
    ORDER BY d.last_active DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get applicable routing rules
CREATE OR REPLACE FUNCTION get_applicable_routing_rules(
    p_category notification_category,
    p_priority notification_priority,
    p_organization_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    name VARCHAR(255),
    primary_channels delivery_channel[],
    fallback_channels delivery_channel[],
    escalation_enabled BOOLEAN,
    escalation_delay_minutes INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.id, 
        r.name, 
        r.primary_channels, 
        r.fallback_channels, 
        r.escalation_enabled, 
        r.escalation_delay_minutes
    FROM notification_routing_rules r
    WHERE r.is_active = true
    AND (r.category = p_category OR r.category = 'governance_update')
    AND (
        (r.priority = 'low') OR
        (r.priority = 'medium' AND p_priority IN ('medium', 'high', 'critical')) OR
        (r.priority = 'high' AND p_priority IN ('high', 'critical')) OR
        (r.priority = 'critical' AND p_priority = 'critical')
    )
    AND (
        r.organization_id IS NULL OR 
        r.organization_id = p_organization_id
    )
    ORDER BY 
        CASE r.priority 
            WHEN 'critical' THEN 1
            WHEN 'high' THEN 2
            WHEN 'medium' THEN 3
            WHEN 'low' THEN 4
        END,
        r.rule_priority ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update push notification metrics
CREATE OR REPLACE FUNCTION update_push_metrics(
    p_organization_id UUID,
    p_user_id UUID,
    p_category notification_category,
    p_platform notification_platform,
    p_sent INTEGER DEFAULT 0,
    p_delivered INTEGER DEFAULT 0,
    p_failed INTEGER DEFAULT 0,
    p_opened INTEGER DEFAULT 0,
    p_acted_upon INTEGER DEFAULT 0,
    p_delivery_time_ms INTEGER DEFAULT 0
)
RETURNS VOID AS $$
DECLARE
    current_date DATE := CURRENT_DATE;
    current_hour INTEGER := EXTRACT(HOUR FROM NOW());
BEGIN
    INSERT INTO push_notification_metrics (
        organization_id, user_id, category, platform,
        metric_date, metric_hour,
        notifications_sent, notifications_delivered, notifications_failed,
        notifications_opened, notifications_acted_upon,
        avg_delivery_time_ms
    )
    VALUES (
        p_organization_id, p_user_id, p_category, p_platform,
        current_date, current_hour,
        p_sent, p_delivered, p_failed,
        p_opened, p_acted_upon,
        p_delivery_time_ms
    )
    ON CONFLICT (organization_id, user_id, category, platform, metric_date, metric_hour)
    DO UPDATE SET
        notifications_sent = push_notification_metrics.notifications_sent + EXCLUDED.notifications_sent,
        notifications_delivered = push_notification_metrics.notifications_delivered + EXCLUDED.notifications_delivered,
        notifications_failed = push_notification_metrics.notifications_failed + EXCLUDED.notifications_failed,
        notifications_opened = push_notification_metrics.notifications_opened + EXCLUDED.notifications_opened,
        notifications_acted_upon = push_notification_metrics.notifications_acted_upon + EXCLUDED.notifications_acted_upon,
        avg_delivery_time_ms = (
            (push_notification_metrics.avg_delivery_time_ms * push_notification_metrics.notifications_sent + 
             EXCLUDED.avg_delivery_time_ms * EXCLUDED.notifications_sent) / 
            NULLIF(push_notification_metrics.notifications_sent + EXCLUDED.notifications_sent, 0)
        )::INTEGER,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- INITIAL DATA
-- =============================================

-- Insert default global routing rules
INSERT INTO notification_routing_rules (
    name, description, category, priority, routing_context,
    primary_channels, fallback_channels,
    immediate_delivery, respect_dnd, escalation_enabled, escalation_delay_minutes,
    escalation_channels, created_by
) VALUES
-- Emergency board matters
('Emergency Board Alert', 'Critical emergency notifications for board members', 
 'emergency_board_matter', 'critical', 'emergency',
 ARRAY['push', 'sms'], ARRAY['email'],
 true, false, true, 5,
 ARRAY['sms', 'email'], 
 (SELECT id FROM users WHERE email = 'system@boardguru.ai' LIMIT 1)),

-- Time-sensitive voting
('Urgent Voting Alert', 'Time-sensitive voting notifications',
 'time_sensitive_voting', 'high', 'voting',
 ARRAY['push', 'in_app'], ARRAY['email'],
 true, false, true, 15,
 ARRAY['email'],
 (SELECT id FROM users WHERE email = 'system@boardguru.ai' LIMIT 1)),

-- Compliance alerts
('Compliance Alert', 'Regulatory compliance notifications',
 'compliance_alert', 'high', 'compliance',
 ARRAY['push', 'email'], ARRAY['in_app'],
 false, true, true, 30,
 ARRAY['email'],
 (SELECT id FROM users WHERE email = 'system@boardguru.ai' LIMIT 1)),

-- Meeting notifications
('Meeting Alert', 'Meeting-related notifications',
 'meeting_notification', 'medium', 'meeting',
 ARRAY['push', 'in_app'], ARRAY['email'],
 false, true, false, 60,
 ARRAY[],
 (SELECT id FROM users WHERE email = 'system@boardguru.ai' LIMIT 1)),

-- Governance updates
('Governance Update', 'General governance notifications',
 'governance_update', 'low', 'governance',
 ARRAY['in_app'], ARRAY['email'],
 false, true, false, 240,
 ARRAY[],
 (SELECT id FROM users WHERE email = 'system@boardguru.ai' LIMIT 1)),

-- Security alerts
('Security Alert', 'Security incident notifications',
 'security_alert', 'critical', 'emergency',
 ARRAY['push', 'sms', 'email'], ARRAY['in_app'],
 true, false, true, 2,
 ARRAY['sms', 'email'],
 (SELECT id FROM users WHERE email = 'system@boardguru.ai' LIMIT 1))

ON CONFLICT DO NOTHING;

-- =============================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================

COMMENT ON TABLE push_devices IS 'Device registration table for push notifications across iOS, Android, and web platforms';
COMMENT ON TABLE notification_routing_rules IS 'Configurable rules for intelligent notification routing based on governance context';
COMMENT ON TABLE push_notification_deliveries IS 'Delivery tracking and analytics for push notifications';
COMMENT ON TABLE notification_escalations IS 'Escalation management for unread or undelivered critical notifications';
COMMENT ON TABLE user_routing_profiles IS 'User-specific routing preferences and availability settings';
COMMENT ON TABLE routing_decisions IS 'Log of routing decisions for analytics and debugging';
COMMENT ON TABLE push_notification_metrics IS 'Aggregated metrics for push notification performance analysis';

COMMENT ON COLUMN push_devices.preferences IS 'JSONB containing device-specific notification preferences including DND settings and category preferences';
COMMENT ON COLUMN notification_routing_rules.conditions IS 'JSONB array of flexible routing conditions for advanced rule matching';
COMMENT ON COLUMN push_notification_deliveries.delivery_results IS 'JSONB array containing detailed delivery results for each target device';
COMMENT ON COLUMN routing_decisions.decision_factors IS 'JSONB containing the factors that influenced the routing decision for analytics';

-- Record migration completion
INSERT INTO _migrations (name) VALUES ('20250824_003_enterprise_push_notifications_system');