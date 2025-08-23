-- =====================================================
-- COMPLETE ORGANIZATION SETUP - FIXED VERSION
-- Run this complete script in Supabase SQL Editor
-- Handles all setup including user creation and data
-- =====================================================

-- =====================================================
-- 1. CREATE REQUIRED ENUMS (IF NOT EXISTS)
-- =====================================================

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'director', 'member', 'viewer');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE user_status AS ENUM ('pending', 'approved', 'rejected', 'suspended');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE organization_role AS ENUM ('owner', 'admin', 'member', 'viewer');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE membership_status AS ENUM ('active', 'inactive', 'pending', 'suspended');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'rejected', 'expired', 'revoked');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE vault_category AS ENUM ('quarterly', 'strategic', 'financial', 'compliance', 'annual');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE vault_priority AS ENUM ('high', 'medium', 'low');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE vault_status AS ENUM ('draft', 'active', 'review', 'archived');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- 2. CREATE TEST USER IN AUTH.USERS (IF NOT EXISTS)
-- =====================================================

-- Check if test user exists, if not create it
DO $$
DECLARE
    test_user_exists BOOLEAN := FALSE;
    test_user_id UUID;
BEGIN
    -- Check if test user already exists
    SELECT EXISTS(
        SELECT 1 FROM auth.users WHERE email = 'test.director@appboardguru.com'
    ) INTO test_user_exists;
    
    IF NOT test_user_exists THEN
        RAISE NOTICE 'Creating test.director user in auth.users...';
        
        -- Insert test user into Supabase auth.users table
        INSERT INTO auth.users (
            id,
            aud,
            role,
            email,
            email_confirmed_at,
            phone,
            confirmation_token,
            recovery_token,
            email_change_token_new,
            email_change,
            last_sign_in_at,
            raw_app_meta_data,
            raw_user_meta_data,
            is_super_admin,
            created_at,
            updated_at
        ) VALUES (
            gen_random_uuid(),
            'authenticated',
            'authenticated',
            'test.director@appboardguru.com',
            NOW(),
            NULL,
            '',
            '',
            '',
            '',
            NOW(),
            '{"provider": "email", "providers": ["email"]}',
            '{"full_name": "Test Director", "email": "test.director@appboardguru.com"}',
            false,
            NOW(),
            NOW()
        );
        
        RAISE NOTICE 'Test user created in auth.users';
    ELSE
        RAISE NOTICE 'Test user already exists in auth.users, updating metadata...';
        
        -- Update existing user metadata
        UPDATE auth.users SET
            raw_user_meta_data = '{"full_name": "Test Director", "email": "test.director@appboardguru.com"}',
            email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
            last_sign_in_at = NOW(),
            updated_at = NOW()
        WHERE email = 'test.director@appboardguru.com';
    END IF;
    
    -- Get the test user ID for verification
    SELECT id INTO test_user_id 
    FROM auth.users 
    WHERE email = 'test.director@appboardguru.com';
    
    RAISE NOTICE 'Test user ID: %', test_user_id;
END $$;

-- =====================================================
-- 3. CREATE/UPDATE USER PROFILE
-- =====================================================

-- Insert or update user profile in users table
INSERT INTO users (
    id,
    email,
    full_name,
    role,
    status,
    company,
    position,
    approved_by,
    approved_at,
    created_at,
    updated_at
)
SELECT 
    auth.users.id,
    'test.director@appboardguru.com',
    'Test Director',
    'director'::user_role,
    'approved'::user_status,
    'AppBoardGuru Test Company',
    'Director of Testing',
    auth.users.id, -- Self-approved for testing
    NOW(),
    NOW(),
    NOW()
FROM auth.users 
WHERE email = 'test.director@appboardguru.com'
ON CONFLICT (id) DO UPDATE SET
    full_name = 'Test Director',
    role = 'director'::user_role,
    status = 'approved'::user_status,
    company = 'AppBoardGuru Test Company',
    position = 'Director of Testing',
    approved_at = COALESCE(users.approved_at, NOW()),
    updated_at = NOW();

-- =====================================================
-- 4. CREATE 10 SYNTHETIC ORGANIZATIONS
-- =====================================================

