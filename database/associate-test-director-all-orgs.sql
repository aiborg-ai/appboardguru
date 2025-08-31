-- Associate test director with ALL organizations and give owner rights
-- This script makes the test director an owner of every organization in the system

DO $$
DECLARE
    v_user_id UUID;
    v_org RECORD;
    v_membership_count INTEGER := 0;
    v_created_count INTEGER := 0;
    v_updated_count INTEGER := 0;
BEGIN
    -- Get the test director user ID
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = 'test.director@appboardguru.com'
    LIMIT 1;
    
    -- Check if user exists
    IF v_user_id IS NULL THEN
        RAISE NOTICE '❌ Test director user not found. Please ensure the user exists.';
        RETURN;
    END IF;
    
    RAISE NOTICE '✅ Found test director user: %', v_user_id;
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'EXISTING ORGANIZATIONS IN THE SYSTEM:';
    RAISE NOTICE '========================================';
    
    -- Show all existing organizations
    FOR v_org IN 
        SELECT 
            o.id,
            o.name,
            o.slug,
            o.status,
            o.created_at,
            o.industry,
            o.organization_size,
            COUNT(DISTINCT om.user_id) as member_count
        FROM organizations o
        LEFT JOIN organization_members om ON om.organization_id = o.id
        WHERE o.status = 'active'
        GROUP BY o.id, o.name, o.slug, o.status, o.created_at, o.industry, o.organization_size
        ORDER BY o.created_at DESC
    LOOP
        RAISE NOTICE '';
        RAISE NOTICE '📁 Organization: %', v_org.name;
        RAISE NOTICE '   - ID: %', v_org.id;
        RAISE NOTICE '   - Slug: %', v_org.slug;
        RAISE NOTICE '   - Status: %', v_org.status;
        RAISE NOTICE '   - Industry: %', COALESCE(v_org.industry, 'Not specified');
        RAISE NOTICE '   - Size: %', COALESCE(v_org.organization_size, 'Not specified');
        RAISE NOTICE '   - Members: %', v_org.member_count;
        RAISE NOTICE '   - Created: %', v_org.created_at::date;
        
        -- Check if test director is already a member
        IF EXISTS (
            SELECT 1 FROM organization_members 
            WHERE organization_id = v_org.id 
            AND user_id = v_user_id
        ) THEN
            -- Update existing membership to owner if not already
            UPDATE organization_members
            SET 
                role = 'owner',
                status = 'active',
                updated_at = NOW()
            WHERE organization_id = v_org.id 
            AND user_id = v_user_id
            AND (role != 'owner' OR status != 'active');
            
            IF FOUND THEN
                RAISE NOTICE '   ✅ UPDATED membership to OWNER';
                v_updated_count := v_updated_count + 1;
            ELSE
                RAISE NOTICE '   ✓ Already an active owner';
            END IF;
        ELSE
            -- Create new membership as owner
            INSERT INTO organization_members (
                id,
                organization_id,
                user_id,
                role,
                status,
                joined_at,
                created_at,
                updated_at
            ) VALUES (
                gen_random_uuid(),
                v_org.id,
                v_user_id,
                'owner',
                'active',
                NOW(),
                NOW(),
                NOW()
            );
            RAISE NOTICE '   ✅ ADDED as OWNER';
            v_created_count := v_created_count + 1;
        END IF;
        
        v_membership_count := v_membership_count + 1;
    END LOOP;
    
    -- If no organizations exist, create a default one
    IF v_membership_count = 0 THEN
        RAISE NOTICE '';
        RAISE NOTICE '⚠️  No organizations found in the system!';
        RAISE NOTICE 'Creating a default organization...';
        
        INSERT INTO organizations (
            id,
            name,
            slug,
            description,
            created_by,
            created_at,
            updated_at,
            status,
            industry,
            organization_size
        ) VALUES (
            gen_random_uuid(),
            'Default Organization',
            'default-org',
            'Default organization for testing',
            v_user_id,
            NOW(),
            NOW(),
            'active',
            'Technology',
            'medium'
        )
        RETURNING id INTO v_org.id;
        
        -- Create membership
        INSERT INTO organization_members (
            id,
            organization_id,
            user_id,
            role,
            status,
            joined_at,
            created_at,
            updated_at
        ) VALUES (
            gen_random_uuid(),
            v_org.id,
            v_user_id,
            'owner',
            'active',
            NOW(),
            NOW(),
            NOW()
        );
        
        RAISE NOTICE '✅ Created default organization with ID: %', v_org.id;
        v_created_count := 1;
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'SUMMARY:';
    RAISE NOTICE '========================================';
    RAISE NOTICE '📊 Total organizations: %', v_membership_count;
    RAISE NOTICE '✅ New memberships created: %', v_created_count;
    RAISE NOTICE '🔄 Memberships updated: %', v_updated_count;
    RAISE NOTICE '👤 Test director is now OWNER of ALL organizations';
    
END $$;

-- Verify the associations
RAISE NOTICE '';
RAISE NOTICE '========================================';
RAISE NOTICE 'VERIFICATION - Test Director Memberships:';
RAISE NOTICE '========================================';

SELECT 
    o.name as organization_name,
    o.slug,
    o.id as org_id,
    om.role,
    om.status as membership_status,
    o.status as org_status,
    om.joined_at::date as joined_date,
    CASE 
        WHEN o.created_by = u.id THEN 'Yes'
        ELSE 'No'
    END as is_creator
FROM organizations o
JOIN organization_members om ON om.organization_id = o.id
JOIN auth.users u ON u.id = om.user_id
WHERE u.email = 'test.director@appboardguru.com'
ORDER BY om.joined_at DESC;

-- Also show a count summary
SELECT 
    COUNT(*) as total_organizations,
    COUNT(CASE WHEN om.role = 'owner' THEN 1 END) as owner_count,
    COUNT(CASE WHEN om.role = 'admin' THEN 1 END) as admin_count,
    COUNT(CASE WHEN om.role = 'member' THEN 1 END) as member_count,
    COUNT(CASE WHEN om.status = 'active' THEN 1 END) as active_memberships
FROM organization_members om
JOIN auth.users u ON u.id = om.user_id
WHERE u.email = 'test.director@appboardguru.com';