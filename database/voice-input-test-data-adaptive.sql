-- =====================================================
-- ADAPTIVE VOICE INPUT TEST DATA SCRIPT
-- Dynamically checks database schema and creates test data
-- Works with ANY version of your database schema
-- Run this AFTER ensuring test.director@boardguru.ai exists in Supabase Auth
-- =====================================================

DO $$
DECLARE 
    test_user_id UUID;
    test_org_id UUID;
    
    -- Schema inspection variables
    users_columns TEXT[];
    orgs_columns TEXT[];
    assets_columns TEXT[];
    vaults_columns TEXT[];
    vault_members_columns TEXT[];
    meetings_columns TEXT[];
    documents_columns TEXT[];
    
    -- Data creation counters
    assets_created INTEGER := 0;
    vaults_created INTEGER := 0;
    meetings_created INTEGER := 0;
    documents_created INTEGER := 0;
    
    -- Helper variables
    current_vault_id UUID;
    temp_query TEXT;
    
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'ADAPTIVE VOICE INPUT TEST DATA SETUP';
    RAISE NOTICE '========================================';

    -- =====================================================
    -- STEP 1: INSPECT DATABASE SCHEMA
    -- =====================================================
    
    RAISE NOTICE 'Inspecting database schema...';
    
    -- Get users table columns
    SELECT ARRAY(
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'users' AND table_schema = 'public'
        ORDER BY ordinal_position
    ) INTO users_columns;
    
    -- Get organizations table columns
    SELECT ARRAY(
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'organizations' AND table_schema = 'public'
        ORDER BY ordinal_position
    ) INTO orgs_columns;
    
    -- Get assets table columns (if exists)
    SELECT ARRAY(
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'assets' AND table_schema = 'public'
        ORDER BY ordinal_position
    ) INTO assets_columns;
    
    -- Get vaults table columns (if exists)
    SELECT ARRAY(
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'vaults' AND table_schema = 'public'
        ORDER BY ordinal_position
    ) INTO vaults_columns;
    
    -- Get vault_members table columns (if exists)
    SELECT ARRAY(
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'vault_members' AND table_schema = 'public'
        ORDER BY ordinal_position
    ) INTO vault_members_columns;
    
    -- Get meetings table columns (if exists)
    SELECT ARRAY(
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'meetings' AND table_schema = 'public'
        ORDER BY ordinal_position
    ) INTO meetings_columns;
    
    -- Get documents table columns (if exists)
    SELECT ARRAY(
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'documents' AND table_schema = 'public'
        ORDER BY ordinal_position
    ) INTO documents_columns;
    
    -- Report schema findings
    RAISE NOTICE 'Schema inspection complete:';
    RAISE NOTICE '- users table has % columns: %', array_length(users_columns, 1), users_columns;
    RAISE NOTICE '- organizations table has % columns: %', array_length(orgs_columns, 1), orgs_columns;
    RAISE NOTICE '- assets table has % columns: %', COALESCE(array_length(assets_columns, 1), 0), COALESCE(assets_columns::TEXT, 'TABLE NOT FOUND');
    RAISE NOTICE '- vaults table has % columns: %', COALESCE(array_length(vaults_columns, 1), 0), COALESCE(vaults_columns::TEXT, 'TABLE NOT FOUND');
    RAISE NOTICE '- meetings table has % columns: %', COALESCE(array_length(meetings_columns, 1), 0), COALESCE(meetings_columns::TEXT, 'TABLE NOT FOUND');
    RAISE NOTICE '- documents table has % columns: %', COALESCE(array_length(documents_columns, 1), 0), COALESCE(documents_columns::TEXT, 'TABLE NOT FOUND');

    -- =====================================================
    -- STEP 2: GET TEST USER FROM AUTH
    -- =====================================================
    
    SELECT id INTO test_user_id 
    FROM auth.users 
    WHERE email = 'test.director@boardguru.ai'
    LIMIT 1;
    
    IF test_user_id IS NULL THEN
        RAISE EXCEPTION 'Test user not found in auth.users. Please create test.director@boardguru.ai in Supabase Auth first.';
    END IF;
    
    RAISE NOTICE 'Found test user: %', test_user_id;

    -- =====================================================
    -- STEP 3: UPDATE USER DATA (ADAPTIVE)
    -- =====================================================
    
    -- Build dynamic INSERT for users table
    temp_query := 'INSERT INTO users (id, email';
    
    -- Add optional columns if they exist
    IF 'full_name' = ANY(users_columns) THEN temp_query := temp_query || ', full_name'; END IF;
    IF 'role' = ANY(users_columns) THEN temp_query := temp_query || ', role'; END IF;
    IF 'status' = ANY(users_columns) THEN temp_query := temp_query || ', status'; END IF;
    IF 'company' = ANY(users_columns) THEN temp_query := temp_query || ', company'; END IF;
    IF 'position' = ANY(users_columns) THEN temp_query := temp_query || ', position'; END IF;
    IF 'designation' = ANY(users_columns) THEN temp_query := temp_query || ', designation'; END IF;
    IF 'linkedin_url' = ANY(users_columns) THEN temp_query := temp_query || ', linkedin_url'; END IF;
    IF 'bio' = ANY(users_columns) THEN temp_query := temp_query || ', bio'; END IF;
    IF 'approved_by' = ANY(users_columns) THEN temp_query := temp_query || ', approved_by'; END IF;
    IF 'approved_at' = ANY(users_columns) THEN temp_query := temp_query || ', approved_at'; END IF;
    
    temp_query := temp_query || ') VALUES ($1, $2';
    
    -- Add values for optional columns
    IF 'full_name' = ANY(users_columns) THEN temp_query := temp_query || ', $3'; END IF;
    IF 'role' = ANY(users_columns) THEN temp_query := temp_query || ', $4'; END IF;
    IF 'status' = ANY(users_columns) THEN temp_query := temp_query || ', $5'; END IF;
    IF 'company' = ANY(users_columns) THEN temp_query := temp_query || ', $6'; END IF;
    IF 'position' = ANY(users_columns) THEN temp_query := temp_query || ', $7'; END IF;
    IF 'designation' = ANY(users_columns) THEN temp_query := temp_query || ', $8'; END IF;
    IF 'linkedin_url' = ANY(users_columns) THEN temp_query := temp_query || ', $9'; END IF;
    IF 'bio' = ANY(users_columns) THEN temp_query := temp_query || ', $10'; END IF;
    IF 'approved_by' = ANY(users_columns) THEN temp_query := temp_query || ', $11'; END IF;
    IF 'approved_at' = ANY(users_columns) THEN temp_query := temp_query || ', NOW()'; END IF;
    
    temp_query := temp_query || ') ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email';
    
    -- Execute simplified user insert with only basic fields
    INSERT INTO users (id, email) VALUES (test_user_id, 'test.director@boardguru.ai')
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
    
    -- Update additional fields if they exist
    IF 'full_name' = ANY(users_columns) THEN
        EXECUTE 'UPDATE users SET full_name = $1 WHERE id = $2' USING 'Test Director', test_user_id;
    END IF;
    
    IF 'role' = ANY(users_columns) THEN
        EXECUTE 'UPDATE users SET role = $1 WHERE id = $2' USING 'director', test_user_id;
    END IF;
    
    IF 'status' = ANY(users_columns) THEN
        EXECUTE 'UPDATE users SET status = $1 WHERE id = $2' USING 'approved', test_user_id;
    END IF;
    
    RAISE NOTICE 'Updated test user profile';

    -- =====================================================
    -- STEP 4: CREATE TEST ORGANIZATION (ADAPTIVE)
    -- =====================================================
    
    -- Simple organization insert with basic fields
    INSERT INTO organizations (id, name, slug) 
    VALUES (gen_random_uuid(), 'BoardTech Solutions Voice Test', 'boardtech-voice-test-org')
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO test_org_id;
    
    -- If conflict occurred, get existing org ID
    IF test_org_id IS NULL THEN
        SELECT id INTO test_org_id FROM organizations WHERE slug = 'boardtech-voice-test-org';
    END IF;
    
    -- Update additional org fields if they exist
    IF 'description' = ANY(orgs_columns) THEN
        EXECUTE 'UPDATE organizations SET description = $1 WHERE id = $2' 
        USING 'Test organization for voice input functionality testing', test_org_id;
    END IF;
    
    IF 'created_by' = ANY(orgs_columns) THEN
        EXECUTE 'UPDATE organizations SET created_by = $1 WHERE id = $2' USING test_user_id, test_org_id;
    END IF;
    
    RAISE NOTICE 'Created test organization: %', test_org_id;

    -- Add user to organization
    INSERT INTO organization_members (organization_id, user_id, role, status)
    VALUES (test_org_id, test_user_id, 'owner', 'active')
    ON CONFLICT (organization_id, user_id) DO UPDATE SET role = 'owner', status = 'active';

    -- =====================================================
    -- STEP 5: CREATE TEST VAULTS (IF TABLE EXISTS)
    -- =====================================================
    
    IF array_length(vaults_columns, 1) > 0 THEN
        RAISE NOTICE 'Creating test vaults...';
        
        FOR i IN 1..5 LOOP
            -- Basic vault insert
            INSERT INTO vaults (name, organization_id, created_by)
            VALUES (
                'Test Vault ' || i || ' - ' || 
                CASE i
                    WHEN 1 THEN 'Board Materials'
                    WHEN 2 THEN 'Financial Documents'
                    WHEN 3 THEN 'Strategic Planning'
                    WHEN 4 THEN 'Audit Committee'
                    ELSE 'Governance Files'
                END,
                test_org_id,
                test_user_id
            )
            RETURNING id INTO current_vault_id;
            
            -- Update additional fields if they exist
            IF 'description' = ANY(vaults_columns) THEN
                EXECUTE 'UPDATE vaults SET description = $1 WHERE id = $2'
                USING 'Test vault ' || i || ' containing voice input test materials', current_vault_id;
            END IF;
            
            IF 'status' = ANY(vaults_columns) THEN
                EXECUTE 'UPDATE vaults SET status = $1 WHERE id = $2' USING 'active', current_vault_id;
            END IF;
            
            -- Add vault member if table exists
            IF array_length(vault_members_columns, 1) > 0 THEN
                INSERT INTO vault_members (vault_id, user_id, role, status)
                VALUES (current_vault_id, test_user_id, 'owner', 'active');
                
                -- Update organization_id if column exists
                IF 'organization_id' = ANY(vault_members_columns) THEN
                    EXECUTE 'UPDATE vault_members SET organization_id = $1 WHERE vault_id = $2'
                    USING test_org_id, current_vault_id;
                END IF;
            END IF;
            
            vaults_created := vaults_created + 1;
        END LOOP;
        
        RAISE NOTICE 'Created % vaults', vaults_created;
    ELSE
        RAISE NOTICE 'Vaults table not found - skipping vault creation';
    END IF;

    -- =====================================================
    -- STEP 6: CREATE TEST ASSETS (IF TABLE EXISTS)
    -- =====================================================
    
    IF array_length(assets_columns, 1) > 0 THEN
        RAISE NOTICE 'Creating test assets...';
        
        FOR i IN 1..25 LOOP
            -- Determine required vs optional fields
            IF 'title' = ANY(assets_columns) AND 'file_path' = ANY(assets_columns) AND 'file_type' = ANY(assets_columns) THEN
                
                INSERT INTO assets (
                    title,
                    file_path,
                    file_type,
                    file_size,
                    owner_id
                )
                VALUES (
                    'Test Asset ' || i || ' - ' ||
                    CASE (i % 5)
                        WHEN 0 THEN 'Financial Report'
                        WHEN 1 THEN 'Strategic Plan'  
                        WHEN 2 THEN 'Board Minutes'
                        WHEN 3 THEN 'Audit Report'
                        ELSE 'Governance Doc'
                    END,
                    '/test-assets/voice-test-' || i || '.pdf',
                    'pdf',
                    (random() * 1000000)::bigint + 50000,
                    test_user_id
                );
                
                -- Update optional fields if they exist
                IF 'organization_id' = ANY(assets_columns) THEN
                    EXECUTE 'UPDATE assets SET organization_id = $1 WHERE title LIKE $2'
                    USING test_org_id, 'Test Asset ' || i || '%';
                END IF;
                
                IF 'description' = ANY(assets_columns) THEN
                    EXECUTE 'UPDATE assets SET description = $1 WHERE title LIKE $2'
                    USING 'Searchable test content for voice input - ' || i, 'Test Asset ' || i || '%';
                END IF;
                
                IF 'file_name' = ANY(assets_columns) THEN
                    EXECUTE 'UPDATE assets SET file_name = $1 WHERE title LIKE $2'
                    USING 'test-asset-' || i || '.pdf', 'Test Asset ' || i || '%';
                END IF;
                
                IF 'original_file_name' = ANY(assets_columns) THEN
                    EXECUTE 'UPDATE assets SET original_file_name = $1 WHERE title LIKE $2'
                    USING 'Test_Asset_' || i || '.pdf', 'Test Asset ' || i || '%';
                END IF;
                
                IF 'mime_type' = ANY(assets_columns) THEN
                    EXECUTE 'UPDATE assets SET mime_type = $1 WHERE title LIKE $2'
                    USING 'application/pdf', 'Test Asset ' || i || '%';
                END IF;
                
                assets_created := assets_created + 1;
            END IF;
        END LOOP;
        
        RAISE NOTICE 'Created % assets', assets_created;
    ELSE
        RAISE NOTICE 'Assets table not found - skipping asset creation';
    END IF;

    -- =====================================================
    -- STEP 7: CREATE TEST MEETINGS (IF TABLE EXISTS)
    -- =====================================================
    
    IF array_length(meetings_columns, 1) > 0 THEN
        RAISE NOTICE 'Creating test meetings...';
        
        FOR i IN 1..5 LOOP
            IF 'title' = ANY(meetings_columns) AND 'organization_id' = ANY(meetings_columns) AND 'created_by' = ANY(meetings_columns) THEN
                
                INSERT INTO meetings (
                    title,
                    organization_id,
                    created_by
                )
                VALUES (
                    CASE i
                        WHEN 1 THEN 'Q4 Board Meeting'
                        WHEN 2 THEN 'Strategic Planning Session'
                        WHEN 3 THEN 'Audit Committee Review'
                        WHEN 4 THEN 'Emergency Board Meeting'
                        ELSE 'Governance Workshop'
                    END,
                    test_org_id,
                    test_user_id
                );
                
                meetings_created := meetings_created + 1;
            END IF;
        END LOOP;
        
        RAISE NOTICE 'Created % meetings', meetings_created;
    ELSE
        RAISE NOTICE 'Meetings table not found - skipping meeting creation';
    END IF;

    -- =====================================================
    -- STEP 8: CREATE TEST DOCUMENTS (IF TABLE EXISTS)
    -- =====================================================
    
    IF array_length(documents_columns, 1) > 0 THEN
        RAISE NOTICE 'Creating test documents...';
        
        FOR i IN 1..15 LOOP
            IF 'title' = ANY(documents_columns) AND 'organization_id' = ANY(documents_columns) AND 'created_by' = ANY(documents_columns) THEN
                
                INSERT INTO documents (
                    title,
                    organization_id,
                    created_by
                )
                VALUES (
                    'Test Document ' || i || ' - ' ||
                    CASE (i % 4)
                        WHEN 0 THEN 'Financial Analysis'
                        WHEN 1 THEN 'Strategic Report'
                        WHEN 2 THEN 'Board Resolution'
                        ELSE 'Policy Document'
                    END,
                    test_org_id,
                    test_user_id
                );
                
                -- Add content if column exists
                IF 'content' = ANY(documents_columns) THEN
                    EXECUTE 'UPDATE documents SET content = $1 WHERE title LIKE $2'
                    USING 'Comprehensive searchable content for voice input testing. Contains financial data, strategic planning information, governance policies, board meeting minutes, audit findings, compliance requirements, and risk assessments. Keywords: board meetings, financial reports, strategic planning, governance, audit committee.', 'Test Document ' || i || '%';
                END IF;
                
                documents_created := documents_created + 1;
            END IF;
        END LOOP;
        
        RAISE NOTICE 'Created % documents', documents_created;
    ELSE
        RAISE NOTICE 'Documents table not found - skipping document creation';
    END IF;

    -- =====================================================
    -- FINAL SUCCESS REPORT
    -- =====================================================
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'ADAPTIVE TEST DATA SETUP COMPLETE!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Test Organization: BoardTech Solutions Voice Test';
    RAISE NOTICE 'Organization ID: %', test_org_id;
    RAISE NOTICE 'Test User: test.director@boardguru.ai';
    RAISE NOTICE 'User ID: %', test_user_id;
    RAISE NOTICE '';
    RAISE NOTICE 'Data Created:';
    RAISE NOTICE '- Vaults: %', vaults_created;
    RAISE NOTICE '- Assets: %', assets_created;
    RAISE NOTICE '- Meetings: %', meetings_created;
    RAISE NOTICE '- Documents: %', documents_created;
    RAISE NOTICE '';
    RAISE NOTICE 'You can now test voice input functionality!';
    RAISE NOTICE 'Login with: test.director@boardguru.ai';
    RAISE NOTICE '========================================';
    
EXCEPTION 
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Adaptive setup error: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
END $$;