DO $$
DECLARE
    director_user_id UUID;
    org_data RECORD;
    org_id UUID;
    i INTEGER;
    org_names TEXT[] := ARRAY[
        'BoardTech Solutions',
        'Executive Analytics Corp', 
        'Strategic Governance Inc',
        'Digital Board Partners',
        'Corporate Insights Ltd',
        'Modern Governance Co',
        'Board Excellence Group',
        'Future Directors Alliance',
        'Smart Governance Systems',
        'Executive Leadership Hub'
    ];
    org_slugs TEXT[] := ARRAY[
        'boardtech-solutions',
        'executive-analytics-corp',
        'strategic-governance-inc', 
        'digital-board-partners',
        'corporate-insights-ltd',
        'modern-governance-co',
        'board-excellence-group',
        'future-directors-alliance',
        'smart-governance-systems',
        'executive-leadership-hub'
    ];
    org_descriptions TEXT[] := ARRAY[
        'Leading provider of board management technology solutions for modern enterprises.',
        'Data-driven insights and analytics platform for executive decision making.',
        'Strategic consulting firm specializing in corporate governance best practices.',
        'Digital transformation partners for board rooms and executive teams.',
        'Corporate intelligence and insights for informed business decisions.',
        'Modern governance solutions for contemporary business challenges.',
        'Excellence-driven board management and governance consulting services.',
        'Alliance of future-focused directors and governance professionals.',
        'Smart technology systems for streamlined governance processes.',
        'Central hub for executive leadership development and resources.'
    ];
    industries TEXT[] := ARRAY['Technology', 'Healthcare', 'Finance', 'Education', 'Manufacturing', 'Retail', 'Consulting', 'Real Estate'];
    sizes TEXT[] := ARRAY['startup', 'small', 'medium', 'large', 'enterprise'];
    feature_plans TEXT[] := ARRAY['basic', 'professional', 'enterprise'];
BEGIN
    -- Get director user ID
    SELECT id INTO director_user_id 
    FROM auth.users 
    WHERE email = 'test.director@appboardguru.com';
    
    IF director_user_id IS NULL THEN
        RAISE EXCEPTION 'test.director user not found after creation attempt!';
    END IF;
    
    RAISE NOTICE 'Creating 10 synthetic organizations for test.director (ID: %)', director_user_id;
    
    -- Create 10 organizations
    FOR i IN 1..10 LOOP
        -- Insert organization (using INSERT ... ON CONFLICT for safety)
        INSERT INTO organizations (
            id,
            name,
            slug,
            description,
            website,
            industry,
            organization_size,
            created_by,
            is_active,
            created_at,
            updated_at
        ) VALUES (
            gen_random_uuid(),
            org_names[i],
            org_slugs[i],
            org_descriptions[i],
            'https://' || org_slugs[i] || '.com',
            industries[((i-1) % array_length(industries, 1)) + 1],
            sizes[((i-1) % array_length(sizes, 1)) + 1],
            director_user_id,
            true,
            NOW() - (i * INTERVAL '7 days'), -- Spread creation dates
            NOW() - (i * INTERVAL '3 days')
        ) 
        ON CONFLICT (slug) DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            updated_at = NOW()
        RETURNING id INTO org_id;
        
        -- If ON CONFLICT triggered, get the existing org_id
        IF org_id IS NULL THEN
            SELECT id INTO org_id FROM organizations WHERE slug = org_slugs[i];
        END IF;
        
        -- Add director as owner of organization (handle conflict)
        INSERT INTO organization_members (
            id,
            organization_id,
            user_id,
            role,
            invited_by,
            joined_at,
            last_accessed,
            status,
            is_primary,
            access_count
        ) VALUES (
            gen_random_uuid(),
            org_id,
            director_user_id,
            'owner'::organization_role,
            director_user_id,
            NOW() - (i * INTERVAL '7 days'),
            NOW() - (RANDOM() * INTERVAL '24 hours'),
            'active'::membership_status,
            i = 1, -- First org is primary
            FLOOR(RANDOM() * 100 + 10)::INTEGER
        )
        ON CONFLICT (organization_id, user_id) DO UPDATE SET
            role = 'owner'::organization_role,
            status = 'active'::membership_status,
            is_primary = EXCLUDED.is_primary,
            last_accessed = NOW();
        
        -- Create organization features (handle conflict by using org_id as key)
        INSERT INTO organization_features (
            organization_id,
            plan_type,
            max_storage_gb,
            current_storage_gb,
            max_board_packs,
            current_board_packs,
            max_file_size_mb,
            ai_summarization,
            advanced_permissions,
            sso_enabled,
            api_access,
            audit_logs,
            white_label,
            updated_at
        ) VALUES (
            org_id,
            feature_plans[((i-1) % 3) + 1], -- Cycle through plans
            CASE 
                WHEN i <= 3 THEN 50   -- Basic: 50GB
                WHEN i <= 7 THEN 200  -- Professional: 200GB  
                ELSE 1000             -- Enterprise: 1TB
            END,
            FLOOR(RANDOM() * 20 + 5)::INTEGER, -- 5-25GB used
            CASE 
                WHEN i <= 3 THEN 100
                WHEN i <= 7 THEN 500
                ELSE 2000
            END,
            FLOOR(RANDOM() * 20 + 5)::INTEGER, -- 5-25 board packs
            CASE 
                WHEN i <= 3 THEN 100  -- Basic: 100MB
                WHEN i <= 7 THEN 500  -- Professional: 500MB
                ELSE 2000             -- Enterprise: 2GB
            END,
            i > 3,  -- AI features for professional+ plans
            i > 3,  -- Advanced permissions for professional+ plans
            i > 7,  -- SSO only for enterprise plans
            i > 3,  -- API access for professional+ plans
            true,   -- Audit logs for all
            i > 7,  -- White label only for enterprise
            NOW()
        )
        ON CONFLICT (organization_id) DO UPDATE SET
            plan_type = EXCLUDED.plan_type,
            max_storage_gb = EXCLUDED.max_storage_gb,
            current_storage_gb = EXCLUDED.current_storage_gb,
            ai_summarization = EXCLUDED.ai_summarization,
            advanced_permissions = EXCLUDED.advanced_permissions,
            updated_at = NOW();
        
        RAISE NOTICE 'Created organization %: % (ID: %)', i, org_names[i], org_id;
    END LOOP;
    
    RAISE NOTICE 'Successfully created/updated 10 organizations with features and memberships!';
