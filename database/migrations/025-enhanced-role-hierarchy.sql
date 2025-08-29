-- Migration: Enhanced Role Hierarchy System
-- Agent: DBA-01 (Database Architect)
-- Purpose: Implement 5-level role hierarchy with granular permissions
-- Date: 2025-08-29

BEGIN;

-- Step 1: Create new user_role enum with enhanced roles
-- Note: We need to drop and recreate the enum to add new values properly
DO $$ 
BEGIN
    -- Check if the new roles already exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumtypid = 'user_role'::regtype 
        AND enumlabel IN ('superuser', 'reviewer')
    ) THEN
        -- Create temporary enum
        CREATE TYPE user_role_new AS ENUM (
            'admin',      -- System administrator (highest)
            'superuser',  -- Board administrator
            'director',   -- Board member (keeping for backward compatibility)
            'user',       -- Standard board member
            'viewer',     -- Observer/Guest
            'reviewer',   -- QA Tester
            'pending'     -- Pending approval
        );
        
        -- Update existing columns to use new enum
        ALTER TABLE users 
            ALTER COLUMN role TYPE user_role_new 
            USING role::text::user_role_new;
            
        -- Drop old enum and rename new one
        DROP TYPE user_role;
        ALTER TYPE user_role_new RENAME TO user_role;
    END IF;
END $$;

-- Step 2: Create role_permissions table for granular permission control
CREATE TABLE IF NOT EXISTS role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_name user_role NOT NULL,
    permission_key TEXT NOT NULL,
    permission_value JSONB DEFAULT '{}',
    description TEXT,
    is_system_default BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(role_name, permission_key)
);

-- Step 3: Create user_custom_permissions for permission overrides
CREATE TABLE IF NOT EXISTS user_custom_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    permission_overrides JSONB DEFAULT '{}',
    granted_by UUID REFERENCES users(id),
    reason TEXT,
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, organization_id)
);

-- Step 4: Add reviewer-specific fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_reviewer BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS reviewer_metadata JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS test_environment_access BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS bug_reports_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_review_activity TIMESTAMPTZ;

-- Step 5: Create role_change_history for audit trail
CREATE TABLE IF NOT EXISTS role_change_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id),
    old_role user_role,
    new_role user_role,
    changed_by UUID REFERENCES users(id),
    change_type TEXT CHECK (change_type IN ('promotion', 'demotion', 'lateral', 'initial')),
    reason TEXT,
    metadata JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 6: Create bug_reports table for reviewer functionality
CREATE TABLE IF NOT EXISTS bug_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID REFERENCES users(id) ON DELETE SET NULL,
    organization_id UUID REFERENCES organizations(id),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    severity TEXT CHECK (severity IN ('critical', 'high', 'medium', 'low')),
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed', 'wont_fix')),
    category TEXT CHECK (category IN ('ui', 'functionality', 'performance', 'security', 'data', 'other')),
    screenshot_url TEXT,
    page_url TEXT,
    browser_info JSONB,
    device_info JSONB,
    reproduction_steps TEXT[],
    assigned_to UUID REFERENCES users(id),
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 7: Insert default permissions for each role
INSERT INTO role_permissions (role_name, permission_key, permission_value, description) VALUES
-- Admin permissions (highest level)
('admin', 'system.manage', '{"allowed": true}', 'Full system configuration access'),
('admin', 'users.manage_all', '{"allowed": true}', 'Create, update, delete any user'),
('admin', 'organizations.manage_all', '{"allowed": true}', 'Full organization control'),
('admin', 'billing.manage', '{"allowed": true}', 'Access to billing and subscriptions'),
('admin', 'compliance.configure', '{"allowed": true}', 'Configure compliance settings'),
('admin', 'integrations.manage', '{"allowed": true}', 'Manage third-party integrations'),
('admin', 'analytics.view_all', '{"allowed": true}', 'View system-wide analytics'),
('admin', 'audit.view_all', '{"allowed": true}', 'Access all audit logs'),
('admin', 'boards.access_all', '{"allowed": true}', 'Access all boards and committees'),

