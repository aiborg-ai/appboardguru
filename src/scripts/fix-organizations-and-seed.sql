-- Fix Organization Loading and Seed Test Data
-- Run this script in Supabase SQL Editor

-- Step 1: Check if test director exists
DO $$
DECLARE
    director_user_id UUID;
    org_id UUID;
    org_count INTEGER;
BEGIN
    -- Get the test director user ID
    SELECT id INTO director_user_id 
    FROM auth.users 
    WHERE email = 'test.director@appboardguru.com';
    
    IF director_user_id IS NULL THEN
        RAISE NOTICE 'Test director user not found. Please create the user first.';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Found test director user: %', director_user_id;
    
    -- Check existing organizations for this user
    SELECT COUNT(*) INTO org_count
    FROM organization_members om
    WHERE om.user_id = director_user_id;
    
    IF org_count > 0 THEN
        RAISE NOTICE 'User already has % organizations. Skipping seed.', org_count;
        RETURN;
    END IF;
    
    RAISE NOTICE 'Creating organizations for test director...';
    
    -- Create GlobalTech Solutions
    INSERT INTO organizations (
        name, slug, description, website, industry, 
        organization_size, created_by, is_active
    ) VALUES (
        'GlobalTech Solutions',
        'globaltech-solutions',
        'Leading technology solutions provider for enterprise board management.',
        'https://globaltech-solutions.com',
        'Technology',
        'enterprise',
        director_user_id,
        true
    ) RETURNING id INTO org_id;
    
    INSERT INTO organization_members (
        organization_id, user_id, role, status, 
        invited_by, is_primary
    ) VALUES (
        org_id, director_user_id, 'owner', 'active',
        director_user_id, true
    );
    
    -- Create Executive Analytics Corp
    INSERT INTO organizations (
        name, slug, description, website, industry, 
        organization_size, created_by, is_active
    ) VALUES (
        'Executive Analytics Corp',
        'executive-analytics-corp',
        'Data-driven insights and analytics platform for executive decision making.',
        'https://executive-analytics-corp.com',
        'Healthcare',
        'large',
        director_user_id,
        true
    ) RETURNING id INTO org_id;
    
    INSERT INTO organization_members (
        organization_id, user_id, role, status, 
        invited_by, is_primary
    ) VALUES (
        org_id, director_user_id, 'owner', 'active',
        director_user_id, false
    );
    
    -- Create Strategic Governance Inc
    INSERT INTO organizations (
        name, slug, description, website, industry, 
        organization_size, created_by, is_active
    ) VALUES (
        'Strategic Governance Inc',
        'strategic-governance-inc',
        'Strategic consulting firm specializing in corporate governance best practices.',
        'https://strategic-governance-inc.com',
        'Finance',
        'medium',
        director_user_id,
        true
    ) RETURNING id INTO org_id;
    
    INSERT INTO organization_members (
        organization_id, user_id, role, status, 
        invited_by, is_primary
    ) VALUES (
        org_id, director_user_id, 'owner', 'active',
        director_user_id, false
    );
    
    -- Create Digital Transformation Partners
    INSERT INTO organizations (
        name, slug, description, website, industry, 
        organization_size, created_by, is_active
    ) VALUES (
        'Digital Transformation Partners',
        'digital-transformation-partners',
        'Accelerating digital innovation for modern board operations.',
        'https://digital-transformation-partners.com',
        'Consulting',
        'large',
        director_user_id,
        true
    ) RETURNING id INTO org_id;
    
    INSERT INTO organization_members (
        organization_id, user_id, role, status, 
        invited_by, is_primary
    ) VALUES (
        org_id, director_user_id, 'owner', 'active',
        director_user_id, false
    );
    
    -- Create Future Board Solutions
    INSERT INTO organizations (
        name, slug, description, website, industry, 
        organization_size, created_by, is_active
    ) VALUES (
        'Future Board Solutions',
        'future-board-solutions',
        'Next-generation board management platform for agile organizations.',
        'https://future-board-solutions.com',
        'Technology',
        'medium',
        director_user_id,
        true
    ) RETURNING id INTO org_id;
    
    INSERT INTO organization_members (
        organization_id, user_id, role, status, 
        invited_by, is_primary
    ) VALUES (
        org_id, director_user_id, 'owner', 'active',
        director_user_id, false
    );
    
    -- Create Regulatory Compliance Systems
    INSERT INTO organizations (
        name, slug, description, website, industry, 
        organization_size, created_by, is_active
    ) VALUES (
        'Regulatory Compliance Systems',
        'regulatory-compliance-systems',
        'Comprehensive compliance management for board governance.',
        'https://regulatory-compliance-systems.com',
        'Legal',
        'enterprise',
        director_user_id,
        true
    ) RETURNING id INTO org_id;
    
    INSERT INTO organization_members (
        organization_id, user_id, role, status, 
        invited_by, is_primary
    ) VALUES (
        org_id, director_user_id, 'owner', 'active',
        director_user_id, false
    );
    
    -- Create Board Excellence Institute
    INSERT INTO organizations (
        name, slug, description, website, industry, 
        organization_size, created_by, is_active
    ) VALUES (
        'Board Excellence Institute',
        'board-excellence-institute',
        'Training and certification programs for board directors.',
        'https://board-excellence-institute.org',
        'Education',
        'small',
        director_user_id,
        true
    ) RETURNING id INTO org_id;
    
    INSERT INTO organization_members (
        organization_id, user_id, role, status, 
        invited_by, is_primary
    ) VALUES (
        org_id, director_user_id, 'owner', 'active',
        director_user_id, false
    );
    
    -- Create Secure Governance Cloud
    INSERT INTO organizations (
        name, slug, description, website, industry, 
        organization_size, created_by, is_active
    ) VALUES (
        'Secure Governance Cloud',
        'secure-governance-cloud',
        'Cloud-based secure document management for boards.',
        'https://secure-governance-cloud.com',
        'Technology',
        'large',
        director_user_id,
        true
    ) RETURNING id INTO org_id;
    
    INSERT INTO organization_members (
        organization_id, user_id, role, status, 
        invited_by, is_primary
    ) VALUES (
        org_id, director_user_id, 'owner', 'active',
        director_user_id, false
    );
    
    -- Create International Directors Network
    INSERT INTO organizations (
        name, slug, description, website, industry, 
        organization_size, created_by, is_active
    ) VALUES (
        'International Directors Network',
        'international-directors-network',
        'Global network connecting board directors worldwide.',
        'https://international-directors-network.org',
        'Professional Services',
        'enterprise',
        director_user_id,
        true
    ) RETURNING id INTO org_id;
    
    INSERT INTO organization_members (
        organization_id, user_id, role, status, 
        invited_by, is_primary
    ) VALUES (
        org_id, director_user_id, 'owner', 'active',
        director_user_id, false
    );
    
    -- Create Governance Analytics Pro
    INSERT INTO organizations (
        name, slug, description, website, industry, 
        organization_size, created_by, is_active
    ) VALUES (
        'Governance Analytics Pro',
        'governance-analytics-pro',
        'Advanced analytics and reporting for board performance.',
        'https://governance-analytics-pro.com',
        'Analytics',
        'medium',
        director_user_id,
        true
    ) RETURNING id INTO org_id;
    
    INSERT INTO organization_members (
        organization_id, user_id, role, status, 
        invited_by, is_primary
    ) VALUES (
        org_id, director_user_id, 'owner', 'active',
        director_user_id, false
    );
    
    RAISE NOTICE 'Successfully created 10 organizations for test director';
END $$;

-- Step 2: Verify the organizations were created
SELECT 
    o.id,
    o.name,
    o.slug,
    o.industry,
    om.role,
    om.status,
    om.is_primary
FROM organizations o
JOIN organization_members om ON o.id = om.organization_id
WHERE om.user_id = (SELECT id FROM auth.users WHERE email = 'test.director@appboardguru.com')
ORDER BY om.is_primary DESC, o.name;