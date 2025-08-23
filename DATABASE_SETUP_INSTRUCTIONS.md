# Database Setup Instructions for Upload Functionality

This document provides step-by-step instructions to set up the database tables, API connectors, and test data for the file upload functionality in AppBoardGuru.

## Overview

The upload functionality requires the following database components:
- **Core tables**: users, organizations, organization_members
- **Asset tables**: assets, vaults, vault_members, asset_shares, asset_annotations
- **API endpoints**: `/api/assets/upload` and related endpoints
- **Test data**: 15 realistic assets for testing with user `test.director@appboardguru.com`

## Current Status Check

✅ **Database Schema**: Comprehensive asset management schema exists  
✅ **API Endpoints**: Upload API endpoint exists at `/src/app/api/assets/upload/route.ts`  
✅ **Repository Layer**: AssetRepository and AssetService implemented  
✅ **Test Files**: Complete test suite created  

## Step-by-Step Setup Instructions

### Step 1: Run Core Tables Setup

**File**: `database/setup-scripts/01-core-tables-email-assets.sql`

1. Open Supabase SQL Editor
2. Copy and paste the contents of `01-core-tables-email-assets.sql`
3. Click "Run" to execute
4. Verify success message: "All core tables for email-to-asset functionality have been created!"

**This script creates**:
- `users` table (extends auth.users)
- `organizations` table
- `organization_members` table  
- `assets` table (basic version)
- `email_processing_logs` table
- Row Level Security policies
- Storage buckets (`assets`, `email-assets`)
- Indexes and triggers

### Step 2: Create Test Users and Organization

**File**: `database/setup-scripts/02-test-user-setup.sql`

1. In Supabase SQL Editor, copy and paste the contents of `02-test-user-setup.sql`
2. Click "Run" to execute
3. Verify the test users are created:
   - `test.director@appboardguru.com` (Director, Owner)
   - `admin.user@appboardguru.com` (Admin)
   - `board.member@appboardguru.com` (Member)
4. Verify test organization: "Test Board Organization" (`test-board-org`)

**This script creates**:
- Test users in `auth.users` and `users` tables
- Test organization "Test Board Organization"
- Organization membership relationships
- Proper user roles and permissions

### Step 3: Create Assets and Vaults Tables

**File**: `database/setup-scripts/03-create-assets-and-vaults-tables.sql`

1. In Supabase SQL Editor, copy and paste the contents of `03-create-assets-and-vaults-tables.sql`
2. Click "Run" to execute
3. Verify success message about created tables

**This script creates**:
- `vaults` table for document collections
- `vault_members` table for vault access control
- `asset_shares` table for sharing functionality
- `asset_annotations` table for comments/notes
- Enhanced `assets` table with additional columns:
  - `vault_id` (link to vaults)
  - `version` (version tracking)
  - `public_url` (public access)
  - `metadata` (JSON metadata)
  - `uploaded_by` (uploader reference)
- Comprehensive Row Level Security policies
- Performance indexes
- Helper functions

### Step 4: Create Synthetic Test Data

**File**: `database/setup-scripts/04-synthetic-test-data.sql`

1. In Supabase SQL Editor, copy and paste the contents of `04-synthetic-test-data.sql`
2. Click "Run" to execute
3. Verify the data summary showing:
   - 3 vaults created
   - 15 assets created
   - Asset sharing relationships
   - Comments and annotations

**This script creates**:
- **3 Test Vaults**:
  - "Board Documents" (meeting agendas, minutes, strategic plans)
  - "Financial Reports" (financial statements, budgets, audits)
  - "Legal & Compliance" (policies, contracts, training materials)
  
- **15 Realistic Assets** across different file types:
  - PDFs (meeting minutes, financial statements, policies)
  - Word docs (strategic plans, contracts)
  - Excel sheets (budgets, risk assessments, cash flow)
  - PowerPoint presentations (training materials)

- **Asset Metadata**:
  - Realistic file sizes (1KB to 60MB)
  - View/download statistics
  - Tags and categories
  - Processing status and versions
  - Last accessed timestamps

- **User Interactions**:
  - Asset sharing between users
  - Comments and annotations on documents
  - Different permission levels (view, download, edit)

### Step 5: Verify Database Setup

After running all scripts, verify the setup:

