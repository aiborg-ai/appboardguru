-- =====================================================
-- VOICE INPUT TEST DATA - SYNTHETIC DATA GENERATION
-- Creates test user 'test.director' and comprehensive test data
-- Run this AFTER the voice-input-test-setup.sql
-- =====================================================

-- Step 1: Create test.director user in auth.users (you'll need to do this in Supabase Auth manually)
-- =====================================================
-- IMPORTANT: This user must be created manually in Supabase Auth first:
-- Email: test.director@appboardguru.com
-- Password: TestDirector123!
-- Confirm the email manually in the Supabase Auth dashboard

-- Step 2: Insert the test user into users table
-- =====================================================

-- First, we need to get the auth user ID. Replace 'your-auth-user-id' with the actual UUID from auth.users
-- You can find this by running: SELECT id, email FROM auth.users WHERE email = 'test.director@appboardguru.com';

DO $$
DECLARE 
    test_user_id UUID;
    test_org_id UUID;
    test_board_id UUID;
    test_committee_id UUID;
BEGIN
    -- Get the test user ID from auth.users
    SELECT id INTO test_user_id 
    FROM auth.users 
    WHERE email = 'test.director@appboardguru.com';
    
    -- If user doesn't exist in auth, we'll create a placeholder ID
    -- NOTE: This won't work for actual authentication - you MUST create the user in Supabase Auth
    IF test_user_id IS NULL THEN
        test_user_id := gen_random_uuid();
        RAISE NOTICE 'WARNING: test.director user not found in auth.users. Please create this user in Supabase Auth first.';
    END IF;

    -- Insert/Update user in users table
    INSERT INTO users (id, email, full_name, role, status, company, position, designation, linkedin_url, bio, approved_at)
    VALUES (
        test_user_id,
        'test.director@appboardguru.com',
        'Test Director',
        'director',
        'approved',
        'AppBoard Guru Inc.',
        'Board Director',
        'Senior Director of Governance',
        'https://linkedin.com/in/test-director',
        'Experienced board director with expertise in corporate governance, risk management, and strategic planning. Passionate about digital transformation and sustainable business practices.',
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        status = EXCLUDED.status,
        company = EXCLUDED.company,
        position = EXCLUDED.position,
        designation = EXCLUDED.designation,
        linkedin_url = EXCLUDED.linkedin_url,
        bio = EXCLUDED.bio,
        approved_at = EXCLUDED.approved_at,
        updated_at = NOW();

    -- Create test organization
    INSERT INTO organizations (id, name, slug, description, logo_url, website, industry, organization_size, created_by, is_active)
    VALUES (
        gen_random_uuid(),
        'BoardTech Solutions',
        'boardtech-solutions',
        'Leading provider of board governance solutions and corporate digital transformation services.',
        'https://example.com/logo.png',
        'https://boardtech-solutions.com',
        'Technology',
        'medium',
        test_user_id,
        true
    )
    RETURNING id INTO test_org_id;

    -- Add test user as organization owner
    INSERT INTO organization_members (organization_id, user_id, role, status, joined_at)
    VALUES (test_org_id, test_user_id, 'owner', 'active', NOW());

    -- Create additional test users for the organization
    INSERT INTO users (id, email, full_name, role, status, company, position, designation, approved_at) VALUES
    (gen_random_uuid(), 'alice.smith@boardtech.com', 'Alice Smith', 'admin', 'approved', 'BoardTech Solutions', 'Chief Financial Officer', 'CFO & Board Secretary', NOW()),
    (gen_random_uuid(), 'bob.johnson@boardtech.com', 'Bob Johnson', 'director', 'approved', 'BoardTech Solutions', 'Independent Director', 'Independent Board Director', NOW()),
    (gen_random_uuid(), 'carol.davis@boardtech.com', 'Carol Davis', 'admin', 'approved', 'BoardTech Solutions', 'Chief Technology Officer', 'CTO & Innovation Lead', NOW()),
    (gen_random_uuid(), 'david.wilson@boardtech.com', 'David Wilson', 'viewer', 'approved', 'BoardTech Solutions', 'Compliance Manager', 'Risk & Compliance Officer', NOW()),
    (gen_random_uuid(), 'eva.brown@boardtech.com', 'Eva Brown', 'director', 'approved', 'BoardTech Solutions', 'Marketing Director', 'Director of Marketing & Strategy', NOW()),
    (gen_random_uuid(), 'frank.miller@boardtech.com', 'Frank Miller', 'admin', 'approved', 'BoardTech Solutions', 'Head of Operations', 'Operations & HR Director', NOW()),
    (gen_random_uuid(), 'grace.taylor@boardtech.com', 'Grace Taylor', 'viewer', 'approved', 'BoardTech Solutions', 'Legal Counsel', 'General Counsel & Secretary', NOW()),
    (gen_random_uuid(), 'henry.anderson@boardtech.com', 'Henry Anderson', 'director', 'approved', 'BoardTech Solutions', 'Sales Director', 'Director of Sales & Partnerships', NOW()),
    (gen_random_uuid(), 'iris.clark@boardtech.com', 'Iris Clark', 'admin', 'approved', 'BoardTech Solutions', 'Product Manager', 'Head of Product Development', NOW()),
    (gen_random_uuid(), 'jack.martin@boardtech.com', 'Jack Martin', 'viewer', 'approved', 'BoardTech Solutions', 'Data Analyst', 'Business Intelligence Analyst', NOW());

    -- Add all users to the organization
    INSERT INTO organization_members (organization_id, user_id, role, status, joined_at)
    SELECT test_org_id, u.id, 
           CASE 
               WHEN u.role = 'admin' THEN 'admin'::organization_role
               WHEN u.role = 'director' THEN 'member'::organization_role
               ELSE 'viewer'::organization_role
           END,
           'active'::membership_status, 
           NOW()
    FROM users u 
    WHERE u.email LIKE '%@boardtech.com' AND u.id != test_user_id;

    -- Create test board
    INSERT INTO boards (id, name, description, board_type, organization_id, status, established_date, meeting_frequency, created_by, settings)
    VALUES (
        gen_random_uuid(),
        'BoardTech Main Board',
        'Primary board of directors responsible for strategic oversight and corporate governance of BoardTech Solutions.',
        'main_board',
        test_org_id,
        'active',
        '2020-01-15',
        'quarterly',
        test_user_id,
        '{
            "quorum_requirement": 60,
            "voting_threshold": 50,
            "allow_virtual_meetings": true,
            "notification_settings": {
                "notify_before_meetings": true,
                "days_before_notification": 7
            }
        }'::jsonb
    )
    RETURNING id INTO test_board_id;

    -- Add board members
    INSERT INTO board_members (board_id, user_id, organization_id, role, status, appointed_date, is_voting_member, meetings_attended, meetings_total, expertise_areas)
    SELECT 
        test_board_id, 
        u.id, 
        test_org_id,
        CASE 
            WHEN u.email = 'test.director@appboardguru.com' THEN 'chairman'::board_member_role
            WHEN u.email = 'alice.smith@boardtech.com' THEN 'cfo'::board_member_role
            WHEN u.email = 'carol.davis@boardtech.com' THEN 'cto'::board_member_role
            ELSE 'independent_director'::board_member_role
        END,
        'active'::board_member_status,
        CURRENT_DATE - INTERVAL '2 years',
        true,
        FLOOR(RANDOM() * 15 + 10)::int,  -- 10-24 meetings attended
        FLOOR(RANDOM() * 20 + 15)::int,  -- 15-34 total meetings
        ARRAY['governance', 'strategy', 'risk management', 'technology', 'finance']
    FROM users u 
    WHERE u.email IN ('test.director@appboardguru.com', 'alice.smith@boardtech.com', 'bob.johnson@boardtech.com', 'carol.davis@boardtech.com', 'eva.brown@boardtech.com');

    -- Create test committee
    INSERT INTO committees (id, name, description, committee_type, organization_id, board_id, status, established_date, created_by)
    VALUES (
        gen_random_uuid(),
        'Audit Committee',
        'Responsible for overseeing financial reporting, internal controls, and external audit processes.',
        'audit',
        test_org_id,
        test_board_id,
        'active',
        '2020-03-01',
        test_user_id
    )
    RETURNING id INTO test_committee_id;

    -- Add committee members
    INSERT INTO committee_members (committee_id, user_id, board_id, organization_id, role, status, appointed_date, meetings_attended, meetings_total)
    SELECT 
        test_committee_id,
        u.id,
        test_board_id,
        test_org_id,
        CASE 
            WHEN u.email = 'alice.smith@boardtech.com' THEN 'chair'::committee_member_role
            WHEN u.email = 'test.director@appboardguru.com' THEN 'member'::committee_member_role
            ELSE 'member'::committee_member_role
        END,
        'active'::committee_member_status,
        CURRENT_DATE - INTERVAL '18 months',
        FLOOR(RANDOM() * 8 + 5)::int,   -- 5-12 meetings attended
        FLOOR(RANDOM() * 10 + 6)::int   -- 6-15 total meetings
    FROM users u 
    WHERE u.email IN ('test.director@appboardguru.com', 'alice.smith@boardtech.com', 'david.wilson@boardtech.com');

    -- Create test meetings
    INSERT INTO meetings (id, organization_id, created_by, title, description, meeting_type, status, scheduled_start, scheduled_end, location, category, tags)
    VALUES
    (gen_random_uuid(), test_org_id, test_user_id, 'Q4 2024 Board Meeting', 'Quarterly board meeting to review financial performance and strategic initiatives for Q4 2024.', 'board', 'completed', '2024-12-15 14:00:00+00', '2024-12-15 16:30:00+00', 'BoardTech Conference Room A', 'quarterly_review', ARRAY['quarterly', 'financials', 'strategy']),
    (gen_random_uuid(), test_org_id, test_user_id, 'Strategic Planning Workshop', 'Annual strategic planning session to define goals and priorities for 2025.', 'board', 'scheduled', '2025-01-20 09:00:00+00', '2025-01-20 17:00:00+00', 'Offsite - Downtown Convention Center', 'strategic_planning', ARRAY['strategy', 'planning', 'annual']),
    (gen_random_uuid(), test_org_id, test_user_id, 'Audit Committee Review', 'Monthly audit committee meeting to review financial controls and compliance matters.', 'committee', 'completed', '2024-12-05 10:00:00+00', '2024-12-05 12:00:00+00', 'Virtual Meeting', 'audit_review', ARRAY['audit', 'compliance', 'monthly']),
    (gen_random_uuid(), test_org_id, test_user_id, 'Emergency Board Session', 'Special board meeting to address urgent market opportunities and competitive response.', 'board', 'scheduled', '2025-01-10 15:00:00+00', '2025-01-10 17:00:00+00', 'BoardTech Conference Room B', 'emergency', ARRAY['urgent', 'competitive', 'market']),
    (gen_random_uuid(), test_org_id, test_user_id, 'Technology Roadmap Review', 'Quarterly review of technology initiatives and digital transformation progress.', 'committee', 'draft', '2025-02-01 13:00:00+00', '2025-02-01 15:00:00+00', 'Innovation Lab', 'tech_review', ARRAY['technology', 'digital', 'roadmap']),
    (gen_random_uuid(), test_org_id, test_user_id, 'Annual Shareholder Meeting', 'Annual general meeting with shareholders to present yearly results and future outlook.', 'agm', 'scheduled', '2025-03-15 10:00:00+00', '2025-03-15 14:00:00+00', 'Grand Ballroom - City Hotel', 'agm', ARRAY['annual', 'shareholders', 'results']),
    (gen_random_uuid(), test_org_id, test_user_id, 'Risk Management Workshop', 'Comprehensive risk assessment and mitigation strategy development session.', 'committee', 'completed', '2024-11-20 09:00:00+00', '2024-11-20 16:00:00+00', 'Risk Assessment Center', 'risk_management', ARRAY['risk', 'mitigation', 'workshop']),
    (gen_random_uuid(), test_org_id, test_user_id, 'Compensation Committee Meeting', 'Review of executive compensation packages and performance incentive structures.', 'committee', 'scheduled', '2025-01-25 11:00:00+00', '2025-01-25 13:00:00+00', 'Executive Conference Room', 'compensation', ARRAY['compensation', 'executive', 'performance']),
    (gen_random_uuid(), test_org_id, test_user_id, 'Board Retreat Planning', 'Planning session for the annual board retreat and team building activities.', 'other', 'draft', '2025-02-10 14:00:00+00', '2025-02-10 16:00:00+00', 'Planning Room', 'retreat_planning', ARRAY['retreat', 'planning', 'team_building']),
    (gen_random_uuid(), test_org_id, test_user_id, 'Governance Best Practices', 'Educational session on latest governance trends and regulatory compliance updates.', 'other', 'scheduled', '2025-01-30 10:00:00+00', '2025-01-30 12:00:00+00', 'Training Center', 'governance', ARRAY['governance', 'compliance', 'education']);

    -- Create test vaults
    INSERT INTO vaults (id, name, description, organization_id, created_by, status, priority, meeting_date, location, category, tags, member_count, asset_count)
    VALUES
    (gen_random_uuid(), 'Q4 2024 Board Materials', 'Document vault containing all materials for the Q4 2024 quarterly board meeting including financial reports and strategic updates.', test_org_id, test_user_id, 'active', 'high', '2024-12-15 14:00:00+00', 'BoardTech Conference Room A', 'quarterly_meeting', ARRAY['q4', 'board', 'financial'], 8, 15),
    (gen_random_uuid(), 'Strategic Planning Documents', 'Comprehensive collection of strategic planning materials, market analysis, and competitive intelligence reports for 2025 planning.', test_org_id, test_user_id, 'active', 'urgent', '2025-01-20 09:00:00+00', 'Offsite - Downtown Convention Center', 'strategic_planning', ARRAY['strategy', '2025', 'planning'], 12, 23),
    (gen_random_uuid(), 'Audit Committee Files', 'Audit-related documents including financial statements, internal control reports, and compliance documentation.', test_org_id, test_user_id, 'active', 'medium', '2024-12-05 10:00:00+00', 'Virtual Meeting', 'audit_materials', ARRAY['audit', 'compliance', 'financial'], 5, 18),
    (gen_random_uuid(), 'Technology Roadmap Archive', 'Historical and current technology roadmap documents, digital transformation initiatives, and innovation project updates.', test_org_id, test_user_id, 'active', 'medium', '2025-02-01 13:00:00+00', 'Innovation Lab', 'technology', ARRAY['technology', 'roadmap', 'digital'], 7, 12),
    (gen_random_uuid(), 'Risk Assessment Repository', 'Risk management documentation including risk registers, mitigation strategies, and compliance monitoring reports.', test_org_id, test_user_id, 'archived', 'low', '2024-11-20 09:00:00+00', 'Risk Assessment Center', 'risk_management', ARRAY['risk', 'assessment', 'compliance'], 6, 9),
    (gen_random_uuid(), 'Executive Compensation Data', 'Confidential vault containing executive compensation analysis, benchmarking studies, and performance metrics.', test_org_id, test_user_id, 'active', 'high', '2025-01-25 11:00:00+00', 'Executive Conference Room', 'compensation', ARRAY['compensation', 'executive', 'confidential'], 4, 8),
    (gen_random_uuid(), 'Annual Shareholder Materials', 'All materials prepared for the annual shareholder meeting including annual reports, presentations, and proxy statements.', test_org_id, test_user_id, 'draft', 'urgent', '2025-03-15 10:00:00+00', 'Grand Ballroom - City Hotel', 'annual_meeting', ARRAY['annual', 'shareholders', 'agm'], 10, 20),
    (gen_random_uuid(), 'Governance Policies Archive', 'Repository of governance policies, procedures, and best practice documentation for board reference and training.', test_org_id, test_user_id, 'active', 'low', NULL, 'Document Repository', 'governance', ARRAY['governance', 'policies', 'procedures'], 15, 35),
    (gen_random_uuid(), 'Emergency Response Documents', 'Crisis management plans, emergency contact information, and rapid response procedures for urgent situations.', test_org_id, test_user_id, 'active', 'urgent', '2025-01-10 15:00:00+00', 'BoardTech Conference Room B', 'emergency', ARRAY['emergency', 'crisis', 'response'], 8, 6),
    (gen_random_uuid(), 'Board Retreat Resources', 'Planning documents, agendas, and materials for the annual board retreat and strategic offsite sessions.', test_org_id, test_user_id, 'draft', 'medium', '2025-02-10 14:00:00+00', 'Planning Room', 'retreat', ARRAY['retreat', 'offsite', 'team_building'], 12, 14);

    -- Add vault members (all organization members get access to most vaults)
    INSERT INTO vault_members (vault_id, user_id, organization_id, role, status, joined_via)
    SELECT 
        v.id,
        u.id,
        test_org_id,
        CASE 
            WHEN u.email = 'test.director@appboardguru.com' THEN 'owner'
            WHEN u.role = 'admin' THEN 'admin'
            WHEN u.role = 'director' THEN 'editor'
            ELSE 'viewer'
        END,
        'active',
        'invitation'
    FROM vaults v
    CROSS JOIN users u
    WHERE v.organization_id = test_org_id 
    AND u.id IN (SELECT user_id FROM organization_members WHERE organization_id = test_org_id);

    -- Create test assets
    INSERT INTO assets (id, name, file_path, file_type, file_size, owner_id, uploaded_by, organization_id, vault_id, description, tags, metadata)
    SELECT 
        gen_random_uuid(),
        asset_name,
        '/uploads/' || LOWER(REPLACE(asset_name, ' ', '_')) || file_ext,
        CASE 
            WHEN file_ext = '.pdf' THEN 'application/pdf'
            WHEN file_ext = '.docx' THEN 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            WHEN file_ext = '.xlsx' THEN 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            WHEN file_ext = '.pptx' THEN 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
            ELSE 'application/octet-stream'
        END,
        FLOOR(RANDOM() * 5000000 + 100000)::bigint, -- 100KB to 5MB
        test_user_id,
        test_user_id,
        test_org_id,
        v.id,
        asset_desc,
        ARRAY[tag1, tag2, tag3],
        ('{"pages": ' || FLOOR(RANDOM() * 50 + 1) || ', "created_date": "' || NOW()::date || '"}')::jsonb
    FROM (
        SELECT v.id, v.name as vault_name FROM vaults v WHERE v.organization_id = test_org_id LIMIT 10
    ) v
    CROSS JOIN (
        VALUES 
            ('Q4 Financial Summary Report', '.pdf', 'Comprehensive financial performance report for the fourth quarter including revenue, expenses, and profit analysis.', 'financial', 'quarterly', 'report'),
            ('Strategic Plan 2025 Presentation', '.pptx', 'Executive presentation outlining strategic objectives and key initiatives for the upcoming fiscal year.', 'strategy', 'presentation', '2025'),
            ('Board Meeting Agenda December', '.docx', 'Detailed agenda for the December board meeting with discussion topics and decision items.', 'agenda', 'meeting', 'december'),
            ('Risk Assessment Matrix', '.xlsx', 'Comprehensive risk analysis spreadsheet with probability ratings and mitigation strategies.', 'risk', 'assessment', 'matrix'),
            ('Governance Policy Manual', '.pdf', 'Updated corporate governance policies and procedures manual for board reference.', 'governance', 'policy', 'manual'),
            ('Audit Committee Charter', '.pdf', 'Official charter document defining the audit committee\'s roles, responsibilities, and authority.', 'audit', 'charter', 'committee'),
            ('Technology Roadmap 2025', '.pptx', 'Detailed technology roadmap presentation showing planned digital initiatives and innovation projects.', 'technology', 'roadmap', 'digital'),
            ('Executive Compensation Analysis', '.xlsx', 'Benchmarking analysis of executive compensation packages against industry standards.', 'compensation', 'executive', 'analysis'),
            ('Market Research Summary', '.pdf', 'Market analysis report covering competitive landscape and growth opportunities.', 'market', 'research', 'competitive'),
            ('Compliance Monitoring Report', '.docx', 'Monthly compliance status report with regulatory updates and action items.', 'compliance', 'monitoring', 'regulatory'),
            ('Innovation Project Proposals', '.pptx', 'Collection of new innovation project proposals for board review and approval.', 'innovation', 'projects', 'proposals'),
            ('Financial Controls Assessment', '.xlsx', 'Internal controls evaluation spreadsheet with effectiveness ratings and recommendations.', 'financial', 'controls', 'assessment'),
            ('Shareholder Communication Plan', '.docx', 'Strategic communication plan for shareholder engagement and investor relations.', 'shareholder', 'communication', 'investor'),
            ('Crisis Management Procedures', '.pdf', 'Emergency response procedures and crisis management protocols for leadership team.', 'crisis', 'emergency', 'procedures'),
            ('Board Training Materials', '.pptx', 'Educational materials for board member training on governance best practices.', 'training', 'governance', 'education')
    ) assets(asset_name, file_ext, asset_desc, tag1, tag2, tag3);

    -- Create test documents
    INSERT INTO documents (id, title, content, summary, asset_id, organization_id, created_by, document_type, status, tags, metadata)
    SELECT 
        gen_random_uuid(),
        a.name,
        'This is the content of ' || a.name || '. It contains detailed information about ' || a.description || ' ' ||
        'The document provides comprehensive coverage of key topics including strategic analysis, performance metrics, ' ||
        'regulatory compliance, and operational excellence. Key sections include executive summary, detailed analysis, ' ||
        'recommendations, and implementation roadmap. This material is essential for board members to make informed ' ||
        'decisions and provide effective oversight of organizational activities and strategic initiatives.',
        SUBSTRING(a.description, 1, 200),
        a.id,
        test_org_id,
        test_user_id,
        CASE 
            WHEN a.name ILIKE '%financial%' OR a.name ILIKE '%audit%' THEN 'financial'
            WHEN a.name ILIKE '%strategic%' OR a.name ILIKE '%plan%' THEN 'strategic'
            WHEN a.name ILIKE '%policy%' OR a.name ILIKE '%governance%' THEN 'governance'
            WHEN a.name ILIKE '%technology%' OR a.name ILIKE '%innovation%' THEN 'technology'
            ELSE 'general'
        END,
        'published',
        a.tags,
        ('{"word_count": ' || FLOOR(RANDOM() * 2000 + 500) || ', "last_reviewed": "' || NOW()::date || '"}')::jsonb
    FROM assets a
    WHERE a.organization_id = test_org_id;

    RAISE NOTICE 'Test data setup completed successfully!';
    RAISE NOTICE 'Test user ID: %', test_user_id;
    RAISE NOTICE 'Test organization ID: %', test_org_id;
    RAISE NOTICE 'Remember to create the auth user manually in Supabase Auth dashboard!';

END $$;