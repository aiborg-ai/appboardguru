-- =====================================================
-- SEED TEST DATA FOR SETTINGS SYSTEM
-- Create test data for user 'test.director@appboardguru.com'
-- =====================================================

-- First, ensure we have the test user
DO $$
DECLARE
    test_user_id UUID;
    org_id UUID;
BEGIN
    -- Check if test user exists, if not create it
    SELECT id INTO test_user_id 
    FROM auth.users 
    WHERE email = 'test.director@appboardguru.com';
    
    -- If user doesn't exist, create it
    IF test_user_id IS NULL THEN
        INSERT INTO auth.users (
            id,
            instance_id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            recovery_sent_at,
            last_sign_in_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at,
            confirmation_token,
            email_change,
            email_change_token_new,
            recovery_token
        ) VALUES (
            gen_random_uuid(),
            '00000000-0000-0000-0000-000000000000',
            'authenticated',
            'authenticated',
            'test.director@appboardguru.com',
            '$2a$10$dummy.hash.for.testing.purposes.only.not.secure',
            NOW(),
            NOW(),
            NOW(),
            '{"provider": "email", "providers": ["email"]}',
            '{"full_name": "Test Director", "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=test"}',
            NOW(),
            NOW(),
            '',
            '',
            '',
            ''
        ) RETURNING id INTO test_user_id;
    END IF;

    -- Check if user exists in users table, if not create it
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = test_user_id) THEN
        INSERT INTO users (
            id,
            email,
            full_name,
            avatar_url,
            role,
            status,
            company,
            position,
            designation,
            linkedin_url,
            bio
        ) VALUES (
            test_user_id,
            'test.director@appboardguru.com',
            'Test Director',
            'https://api.dicebear.com/7.x/avataaars/svg?seed=test',
            'user',
            'approved',
            'AppBoard Guru Test Corp',
            'Independent Director',
            'Independent Director',
            'https://linkedin.com/in/test-director',
            'Experienced independent director with expertise in technology governance and strategic oversight. Specializes in digital transformation and regulatory compliance.'
        );
    END IF;

    -- Create or get organization for test user
    SELECT id INTO org_id 
    FROM organizations 
    WHERE name = 'Test Organization for Settings' 
    LIMIT 1;
    
    IF org_id IS NULL THEN
        INSERT INTO organizations (
            id,
            name,
            slug,
            description,
            industry,
            website,
            logo_url,
            owner_id,
            settings
        ) VALUES (
            gen_random_uuid(),
            'Test Organization for Settings',
            'test-org-settings',
            'Test organization for settings system validation',
            'Technology',
            'https://testorg.appboardguru.com',
            'https://api.dicebear.com/7.x/initials/svg?seed=TO',
            test_user_id,
            '{"features": {"settings": true, "notifications": true, "fyi": true}}'::jsonb
        ) RETURNING id INTO org_id;
        
        -- Add user as organization member
        INSERT INTO organization_members (
            organization_id,
            user_id,
            role,
            status,
            joined_at
        ) VALUES (
            org_id,
            test_user_id,
            'administrator',
            'active',
            NOW()
        );
    END IF;

    -- Insert comprehensive user settings
    INSERT INTO user_settings (
        user_id,
        theme,
        language,
        timezone,
        date_format,
        time_format,
        email_notifications,
        push_notifications,
        desktop_notifications,
        sidebar_collapsed,
        density,
        show_avatars,
        preferences,
        version
    ) VALUES (
        test_user_id,
        'dark',
        'en-US',
        'America/New_York',
        'MM/dd/yyyy',
        '12h',
        true,
        true,
        false,
        false,
        'comfortable',
        true,
        '{
            "dashboard": {
                "defaultView": "grid",
                "autoRefresh": true,
                "refreshInterval": 300,
                "showWelcomeMessage": false,
                "compactMode": false
            },
            "editor": {
                "fontSize": 14,
                "fontFamily": "Monaco",
                "wordWrap": true,
                "lineNumbers": true,
                "theme": "dark"
            },
            "accessibility": {
                "highContrast": false,
                "reducedMotion": false,
                "screenReader": false,
                "keyboardNavigation": true
            },
            "experimental": {
                "betaFeatures": true,
                "aiAssistant": true,
                "voiceCommands": false
            }
        }'::jsonb,
        1
    ) ON CONFLICT (user_id) DO UPDATE SET
        theme = EXCLUDED.theme,
        language = EXCLUDED.language,
        timezone = EXCLUDED.timezone,
        preferences = EXCLUDED.preferences,
        updated_at = NOW();

    -- Insert comprehensive notification preferences
    INSERT INTO notification_preferences (
        user_id,
        email_enabled,
        push_enabled,
        sms_enabled,
        in_app_enabled,
        frequency,
        quiet_hours,
        categories,
        delivery_methods,
        export_preferences,
        version
    ) VALUES (
        test_user_id,
        true,
        true,
        false,
        true,
        'immediate',
        '{
            "enabled": true,
            "startTime": "22:00",
            "endTime": "08:00",
            "timezone": "America/New_York"
        }'::jsonb,
        '{
            "Document Management": {
                "New Document Uploaded": {"email": true, "push": true, "inApp": true},
                "Document Shared": {"email": true, "push": false, "inApp": true},
                "Document Expired": {"email": true, "push": true, "inApp": true},
                "Document Approved": {"email": false, "push": false, "inApp": true},
                "Document Rejected": {"email": true, "push": true, "inApp": true}
            },
            "Task Management": {
                "Task Assigned": {"email": true, "push": true, "inApp": true},
                "Task Due Soon": {"email": true, "push": true, "inApp": true},
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
        '{
            "email": {
                "digest": true,
                "digestFrequency": "daily",
                "digestTime": "09:00",
                "html": true,
                "includeUnread": true
            },
            "push": {
                "sound": true,
                "vibration": true,
                "badge": true,
                "priority": "normal"
            },
            "sms": {
                "emergencyOnly": true,
                "shortFormat": true
            }
        }'::jsonb,
        '{
            "autoExport": true,
            "exportFrequency": "weekly",
            "exportFormat": "json",
            "includeReadNotifications": false,
            "retentionPeriod": 365,
            "emailExport": false,
            "cloudBackup": true
        }'::jsonb,
        1
    ) ON CONFLICT (user_id) DO UPDATE SET
        email_enabled = EXCLUDED.email_enabled,
        categories = EXCLUDED.categories,
        delivery_methods = EXCLUDED.delivery_methods,
        export_preferences = EXCLUDED.export_preferences,
        updated_at = NOW();

    -- Insert comprehensive FYI preferences
    INSERT INTO fyi_preferences (
        user_id,
        enabled,
        news_categories,
        preferred_sources,
        blocked_sources,
        update_frequency,
        digest_enabled,
        digest_time,
        digest_timezone,
        insight_types,
        relevance_threshold,
        max_insights_per_category,
        notification_settings,
        quiet_hours,
        personalization,
        auto_refresh_enabled,
        refresh_interval_minutes,
        max_insights_displayed,
        default_view,
        version
    ) VALUES (
        test_user_id,
        true,
        ARRAY['technology', 'business', 'finance', 'governance', 'regulatory', 'cybersecurity'],
        ARRAY['Reuters', 'Bloomberg', 'Wall Street Journal', 'Financial Times', 'TechCrunch'],
        ARRAY['tabloid-news', 'unverified-sources'],
        'daily',
        true,
        '09:00',
        'America/New_York',
        '{
            "market": true,
            "news": true,
            "weather": true,
            "calendar": true,
            "industry": true,
            "competitors": false,
            "regulations": true,
            "trends": true,
            "executive": true,
            "board": true
        }'::jsonb,
        0.75,
        8,
        '{
            "email": true,
            "push": false,
            "inApp": true,
            "digest": true,
            "immediate": false
        }'::jsonb,
        '{
            "enabled": true,
            "startTime": "22:00",
            "endTime": "08:00",
            "timezone": "America/New_York"
        }'::jsonb,
        '{
            "useReadingHistory": true,
            "useInteractionData": true,
            "adaptToSchedule": true,
            "considerMeetingContext": true,
            "learningEnabled": true,
            "contentFiltering": "moderate"
        }'::jsonb,
        true,
        45,
        15,
        'cards',
        1
    ) ON CONFLICT (user_id) DO UPDATE SET
        enabled = EXCLUDED.enabled,
        news_categories = EXCLUDED.news_categories,
        insight_types = EXCLUDED.insight_types,
        personalization = EXCLUDED.personalization,
        updated_at = NOW();

    RAISE NOTICE 'Test data created successfully for user: test.director@appboardguru.com (ID: %)', test_user_id;

