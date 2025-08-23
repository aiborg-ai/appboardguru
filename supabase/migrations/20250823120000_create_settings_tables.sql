-- =====================================================
-- SETTINGS SYSTEM TABLES
-- Create comprehensive settings management tables
-- =====================================================

-- Create user_settings table for general user preferences
CREATE TABLE IF NOT EXISTS user_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Display preferences
    theme VARCHAR(20) DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'auto')),
    language VARCHAR(10) DEFAULT 'en-US',
    timezone VARCHAR(100) DEFAULT 'UTC',
    date_format VARCHAR(20) DEFAULT 'MM/dd/yyyy' CHECK (date_format IN ('MM/dd/yyyy', 'dd/MM/yyyy', 'yyyy-MM-dd')),
    time_format VARCHAR(10) DEFAULT '12h' CHECK (time_format IN ('12h', '24h')),
    
    -- Notification settings
    email_notifications BOOLEAN DEFAULT true,
    push_notifications BOOLEAN DEFAULT true,
    desktop_notifications BOOLEAN DEFAULT false,
    
    -- UI preferences
    sidebar_collapsed BOOLEAN DEFAULT false,
    density VARCHAR(20) DEFAULT 'comfortable' CHECK (density IN ('compact', 'comfortable', 'spacious')),
    show_avatars BOOLEAN DEFAULT true,
    
    -- Advanced preferences (stored as JSONB)
    preferences JSONB DEFAULT '{}'::jsonb,
    
    -- Versioning for optimistic locking
    version INTEGER DEFAULT 1,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(user_id)
);

-- Create notification_preferences table for detailed notification control
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Global notification toggles
    email_enabled BOOLEAN DEFAULT true,
    push_enabled BOOLEAN DEFAULT true,
    sms_enabled BOOLEAN DEFAULT false,
    in_app_enabled BOOLEAN DEFAULT true,
    
    -- Delivery frequency
    frequency VARCHAR(20) DEFAULT 'immediate' CHECK (frequency IN ('immediate', 'hourly', 'daily', 'weekly')),
    
    -- Quiet hours configuration
    quiet_hours JSONB DEFAULT '{
        "enabled": false,
        "startTime": "22:00",
        "endTime": "08:00",
        "timezone": "UTC"
    }'::jsonb,
    
    -- Category-specific preferences (nested JSONB structure)
    categories JSONB DEFAULT '{
        "Document Management": {
            "New Document Uploaded": {"email": true, "push": true, "inApp": true},
            "Document Shared": {"email": true, "push": false, "inApp": true},
            "Document Expired": {"email": true, "push": true, "inApp": true},
            "Document Approved": {"email": false, "push": false, "inApp": true},
            "Document Rejected": {"email": true, "push": true, "inApp": true}
        },
        "Task Management": {
            "Task Assigned": {"email": true, "push": true, "inApp": true},
            "Task Due Soon": {"email": true, "push": false, "inApp": true},
            "Task Completed": {"email": false, "push": false, "inApp": true},
            "Task Overdue": {"email": true, "push": true, "inApp": true}
        },
        "Meeting Management": {
            "Meeting Scheduled": {"email": true, "push": false, "inApp": true},
            "Meeting Updated": {"email": true, "push": false, "inApp": true},
            "Meeting Reminder": {"email": false, "push": true, "inApp": true},
            "Meeting Cancelled": {"email": true, "push": true, "inApp": true}
        },
        "Board Management": {
            "Board Meeting Scheduled": {"email": true, "push": false, "inApp": true},
            "Board Resolution": {"email": true, "push": true, "inApp": true},
            "Board Member Added": {"email": false, "push": false, "inApp": true},
            "Board Member Removed": {"email": true, "push": false, "inApp": true}
        },
        "System": {
            "System Maintenance": {"email": true, "push": false, "inApp": true},
            "Security Alert": {"email": true, "push": true, "inApp": true},
            "Account Changes": {"email": true, "push": false, "inApp": true},
            "Feature Updates": {"email": false, "push": false, "inApp": true}
        },
        "Compliance": {
            "Compliance Due": {"email": true, "push": true, "inApp": true},
            "Compliance Overdue": {"email": true, "push": true, "inApp": true},
            "Compliance Completed": {"email": false, "push": false, "inApp": true},
            "Audit Scheduled": {"email": true, "push": false, "inApp": true}
        }
    }'::jsonb,
    
    -- Delivery method preferences
    delivery_methods JSONB DEFAULT '{
        "email": {
            "digest": false,
            "digestFrequency": "daily",
            "digestTime": "09:00"
        },
        "push": {
            "sound": true,
            "vibration": true,
            "badge": true
        },
        "sms": {
            "emergencyOnly": true
        }
    }'::jsonb,
    
    -- Export/backup preferences
    export_preferences JSONB DEFAULT '{
        "autoExport": false,
        "exportFrequency": "weekly",
        "exportFormat": "json",
        "includeReadNotifications": false,
        "retentionPeriod": 365
    }'::jsonb,
    
    -- Versioning
    version INTEGER DEFAULT 1,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(user_id)
);

