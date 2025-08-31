-- Ensure test director has an organization and membership
-- This script creates a default organization for the test director account if it doesn't exist

DO $$
DECLARE
    v_user_id UUID;
    v_org_id UUID;
    v_existing_org_count INTEGER;
BEGIN
    -- Get the test director user ID
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = 'test.director@appboardguru.com'
    LIMIT 1;
    
    -- Check if user exists
    IF v_user_id IS NULL THEN
        RAISE NOTICE 'Test director user not found. Please ensure the user exists.';
        RETURN;
    END IF;
    
    -- Check if user already has organizations
    SELECT COUNT(*) INTO v_existing_org_count
    FROM organization_members om
    JOIN organizations o ON o.id = om.organization_id
    WHERE om.user_id = v_user_id
    AND om.status = 'active'
    AND o.status = 'active';
    
    IF v_existing_org_count > 0 THEN
        RAISE NOTICE 'Test director already has % active organization(s)', v_existing_org_count;
        
        -- Display existing organizations
        FOR v_org_id IN 
            SELECT o.id 
            FROM organization_members om
            JOIN organizations o ON o.id = om.organization_id
            WHERE om.user_id = v_user_id
            AND om.status = 'active'
            AND o.status = 'active'
        LOOP
            RAISE NOTICE 'Existing organization ID: %', v_org_id;
        END LOOP;
    ELSE
        -- Create a default organization for test director
        INSERT INTO organizations (
            id,
            name,
            slug,
            description,
            created_by,
            created_at,
            updated_at,
            status,
            settings,
            industry,
            organization_size
        ) VALUES (
            gen_random_uuid(),
            'Test Director Organization',
            'test-director-org',
            'Default organization for test director account',
            v_user_id,
            NOW(),
            NOW(),
            'active',
            '{}',
            'Technology',
            'medium'
        )
        RETURNING id INTO v_org_id;
        
        -- Create organization membership
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
            v_org_id,
            v_user_id,
            'owner',
            'active',
            NOW(),
            NOW(),
            NOW()
        );
        
        RAISE NOTICE 'Created new organization for test director with ID: %', v_org_id;
        
        -- Also create some sample boards for testing
        INSERT INTO boards (
            id,
            organization_id,
            name,
            description,
            board_type,
            status,
            created_by,
            created_at,
            updated_at
        ) VALUES 
        (
            gen_random_uuid(),
            v_org_id,
            'Main Board',
            'Primary board of directors',
            'board_of_directors',
            'active',
            v_user_id,
            NOW(),
            NOW()
        ),
        (
            gen_random_uuid(),
            v_org_id,
            'Audit Committee',
            'Audit and compliance committee',
            'committee',
            'active',
            v_user_id,
            NOW(),
            NOW()
        );
        
        RAISE NOTICE 'Created sample boards for test director organization';
    END IF;
    
    -- Ensure storage bucket permissions
    -- Note: This needs to be run with appropriate permissions
    -- The 'assets' bucket should allow authenticated users to upload
    
END $$;

-- Verify the setup
SELECT 
    o.id as org_id,
    o.name as org_name,
    o.slug as org_slug,
    o.status as org_status,
    om.role as user_role,
    om.status as membership_status,
    u.email as user_email
FROM organizations o
JOIN organization_members om ON om.organization_id = o.id
JOIN auth.users u ON u.id = om.user_id
WHERE u.email = 'test.director@appboardguru.com'
AND o.status = 'active'
AND om.status = 'active';