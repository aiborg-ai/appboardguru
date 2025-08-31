# Asset Upload Fixes - Complete Solution

## Issues Identified and Fixed

### 1. ✅ **Missing Supabase Client in Repository**
- **Problem**: AssetRepository was instantiated without the authenticated Supabase client
- **Fix**: Now passes `supabase` client to `new AssetRepository(supabase)`
- **Files**: `/src/app/api/assets/upload/route.ts`, `/src/lib/repositories/asset.repository.enhanced.ts`

### 2. ✅ **Vercel Function Size Limit (4.5MB)**
- **Problem**: Files larger than 4.5MB hit "FUNCTION_PAYLOAD_TOO_LARGE" error on Vercel
- **Fix**: 
  - Changed runtime from Edge to Node.js (`export const runtime = 'nodejs'`)
  - Implemented direct upload to Supabase for files > 4MB
  - Created presigned URL endpoint for large files
- **Files**: `/src/app/api/assets/upload/route.ts`, `/src/app/api/assets/upload-url/route.ts`

### 3. ✅ **Invalid Organization ID Format**
- **Problem**: Frontend sends "org-001" but backend expects UUID
- **Fix**: Added logic to:
  - Detect legacy org IDs (starting with "org-")
  - Look up actual UUID from database
  - Fall back to user's default organization
- **File**: `/src/app/api/assets/upload/route.ts`

### 4. ✅ **Large File Upload Support**
- **Problem**: Files over 4.5MB couldn't be uploaded at all
- **Fix**: Created dual upload system:
  - Files < 4MB: Regular upload through API
  - Files > 4MB: Direct upload to Supabase Storage using presigned URLs
  - Maximum file size now: 100MB
- **Files**: `/src/features/assets/FileUploadDropzone.tsx`, `/src/app/api/assets/upload-url/route.ts`

## How It Works Now

### Small Files (< 4MB)
1. File is sent to `/api/assets/upload`
2. API validates and uploads to Supabase Storage
3. Creates database record
4. Returns success

### Large Files (4MB - 100MB)
1. Frontend requests presigned URL from `/api/assets/upload-url`
2. Frontend uploads directly to Supabase Storage using the URL
3. After upload, creates database record via `/api/assets`
4. No Vercel function size limit!

## Testing Instructions

### Test Small File Upload (< 4MB)
1. Login to the app
2. Go to Dashboard > Assets
3. Upload a file under 4MB
4. Should work normally

### Test Large File Upload (4MB - 100MB)
1. Login to the app
2. Go to Dashboard > Assets
3. Upload a file between 4MB and 100MB
4. Console will show "Using direct upload for large file"
5. File uploads directly to Supabase

## Configuration Required

### Environment Variables
Make sure these are set in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key (optional but recommended)
```

### Supabase Storage
1. Ensure 'assets' bucket exists
2. Run the SQL script: `database/fix-assets-storage-complete.sql`
3. Verify policies allow authenticated uploads

## Deployment Notes

### For Vercel
- Node.js runtime is now used for upload route (not Edge)
- This allows up to 50MB request body (vs 4.5MB for Edge)
- Direct uploads bypass this limit entirely

### For Other Platforms
- Adjust `MAX_FILE_SIZE` in upload route as needed
- Direct upload threshold can be configured

## Error Messages

The system now provides clear error messages:

- **File too large**: "File size (X MB) exceeds 4.5MB limit. Due to Vercel deployment limits, please use files under 4.5MB or contact admin for direct upload link."
- **Invalid org**: "Invalid organization ID. Please select an organization."
- **No bucket**: "Storage bucket 'assets' not found. Please contact administrator."

## Monitoring

Check these logs for debugging:

1. **Browser Console**:
   - "Starting regular upload" - for small files
   - "Using direct upload for large file" - for large files
   - Upload progress and errors

2. **Server Logs**:
   - "Legacy organization ID detected" - when org-XXX format is used
   - "Upload auth context" - shows authentication details
   - "Assets bucket found" - confirms storage is ready

## Known Limitations

1. **Vercel Free Tier**: 4.5MB function payload limit (bypassed with direct upload)
2. **Supabase Free Tier**: 1GB storage limit
3. **Browser Limit**: Some browsers limit file uploads to 2GB

## Future Improvements

1. **Chunked Uploads**: For files > 100MB
2. **Resume Support**: For interrupted uploads
3. **Progress Bar**: More accurate for direct uploads
4. **Compression**: Client-side compression before upload
5. **Batch Uploads**: Optimize multiple file uploads

## Support

If uploads still fail after these fixes:

1. Check browser console for specific errors
2. Verify organization is selected
3. Ensure Supabase project is active
4. Check storage bucket policies
5. Verify environment variables are set correctly

---

**Last Updated**: January 2025
**Status**: All major upload issues resolved