-- Create fyi_preferences table for FYI insights configuration
CREATE TABLE IF NOT EXISTS fyi_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- FYI system enabled/disabled
    enabled BOOLEAN DEFAULT true,
    
    -- News and content preferences
    news_categories TEXT[] DEFAULT ARRAY['technology', 'business', 'finance'],
    preferred_sources TEXT[] DEFAULT ARRAY[]::TEXT[],
    blocked_sources TEXT[] DEFAULT ARRAY[]::TEXT[],
    
    -- Update frequency
    update_frequency VARCHAR(20) DEFAULT 'daily' CHECK (update_frequency IN ('hourly', 'daily', 'weekly')),
    
    -- Digest settings
    digest_enabled BOOLEAN DEFAULT true,
    digest_time TIME DEFAULT '09:00',
    digest_timezone VARCHAR(100) DEFAULT 'UTC',
    
    -- Insight types enabled
    insight_types JSONB DEFAULT '{
        "market": true,
        "news": true,
        "weather": true,
        "calendar": true,
        "industry": true,
        "competitors": false,
        "regulations": true,
        "trends": true
    }'::jsonb,
    
    -- Relevance settings
    relevance_threshold DECIMAL(3,2) DEFAULT 0.7 CHECK (relevance_threshold BETWEEN 0 AND 1),
    max_insights_per_category INTEGER DEFAULT 5 CHECK (max_insights_per_category > 0),
    
    -- Notification settings for FYI
    notification_settings JSONB DEFAULT '{
        "email": true,
        "push": false,
        "inApp": true,
        "digest": true
    }'::jsonb,
    
    -- Quiet hours for FYI notifications
    quiet_hours JSONB DEFAULT '{
        "enabled": true,
        "startTime": "22:00",
        "endTime": "08:00",
        "timezone": "UTC"
    }'::jsonb,
    
    -- Personalization settings
    personalization JSONB DEFAULT '{
        "useReadingHistory": true,
        "useInteractionData": true,
        "adaptToSchedule": true,
        "considerMeetingContext": true
    }'::jsonb,
    
    -- Auto-refresh settings
    auto_refresh_enabled BOOLEAN DEFAULT true,
    refresh_interval_minutes INTEGER DEFAULT 60 CHECK (refresh_interval_minutes >= 15),
    
    -- Display preferences
    max_insights_displayed INTEGER DEFAULT 10 CHECK (max_insights_displayed > 0),
    default_view VARCHAR(20) DEFAULT 'cards' CHECK (default_view IN ('cards', 'list', 'compact')),
    
    -- Versioning
    version INTEGER DEFAULT 1,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_settings_updated_at ON user_settings(updated_at);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_updated_at ON notification_preferences(updated_at);

CREATE INDEX IF NOT EXISTS idx_fyi_preferences_user_id ON fyi_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_fyi_preferences_enabled ON fyi_preferences(enabled) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS idx_fyi_preferences_updated_at ON fyi_preferences(updated_at);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.version = OLD.version + 1;
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

DROP TRIGGER IF EXISTS update_user_settings_updated_at ON user_settings;
CREATE TRIGGER update_user_settings_updated_at
    BEFORE UPDATE ON user_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_notification_preferences_updated_at ON notification_preferences;
CREATE TRIGGER update_notification_preferences_updated_at
    BEFORE UPDATE ON notification_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_fyi_preferences_updated_at ON fyi_preferences;
