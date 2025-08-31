# Asset Upload Testing Guide

Now that the storage bucket exists, follow these steps to test if uploads are working:

## Manual Testing Steps

### 1. Login to the Application
- Go to http://localhost:3000
- Login with test credentials:
  - Email: `test.director@appboardguru.com`
  - Password: `TestDirector123!`

### 2. Navigate to Assets Page
- Once logged in, go to **Dashboard > Assets**
- Make sure an organization is selected (you should see the org name at the top)
- If no organization is selected, select one from the sidebar

### 3. Test Upload
1. Click the **"Upload Files"** button
2. Select a small test file (PDF, image, or document)
3. The upload dialog should show:
   - File preview
   - Upload progress
   - Success or error message

### 4. Check Results

#### If Upload Succeeds ✅
- File should appear in the assets list
- You should be able to click on it to view details
- Check Supabase Dashboard > Storage > assets bucket to confirm file exists

#### If Upload Fails ❌
Check the following:

**Browser Console (F12 > Console):**
- Look for red error messages
- Check Network tab for failed requests to `/api/assets/upload`

**Common Errors and Solutions:**

| Error | Solution |
|-------|----------|
| "Storage bucket 'assets' not found" | Run the SQL script again |
| "Permission denied" | Check storage policies in Supabase |
| "Organization required" | Select an organization from sidebar |
| "File too large" | Use a file under 50MB |
| "Invalid file type" | Use PDF, DOC, PPT, XLS, or image files |

### 5. Verify in Supabase Dashboard
1. Go to your Supabase Dashboard
2. Navigate to **Storage** section
3. Click on **assets** bucket
4. You should see uploaded files organized by user ID and organization

## Quick Debugging Checklist

- [ ] Dev server is running (`npm run dev`)
- [ ] User is logged in
- [ ] Organization is selected
- [ ] Assets bucket exists in Supabase
- [ ] Storage policies allow authenticated uploads
- [ ] File is under 50MB
- [ ] File type is supported

## Test with cURL

You can also test the API directly (requires auth token):

```bash
# Get auth token from browser (F12 > Application > Cookies > sb-access-token)
AUTH_TOKEN="your-token-here"

# Test upload
curl -X POST http://localhost:3000/api/assets/upload \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -F "file=@test.pdf" \
  -F "title=Test Upload" \
  -F "category=general" \
  -F "organizationId=your-org-id"
```

## Check Server Logs

In the terminal running `npm run dev`, look for:
- "Starting upload with data:" - Shows upload attempt
- "Assets bucket found:" - Confirms bucket exists
- "Upload successful:" - Shows successful upload
- Error messages with detailed information

## Next Steps

If uploads are working:
- ✅ The issue is resolved!
- Test with different file types
- Check that files appear in the assets list

If uploads are still failing:
- Check the specific error message
- Verify all storage policies are in place
- Ensure your Supabase project is active (not paused)
- Check `.env.local` has correct Supabase URL and keys