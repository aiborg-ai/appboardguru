# Voice Input Database Setup Instructions

This guide provides step-by-step instructions to set up the database tables and test data required for the voice input search functionality to work properly.

## Prerequisites

- Access to Supabase SQL Editor
- Admin access to Supabase Auth dashboard
- Understanding of basic SQL operations

## Step-by-Step Setup Instructions

### Step 1: Create the Test User in Supabase Auth

**⚠️ IMPORTANT: This must be done FIRST in the Supabase Auth dashboard**

1. Go to your Supabase project dashboard
2. Navigate to **Authentication > Users**
3. Click **"Add user"** or **"Create new user"**
4. Fill in the details:
   - **Email**: `test.director@appboardguru.com`
   - **Password**: `TestDirector123!`
   - **Email Confirm**: Set to `true` (confirmed)
5. Click **"Create user"**
6. **Copy the user ID (UUID)** - you'll need this for verification

### Step 2: Run Database Setup Script

1. Open **Supabase SQL Editor**
2. Copy the entire contents of `/database/voice-input-test-setup.sql`
3. Paste into a new query
4. Click **"Run"** to execute the script

This script will:
- Create all necessary database tables (users, organizations, meetings, vaults, assets, documents, etc.)
- Set up proper indexes for performance
- Create the `boardmate_profiles` view for the API
- Enable Row Level Security on all tables

### Step 3: Run Test Data Generation Script

1. In **Supabase SQL Editor**, create a new query
2. Copy the entire contents of `/database/voice-input-test-data.sql`
3. Paste into the new query
4. Click **"Run"** to execute the script

This script will:
- Insert the test.director user into the users table
- Create "BoardTech Solutions" organization with 10 additional users
- Generate 10 test meetings with realistic titles and descriptions
- Create 10 test vaults with comprehensive metadata
- Generate 150+ test assets with searchable content
- Create corresponding documents for search functionality
- Set up proper relationships between all entities

### Step 4: Verify Setup

Run these verification queries in the SQL Editor:

```sql
-- 1. Verify the test user exists
SELECT id, email, full_name, role, status 
FROM users 
WHERE email = 'test.director@appboardguru.com';

-- 2. Check organization setup
SELECT o.name, o.slug, COUNT(om.user_id) as member_count
FROM organizations o
LEFT JOIN organization_members om ON o.id = om.organization_id
WHERE o.slug = 'boardtech-solutions'
GROUP BY o.id, o.name, o.slug;

-- 3. Verify meetings data
SELECT COUNT(*) as meeting_count, status
FROM meetings 
GROUP BY status;

-- 4. Check vaults and assets
SELECT v.name, v.status, v.asset_count, COUNT(a.id) as actual_assets
FROM vaults v
LEFT JOIN assets a ON v.id = a.vault_id
GROUP BY v.id, v.name, v.status, v.asset_count
ORDER BY v.name;

-- 5. Verify documents for search
SELECT document_type, status, COUNT(*) as doc_count
FROM documents
GROUP BY document_type, status;

-- 6. Test the boardmate_profiles view
SELECT full_name, org_role, 
       jsonb_array_length(board_memberships) as boards,
       jsonb_array_length(vault_memberships) as vaults
FROM boardmate_profiles 
WHERE organization_id = (
    SELECT id FROM organizations WHERE slug = 'boardtech-solutions'
);
```

### Step 5: Test API Endpoints

After setup, test these API endpoints to ensure they work:

```bash
# Test BoardMates API
curl -X GET "https://your-app.vercel.app/api/boardmates?organization_id=YOUR_ORG_ID"

# Test Meetings API  
curl -X GET "https://your-app.vercel.app/api/meetings/MEETING_ID"

# Test Vaults API
curl -X GET "https://your-app.vercel.app/api/vaults?organizationId=YOUR_ORG_ID"

# Test Assets Search API
curl -X GET "https://your-app.vercel.app/api/assets/search?q=financial"

# Test Documents Search API
curl -X GET "https://your-app.vercel.app/api/docs?search=strategic"
```

### Step 6: Test Voice Input Functionality

1. Log in as `test.director@appboardguru.com` with password `TestDirector123!`
2. Navigate to each page that has voice input:
   - **Assets page**: `/dashboard/assets` - Search through 150+ test assets
   - **Meetings page**: `/dashboard/meetings` - Search through 10 test meetings  
   - **BoardMates page**: `/dashboard/boardmates` - Search through 11 test users
   - **Documents page**: `/dashboard/documents` - Search through generated documents
