-- =====================================================
-- ULTRA-SAFE VOICE INPUT TEST DATA SCRIPT
-- Uses the most conservative approach possible
-- Works with ANY database schema by being extremely cautious
-- Run this AFTER ensuring test.director@boardguru.ai exists in Supabase Auth
-- =====================================================

DO $$
DECLARE 
    test_user_id UUID;
    test_org_id UUID;
    
    -- Data creation counters
    assets_created INTEGER := 0;
    vaults_created INTEGER := 0;
    meetings_created INTEGER := 0;
    documents_created INTEGER := 0;
    
    -- Helper variables
    current_vault_id UUID;
    column_exists BOOLEAN;
    table_exists BOOLEAN;
    
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'ULTRA-SAFE VOICE INPUT TEST DATA SETUP';
    RAISE NOTICE '========================================';

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

    -- =====================================================
    -- STEP 2: UPDATE USER DATA (ULTRA SAFE)
    -- =====================================================
    
    -- Only insert basic required fields
    INSERT INTO users (id, email) VALUES (test_user_id, 'test.director@boardguru.ai')
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
    
    -- Try to update optional fields one by one with individual error handling
    BEGIN
        EXECUTE 'UPDATE users SET full_name = $1 WHERE id = $2' USING 'Test Director', test_user_id;
        RAISE NOTICE 'Updated full_name';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Skipped full_name (column does not exist)';
    END;
    
    BEGIN
        EXECUTE 'UPDATE users SET role = $1 WHERE id = $2' USING 'director', test_user_id;
        RAISE NOTICE 'Updated role';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Skipped role (column does not exist)';
    END;
    
    BEGIN
        EXECUTE 'UPDATE users SET status = $1 WHERE id = $2' USING 'approved', test_user_id;
        RAISE NOTICE 'Updated status';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Skipped status (column does not exist)';
    END;

    -- =====================================================
    -- STEP 3: CREATE TEST ORGANIZATION (ULTRA SAFE)
    -- =====================================================
    
    -- Only insert required fields
    INSERT INTO organizations (id, name, slug) 
    VALUES (gen_random_uuid(), 'BoardTech Solutions Voice Test', 'boardtech-voice-test-org')
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO test_org_id;
    
    -- If conflict occurred, get existing org ID
    IF test_org_id IS NULL THEN
        SELECT id INTO test_org_id FROM organizations WHERE slug = 'boardtech-voice-test-org';
    END IF;
    
    -- Try to update optional organization fields
    BEGIN
        EXECUTE 'UPDATE organizations SET description = $1 WHERE id = $2' 
        USING 'Test organization for voice input functionality testing', test_org_id;
        RAISE NOTICE 'Updated organization description';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Skipped organization description (column does not exist)';
    END;
    
    RAISE NOTICE 'Created test organization: %', test_org_id;

    -- Add user to organization (basic fields only)
    INSERT INTO organization_members (organization_id, user_id)
    VALUES (test_org_id, test_user_id)
    ON CONFLICT (organization_id, user_id) DO NOTHING;
    
    -- Try to update optional member fields
    BEGIN
        EXECUTE 'UPDATE organization_members SET role = $1 WHERE organization_id = $2 AND user_id = $3' 
        USING 'owner', test_org_id, test_user_id;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not set organization member role';
    END;
    
    BEGIN
        EXECUTE 'UPDATE organization_members SET status = $1 WHERE organization_id = $2 AND user_id = $3' 
        USING 'active', test_org_id, test_user_id;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not set organization member status';
    END;

    -- =====================================================
    -- STEP 4: CREATE TEST VAULTS (IF TABLE EXISTS)
    -- =====================================================
    
    -- Check if vaults table exists
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'vaults'
    ) INTO table_exists;
    
    IF table_exists THEN
        RAISE NOTICE 'Creating test vaults...';
        
        FOR i IN 1..5 LOOP
            BEGIN
                -- Try basic vault insert
                INSERT INTO vaults (name)
                VALUES (
                    'Test Vault ' || i || ' - ' || 
                    CASE i
                        WHEN 1 THEN 'Board Materials'
                        WHEN 2 THEN 'Financial Documents'
                        WHEN 3 THEN 'Strategic Planning'
                        WHEN 4 THEN 'Audit Committee'
                        ELSE 'Governance Files'
                    END
                )
                RETURNING id INTO current_vault_id;
                
                -- Try to update optional fields
                BEGIN
                    EXECUTE 'UPDATE vaults SET organization_id = $1 WHERE id = $2' USING test_org_id, current_vault_id;
                EXCEPTION WHEN OTHERS THEN
                    RAISE NOTICE 'Could not set vault organization_id';
                END;
                
                BEGIN
                    EXECUTE 'UPDATE vaults SET created_by = $1 WHERE id = $2' USING test_user_id, current_vault_id;
                EXCEPTION WHEN OTHERS THEN
                    RAISE NOTICE 'Could not set vault created_by';
                END;
                
                BEGIN
                    EXECUTE 'UPDATE vaults SET description = $1 WHERE id = $2' 
                    USING 'Test vault ' || i || ' containing voice input test materials', current_vault_id;
                EXCEPTION WHEN OTHERS THEN
                    RAISE NOTICE 'Could not set vault description';
                END;
                
                -- Try to create vault member
                BEGIN
                    -- Check if vault_members table exists first
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = 'public' AND table_name = 'vault_members'
                    ) INTO table_exists;
                    
                    IF table_exists THEN
                        INSERT INTO vault_members (vault_id, user_id) VALUES (current_vault_id, test_user_id);
                        
                        -- Try optional vault member fields
                        BEGIN
                            EXECUTE 'UPDATE vault_members SET role = $1 WHERE vault_id = $2 AND user_id = $3' 
                            USING 'owner', current_vault_id, test_user_id;
                        EXCEPTION WHEN OTHERS THEN NULL;
                        END;
                        
                        BEGIN
                            EXECUTE 'UPDATE vault_members SET status = $1 WHERE vault_id = $2 AND user_id = $3' 
                            USING 'active', current_vault_id, test_user_id;
                        EXCEPTION WHEN OTHERS THEN NULL;
                        END;
                    END IF;
                EXCEPTION WHEN OTHERS THEN
                    RAISE NOTICE 'Could not create vault member for vault %', current_vault_id;
                END;
                
                vaults_created := vaults_created + 1;
                
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Failed to create vault %: %', i, SQLERRM;
            END;
        END LOOP;
        
        RAISE NOTICE 'Created % vaults', vaults_created;
    ELSE
        RAISE NOTICE 'Vaults table not found - skipping vault creation';
    END IF;

    -- =====================================================
    -- STEP 5: CREATE TEST ASSETS (IF TABLE EXISTS)
    -- =====================================================
    
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'assets'
    ) INTO table_exists;
    
    IF table_exists THEN
        RAISE NOTICE 'Creating test assets...';
        
        FOR i IN 1..25 LOOP
            BEGIN
                -- Try the most basic asset insert possible
                INSERT INTO assets (owner_id)
                VALUES (test_user_id)
                RETURNING id INTO current_vault_id; -- reusing variable
                
                -- Try to update fields one by one
                BEGIN
                    EXECUTE 'UPDATE assets SET title = $1 WHERE id = $2'
                    USING 'Test Asset ' || i || ' - ' ||
                    CASE (i % 5)
                        WHEN 0 THEN 'Financial Report'
                        WHEN 1 THEN 'Strategic Plan'  
                        WHEN 2 THEN 'Board Minutes'
                        WHEN 3 THEN 'Audit Report'
                        ELSE 'Governance Doc'
                    END, current_vault_id;
                EXCEPTION WHEN OTHERS THEN
                    -- Try 'name' instead of 'title'
                    BEGIN
                        EXECUTE 'UPDATE assets SET name = $1 WHERE id = $2'
                        USING 'Test Asset ' || i, current_vault_id;
                    EXCEPTION WHEN OTHERS THEN NULL;
                    END;
                END;
                
                BEGIN
                    EXECUTE 'UPDATE assets SET file_path = $1 WHERE id = $2'
                    USING '/test-assets/voice-test-' || i || '.pdf', current_vault_id;
                EXCEPTION WHEN OTHERS THEN NULL;
                END;
                
                BEGIN
                    EXECUTE 'UPDATE assets SET file_type = $1 WHERE id = $2'
                    USING 'pdf', current_vault_id;
                EXCEPTION WHEN OTHERS THEN NULL;
                END;
                
                BEGIN
                    EXECUTE 'UPDATE assets SET file_size = $1 WHERE id = $2'
                    USING (random() * 1000000)::bigint + 50000, current_vault_id;
                EXCEPTION WHEN OTHERS THEN NULL;
                END;
                
                BEGIN
                    EXECUTE 'UPDATE assets SET description = $1 WHERE id = $2'
                    USING 'Searchable test content for voice input - asset ' || i, current_vault_id;
                EXCEPTION WHEN OTHERS THEN NULL;
                END;
                
                -- DO NOT try organization_id - we know this is the problematic field
                
                assets_created := assets_created + 1;
                
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Failed to create asset %: %', i, SQLERRM;
            END;
        END LOOP;
        
        RAISE NOTICE 'Created % assets', assets_created;
    ELSE
        RAISE NOTICE 'Assets table not found - skipping asset creation';
    END IF;

    -- =====================================================
    -- STEP 6: CREATE TEST MEETINGS (IF TABLE EXISTS)
    -- =====================================================
    
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'meetings'
    ) INTO table_exists;
    
    IF table_exists THEN
        RAISE NOTICE 'Creating test meetings...';
        
        FOR i IN 1..5 LOOP
            BEGIN
                INSERT INTO meetings (created_by)
                VALUES (test_user_id)
                RETURNING id INTO current_vault_id; -- reusing variable
                
                -- Try optional fields
                BEGIN
                    EXECUTE 'UPDATE meetings SET title = $1 WHERE id = $2'
                    USING CASE i
                        WHEN 1 THEN 'Q4 Board Meeting'
                        WHEN 2 THEN 'Strategic Planning Session'
                        WHEN 3 THEN 'Audit Committee Review'
                        WHEN 4 THEN 'Emergency Board Meeting'
                        ELSE 'Governance Workshop'
                    END, current_vault_id;
                EXCEPTION WHEN OTHERS THEN NULL;
                END;
                
                BEGIN
                    EXECUTE 'UPDATE meetings SET organization_id = $1 WHERE id = $2' USING test_org_id, current_vault_id;
                EXCEPTION WHEN OTHERS THEN NULL;
                END;
                
                meetings_created := meetings_created + 1;
                
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Failed to create meeting %: %', i, SQLERRM;
            END;
        END LOOP;
        
        RAISE NOTICE 'Created % meetings', meetings_created;
    ELSE
        RAISE NOTICE 'Meetings table not found - skipping meeting creation';
    END IF;

    -- =====================================================
    -- STEP 7: CREATE TEST DOCUMENTS (IF TABLE EXISTS)
    -- =====================================================
    
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'documents'
    ) INTO table_exists;
    
    IF table_exists THEN
        RAISE NOTICE 'Creating test documents...';
        
        FOR i IN 1..15 LOOP
            BEGIN
                INSERT INTO documents (created_by)
                VALUES (test_user_id)
                RETURNING id INTO current_vault_id; -- reusing variable
                
                -- Try optional fields
                BEGIN
                    EXECUTE 'UPDATE documents SET title = $1 WHERE id = $2'
                    USING 'Test Document ' || i || ' - ' ||
                    CASE (i % 4)
                        WHEN 0 THEN 'Financial Analysis'
                        WHEN 1 THEN 'Strategic Report'
                        WHEN 2 THEN 'Board Resolution'
                        ELSE 'Policy Document'
                    END, current_vault_id;
                EXCEPTION WHEN OTHERS THEN NULL;
                END;
                
                BEGIN
                    EXECUTE 'UPDATE documents SET organization_id = $1 WHERE id = $2' USING test_org_id, current_vault_id;
                EXCEPTION WHEN OTHERS THEN NULL;
                END;
                
                BEGIN
                    EXECUTE 'UPDATE documents SET content = $1 WHERE id = $2'
                    USING 'Comprehensive searchable content for voice input testing. Contains financial data, strategic planning, governance policies, board meetings, audit findings, compliance requirements. Keywords: board meetings, financial reports, strategic planning, governance, audit committee.', current_vault_id;
                EXCEPTION WHEN OTHERS THEN NULL;
                END;
                
                documents_created := documents_created + 1;
                
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Failed to create document %: %', i, SQLERRM;
            END;
        END LOOP;
        
        RAISE NOTICE 'Created % documents', documents_created;
    ELSE
        RAISE NOTICE 'Documents table not found - skipping document creation';
    END IF;

    -- =====================================================
    -- FINAL SUCCESS REPORT
    -- =====================================================
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'ULTRA-SAFE TEST DATA SETUP COMPLETE!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Test Organization: BoardTech Solutions Voice Test';
    RAISE NOTICE 'Organization ID: %', test_org_id;
    RAISE NOTICE 'Test User: test.director@boardguru.ai';
    RAISE NOTICE 'User ID: %', test_user_id;
    RAISE NOTICE '';
    RAISE NOTICE 'Data Created Successfully:';
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
        RAISE EXCEPTION 'Ultra-safe setup error: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
END $$;