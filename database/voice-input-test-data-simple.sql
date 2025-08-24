-- =====================================================
-- VOICE INPUT TEST DATA - SIMPLIFIED VERSION
-- Creates test data that works with current schema
-- Run this AFTER creating test.director@appboardguru.com in Supabase Auth
-- =====================================================

DO $$
DECLARE 
    test_user_id UUID;
    test_org_id UUID;
    meeting_ids UUID[];
    vault_ids UUID[];
    asset_counter INTEGER := 0;
    current_vault_id UUID;
    temp_asset_id UUID;
BEGIN
    RAISE NOTICE 'Starting voice input test data setup (simplified version)...';

    -- =====================================================
    -- STEP 1: GET TEST USER FROM AUTH
    -- =====================================================
    
    SELECT id INTO test_user_id 
    FROM auth.users 
    WHERE email = 'test.director@boardguru.ai'
    LIMIT 1;
    
    IF test_user_id IS NULL THEN
        RAISE EXCEPTION 'Test user not found in auth.users. Please create test.director@boardguru.ai in Supabase Auth first.';
    END IF;
    
    RAISE NOTICE 'Found test user: %', test_user_id;
    
    -- Insert basic user data (only with columns that exist)
    INSERT INTO users (id, email, full_name, role, status, company, position, approved_by, approved_at)
    VALUES (
        test_user_id,
        'test.director@boardguru.ai',
        'Test Director',
        'director',
        'approved',
        'BoardTech Solutions',
        'Chief Executive Officer',
        test_user_id,
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        status = EXCLUDED.status,
        company = EXCLUDED.company,
        position = EXCLUDED.position,
        updated_at = NOW();
    
    -- =====================================================
    -- STEP 2: CREATE TEST ORGANIZATION
    -- =====================================================
    
    INSERT INTO organizations (
        id, name, slug, description, website, 
        industry, organization_size, created_by, is_active
    ) VALUES (
        gen_random_uuid(),
        'BoardTech Solutions',
        'boardtech-solutions-voice-test',
        'A technology company focused on innovative solutions for corporate governance and board management.',
        'https://boardtechsolutions.com',
        'Technology',
        'medium',
        test_user_id,
        true
    )
    ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        updated_at = NOW()
    RETURNING id INTO test_org_id;
    
    -- If conflict occurred, get the existing org ID
    IF test_org_id IS NULL THEN
        SELECT id INTO test_org_id FROM organizations WHERE slug = 'boardtech-solutions-voice-test';
    END IF;
    
    RAISE NOTICE 'Organization ID: %', test_org_id;
    
    -- Add test user to organization
    INSERT INTO organization_members (organization_id, user_id, role, status, invited_by, joined_at)
    VALUES (test_org_id, test_user_id, 'owner', 'active', test_user_id, NOW())
    ON CONFLICT (organization_id, user_id) DO UPDATE SET
        role = EXCLUDED.role,
        status = EXCLUDED.status;
    
    -- =====================================================
    -- STEP 3: SKIP ADDITIONAL USERS (AUTH CONSTRAINT)
    -- =====================================================
    
    -- Note: We can only create users that exist in auth.users first
    -- For voice input testing, the single test user is sufficient
    RAISE NOTICE 'Skipping additional user creation - only auth users can be added to users table';
    
    -- =====================================================
    -- STEP 4: CREATE TEST MEETINGS (if meetings table exists)
    -- =====================================================
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'meetings') THEN
        WITH meeting_data AS (
            SELECT * FROM (VALUES
                ('Q4 2024 Board Meeting', 'Quarterly board meeting to review financial performance and strategic initiatives.', 'board', 'scheduled', '2024-12-15 10:00:00+00', '2024-12-15 12:00:00+00'),
                ('Strategic Planning Workshop', 'Annual strategic planning session to define objectives and roadmap.', 'board', 'scheduled', '2024-12-20 09:00:00+00', '2024-12-20 17:00:00+00'),
                ('Audit Committee Review', 'Review of audit findings and compliance matters.', 'committee', 'completed', '2024-11-28 14:00:00+00', '2024-11-28 16:00:00+00'),
                ('Emergency Board Session', 'Urgent board meeting to address critical business matters.', 'board', 'completed', '2024-11-15 16:00:00+00', '2024-11-15 18:00:00+00'),
                ('Technology Roadmap Review', 'Deep dive into technology strategy and innovation priorities.', 'other', 'scheduled', '2025-01-10 13:00:00+00', '2025-01-10 15:30:00+00')
            ) AS t(title, description, meeting_type, status, scheduled_start, scheduled_end)
        )
        INSERT INTO meetings (
            id, organization_id, created_by, title, description, 
            meeting_type, status, scheduled_start, scheduled_end, created_at
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
            NOW()
        FROM meeting_data md;
        
        RAISE NOTICE 'Created meetings';
    ELSE
        RAISE NOTICE 'Meetings table does not exist, skipping meeting creation';
    END IF;
    
    -- =====================================================
    -- STEP 5: CREATE TEST VAULTS (if vaults table exists)
    -- =====================================================
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vaults') THEN
        WITH vault_data AS (
            SELECT * FROM (VALUES
                ('Q4 2024 Board Materials', 'Collection of all documents and materials for Q4 2024 board meetings.'),
                ('Strategic Planning Documents', 'Strategic planning materials, market analysis, and roadmap documentation.'),
                ('Audit Committee Files', 'Audit reports, compliance documents, and internal control assessments.'),
                ('Technology Roadmap Archive', 'Technical documentation, innovation reports, and technology strategy.'),
                ('Risk Assessment Repository', 'Risk management frameworks and assessment reports.')
            ) AS t(name, description)
        )
        INSERT INTO vaults (
            id, name, description, organization_id, created_by, 
            status, category, created_at
        )
        SELECT 
            gen_random_uuid(),
            vd.name,
            vd.description,
            test_org_id,
            test_user_id,
            'active'::vault_status,
            'board_meeting',
            NOW()
        FROM vault_data vd;
        
        -- Add vault members (only the test user)
        INSERT INTO vault_members (vault_id, user_id, organization_id, role, status)
        SELECT v.id, test_user_id, test_org_id, 'owner', 'active'
        FROM vaults v
        WHERE v.organization_id = test_org_id;
        
        RAISE NOTICE 'Created vaults';
    ELSE
        RAISE NOTICE 'Vaults table does not exist, skipping vault creation';
    END IF;
    
    -- =====================================================
    -- STEP 6: CREATE TEST ASSETS (if assets table exists)
    -- =====================================================
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'assets') THEN
        -- Create 50 test assets
        FOR i IN 1..50 LOOP
            INSERT INTO assets (
                id, title, description, file_name, original_file_name, 
                file_path, file_type, mime_type, file_size, owner_id,
                organization_id, category, created_at
            )
            VALUES (
                gen_random_uuid(),
                'Test Asset ' || i || ' - ' || 
                CASE (i % 5)
                    WHEN 0 THEN 'Financial Report'
                    WHEN 1 THEN 'Strategic Plan'
                    WHEN 2 THEN 'Board Meeting Minutes'
                    WHEN 3 THEN 'Audit Committee Report' 
                    ELSE 'Governance Document'
                END,
                'Voice input test asset #' || i || ' containing searchable business content including financial analysis, strategic planning, governance policies, and board meeting materials.',
                'asset-' || i || '.pdf',
                'Test_Asset_' || i || '.pdf',
                '/assets/voice-test/asset-' || i || '.pdf',
                'pdf',
                'application/pdf',
                (random() * 2000000)::bigint + 100000,
                test_user_id,
                test_org_id,
                CASE (i % 3) WHEN 0 THEN 'financial' WHEN 1 THEN 'strategic' ELSE 'governance' END,
                NOW() - (random() * interval '90 days')
            );
        END LOOP;
        
        RAISE NOTICE 'Created 50 test assets';
    ELSE
        RAISE NOTICE 'Assets table does not exist, skipping asset creation';
    END IF;
    
    -- =====================================================
    -- STEP 7: CREATE TEST DOCUMENTS (if documents table exists)
    -- =====================================================
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'documents') THEN
        -- Create 25 test documents
        FOR i IN 1..25 LOOP
            INSERT INTO documents (
                id, title, content, organization_id, created_by, 
                document_type, status, created_at
            )
            VALUES (
                gen_random_uuid(),
                'Document ' || i || ' - ' || 
                CASE (i % 4)
                    WHEN 0 THEN 'Financial Analysis'
                    WHEN 1 THEN 'Strategic Planning Report'
                    WHEN 2 THEN 'Board Resolution'
                    ELSE 'Governance Policy'
                END,
                'This is comprehensive searchable content for voice input testing. Document contains financial data, strategic information, governance policies, board meeting minutes, audit findings, compliance requirements, risk assessments, and corporate communications. Keywords: board meetings, financial reports, strategic planning, governance, audit committee, compliance.',
                test_org_id,
                test_user_id,
                CASE (i % 3) WHEN 0 THEN 'financial' WHEN 1 THEN 'strategic' ELSE 'governance' END,
                'active',
                NOW() - (random() * interval '60 days')
            );
        END LOOP;
        
        RAISE NOTICE 'Created 25 test documents';
    ELSE
        RAISE NOTICE 'Documents table does not exist, skipping document creation';
    END IF;
    
    -- =====================================================
    -- FINAL SUCCESS MESSAGE
    -- =====================================================
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'VOICE INPUT TEST DATA SETUP COMPLETE!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Test Organization: BoardTech Solutions';
    RAISE NOTICE 'Organization ID: %', test_org_id;
    RAISE NOTICE 'Test User: test.director@boardguru.ai';
    RAISE NOTICE 'User ID: %', test_user_id;
    RAISE NOTICE 'Total Users in Org: %', (SELECT COUNT(*) FROM organization_members WHERE organization_id = test_org_id);
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'meetings') THEN
        RAISE NOTICE 'Total Meetings: %', (SELECT COUNT(*) FROM meetings WHERE organization_id = test_org_id);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vaults') THEN
        RAISE NOTICE 'Total Vaults: %', (SELECT COUNT(*) FROM vaults WHERE organization_id = test_org_id);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'assets') THEN
        RAISE NOTICE 'Total Assets: %', (SELECT COUNT(*) FROM assets WHERE organization_id = test_org_id);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'documents') THEN
        RAISE NOTICE 'Total Documents: %', (SELECT COUNT(*) FROM documents WHERE organization_id = test_org_id);
    END IF;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'You can now test voice input functionality!';
    
EXCEPTION 
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error setting up voice input test data: %', SQLERRM;
END $$;