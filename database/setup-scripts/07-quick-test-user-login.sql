-- =====================================================
-- QUICK TEST USER LOGIN SETUP
-- Creates a test user with a simple password for immediate testing
-- Password will be: "password123"
-- =====================================================

DO $$
DECLARE
    test_user_id UUID;
    password_hash TEXT := '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'; -- bcrypt hash for "password123"
BEGIN
    -- Get or create test user in auth.users
    SELECT id INTO test_user_id FROM auth.users WHERE email = 'test.director@appboardguru.com';
    
    IF test_user_id IS NULL THEN
        -- Create new user
        test_user_id := gen_random_uuid();
        
        INSERT INTO auth.users (
            id,
            instance_id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            created_at,
            updated_at,
            raw_app_meta_data,
            raw_user_meta_data
        ) VALUES (
            test_user_id,
            '00000000-0000-0000-0000-000000000000',
            'authenticated',
            'authenticated',
            'test.director@appboardguru.com',
            password_hash,
            NOW(),
            NOW(),
            NOW(),
            '{"provider": "email", "providers": ["email"]}',
            '{"full_name": "Test Director", "email": "test.director@appboardguru.com"}'
        );
        
        RAISE NOTICE 'Created new test user in auth.users';
    ELSE
        -- Update existing user with password
        UPDATE auth.users 
        SET encrypted_password = password_hash,
            email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
            updated_at = NOW()
        WHERE id = test_user_id;
        
        RAISE NOTICE 'Updated existing test user password';
    END IF;
    
    -- Ensure user profile exists in public.users
    INSERT INTO public.users (
        id,
        email,
        full_name,
        role,
        status,
        password_set,
        company,
        position,
        approved_by,
        approved_at,
        created_at,
        updated_at
    ) VALUES (
        test_user_id,
        'test.director@appboardguru.com',
        'Test Director',
        'director',
        'approved',
        true, -- Password is now set
        'AppBoardGuru Test Company',
        'Director of Testing',
        test_user_id,
        NOW(),
        NOW(),
        NOW()
    ) ON CONFLICT (id) DO UPDATE SET
        status = 'approved',
        password_set = true,
        updated_at = NOW();
    
    -- Ensure test organization exists
    INSERT INTO organizations (
        id,
        name,
        slug,
        description,
        created_by,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        'Test Board Organization',
        'test-board-org',
        'Test organization for vault creation',
        test_user_id,
        true,
        NOW(),
        NOW()
    ) ON CONFLICT (slug) DO NOTHING;
    
    -- Add user to organization as owner
    INSERT INTO organization_members (
        organization_id,
        user_id,
        role,
        status,
        is_primary,
        joined_at
    )
    SELECT o.id, test_user_id, 'owner', 'active', true, NOW()
    FROM organizations o
    WHERE o.slug = 'test-board-org'
    ON CONFLICT (organization_id, user_id) DO UPDATE SET
        role = 'owner',
        status = 'active',
        is_primary = true;
    
    RAISE NOTICE 'Test user setup complete!';
    RAISE NOTICE 'Email: test.director@appboardguru.com';
    RAISE NOTICE 'Password: password123';
    
END $$;

-- Verify the setup
SELECT 
    'Login credentials ready:' as status,
    au.email,
    au.email_confirmed_at IS NOT NULL as can_login,
    pu.status,
    pu.password_set,
    pu.role
FROM auth.users au
JOIN public.users pu ON au.id = pu.id
WHERE au.email = 'test.director@appboardguru.com';

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== READY TO LOGIN ===';
    RAISE NOTICE 'Go to: /auth/signin';
    RAISE NOTICE 'Email: test.director@appboardguru.com';
    RAISE NOTICE 'Password: password123';
    RAISE NOTICE '=====================';
END $$;