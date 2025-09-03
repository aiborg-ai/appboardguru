# Fix Storage Bucket for Asset Uploads

## Problem
The 'assets' storage bucket doesn't exist, causing upload failures.

## Solution

### Option 1: Via Supabase Dashboard UI (Recommended)

1. **Go to Supabase Dashboard**
   - Navigate to your project at https://app.supabase.com
   - Select your project

2. **Create Storage Bucket**
   - Go to **Storage** in the left sidebar
   - Click **"New bucket"** button
   - Enter these settings:
     - **Name**: `assets`
     - **Public bucket**: ❌ OFF (unchecked)
     - **File size limit**: `52428800` (50MB)
     - **Allowed MIME types**: Leave empty to allow all, or add:
       ```
       application/pdf
       application/msword
       application/vnd.openxmlformats-officedocument.wordprocessingml.document
       application/vnd.ms-excel
       application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
       application/vnd.ms-powerpoint
       application/vnd.openxmlformats-officedocument.presentationml.presentation
       text/plain
       image/jpeg
       image/png
       image/gif
       image/webp
       video/mp4
       application/zip
       ```
   - Click **"Save"**

3. **Configure RLS Policies**
   - After creating the bucket, click on it
   - Go to **"Policies"** tab
   - Click **"New policy"** and add these policies:

   **Policy 1: Allow authenticated users to view**
   - **Name**: `Authenticated users can view assets`
   - **Target roles**: `authenticated`
   - **WITH CHECK expression**:
   ```sql
   true
   ```

   **Policy 2: Allow authenticated users to upload**
   - **Name**: `Authenticated users can upload assets`
   - **Target roles**: `authenticated`
   - **Operation**: `INSERT`
   - **WITH CHECK expression**:
   ```sql
   true
   ```

   **Policy 3: Allow users to update their own files**
   - **Name**: `Users can update own assets`
   - **Target roles**: `authenticated`
   - **Operation**: `UPDATE`
   - **USING expression**:
   ```sql
   (storage.foldername(name))[1] = auth.uid()::text
   ```

   **Policy 4: Allow users to delete their own files**
   - **Name**: `Users can delete own assets`
   - **Target roles**: `authenticated`
   - **Operation**: `DELETE`
   - **USING expression**:
   ```sql
   (storage.foldername(name))[1] = auth.uid()::text
   ```

### Option 2: Via Supabase CLI

If you have Supabase CLI installed:

```bash
# Login to Supabase
supabase login

# Link your project
supabase link --project-ref your-project-ref

# Create bucket
supabase storage create assets --public false --file-size-limit 52428800

# Apply policies
supabase storage policies create assets --authenticated --operation SELECT
supabase storage policies create assets --authenticated --operation INSERT
supabase storage policies create assets --authenticated --operation UPDATE --expression "(storage.foldername(name))[1] = auth.uid()::text"
supabase storage policies create assets --authenticated --operation DELETE --expression "(storage.foldername(name))[1] = auth.uid()::text"
```

### Option 3: Via Supabase Management API

```bash
# Get your project's API URL and service role key from dashboard
curl -X POST 'https://YOUR_PROJECT.supabase.co/storage/v1/bucket' \
  -H "apikey: YOUR_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "assets",
    "name": "assets",
    "public": false,
    "file_size_limit": 52428800
  }'
```

## Verification

After creating the bucket, verify it works:

1. **Check via API**:
   ```
   GET /api/assets/diagnose
   ```
   This should show `storageBucket.status: "pass"`

2. **Test Upload**:
   - Go to your application
   - Try uploading a small PDF or image
   - Check browser console for any errors

## Troubleshooting

If uploads still fail after creating the bucket:

1. **Check RLS is enabled but has policies**:
   - In Storage > Configuration
   - Ensure RLS is enabled for the bucket
   - Ensure policies exist (created above)

2. **Check authentication**:
   - User must be logged in
   - User must belong to an organization

3. **Run diagnostics**:
   ```bash
   curl https://your-app.vercel.app/api/assets/diagnose
   ```

## Common Issues

- **"storage schema does not exist"**: Storage needs to be enabled in your Supabase project
- **"permission denied for schema storage"**: Can't create buckets via SQL, use Dashboard UI
- **"new row violates row-level security"**: RLS policies not configured correctly
- **"Bucket not found"**: Bucket doesn't exist or name mismatch

## Support

If you continue to have issues:
1. Check Supabase Dashboard > Storage > Logs
2. Review browser console errors
3. Run the diagnostic endpoint
4. Check that your Supabase project has storage enabled (it should by default)