END $$;

-- =====================================================
-- CREATE 10+ SAMPLE NOTIFICATIONS FOR TESTING
-- =====================================================

DO $$
DECLARE
    test_user_id UUID;
    org_id UUID;
    notification_types TEXT[] := ARRAY[
        'document_uploaded', 'task_assigned', 'meeting_scheduled', 
        'board_resolution', 'compliance_due', 'security_alert',
        'system_maintenance', 'document_shared', 'task_due_soon',
        'meeting_reminder', 'audit_scheduled', 'feature_update'
    ];
    categories TEXT[] := ARRAY[
        'Document Management', 'Task Management', 'Meeting Management',
        'Board Management', 'Compliance', 'System',
        'System', 'Document Management', 'Task Management',
        'Meeting Management', 'Compliance', 'System'
    ];
    priorities TEXT[] := ARRAY['low', 'medium', 'high', 'critical'];
    i INTEGER;
BEGIN
    -- Get test user ID
    SELECT id INTO test_user_id 
    FROM auth.users 
    WHERE email = 'test.director@appboardguru.com';
    
    SELECT id INTO org_id 
    FROM organizations 
    WHERE name = 'Test Organization for Settings';

    -- Create sample notifications
    FOR i IN 1..12 LOOP
        INSERT INTO notifications (
            user_id,
            organization_id,
            type,
            category,
            title,
            message,
            priority,
            status,
            action_url,
            action_text,
            icon,
            color,
            metadata,
            created_at,
            sender_id
        ) VALUES (
            test_user_id,
            org_id,
            notification_types[((i-1) % array_length(notification_types, 1)) + 1],
            categories[((i-1) % array_length(categories, 1)) + 1],
            CASE ((i-1) % 12) + 1
                WHEN 1 THEN 'New Board Meeting Minutes Available'
                WHEN 2 THEN 'Quarterly Compliance Report Due'
                WHEN 3 THEN 'Executive Committee Meeting Tomorrow'
                WHEN 4 THEN 'Security Audit Findings Document'
                WHEN 5 THEN 'Board Resolution 2024-15 Approved'
                WHEN 6 THEN 'Critical: System Maintenance Tonight'
                WHEN 7 THEN 'New Feature: Voice Commands Beta'
                WHEN 8 THEN 'Annual Budget Document Shared'
                WHEN 9 THEN 'Task: Review Risk Assessment'
                WHEN 10 THEN 'Meeting Reminder: 2PM Strategy Session'
                WHEN 11 THEN 'Compliance Training Due Next Week'
                ELSE 'Weekly Board Activity Summary'
            END,
            CASE ((i-1) % 12) + 1
                WHEN 1 THEN 'The minutes from the latest board meeting are now available for review in the secure vault.'
                WHEN 2 THEN 'Your quarterly compliance report is due by end of business Friday. Please submit via the compliance portal.'
                WHEN 3 THEN 'Executive Committee meeting scheduled for tomorrow at 10:00 AM. Agenda has been distributed.'
                WHEN 4 THEN 'Security audit findings document requires your immediate review and sign-off.'
                WHEN 5 THEN 'Board Resolution 2024-15 regarding the acquisition has been approved by majority vote.'
                WHEN 6 THEN 'Critical system maintenance scheduled for tonight 11 PM - 3 AM EST. Plan accordingly.'
                WHEN 7 THEN 'Voice Commands beta feature is now available. Enable in your settings to try it out.'
                WHEN 8 THEN 'The annual budget document has been shared with all board members for final review.'
                WHEN 9 THEN 'Please review the updated risk assessment document and provide feedback by Thursday.'
                WHEN 10 THEN 'Reminder: Strategic planning session today at 2:00 PM in the executive conference room.'
                WHEN 11 THEN 'Annual compliance training must be completed by next Friday. Access via the training portal.'
                ELSE 'Your weekly summary of board activities and important updates is ready.'
            END,
            priorities[((i-1) % array_length(priorities, 1)) + 1],
            CASE 
                WHEN i <= 3 THEN 'unread'
                WHEN i <= 7 THEN 'read'
                WHEN i <= 9 THEN 'unread'
                ELSE 'read'
            END,
            CASE ((i-1) % 6) + 1
                WHEN 1 THEN '/dashboard/documents/board-minutes'
                WHEN 2 THEN '/compliance/reports'
                WHEN 3 THEN '/meetings/executive-committee'
                WHEN 4 THEN '/documents/security-audit'
                WHEN 5 THEN '/governance/resolutions'
                ELSE '/dashboard'
            END,
            CASE ((i-1) % 4) + 1
                WHEN 1 THEN 'View Document'
                WHEN 2 THEN 'Take Action'
                WHEN 3 THEN 'Join Meeting'
                ELSE 'Review Now'
            END,
            CASE ((i-1) % 6) + 1
                WHEN 1 THEN 'file-text'
                WHEN 2 THEN 'alert-triangle'
                WHEN 3 THEN 'calendar'
                WHEN 4 THEN 'shield-alert'
                WHEN 5 THEN 'check-circle'
                ELSE 'info'
            END,
            CASE ((i-1) % 4) + 1
                WHEN 1 THEN '#3B82F6'
                WHEN 2 THEN '#F59E0B'
                WHEN 3 THEN '#10B981'
                ELSE '#EF4444'
            END,
            format('{
                "document_id": "doc-%s",
                "meeting_id": "meeting-%s",
                "source": "automated",
                "requires_action": %s,
                "estimated_read_time": %s,
                "category_priority": "%s"
            }', 
                lpad(i::text, 3, '0'),
                lpad((i+100)::text, 3, '0'), 
                (i % 3 = 0)::text,
                (5 + (i % 10))::text,
                CASE WHEN i % 4 = 0 THEN 'high' ELSE 'normal' END
            )::jsonb,
            NOW() - (i || ' days')::interval,
            test_user_id
        );
    END LOOP;

    RAISE NOTICE 'Created 12 sample notifications for test user';