3. Test voice input on each search bar:
   - Click the microphone icon
   - Grant microphone permissions
   - Speak search terms like:
     - "financial reports"
     - "strategic planning" 
     - "board meetings"
     - "Alice Smith"
     - "audit committee"
   - Verify transcription appears in search box
   - Verify search results are filtered correctly

## Data Overview

The test data includes:

### Organizations
- **BoardTech Solutions** (1 organization)

### Users  
- **test.director@appboardguru.com** (Primary test user)
- **10 additional users** with various roles (CFO, CTO, Directors, Managers, etc.)

### Meetings (10 meetings)
- Q4 2024 Board Meeting
- Strategic Planning Workshop  
- Audit Committee Review
- Emergency Board Session
- Technology Roadmap Review
- Annual Shareholder Meeting
- Risk Management Workshop
- Compensation Committee Meeting
- Board Retreat Planning
- Governance Best Practices

### Vaults (10 vaults)
- Q4 2024 Board Materials
- Strategic Planning Documents
- Audit Committee Files
- Technology Roadmap Archive
- Risk Assessment Repository
- Executive Compensation Data
- Annual Shareholder Materials
- Governance Policies Archive
- Emergency Response Documents
- Board Retreat Resources

### Assets (150+ assets)
- Financial reports and summaries
- Strategic planning presentations
- Meeting agendas and minutes
- Risk assessment matrices
- Governance policy documents
- Audit committee charters
- Technology roadmaps
- Compensation analyses
- Market research reports
- Compliance monitoring reports

### Board Structure
- **Main Board**: BoardTech Main Board with 5 members
- **Audit Committee**: 3 members with defined roles

## Voice Search Test Cases

Try these voice commands to test the functionality:

### Assets Search
- "Show me financial documents"
- "Find strategic planning materials" 
- "Search for audit reports"
- "Technology roadmap presentations"

### Meetings Search  
- "Board meetings in December"
- "Strategic planning sessions"
- "Emergency meetings"
- "Quarterly reviews"

### BoardMates Search
- "Find Alice Smith"
- "CFO contact information"
- "Technology director"
- "Audit committee members"

### Documents Search
- "Governance policies"
- "Risk assessment documents"
- "Financial controls"
- "Compliance reports"

## Troubleshooting

### Common Issues

1. **"User not found" errors**: Ensure you created the auth user in Step 1
2. **Empty search results**: Verify test data was inserted correctly using the verification queries
3. **Permission denied errors**: Check that Row Level Security policies are properly configured
4. **Voice input not working**: Verify OpenRouter API key is configured in environment variables

### Reset Instructions

To reset the test data:

```sql
-- Remove all test data (run in this order)
DELETE FROM documents WHERE organization_id IN (SELECT id FROM organizations WHERE slug = 'boardtech-solutions');
DELETE FROM assets WHERE organization_id IN (SELECT id FROM organizations WHERE slug = 'boardtech-solutions');
DELETE FROM vault_members WHERE organization_id IN (SELECT id FROM organizations WHERE slug = 'boardtech-solutions');
DELETE FROM vaults WHERE organization_id IN (SELECT id FROM organizations WHERE slug = 'boardtech-solutions');
DELETE FROM meetings WHERE organization_id IN (SELECT id FROM organizations WHERE slug = 'boardtech-solutions');
DELETE FROM committee_members WHERE organization_id IN (SELECT id FROM organizations WHERE slug = 'boardtech-solutions');
DELETE FROM board_members WHERE organization_id IN (SELECT id FROM organizations WHERE slug = 'boardtech-solutions');
DELETE FROM committees WHERE organization_id IN (SELECT id FROM organizations WHERE slug = 'boardtech-solutions');
DELETE FROM boards WHERE organization_id IN (SELECT id FROM organizations WHERE slug = 'boardtech-solutions');
DELETE FROM organization_members WHERE organization_id IN (SELECT id FROM organizations WHERE slug = 'boardtech-solutions');
DELETE FROM organizations WHERE slug = 'boardtech-solutions';
DELETE FROM users WHERE email LIKE '%@boardtech.com' OR email = 'test.director@appboardguru.com';

-- Also delete the auth user manually from Supabase Auth dashboard
```

Then re-run Steps 1-3 to recreate the test data.

## Next Steps

After successful setup:

1. **Run the comprehensive test suite** created for voice input functionality
2. **Test voice input across different browsers** (Chrome, Firefox, Safari)
3. **Verify mobile voice input functionality** on tablets and phones
4. **Monitor API response times** and optimize if needed
5. **Test error scenarios** (no microphone permission, network issues, etc.)

The database setup provides a realistic test environment with sufficient data variety to thoroughly test the voice input search functionality across all pages and components.