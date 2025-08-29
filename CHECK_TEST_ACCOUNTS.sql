-- =====================================================
-- Quick check for all test accounts
-- =====================================================

-- Check which test accounts exist in auth.users
SELECT 
    '=== AUTH.USERS CHECK ===' as status;

SELECT 
    email,
    id,
    created_at,
    CASE 
        WHEN email_confirmed_at IS NOT NULL THEN 'Confirmed'
        ELSE 'Not Confirmed'
    END as email_status,
    last_sign_in_at
FROM auth.users 
WHERE email IN (
    'test.director@boardguru.ai',
    'test.director@appboardguru.com'
)
ORDER BY email;

-- Check which test accounts have profiles
SELECT 
    '=== PUBLIC.USERS PROFILES ===' as status;

SELECT 
    email,
    full_name,
    role,
    status,
    password_set,
    company,
    created_at
FROM public.users 
WHERE email IN (
    'test.director@boardguru.ai',
    'test.director@appboardguru.com'
)
ORDER BY email;

-- Check organization memberships
SELECT 
    '=== ORGANIZATION MEMBERSHIPS ===' as status;

SELECT 
    u.email,
    o.name as organization,
    o.slug as org_slug,
    om.role as member_role,
    om.status as membership_status,
    om.is_primary
FROM auth.users u
LEFT JOIN organization_members om ON u.id = om.user_id
LEFT JOIN organizations o ON om.organization_id = o.id
WHERE u.email IN (
    'test.director@boardguru.ai',
    'test.director@appboardguru.com'
)
ORDER BY u.email;

-- Summary
SELECT 
    '=== SUMMARY ===' as status;

SELECT 
    email,
    CASE 
        WHEN au.id IS NOT NULL AND pu.id IS NOT NULL AND om.user_id IS NOT NULL 
        THEN '✅ Fully configured - Ready to login!'
        WHEN au.id IS NOT NULL AND pu.id IS NOT NULL 
        THEN '⚠️ Has profile but no organization'
        WHEN au.id IS NOT NULL 
        THEN '❌ Auth user exists but no profile - Run setup script'
        ELSE '❌ User does not exist in auth - Need to create in Supabase'
    END as account_status
FROM (
    SELECT 'test.director@boardguru.ai' as email
    UNION ALL
    SELECT 'test.director@appboardguru.com'
) emails
LEFT JOIN auth.users au ON emails.email = au.email
LEFT JOIN public.users pu ON au.id = pu.id
LEFT JOIN organization_members om ON au.id = om.user_id
ORDER BY email;