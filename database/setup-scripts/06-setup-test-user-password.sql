-- =====================================================
-- SET UP TEST USER WITH PASSWORD IN SUPABASE AUTH
-- This script ensures test.director@appboardguru.com can login
-- =====================================================

-- First, let's check what we have
SELECT 'Current test user status:' as info;

SELECT 
    au.email,
    au.email_confirmed_at,
    au.created_at,
    pu.full_name,
    pu.role,
    pu.status,
    pu.password_set
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE au.email = 'test.director@appboardguru.com';

-- Update the user's password_set flag to false so they can get a magic link
UPDATE public.users 
SET password_set = false,
    status = 'approved'
WHERE email = 'test.director@appboardguru.com';

-- Also make sure email is confirmed in auth.users
UPDATE auth.users 
SET email_confirmed_at = NOW(),
    confirmed_at = NOW()
WHERE email = 'test.director@appboardguru.com'
AND email_confirmed_at IS NULL;

-- Show final status
SELECT 'Updated test user status:' as info;

SELECT 
    au.email,
    au.email_confirmed_at IS NOT NULL as email_confirmed,
    pu.full_name,
    pu.role,
    pu.status,
    pu.password_set
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE au.email = 'test.director@appboardguru.com';

-- Instructions for user
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== TEST USER SETUP INSTRUCTIONS ===';
    RAISE NOTICE '1. Go to /auth/signin';
    RAISE NOTICE '2. Enter email: test.director@appboardguru.com';
    RAISE NOTICE '3. Click "Get Password Setup Link" (blue button)';
    RAISE NOTICE '4. Check your email for the setup link';
    RAISE NOTICE '5. Set up your password';
    RAISE NOTICE '6. Then try vault creation again';
    RAISE NOTICE '===================================';
END $$;