-- SuperUser permissions (Board Administrator)
('superuser', 'boards.manage', '{"allowed": true}', 'Create and configure boards'),
('superuser', 'committees.manage', '{"allowed": true}', 'Manage committees'),
('superuser', 'meetings.configure', '{"allowed": true}', 'Configure meeting settings'),
('superuser', 'members.manage', '{"allowed": true}', 'Add/remove board members'),
('superuser', 'documents.manage_all', '{"allowed": true}', 'Full document management'),
('superuser', 'decisions.approve', '{"allowed": true}', 'Approve critical decisions'),
('superuser', 'analytics.view_board', '{"allowed": true}', 'View board analytics'),
('superuser', 'settings.board', '{"allowed": true}', 'Configure board settings'),
('superuser', 'voting.configure', '{"allowed": true}', 'Set up voting parameters'),

-- User permissions (Board Member)
('user', 'boards.access_assigned', '{"allowed": true}', 'Access assigned boards'),
('user', 'meetings.participate', '{"allowed": true}', 'Join and participate in meetings'),
('user', 'voting.cast', '{"allowed": true}', 'Cast votes in decisions'),
('user', 'documents.upload', '{"allowed": true}', 'Upload and share documents'),
('user', 'documents.collaborate', '{"allowed": true}', 'Collaborate on documents'),
('user', 'ai.use_assistants', '{"allowed": true}', 'Access AI assistants'),
('user', 'dashboard.personal', '{"allowed": true}', 'View personal dashboard'),
('user', 'notifications.receive', '{"allowed": true}', 'Receive notifications'),
('user', 'chat.participate', '{"allowed": true}', 'Use board chat features'),

-- Viewer permissions (Observer/Guest)
('viewer', 'boards.view_permitted', '{"allowed": true}', 'View permitted boards only'),
('viewer', 'meetings.view_recordings', '{"allowed": true}', 'View meeting recordings'),
('viewer', 'documents.view_shared', '{"allowed": true, "download": false}', 'View shared documents'),
('viewer', 'analytics.view_basic', '{"allowed": true}', 'View basic analytics'),
('viewer', 'notifications.receive_limited', '{"allowed": true}', 'Receive limited notifications'),
('viewer', 'access.time_limited', '{"default_hours": 168}', 'Time-limited access'),

-- Reviewer permissions (QA Tester)
('reviewer', 'boards.view_permitted', '{"allowed": true}', 'View permitted boards'),
('reviewer', 'bugs.report', '{"allowed": true}', 'Submit bug reports'),
('reviewer', 'screen.record', '{"allowed": true}', 'Record screen for bug reports'),
('reviewer', 'test_data.create', '{"allowed": true, "environment": "staging"}', 'Create test data'),
('reviewer', 'performance.view_metrics', '{"allowed": true}', 'View performance metrics'),
('reviewer', 'issues.flag', '{"allowed": true}', 'Flag UI/UX issues'),
('reviewer', 'staging.access', '{"allowed": true}', 'Access staging environment'),
('reviewer', 'tracker.integrate', '{"allowed": true}', 'Integration with issue tracker')
ON CONFLICT (role_name, permission_key) DO UPDATE
SET permission_value = EXCLUDED.permission_value,
    description = EXCLUDED.description,
    updated_at = NOW();

-- Step 8: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_name);
CREATE INDEX IF NOT EXISTS idx_user_custom_permissions_user ON user_custom_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_custom_permissions_org ON user_custom_permissions(organization_id);
CREATE INDEX IF NOT EXISTS idx_role_change_history_user ON role_change_history(user_id);
CREATE INDEX IF NOT EXISTS idx_role_change_history_date ON role_change_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bug_reports_reporter ON bug_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_bug_reports_status ON bug_reports(status);
CREATE INDEX IF NOT EXISTS idx_users_reviewer ON users(is_reviewer) WHERE is_reviewer = true;

-- Step 9: Create RLS policies for new tables
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_custom_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_change_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE bug_reports ENABLE ROW LEVEL SECURITY;

-- Role permissions policies (read-only for all authenticated users)
CREATE POLICY "Authenticated users can view role permissions"
    ON role_permissions FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Only admins can modify role permissions"
    ON role_permissions FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- User custom permissions policies