END $$;

-- =====================================================
-- 5. CREATE ADDITIONAL TEST USERS AND ADD TO ORGS
-- =====================================================

DO $$
DECLARE
    director_user_id UUID;
    org_record RECORD;
    member_emails TEXT[] := ARRAY[
        'sarah.chen@boardtech.com',
        'michael.rodriguez@analytics.com',
        'jennifer.williams@governance.com',
        'david.thompson@digital.com',
        'lisa.anderson@insights.com',
        'robert.taylor@modern.com',
        'emily.davis@excellence.com',
        'james.wilson@future.com',
        'maria.garcia@smart.com',
        'christopher.brown@leadership.com'
    ];
    member_names TEXT[] := ARRAY[
        'Sarah Chen',
        'Michael Rodriguez', 
        'Jennifer Williams',
        'David Thompson',
        'Lisa Anderson',
        'Robert Taylor',
        'Emily Davis',
        'James Wilson',
        'Maria Garcia',
        'Christopher Brown'
    ];
    roles organization_role[] := ARRAY['admin'::organization_role, 'member'::organization_role, 'viewer'::organization_role];
    member_user_id UUID;
    i INTEGER := 1;
BEGIN
    -- Get director user ID
    SELECT id INTO director_user_id 
    FROM auth.users 
    WHERE email = 'test.director@appboardguru.com';
    
    -- Create additional auth users (handle conflicts)
    FOR i IN 1..10 LOOP
        INSERT INTO auth.users (
            id,
            aud,
            role,
            email,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at
        ) VALUES (
            gen_random_uuid(),
            'authenticated',
            'authenticated',
            member_emails[i],
            NOW() - (RANDOM() * INTERVAL '30 days'),
            '{"provider": "email", "providers": ["email"]}',
            json_build_object('full_name', member_names[i], 'email', member_emails[i]),
            NOW() - (RANDOM() * INTERVAL '90 days'),
            NOW() - (RANDOM() * INTERVAL '7 days')
        )
        ON CONFLICT (email) DO UPDATE SET
            raw_user_meta_data = EXCLUDED.raw_user_meta_data,
            updated_at = NOW();
        
        -- Get the user ID
        SELECT id INTO member_user_id FROM auth.users WHERE email = member_emails[i];
        
        -- Create user profile (handle conflicts)
        INSERT INTO users (
            id,
            email,
            full_name,
            role,
            status,
            company,
            position,
            created_at,
            updated_at
        ) VALUES (
            member_user_id,
            member_emails[i],
            member_names[i],
            CASE 
                WHEN i <= 3 THEN 'admin'::user_role
                WHEN i <= 7 THEN 'member'::user_role
                ELSE 'viewer'::user_role
            END,
            'approved'::user_status,
            'BoardTech Partner Company ' || i,
            CASE 
                WHEN i <= 3 THEN 'Senior Manager'
                WHEN i <= 7 THEN 'Team Lead'
                ELSE 'Analyst'
            END,
            NOW() - (RANDOM() * INTERVAL '90 days'),
            NOW() - (RANDOM() * INTERVAL '7 days')
        )
        ON CONFLICT (id) DO UPDATE SET
            full_name = EXCLUDED.full_name,
            updated_at = NOW();
        
        RAISE NOTICE 'Created/updated user %: %', i, member_names[i];
    END LOOP;
    
    -- Add members to organizations (2-3 members per org)
    FOR org_record IN 
        SELECT id, name, slug FROM organizations 
        WHERE created_by = director_user_id 
        ORDER BY created_at
        LIMIT 10
    LOOP
        -- Add 2-3 random members to each organization
        FOR i IN 1..(2 + FLOOR(RANDOM() * 2)::INTEGER) LOOP
            SELECT id INTO member_user_id 
            FROM auth.users 
            WHERE email = member_emails[(FLOOR(RANDOM() * 10) + 1)::INTEGER]
            AND id != director_user_id
            LIMIT 1;
            
            IF member_user_id IS NOT NULL THEN
                INSERT INTO organization_members (
                    id,
                    organization_id,
                    user_id,
                    role,
                    invited_by,
                    joined_at,
                    last_accessed,
                    status,
                    access_count
                ) VALUES (
                    gen_random_uuid(),
                    org_record.id,
                    member_user_id,
                    roles[(FLOOR(RANDOM() * 3) + 1)::INTEGER],
                    director_user_id,
                    NOW() - (RANDOM() * INTERVAL '60 days'),
                    NOW() - (RANDOM() * INTERVAL '7 days'),
                    'active'::membership_status,
                    FLOOR(RANDOM() * 50 + 5)::INTEGER
                )
                ON CONFLICT (organization_id, user_id) DO NOTHING;
            END IF;
        END LOOP;
        
        RAISE NOTICE 'Added members to organization: %', org_record.name;
    END LOOP;
    
    RAISE NOTICE 'Successfully created additional members and added them to organizations!';
