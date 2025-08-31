# Fix Asset Upload Issue

## Problem
Users are unable to upload documents from the assets page. The upload fails silently or shows an error.

## Root Cause
The Supabase storage bucket named 'assets' either:
1. Does not exist
2. Has incorrect permissions/policies
3. Is not accessible due to authentication issues

## Solution Steps

### Step 1: Run the Storage Bucket Fix Script

1. Open your Supabase Dashboard
2. Go to the SQL Editor
3. Copy and run the SQL script from: `database/fix-assets-storage-bucket.sql`
   
   Or run this SQL directly:
   ```sql
   -- Create the assets storage bucket
   INSERT INTO storage.buckets (id, name, public) 
   VALUES ('assets', 'assets', false)
   ON CONFLICT (id) DO UPDATE SET public = false;
   
   -- Create proper policies
   CREATE POLICY "Authenticated users can upload assets"
   ON storage.objects FOR INSERT
   WITH CHECK (
       bucket_id = 'assets' 
       AND auth.uid() IS NOT NULL
   );
   ```

### Step 2: Verify the Bucket Exists

1. In Supabase Dashboard, go to Storage section
2. You should see a bucket named "assets"
3. If not, create it manually:
   - Click "New Bucket"
   - Name: `assets`
   - Public: `No` (keep it private)

### Step 3: Check Storage Policies

1. In the Storage section, click on the "assets" bucket
2. Go to Policies tab
3. Ensure these policies exist:
   - "Authenticated users can view assets" (SELECT)
   - "Authenticated users can upload assets" (INSERT)
   - "Users can update their own assets" (UPDATE)
   - "Users can delete their own assets" (DELETE)

### Step 4: Test the Upload

1. Start the development server: `npm run dev`
2. Login to the application
3. Navigate to Dashboard > Assets
4. Click "Upload Files"
5. Try uploading a small PDF or image file

### Step 5: Check Console Logs

If upload still fails, check the browser console and server logs:

**Browser Console (F12):**
- Look for network errors in the Network tab
- Check for any red error messages in Console tab

**Server Logs (Terminal):**
Look for messages like:
- "CRITICAL: Assets storage bucket does not exist!"
- "Storage permission error"
- "Supabase storage upload failed"

## Enhanced Error Logging

The code has been updated with better error logging:

1. **Asset Repository** (`src/lib/repositories/asset.repository.enhanced.ts`):
   - Checks if bucket exists before upload
   - Provides detailed error messages
   - Suggests solutions for common errors

2. **Upload API Route** (`src/app/api/assets/upload/route.ts`):
   - Logs all upload attempts with details
   - Returns specific error codes
   - Provides solutions in error responses

## Test Script

Run the test script to diagnose issues:

```bash
node scripts/test-asset-upload.js
```

This will:
- Create a test PDF file
- Attempt to upload it
- Report specific errors with solutions

## Common Issues and Solutions

### Issue 1: "Storage bucket not found"
**Solution:** Run the SQL script to create the bucket

### Issue 2: "Permission denied"
**Solution:** Check that the user is properly authenticated and policies are correct

### Issue 3: "File type not allowed"
**Solution:** Ensure you're uploading supported file types (PDF, DOC, PPT, XLS, images)

### Issue 4: "File too large"
**Solution:** Keep files under 50MB

## Verification Checklist

- [ ] Storage bucket "assets" exists in Supabase
- [ ] Storage policies are properly configured
- [ ] User is authenticated when uploading
- [ ] Organization is selected in the UI
- [ ] File type is supported
- [ ] File size is under 50MB
- [ ] Browser console shows no CORS errors
- [ ] Server logs show successful upload attempts

## Need More Help?

If the issue persists after following these steps:

1. Check the detailed server logs in the terminal
2. Look for specific error codes in the browser network tab
3. Verify your Supabase project URL and keys are correct in `.env.local`
4. Ensure your Supabase project is active and not paused

## Files Modified

- `/database/fix-assets-storage-bucket.sql` - SQL script to fix storage bucket
- `/src/lib/repositories/asset.repository.enhanced.ts` - Added detailed error logging
- `/src/app/api/assets/upload/route.ts` - Enhanced error responses
- `/scripts/test-asset-upload.js` - Test script for diagnostics
- `/FIX_ASSET_UPLOAD_ISSUE.md` - This documentation