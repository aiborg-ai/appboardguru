-- =====================================================
-- VOICE INPUT TEST DATA - CONFLICT-FREE VERSION
-- Creates test data with proper conflict handling
-- Run this AFTER voice-input-missing-tables.sql
-- =====================================================

DO $$
DECLARE 
    test_user_id UUID;
    test_org_id UUID;
    meeting_ids UUID[];
    vault_ids UUID[];
    asset_counter INTEGER := 0;
    current_meeting_id UUID;
    current_vault_id UUID;
    temp_asset_id UUID;
    temp_doc_id UUID;
BEGIN
    RAISE NOTICE 'Starting voice input test data setup...';

    -- =====================================================
    -- STEP 1: GET OR CREATE TEST USER
    -- =====================================================
    
    -- First try to get existing user from auth
    SELECT id INTO test_user_id 
    FROM auth.users 
    WHERE email = 'test.director@appboardguru.com'
    LIMIT 1;
    
    IF test_user_id IS NULL THEN
        RAISE EXCEPTION 'Test user not found in auth.users. Please create test.director@appboardguru.com in Supabase Auth first.';
    END IF;
    
    RAISE NOTICE 'Found test user: %', test_user_id;
    
    -- Check if extended user columns exist and add them if needed
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'designation') THEN
        ALTER TABLE users ADD COLUMN designation TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'linkedin_url') THEN
        ALTER TABLE users ADD COLUMN linkedin_url TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'bio') THEN
        ALTER TABLE users ADD COLUMN bio TEXT;
    END IF;

    -- Insert or update user in users table with proper conflict handling
    INSERT INTO users (
        id, email, full_name, role, status, 
        company, position, designation, linkedin_url, bio,
        approved_by, approved_at
    ) VALUES (
        test_user_id,
        'test.director@appboardguru.com',
        'Test Director',
        'director',
        'approved',
        'BoardTech Solutions',
        'Chief Executive Officer',
        'Chief Executive Officer & Chairman',
        'https://linkedin.com/in/test-director-boardtech',
        'Experienced executive with 15+ years in corporate governance and strategic leadership. Expert in board management and organizational development.',
        test_user_id,
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
        approved_by = EXCLUDED.approved_by,
        approved_at = EXCLUDED.approved_at,
        updated_at = NOW();
    
    -- =====================================================
    -- STEP 2: CREATE TEST ORGANIZATION
    -- =====================================================
    
    INSERT INTO organizations (
        id, name, slug, description, logo_url, website, 
        industry, organization_size, created_by, is_active
    ) VALUES (
        gen_random_uuid(),
        'BoardTech Solutions',
        'boardtech-solutions-voice-test',
        'A technology company focused on innovative solutions for corporate governance and board management.',
        'https://example.com/boardtech-logo.png',
        'https://boardtechsolutions.com',
        'Technology',
        'medium',
        test_user_id,
        true
    )
    ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        logo_url = EXCLUDED.logo_url,
        website = EXCLUDED.website,
        industry = EXCLUDED.industry,
        organization_size = EXCLUDED.organization_size,
        updated_at = NOW()
    RETURNING id INTO test_org_id;
    
    -- If conflict occurred, get the existing org ID
    IF test_org_id IS NULL THEN
        SELECT id INTO test_org_id FROM organizations WHERE slug = 'boardtech-solutions-voice-test';
    END IF;
    
    RAISE NOTICE 'Organization ID: %', test_org_id;
    
    -- Add test user to organization
    INSERT INTO organization_members (
        organization_id, user_id, role, status, invited_by, joined_at
    ) VALUES (
        test_org_id, test_user_id, 'owner', 'active', test_user_id, NOW()
    )
    ON CONFLICT (organization_id, user_id) DO UPDATE SET
        role = EXCLUDED.role,
        status = EXCLUDED.status;
    
    -- =====================================================
    -- STEP 3: CREATE ADDITIONAL TEST USERS
    -- =====================================================
    
    -- Create additional users with unique email patterns (handle missing columns dynamically)
    INSERT INTO users (id, email, full_name, role, status, company, position, 
        CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'designation') THEN 'designation' END,
        CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'linkedin_url') THEN 'linkedin_url' END,
        CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'bio') THEN 'bio' END,
        approved_by, approved_at)
    SELECT 
        gen_random_uuid(),
        'alice.smith.voice.test@boardtech.com',
        'Alice Smith',
        'director',
        'approved',
        'BoardTech Solutions',
        'Chief Financial Officer',
        'Chief Financial Officer',
        'https://linkedin.com/in/alice-smith-cfo',
        'Seasoned financial executive with expertise in corporate finance and audit oversight.',
        test_user_id,
        NOW()
    WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'alice.smith.voice.test@boardtech.com');
    
    -- Add other users with simpler approach - just basic fields
    INSERT INTO users (id, email, full_name, role, status, company, position, approved_by, approved_at)
    SELECT 
        gen_random_uuid(),
        'bob.johnson.voice.test@boardtech.com',
        'Bob Johnson',
        'director',
        'approved',
        'BoardTech Solutions',
        'Chief Technology Officer',
        test_user_id,
        NOW()
    WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'bob.johnson.voice.test@boardtech.com');
    
    INSERT INTO users (id, email, full_name, role, status, company, position, approved_by, approved_at)
    SELECT 
        gen_random_uuid(),
        'carol.williams.voice.test@boardtech.com',
        'Carol Williams',
        'director',
        'approved',
        'BoardTech Solutions',
        'Independent Director',
        test_user_id,
        NOW()
    WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'carol.williams.voice.test@boardtech.com');
    
    -- Add additional users to organization
    INSERT INTO organization_members (organization_id, user_id, role, status, invited_by, joined_at)
    SELECT test_org_id, u.id, 'member', 'active', test_user_id, NOW()
    FROM users u 
    WHERE u.email LIKE '%.voice.test@boardtech.com'
    ON CONFLICT (organization_id, user_id) DO UPDATE SET status = 'active';
    
    -- =====================================================
    -- STEP 4: CREATE TEST MEETINGS
    -- =====================================================
    
    -- Create 10 test meetings with realistic data
    WITH meeting_data AS (
        SELECT * FROM (VALUES
            ('Q4 2024 Board Meeting', 'Quarterly board meeting to review financial performance, strategic initiatives, and governance matters.', 'board', 'scheduled', '2024-12-15 10:00:00+00', '2024-12-15 12:00:00+00', 'BoardTech Conference Room A'),
            ('Strategic Planning Workshop', 'Annual strategic planning session to define objectives and roadmap for the upcoming year.', 'board', 'scheduled', '2024-12-20 09:00:00+00', '2024-12-20 17:00:00+00', 'Executive Retreat Center'),
            ('Audit Committee Review', 'Review of audit findings, internal controls, and compliance matters.', 'committee', 'completed', '2024-11-28 14:00:00+00', '2024-11-28 16:00:00+00', 'Virtual Meeting'),
            ('Emergency Board Session', 'Urgent board meeting to address critical business matters and strategic decisions.', 'board', 'completed', '2024-11-15 16:00:00+00', '2024-11-15 18:00:00+00', 'BoardTech Headquarters'),
            ('Technology Roadmap Review', 'Deep dive into technology strategy, innovation priorities, and digital transformation initiatives.', 'other', 'scheduled', '2025-01-10 13:00:00+00', '2025-01-10 15:30:00+00', 'Innovation Lab'),
            ('Annual Shareholder Meeting', 'Annual general meeting with shareholders to review company performance and elect directors.', 'agm', 'scheduled', '2025-03-15 11:00:00+00', '2025-03-15 14:00:00+00', 'Grand Ballroom Hotel'),
            ('Risk Management Workshop', 'Comprehensive review of enterprise risk management framework and mitigation strategies.', 'committee', 'scheduled', '2025-01-25 10:00:00+00', '2025-01-25 13:00:00+00', 'Risk Assessment Center'),
            ('Compensation Committee Meeting', 'Review of executive compensation, performance metrics, and incentive programs.', 'committee', 'scheduled', '2025-02-05 15:00:00+00', '2025-02-05 17:00:00+00', 'Executive Conference Room'),
            ('Board Retreat Planning', 'Planning session for the annual board retreat, agenda setting, and logistics coordination.', 'other', 'draft', '2025-04-10 09:00:00+00', '2025-04-12 17:00:00+00', 'Mountain Resort Conference Center'),
            ('Governance Best Practices', 'Workshop on corporate governance best practices, regulatory compliance, and board effectiveness.', 'other', 'scheduled', '2025-02-20 10:00:00+00', '2025-02-20 16:00:00+00', 'Governance Institute')
        ) AS t(title, description, meeting_type, status, scheduled_start, scheduled_end, location)
    )
    INSERT INTO meetings (
        id, organization_id, created_by, title, description, 
        meeting_type, status, scheduled_start, scheduled_end, 
        location, created_at, tags, category
    )
    SELECT 
        gen_random_uuid(),
        test_org_id,
        test_user_id,
        md.title,
        md.description,
        md.meeting_type::meeting_type,
        md.status::meeting_status,
        md.scheduled_start::TIMESTAMPTZ,
        md.scheduled_end::TIMESTAMPTZ,
        md.location,
        NOW(),
        ARRAY[
            CASE WHEN md.meeting_type = 'board' THEN 'board-meeting' ELSE md.meeting_type END,
            'voice-test-data',
            CASE WHEN md.status = 'completed' THEN 'historical' ELSE 'upcoming' END
        ],
        md.meeting_type
    FROM meeting_data md
    ON CONFLICT DO NOTHING;
    
    -- Get created meeting IDs
    SELECT ARRAY(SELECT id FROM meetings WHERE organization_id = test_org_id ORDER BY scheduled_start LIMIT 10) INTO meeting_ids;
    
    RAISE NOTICE 'Created % meetings', array_length(meeting_ids, 1);
    
    -- =====================================================
    -- STEP 5: CREATE TEST VAULTS
    -- =====================================================
    
    WITH vault_data AS (
        SELECT * FROM (VALUES
            ('Q4 2024 Board Materials', 'Collection of all documents and materials for Q4 2024 board meetings and strategic sessions.'),
            ('Strategic Planning Documents', 'Strategic planning materials, market analysis, and long-term roadmap documentation.'),
            ('Audit Committee Files', 'Audit reports, compliance documents, and internal control assessments.'),
            ('Technology Roadmap Archive', 'Technical documentation, innovation reports, and technology strategy materials.'),
            ('Risk Assessment Repository', 'Risk management frameworks, assessment reports, and mitigation strategy documents.'),
            ('Executive Compensation Data', 'Compensation analysis, benchmarking reports, and executive incentive documentation.'),
            ('Annual Shareholder Materials', 'Shareholder meeting materials, annual reports, and corporate communications.'),
            ('Governance Policies Archive', 'Corporate governance policies, procedures, and best practices documentation.'),
            ('Emergency Response Documents', 'Crisis management plans, emergency procedures, and business continuity documentation.'),
            ('Board Retreat Resources', 'Retreat materials, team building resources, and strategic planning worksheets.')
        ) AS t(name, description)
    )
    INSERT INTO vaults (
        id, name, description, organization_id, created_by, 
        status, priority, is_public, requires_invitation, 
        category, tags, created_at
    )
    SELECT 
        gen_random_uuid(),
        vd.name,
        vd.description,
        test_org_id,
        test_user_id,
        'active'::vault_status,
        CASE 
            WHEN vd.name LIKE '%Emergency%' OR vd.name LIKE '%Risk%' THEN 'high'::vault_priority
            WHEN vd.name LIKE '%Strategic%' OR vd.name LIKE '%Board%' THEN 'medium'::vault_priority
            ELSE 'low'::vault_priority
        END,
        false,
        true,
        'board_meeting',
        ARRAY['voice-test-data', 'documents', 'governance'],
        NOW()
    FROM vault_data vd
    ON CONFLICT (organization_id, name) DO UPDATE SET
        description = EXCLUDED.description,
        status = EXCLUDED.status,
        updated_at = NOW();
    
    -- Get created vault IDs
    SELECT ARRAY(SELECT id FROM vaults WHERE organization_id = test_org_id ORDER BY name LIMIT 10) INTO vault_ids;
    
    RAISE NOTICE 'Created % vaults', array_length(vault_ids, 1);
    
    -- Add vault members
    INSERT INTO vault_members (vault_id, user_id, organization_id, role, status, added_by)
    SELECT v.id, u.id, test_org_id, 'member', 'active', test_user_id
    FROM vaults v
    CROSS JOIN users u
    WHERE v.organization_id = test_org_id 
    AND u.id IN (SELECT user_id FROM organization_members WHERE organization_id = test_org_id)
    ON CONFLICT (vault_id, user_id) DO UPDATE SET status = 'active';
    
    -- =====================================================
    -- STEP 6: CREATE TEST ASSETS (150+ assets)
    -- =====================================================
    
    -- Create comprehensive test assets for each vault
    FOR i IN 1..array_length(vault_ids, 1) LOOP
        current_vault_id := vault_ids[i];
        
        -- Create 15-20 assets per vault
        FOR j IN 1..15 LOOP
            asset_counter := asset_counter + 1;
            
            -- Generate realistic asset data
            INSERT INTO assets (
                id, name, file_path, file_type, file_size, owner_id, uploaded_by,
                organization_id, vault_id, description, tags, metadata,
                is_public, created_at, updated_at
            )
            SELECT 
                gen_random_uuid(),
                CASE 
                    WHEN i = 1 THEN -- Q4 2024 Board Materials
                        CASE j
                            WHEN 1 THEN 'Q4 Financial Summary Report'
                            WHEN 2 THEN 'Board Meeting Agenda - December 2024'
                            WHEN 3 THEN 'Strategic Initiatives Progress Update'
                            WHEN 4 THEN 'Risk Assessment Matrix Q4 2024'
                            WHEN 5 THEN 'Market Analysis and Competitive Landscape'
                            WHEN 6 THEN 'Executive Summary - Technology Investments'
                            WHEN 7 THEN 'Governance Compliance Report'
                            WHEN 8 THEN 'Board Resolution Templates'
                            WHEN 9 THEN 'Financial Controls Assessment'
                            WHEN 10 THEN 'Stakeholder Engagement Summary'
                            ELSE 'Q4 Board Document ' || j
                        END
                    WHEN i = 2 THEN -- Strategic Planning Documents
                        CASE j
                            WHEN 1 THEN 'Five Year Strategic Plan 2025-2030'
                            WHEN 2 THEN 'Market Opportunity Analysis'
                            WHEN 3 THEN 'Competitive Intelligence Report'
                            WHEN 4 THEN 'Strategic SWOT Analysis'
                            WHEN 5 THEN 'Innovation Roadmap and R&D Priorities'
                            WHEN 6 THEN 'Strategic Partnership Opportunities'
                            WHEN 7 THEN 'Digital Transformation Strategy'
                            WHEN 8 THEN 'Strategic Risk Assessment'
                            WHEN 9 THEN 'Resource Allocation Framework'
                            WHEN 10 THEN 'Strategic KPI Dashboard'
                            ELSE 'Strategic Planning Document ' || j
                        END
                    WHEN i = 3 THEN -- Audit Committee Files  
                        CASE j
                            WHEN 1 THEN 'Internal Audit Report Q4 2024'
                            WHEN 2 THEN 'External Auditor Management Letter'
                            WHEN 3 THEN 'Audit Committee Charter'
                            WHEN 4 THEN 'Internal Control Assessment'
                            WHEN 5 THEN 'Fraud Risk Assessment'
                            WHEN 6 THEN 'Audit Findings and Recommendations'
                            WHEN 7 THEN 'Compliance Monitoring Report'
                            WHEN 8 THEN 'Whistleblower Policy and Procedures'
                            WHEN 9 THEN 'Audit Committee Meeting Minutes'
                            WHEN 10 THEN 'Management Response to Audit Findings'
                            ELSE 'Audit Committee Document ' || j
                        END
                    ELSE 'Test Asset ' || asset_counter || ' for Vault ' || i
                END,
                '/assets/voice-test/' || asset_counter || '/' || 
                CASE (j % 4)
                    WHEN 0 THEN 'document.pdf'
                    WHEN 1 THEN 'presentation.pptx' 
                    WHEN 2 THEN 'spreadsheet.xlsx'
                    ELSE 'report.docx'
                END,
                CASE (j % 4)
                    WHEN 0 THEN 'pdf'
                    WHEN 1 THEN 'pptx'
                    WHEN 2 THEN 'xlsx' 
                    ELSE 'docx'
                END,
                (random() * 5000000)::bigint + 100000, -- 100KB to 5MB
                test_user_id,
                test_user_id,
                test_org_id,
                current_vault_id,
                'Voice input test asset #' || asset_counter || ' with searchable content including financial data, strategic information, and governance materials.',
                ARRAY[
                    'voice-test-data',
                    CASE WHEN i <= 3 THEN 'financial' WHEN i <= 6 THEN 'strategic' ELSE 'governance' END,
                    CASE (j % 3) WHEN 0 THEN 'report' WHEN 1 THEN 'presentation' ELSE 'analysis' END
                ],
                jsonb_build_object(
                    'category', CASE WHEN i <= 3 THEN 'financial' WHEN i <= 6 THEN 'strategic' ELSE 'governance' END,
                    'priority', CASE WHEN j <= 5 THEN 'high' WHEN j <= 10 THEN 'medium' ELSE 'low' END,
                    'department', CASE WHEN i <= 2 THEN 'Finance' WHEN i <= 4 THEN 'Strategy' ELSE 'Governance' END
                ),
                false,
                NOW() - (random() * interval '90 days'),
                NOW() - (random() * interval '30 days')
            RETURNING id INTO temp_asset_id;
            
            -- Create corresponding document for each asset
            INSERT INTO documents (
                id, title, content, summary, asset_id, organization_id, 
                created_by, document_type, status, tags, metadata
            )
            VALUES (
                gen_random_uuid(),
                (SELECT name FROM assets WHERE id = temp_asset_id),
                'This is comprehensive searchable content for voice input testing. ' ||
                'The document contains financial analysis, strategic recommendations, governance policies, ' ||
                'audit findings, compliance requirements, risk assessments, market research, ' ||
                'technology roadmaps, board resolutions, meeting minutes, executive summaries, ' ||
                'performance metrics, stakeholder communications, and regulatory updates. ' ||
                'Keywords: financial reports, strategic planning, board meetings, audit committee, ' ||
                'governance policies, risk management, compliance monitoring, technology innovation, ' ||
                'executive compensation, shareholder materials, corporate communications.',
                CASE 
                    WHEN i = 1 THEN 'Q4 financial and governance summary with board meeting materials and strategic updates.'
                    WHEN i = 2 THEN 'Strategic planning documentation including market analysis and innovation roadmaps.'
                    WHEN i = 3 THEN 'Audit committee files with compliance reports and risk assessments.'
                    ELSE 'Comprehensive business document with financial and strategic information.'
                END,
                temp_asset_id,
                test_org_id,
                test_user_id,
                CASE WHEN i <= 3 THEN 'financial' WHEN i <= 6 THEN 'strategic' ELSE 'governance' END,
                'active',
                ARRAY['searchable', 'voice-test', 'business-document'],
                jsonb_build_object('searchable', true, 'voice_test_data', true)
            );
            
        END LOOP;
    END LOOP;
    
    -- Update vault asset counts
    UPDATE vaults 
    SET asset_count = (
        SELECT COUNT(*) FROM assets WHERE vault_id = vaults.id
    ),
    updated_at = NOW()
    WHERE organization_id = test_org_id;
    
    -- =====================================================
    -- FINAL SUCCESS MESSAGE
    -- =====================================================
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'VOICE INPUT TEST DATA SETUP COMPLETE!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Test Organization: BoardTech Solutions';
    RAISE NOTICE 'Organization ID: %', test_org_id;
    RAISE NOTICE 'Test User: test.director@appboardguru.com';
    RAISE NOTICE 'User ID: %', test_user_id;
    RAISE NOTICE 'Total Users: %', (SELECT COUNT(*) FROM organization_members WHERE organization_id = test_org_id);
    RAISE NOTICE 'Total Meetings: %', (SELECT COUNT(*) FROM meetings WHERE organization_id = test_org_id);
    RAISE NOTICE 'Total Vaults: %', (SELECT COUNT(*) FROM vaults WHERE organization_id = test_org_id);
    RAISE NOTICE 'Total Assets: %', (SELECT COUNT(*) FROM assets WHERE organization_id = test_org_id);
    RAISE NOTICE 'Total Documents: %', (SELECT COUNT(*) FROM documents WHERE organization_id = test_org_id);
    RAISE NOTICE '========================================';
    
EXCEPTION 
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error setting up voice input test data: %', SQLERRM;
END $$;