END $$;

-- =====================================================
-- 6. CREATE SAMPLE VAULTS FOR ORGANIZATIONS
-- =====================================================

DO $$
DECLARE
    director_user_id UUID;
    org_record RECORD;
    vault_names TEXT[] := ARRAY[
        'Q4 2024 Board Meeting',
        'Strategic Planning Session',
        'Financial Review Materials',
        'Governance Committee Docs',
        'Risk Assessment Reports',
        'Executive Compensation Review',
        'Merger & Acquisition Analysis',
        'Annual Shareholder Meeting',
        'Audit Committee Materials',
        'Compliance Review Documents'
    ];
    vault_categories vault_category[] := ARRAY['quarterly'::vault_category, 'strategic'::vault_category, 'financial'::vault_category, 'compliance'::vault_category, 'annual'::vault_category];
    vault_id UUID;
    i INTEGER;
BEGIN
    -- Get director user ID
    SELECT id INTO director_user_id 
    FROM auth.users 
    WHERE email = 'test.director@appboardguru.com';
    
    -- Create 2-3 vaults per organization
    FOR org_record IN 
        SELECT id, name, slug FROM organizations 
        WHERE created_by = director_user_id 
        ORDER BY created_at
        LIMIT 10
    LOOP
        FOR i IN 1..(2 + FLOOR(RANDOM() * 2)::INTEGER) LOOP
            INSERT INTO vaults (
                id,
                name,
                description,
                organization_id,
                created_by,
                category,
                priority,
                status,
                meeting_date,
                location,
                asset_count,
                member_count,
                created_at,
                updated_at
            ) VALUES (
                gen_random_uuid(),
                vault_names[(FLOOR(RANDOM() * 10) + 1)::INTEGER] || ' - ' || org_record.name,
                'Board materials and documents for ' || org_record.name,
                org_record.id,
                director_user_id,
                vault_categories[(FLOOR(RANDOM() * 5) + 1)::INTEGER],
                CASE FLOOR(RANDOM() * 3)
                    WHEN 0 THEN 'high'::vault_priority
                    WHEN 1 THEN 'medium'::vault_priority
                    ELSE 'low'::vault_priority
                END,
                CASE FLOOR(RANDOM() * 4)
                    WHEN 0 THEN 'draft'::vault_status
                    WHEN 1 THEN 'active'::vault_status
                    WHEN 2 THEN 'review'::vault_status
                    ELSE 'archived'::vault_status
                END,
                NOW() + (FLOOR(RANDOM() * 90) + 7) * INTERVAL '1 day', -- Future meeting dates
                'Conference Room ' || chr(65 + FLOOR(RANDOM() * 5)::INTEGER), -- Room A-F
                FLOOR(RANDOM() * 20 + 5)::INTEGER, -- 5-25 assets
                FLOOR(RANDOM() * 8 + 3)::INTEGER,  -- 3-10 members
                NOW() - (RANDOM() * INTERVAL '30 days'),
                NOW() - (RANDOM() * INTERVAL '7 days')
            ) RETURNING id INTO vault_id;
            
            -- Add vault members (director + some org members)
            INSERT INTO vault_members (
                id,
                vault_id,
                organization_id,
                user_id,
                role,
                status,
                joined_at
            ) VALUES (
                gen_random_uuid(),
                vault_id,
                org_record.id,
                director_user_id,
                'owner',
                'active',
                NOW() - (RANDOM() * INTERVAL '30 days')
            );
            
        END LOOP;
        
        RAISE NOTICE 'Created vaults for organization: %', org_record.name;
    END LOOP;
    
    RAISE NOTICE 'Successfully created sample vaults for all organizations!';
