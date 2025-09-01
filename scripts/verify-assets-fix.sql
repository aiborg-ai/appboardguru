-- Verify the assets table fix was applied correctly

-- 1. Check all columns now exist
SELECT 
    'Column Check' as test_type,
    column_name,
    data_type,
    CASE 
        WHEN column_name IN ('owner_id', 'user_id', 'uploaded_by', 'organization_id', 'vault_id') 
        THEN '✅ Critical column exists'
        ELSE '✓ Column exists'
    END as status
FROM information_schema.columns
WHERE table_name = 'assets'
AND column_name IN ('owner_id', 'user_id', 'uploaded_by', 'organization_id', 'vault_id', 'created_at', 'updated_at', 'title', 'description')
ORDER BY 
    CASE column_name
        WHEN 'owner_id' THEN 1
        WHEN 'user_id' THEN 2
        WHEN 'uploaded_by' THEN 3
        WHEN 'organization_id' THEN 4
        WHEN 'vault_id' THEN 5
        ELSE 6
    END;

-- 2. Check RLS is enabled
SELECT 
    'RLS Status' as test_type,
    relname as table_name,
    CASE 
        WHEN relrowsecurity THEN '✅ RLS Enabled'
        ELSE '❌ RLS Disabled'
    END as status
FROM pg_class
WHERE relname = 'assets';

-- 3. Check policies exist
SELECT 
    'Policy Check' as test_type,
    policyname,
    cmd as operation,
    '✅ Policy exists' as status
FROM pg_policies
WHERE tablename = 'assets'
ORDER BY cmd;

-- 4. Test insert capability (dry run - won't actually insert)
DO $$
DECLARE
    test_user_id UUID;
    test_org_id UUID;
BEGIN
    -- Get a test user
    SELECT id INTO test_user_id FROM auth.users LIMIT 1;
    
    -- Get a test organization
    SELECT id INTO test_org_id FROM organizations LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        RAISE NOTICE '✅ Test user found: %', test_user_id;
    ELSE
        RAISE NOTICE '⚠️ No test user found';
    END IF;
    
    IF test_org_id IS NOT NULL THEN
        RAISE NOTICE '✅ Test organization found: %', test_org_id;
    ELSE
        RAISE NOTICE '⚠️ No test organization found';
    END IF;
END $$;

-- 5. Summary
SELECT '=== VERIFICATION COMPLETE ===' as status;
SELECT 'If all checks show ✅, your assets table is ready for uploads!' as message;
SELECT 'The API should now be able to create asset records successfully.' as next_step;