# Supabase Database Setup Instructions

## Quick Fix for "User profile not found" Error

You're getting this error because the test user doesn't exist in the database. Follow these steps to fix it:

## Step 1: Create Test User in Supabase Authentication

1. **Go to your Supabase Dashboard**
   - Open [https://supabase.com](https://supabase.com)
   - Sign in and select your project

2. **Navigate to Authentication**
   - Click on "Authentication" in the left sidebar
   - Click on "Users" tab

3. **Create the Test User**
   - Click the "Invite User" button (or "Add User" / "Create User")
   - Enter these details:
     - **Email**: `test.director@appboardguru.com`
     - **Password**: `TestDirector123!`
   - Click "Send Invitation" or "Create User"

4. **Confirm the User** (if needed)
   - If the user shows as "Waiting for verification", click on the user
   - Click "Confirm Email" to bypass email verification

## Step 2: Run the Database Setup Script

1. **Go to SQL Editor**
   - In Supabase Dashboard, click "SQL Editor" in the left sidebar
   - Click "New query"

2. **Copy and Run the Setup Script**
   - Copy the entire contents of `COMPLETE_DATABASE_SETUP.sql`
   - Paste it into the SQL Editor
   - Click "Run" (or press Ctrl+Enter / Cmd+Enter)

3. **Verify Success**
   - You should see success messages like:
     ```
     ✅ User profile created/updated in public.users
     ✅ Test organization created
     ✅ User added as organization owner
     ✅ DATABASE SETUP COMPLETE!
     ```

## Step 3: Test the Login

1. **Go to your application**
   - Open your app (local or deployed)
   - Navigate to the sign-in page

2. **Login with Test Credentials**
   - **Email**: `test.director@appboardguru.com`
   - **Password**: `TestDirector123!`

3. **You should now be able to login successfully!**

## What the Setup Script Does

The `COMPLETE_DATABASE_SETUP.sql` script:

1. **Creates all required tables**:
   - users (profile data)
   - organizations
   - organization_members
   - vaults (document storage)
   - assets (files)
   - boards & committees
   - meetings
   - notifications
   - activity_logs

2. **Sets up Row Level Security (RLS)**:
   - Ensures users can only see their own data
   - Implements organization-based access control

3. **Creates test data**:
   - User profile for test.director@appboardguru.com
   - Test Board Organization
   - 3 Document Vaults
   - 3 Sample Assets/Documents
   - 2 Scheduled Meetings
   - Sample notifications

## Alternative: Quick Fix Only

If you just want to fix the login error without all the test data, run this minimal SQL:

```sql
-- Get the user ID from auth.users
DO $$
DECLARE
    test_user_id UUID;
BEGIN
    SELECT id INTO test_user_id 
    FROM auth.users 
    WHERE email = 'test.director@appboardguru.com';

    IF test_user_id IS NOT NULL THEN
        -- Create user profile
        INSERT INTO public.users (
            id, email, full_name, role, status, password_set
        ) VALUES (
            test_user_id,
            'test.director@appboardguru.com',
            'Test Director',
            'director',
            'approved',
            true
        ) ON CONFLICT (id) DO UPDATE SET
            status = 'approved',
            password_set = true;
            
        RAISE NOTICE 'User profile created successfully!';
    ELSE
        RAISE NOTICE 'Please create the user in Supabase Auth first!';
    END IF;
END $$;
```

## Troubleshooting

### Error: "User not found in auth.users"
- You need to create the user in Supabase Authentication first (Step 1)
- Make sure the email is exactly: `test.director@appboardguru.com`

### Error: "Permission denied for table users"
- Make sure you're running the SQL as an admin/service role
- Check that RLS policies are properly created

### Error: "Duplicate key value violates unique constraint"
- The data already exists, this is fine
- The script uses "ON CONFLICT" to handle this

### Still can't login?
1. Check the user exists in Authentication > Users
2. Verify the user is confirmed (not pending)
3. Run this SQL to check:
   ```sql
   SELECT * FROM auth.users WHERE email = 'test.director@appboardguru.com';
   SELECT * FROM public.users WHERE email = 'test.director@appboardguru.com';
   ```

## Need Help?

If you're still having issues:
1. Check the Supabase logs (Dashboard > Logs > API)
2. Verify your environment variables are correct
3. Make sure the database URL and keys match your Supabase project

## Summary

1. **Create user** in Supabase Auth: `test.director@appboardguru.com` / `TestDirector123!`
2. **Run the SQL script** in SQL Editor: `COMPLETE_DATABASE_SETUP.sql`
3. **Login** and enjoy the fully configured test environment!

The test account will have access to:
- Full board director permissions
- Sample organization with test data
- Document vaults with sample files
- Scheduled meetings and notifications
- All premium features enabled