```sql
-- Check vault summary
SELECT 
    v.name as vault_name,
    COUNT(a.id) as asset_count,
    ROUND(SUM(a.file_size)::NUMERIC / 1024 / 1024, 2) as total_size_mb
FROM vaults v
LEFT JOIN assets a ON v.id = a.vault_id AND a.is_deleted = false
WHERE v.organization_id = (SELECT id FROM organizations WHERE slug = 'test-board-org')
GROUP BY v.id, v.name
ORDER BY v.created_at;

-- Check test user assets
SELECT 
    a.title,
    a.category,
    a.file_type,
    v.name as vault_name,
    a.view_count,
    a.download_count
FROM assets a
LEFT JOIN vaults v ON a.vault_id = v.id
LEFT JOIN users u ON a.owner_id = u.id
WHERE u.email = 'test.director@appboardguru.com'
ORDER BY a.created_at DESC
LIMIT 10;
```

## API Endpoint Verification

The upload API is available at `/api/assets/upload` with the following features:

### Endpoint: POST `/api/assets/upload`

**Request Format**: `multipart/form-data`
- `file`: File to upload (max 50MB)
- `title`: Asset title (required)
- `description`: Asset description (optional)
- `category`: Asset category (default: 'general')
- `organizationId`: Organization ID (required)
- `vaultId`: Vault ID (optional)
- `folderPath`: Folder path (default: '/')
- `tags`: Comma-separated tags (optional)

**Security Features**:
- File type validation (documents, images, videos, audio, archives)
- File size limits (50MB max)
- Input sanitization
- Path traversal protection
- Authentication required
- Organization membership validation

**Response Format**:
```json
{
  "success": true,
  "asset": {
    "id": "uuid",
    "title": "Asset Title",
    "fileName": "filename.pdf",
    "fileSize": 1234567,
    "fileType": "pdf",
    "category": "board-documents",
    "createdAt": "2024-08-23T...",
    "owner": {
      "id": "uuid",
      "name": "User Name",
      "email": "user@example.com"
    },
    "organization": { ... },
    "vault": { ... }
  },
  "message": "File uploaded successfully"
}
```

## Test User Credentials

For testing the upload functionality:

- **Primary Test User**: `test.director@appboardguru.com`
  - Role: Director, Organization Owner
  - Access: All vaults and assets
  - Can: Create, upload, manage all assets

- **Secondary Test Users**:
  - `admin.user@appboardguru.com` (Admin role)
  - `board.member@appboardguru.com` (Member role)

## Storage Configuration

The setup creates two Supabase storage buckets:
- `assets`: Main asset storage (private)
- `email-assets`: Email-to-asset storage (private)

Verify storage buckets exist in Supabase Storage dashboard.

## Troubleshooting

### Common Issues

1. **"Test user not found"**: Ensure scripts are run in order (01 → 02 → 03 → 04)
2. **"Permission denied"**: Check Row Level Security policies are created
3. **"Storage bucket not found"**: Verify storage buckets were created in Step 1
4. **"Organization not found"**: Ensure Step 2 completed successfully

### Verification Queries

```sql
-- Check if all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'organizations', 'assets', 'vaults', 'vault_members', 'asset_shares', 'asset_annotations');

-- Check test data counts
SELECT 
    'Users' as entity, COUNT(*) as count FROM users WHERE email LIKE '%appboardguru.com'
UNION ALL
SELECT 'Organizations' as entity, COUNT(*) as count FROM organizations WHERE slug = 'test-board-org'
UNION ALL
SELECT 'Vaults' as entity, COUNT(*) as count FROM vaults
UNION ALL
SELECT 'Assets' as entity, COUNT(*) as count FROM assets WHERE is_deleted = false;

-- Check storage policies
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'storage' AND tablename = 'objects';
```

## Next Steps

After completing the database setup:

1. **Test Upload Functionality**: Use the created test data to verify uploads work
2. **Run Test Suite**: Execute the comprehensive test suite created in `/src/testing/`
3. **Verify Frontend Integration**: Test the FileUploadDropzone component with real data
4. **Performance Testing**: Use the performance tests to verify system handles load

## File Locations

All setup scripts are located in:
- `database/setup-scripts/01-core-tables-email-assets.sql`
- `database/setup-scripts/02-test-user-setup.sql`  
- `database/setup-scripts/03-create-assets-and-vaults-tables.sql`
- `database/setup-scripts/04-synthetic-test-data.sql`

## Summary

This setup provides:
- ✅ Complete database schema for asset management
- ✅ Test organization with 3 users
- ✅ 3 vaults with 15 realistic test assets
- ✅ Asset sharing and annotation examples
- ✅ Full Row Level Security implementation
- ✅ API endpoints for upload functionality
- ✅ Comprehensive test suite for quality assurance

The system is ready for testing the complete upload workflow from UI to database storage.