END $$;

-- =====================================================
-- CREATE SAMPLE EXPORT JOBS FOR TESTING
-- =====================================================

DO $$
DECLARE
    test_user_id UUID;
    org_id UUID;
BEGIN
    SELECT id INTO test_user_id FROM auth.users WHERE email = 'test.director@appboardguru.com';
    SELECT id INTO org_id FROM organizations WHERE name = 'Test Organization for Settings';

    -- Create sample export jobs (if table exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'export_jobs') THEN
        INSERT INTO export_jobs (
            user_id,
            organization_id,
            export_type,
            status,
            file_format,
            date_range_start,
            date_range_end,
            filters,
            total_records,
            processed_records,
            file_size,
            download_url,
            expires_at
        ) VALUES 
        (test_user_id, org_id, 'notifications', 'completed', 'json', NOW() - interval '30 days', NOW(), '{"status": "all", "categories": ["all"]}', 12, 12, 2048, '/exports/notifications-export-1.json', NOW() + interval '7 days'),
        (test_user_id, org_id, 'settings', 'completed', 'csv', NOW() - interval '7 days', NOW(), '{}', 3, 3, 1024, '/exports/settings-export-1.csv', NOW() + interval '7 days'),
        (test_user_id, org_id, 'notifications', 'in_progress', 'pdf', NOW() - interval '60 days', NOW(), '{"priority": "high", "categories": ["System", "Compliance"]}', 45, 30, 0, NULL, NULL);
    END IF;

    RAISE NOTICE 'Sample data creation completed successfully';

END $$;