CREATE TRIGGER update_fyi_preferences_updated_at
    BEFORE UPDATE ON fyi_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE fyi_preferences ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own settings" ON user_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings" ON user_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings" ON user_settings
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own settings" ON user_settings
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own notification preferences" ON notification_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification preferences" ON notification_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification preferences" ON notification_preferences
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notification preferences" ON notification_preferences
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own FYI preferences" ON fyi_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own FYI preferences" ON fyi_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own FYI preferences" ON fyi_preferences
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own FYI preferences" ON fyi_preferences
    FOR DELETE USING (auth.uid() = user_id);

-- Add helpful functions for the settings system
CREATE OR REPLACE FUNCTION get_user_settings(p_user_id UUID)
RETURNS TABLE(
    user_id UUID,
    theme VARCHAR(20),
    language VARCHAR(10),
    timezone VARCHAR(100),
    date_format VARCHAR(20),
    time_format VARCHAR(10),
    email_notifications BOOLEAN,
    push_notifications BOOLEAN,
    desktop_notifications BOOLEAN,
    sidebar_collapsed BOOLEAN,
    density VARCHAR(20),
    show_avatars BOOLEAN,
    preferences JSONB,
    version INTEGER,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
) 
LANGUAGE SQL SECURITY DEFINER
AS $$
    SELECT 
        us.user_id,
        us.theme,
        us.language,
        us.timezone,
        us.date_format,
        us.time_format,
        us.email_notifications,
        us.push_notifications,
        us.desktop_notifications,
        us.sidebar_collapsed,
        us.density,
        us.show_avatars,
        us.preferences,
        us.version,
        us.created_at,
        us.updated_at
    FROM user_settings us
    WHERE us.user_id = p_user_id;
$$;

-- Function to get comprehensive notification preferences with fallbacks
CREATE OR REPLACE FUNCTION get_notification_preferences_with_defaults(p_user_id UUID)
RETURNS TABLE(
    user_id UUID,
    email_enabled BOOLEAN,
    push_enabled BOOLEAN,
    sms_enabled BOOLEAN,
    in_app_enabled BOOLEAN,
    frequency VARCHAR(20),
    quiet_hours JSONB,
    categories JSONB,
    delivery_methods JSONB,
    export_preferences JSONB
)
LANGUAGE SQL SECURITY DEFINER
AS $$
    SELECT 
        COALESCE(np.user_id, p_user_id) as user_id,
        COALESCE(np.email_enabled, true) as email_enabled,
        COALESCE(np.push_enabled, true) as push_enabled,
        COALESCE(np.sms_enabled, false) as sms_enabled,
        COALESCE(np.in_app_enabled, true) as in_app_enabled,
        COALESCE(np.frequency, 'immediate') as frequency,
        COALESCE(np.quiet_hours, '{"enabled": false, "startTime": "22:00", "endTime": "08:00", "timezone": "UTC"}'::jsonb) as quiet_hours,
        COALESCE(np.categories, '{}'::jsonb) as categories,
        COALESCE(np.delivery_methods, '{"email": {"digest": false}, "push": {"sound": true}}'::jsonb) as delivery_methods,
        COALESCE(np.export_preferences, '{"autoExport": false, "exportFormat": "json"}'::jsonb) as export_preferences
    FROM (SELECT p_user_id as user_id) u
    LEFT JOIN notification_preferences np ON np.user_id = u.user_id;
$$;

-- Add table comments for documentation
COMMENT ON TABLE user_settings IS 'Stores user interface and general application preferences';
COMMENT ON TABLE notification_preferences IS 'Stores detailed notification preferences and category-specific settings';
COMMENT ON TABLE fyi_preferences IS 'Stores FYI insights and news preferences';

-- Add column comments
COMMENT ON COLUMN user_settings.preferences IS 'Additional user preferences stored as flexible JSONB';
COMMENT ON COLUMN notification_preferences.categories IS 'Category-specific notification preferences with granular control';
COMMENT ON COLUMN fyi_preferences.insight_types IS 'Types of insights to show (market, news, weather, etc.)';
COMMENT ON COLUMN fyi_preferences.personalization IS 'AI personalization settings for content relevance';