END $$;

-- =====================================================
-- 7. FINAL VERIFICATION AND SUMMARY
-- =====================================================

-- Display comprehensive verification
DO $$
DECLARE
    user_count INTEGER;
    org_count INTEGER;
    member_count INTEGER;
    feature_count INTEGER;
    vault_count INTEGER;
    director_user_id UUID;
BEGIN
    -- Get director user ID
    SELECT id INTO director_user_id 
    FROM auth.users 
    WHERE email = 'test.director@appboardguru.com';
    
    -- Count all created entities
    SELECT COUNT(*) INTO user_count FROM users;
    
    SELECT COUNT(*) INTO org_count 
    FROM organizations 
    WHERE created_by = director_user_id;
    
    SELECT COUNT(*) INTO member_count 
    FROM organization_members om
    JOIN organizations o ON om.organization_id = o.id
    WHERE o.created_by = director_user_id;
    
    SELECT COUNT(*) INTO feature_count 
    FROM organization_features of
    JOIN organizations o ON of.organization_id = o.id
    WHERE o.created_by = director_user_id;
    
    SELECT COUNT(*) INTO vault_count 
    FROM vaults v
    JOIN organizations o ON v.organization_id = o.id
    WHERE o.created_by = director_user_id;
    
    RAISE NOTICE '';
    RAISE NOTICE '=== ORGANIZATION SETUP COMPLETE ===';
    RAISE NOTICE 'Director User ID: %', director_user_id;
    RAISE NOTICE 'Total Users: %', user_count;
    RAISE NOTICE 'Organizations Created: %', org_count;
    RAISE NOTICE 'Organization Members: %', member_count;
    RAISE NOTICE 'Organization Features Configured: %', feature_count;
    RAISE NOTICE 'Vaults Created: %', vault_count;
    RAISE NOTICE '';
    RAISE NOTICE 'You can now:';
    RAISE NOTICE '1. Sign in as test.director@appboardguru.com';
    RAISE NOTICE '2. Visit /dashboard/organizations to see your organizations';
    RAISE NOTICE '3. Create new organizations and test the functionality';
    RAISE NOTICE '';
END $$;

-- Show detailed organization summary
SELECT 
    o.name as organization_name,
    o.slug,
    o.industry,
    o.organization_size,
    of.plan_type,
    of.ai_summarization,
    of.advanced_permissions,
    COUNT(DISTINCT om.user_id) as member_count,
    COUNT(DISTINCT v.id) as vault_count,
    o.created_at::date as created_date
FROM organizations o
LEFT JOIN organization_features of ON o.id = of.organization_id
LEFT JOIN organization_members om ON o.id = om.organization_id AND om.status = 'active'
LEFT JOIN vaults v ON o.id = v.organization_id
WHERE o.created_by = (SELECT id FROM auth.users WHERE email = 'test.director@appboardguru.com')
GROUP BY o.id, o.name, o.slug, o.industry, o.organization_size, of.plan_type, of.ai_summarization, of.advanced_permissions, o.created_at
ORDER BY o.created_at;

RAISE NOTICE '';
RAISE NOTICE 'Setup completed successfully! 🎉';
RAISE NOTICE 'Check the query results above for organization details.';