CREATE POLICY "Users can view their own custom permissions"
    ON user_custom_permissions FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'superuser')
    ));

CREATE POLICY "Admins and superusers can manage custom permissions"
    ON user_custom_permissions FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'superuser')
        )
    );

-- Role change history policies
CREATE POLICY "Users can view their own role history"
    ON role_change_history FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'superuser')
    ));

-- Bug reports policies
CREATE POLICY "Reviewers can create bug reports"
    ON bug_reports FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND (users.role = 'reviewer' OR users.is_reviewer = true)
        )
    );

CREATE POLICY "Bug reports are visible to reviewers and admins"
    ON bug_reports FOR SELECT
    TO authenticated
    USING (
        reporter_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'superuser', 'reviewer')
        )
    );

-- Step 10: Create helper functions
CREATE OR REPLACE FUNCTION get_user_effective_permissions(
    p_user_id UUID,
    p_organization_id UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_user_role user_role;
    v_base_permissions JSONB;
    v_custom_permissions JSONB;
    v_effective_permissions JSONB;
BEGIN
    -- Get user's role
    SELECT role INTO v_user_role
    FROM users
    WHERE id = p_user_id;
    
    -- Get base permissions for role
    SELECT jsonb_object_agg(permission_key, permission_value)
    INTO v_base_permissions
    FROM role_permissions
    WHERE role_name = v_user_role;
    
    -- Get custom permissions if organization specified
    IF p_organization_id IS NOT NULL THEN
        SELECT permission_overrides
        INTO v_custom_permissions
        FROM user_custom_permissions
        WHERE user_id = p_user_id
        AND organization_id = p_organization_id
        AND is_active = true
        AND (expires_at IS NULL OR expires_at > NOW());
    END IF;
    
    -- Merge permissions (custom overrides base)
    v_effective_permissions := COALESCE(v_base_permissions, '{}'::JSONB);
    IF v_custom_permissions IS NOT NULL THEN
        v_effective_permissions := v_effective_permissions || v_custom_permissions;
    END IF;
    
    RETURN v_effective_permissions;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION check_permission(
    p_user_id UUID,
    p_permission_key TEXT,
    p_organization_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    v_permissions JSONB;
    v_permission_value JSONB;
BEGIN
    -- Get effective permissions
    v_permissions := get_user_effective_permissions(p_user_id, p_organization_id);
    
    -- Check if permission exists and is allowed
    v_permission_value := v_permissions->p_permission_key;
    
    IF v_permission_value IS NULL THEN
        RETURN FALSE;
    END IF;
    
    RETURN COALESCE((v_permission_value->>'allowed')::BOOLEAN, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 11: Create triggers for audit
CREATE OR REPLACE FUNCTION log_role_change() RETURNS TRIGGER AS $$
BEGIN
    IF OLD.role IS DISTINCT FROM NEW.role THEN
        INSERT INTO role_change_history (
            user_id,
            old_role,
            new_role,
            change_type,
            changed_by,
            created_at
        ) VALUES (
            NEW.id,
            OLD.role,
            NEW.role,
            CASE
                WHEN NEW.role = 'admin' THEN 'promotion'
                WHEN OLD.role = 'admin' THEN 'demotion'
                WHEN OLD.role IS NULL THEN 'initial'
                ELSE 'lateral'
            END,
            auth.uid(),
            NOW()
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER users_role_change_trigger
    AFTER UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION log_role_change();

-- Step 12: Update existing users to map to new roles
UPDATE users 
SET role = CASE
    WHEN role = 'director' THEN 'user'::user_role
    ELSE role
END
WHERE role = 'director';

COMMIT;

-- Verification queries
DO $$
BEGIN
    RAISE NOTICE 'Migration completed successfully!';
    RAISE NOTICE 'New tables created: role_permissions, user_custom_permissions, role_change_history, bug_reports';
    RAISE NOTICE 'Enhanced user_role enum with: admin, superuser, user, viewer, reviewer';
    RAISE NOTICE 'Default permissions inserted for all roles';
    RAISE NOTICE 'RLS policies and indexes created';
END $$;