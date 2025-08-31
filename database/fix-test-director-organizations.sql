-- Fix Test Director Organization Access
-- This script ensures test.director@appboardguru.com has proper organization access
-- Run this in Supabase SQL editor or via psql

BEGIN;

-- Step 1: Get test director user ID
WITH test_director AS (
  SELECT id, email, created_at
  FROM auth.users
  WHERE email = 'test.director@appboardguru.com'
  LIMIT 1
),

-- Step 2: Check if default organizations exist
existing_orgs AS (
  SELECT id, name, slug
  FROM organizations
  WHERE slug IN ('fortune-500-companies', 'tech-startups-inc', 'global-ventures-board')
    AND status = 'active'
),

-- Step 3: Create missing default organizations
created_orgs AS (
  INSERT INTO organizations (
    id,
    name,
    slug,
    description,
    created_by,
    status,
    industry,
    organization_size,
    settings,
    compliance_settings,
    billing_settings,
    created_at,
    updated_at
  )
  SELECT 
    gen_random_uuid(),
    org.name,
    org.slug,
    org.description,
    td.id,
    'active',
    org.industry,
    org.organization_size,
    '{}'::jsonb,
    '{}'::jsonb,
    '{}'::jsonb,
    NOW(),
    NOW()
  FROM test_director td
  CROSS JOIN (
    VALUES 
      ('Fortune 500 Companies', 'fortune-500-companies', 'Leading Fortune 500 companies board management', 'Enterprise', 'enterprise'),
      ('Tech Startups Inc', 'tech-startups-inc', 'Innovative technology startups board', 'Technology', 'startup'),
      ('Global Ventures Board', 'global-ventures-board', 'International venture capital board', 'Finance', 'large')
  ) AS org(name, slug, description, industry, organization_size)
  WHERE NOT EXISTS (
    SELECT 1 FROM existing_orgs eo WHERE eo.slug = org.slug
  )
  RETURNING id, name, slug
),

-- Step 4: Get all organizations (existing + newly created)
all_orgs AS (
  SELECT id, name, slug FROM existing_orgs
  UNION ALL
  SELECT id, name, slug FROM created_orgs
)

-- Step 5: Create memberships for test director
INSERT INTO organization_members (
  id,
  organization_id,
  user_id,
  role,
  status,
  joined_at,
  is_primary,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  ao.id,
  td.id,
  'owner',
  'active',
  NOW(),
  CASE WHEN ao.slug = 'fortune-500-companies' THEN true ELSE false END,
  NOW(),
  NOW()
FROM test_director td
CROSS JOIN all_orgs ao
WHERE NOT EXISTS (
  SELECT 1 
  FROM organization_members om
  WHERE om.organization_id = ao.id 
    AND om.user_id = td.id
)
ON CONFLICT DO NOTHING;

-- Step 6: Ensure at least one board exists for each organization
WITH org_boards AS (
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
  )
  SELECT
    gen_random_uuid(),
    ao.id,
    'Main Board',
    'Primary board of directors for ' || ao.name,
    'board_of_directors',
    'active',
    td.id,
    NOW(),
    NOW()
  FROM test_director td
  CROSS JOIN all_orgs ao
  WHERE NOT EXISTS (
    SELECT 1 
    FROM boards b
    WHERE b.organization_id = ao.id
  )
  RETURNING organization_id
)
SELECT COUNT(*) as boards_created FROM org_boards;

-- Step 7: Create sample committees for organizations
INSERT INTO committees (
  id,
  organization_id,
  name,
  description,
  committee_type,
  status,
  created_by,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  ao.id,
  committee.name,
  committee.description,
  committee.committee_type,
  'active',
  td.id,
  NOW(),
  NOW()
FROM test_director td
CROSS JOIN all_orgs ao
CROSS JOIN (
  VALUES 
    ('Audit Committee', 'Oversees financial reporting and compliance', 'audit'),
    ('Compensation Committee', 'Reviews executive compensation and benefits', 'compensation'),
    ('Governance Committee', 'Ensures proper board governance and practices', 'governance')
) AS committee(name, description, committee_type)
WHERE NOT EXISTS (
  SELECT 1 
  FROM committees c
  WHERE c.organization_id = ao.id 
    AND c.committee_type = committee.committee_type
)
ON CONFLICT DO NOTHING;

COMMIT;

-- Verification Query
SELECT 
  o.name as organization_name,
  o.slug as organization_slug,
  o.status as org_status,
  om.role as user_role,
  om.status as membership_status,
  om.is_primary,
  om.joined_at,
  u.email
FROM organizations o
INNER JOIN organization_members om ON om.organization_id = o.id
INNER JOIN auth.users u ON u.id = om.user_id
WHERE u.email = 'test.director@appboardguru.com'
  AND o.status = 'active'
  AND om.status = 'active'
ORDER BY om.is_primary DESC, o.created_at ASC;

-- Summary
DO $$
DECLARE
  v_user_id UUID;
  v_org_count INTEGER;
  v_membership_count INTEGER;
BEGIN
  -- Get user ID
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'test.director@appboardguru.com';
  
  -- Count organizations
  SELECT COUNT(*) INTO v_org_count
  FROM organizations
  WHERE status = 'active';
  
  -- Count memberships
  SELECT COUNT(*) INTO v_membership_count
  FROM organization_members om
  INNER JOIN organizations o ON o.id = om.organization_id
  WHERE om.user_id = v_user_id
    AND om.status = 'active'
    AND o.status = 'active';
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'FIX COMPLETE!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total active organizations: %', v_org_count;
  RAISE NOTICE 'Test director memberships: %', v_membership_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Test director should now see organizations in the application.';
  RAISE NOTICE 'Please log out and log back in to refresh the session.';
END $$;