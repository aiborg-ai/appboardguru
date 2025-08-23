# Organization Features Database & Data Setup Guide

This guide will help you set up all necessary database tables, API connectors, and synthetic test data for the organization features to work properly.

## Current Status Analysis

✅ **Database Tables Available:**
- `organizations` - Main organizations table
- `organization_members` - User-organization relationships  
- `organization_features` - Feature flags per organization
- `organization_invitations` - Pending invitations
- All related tables (vaults, board_packs, etc.) have organization_id columns

✅ **API Routes Available:**
- `/api/organizations` - CRUD operations
- `/api/organizations/[id]/members` - Member management
- `/api/organizations/check-slug` - Slug validation
- All vault and asset APIs support organization context

✅ **Test User Exists:**
- `test.director@appboardguru.com` user is already set up

## Step-by-Step Setup Instructions

### Step 1: Verify Organization Tables Exist

Run this in Supabase SQL Editor to check current schema:

```sql
-- Check if organization tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%organization%'
ORDER BY table_name;

-- Check organization-related columns in other tables
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE column_name LIKE '%organization%' 
AND table_schema = 'public'
ORDER BY table_name, column_name;
```

### Step 2: Create Missing Tables (if needed)

If any organization tables are missing, run this SQL:

```sql
-- Create organizations table (if not exists)
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    website VARCHAR(255),
    industry VARCHAR(100),
    organization_size VARCHAR(20) CHECK (organization_size IN ('startup', 'small', 'medium', 'large', 'enterprise')),
    logo_url VARCHAR(500),
    settings JSONB DEFAULT '{}',
    compliance_settings JSONB DEFAULT '{}',
    billing_settings JSONB DEFAULT '{}',
    created_by UUID NOT NULL REFERENCES auth.users(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    deletion_scheduled_for TIMESTAMPTZ
);

-- Create organization_members table (if not exists)
CREATE TABLE IF NOT EXISTS organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role organization_role NOT NULL DEFAULT 'member',
    status membership_status DEFAULT 'active',
    invited_by UUID REFERENCES auth.users(id),
    approved_by UUID REFERENCES auth.users(id),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    last_accessed TIMESTAMPTZ,
    is_primary BOOLEAN DEFAULT false,
    receive_notifications BOOLEAN DEFAULT true,
    custom_permissions JSONB DEFAULT '{}',
    access_count INTEGER DEFAULT 0,
    invitation_accepted_ip INET,
    last_login_ip INET,
    suspicious_activity_count INTEGER DEFAULT 0,
    UNIQUE(organization_id, user_id)
);

-- Create organization_features table (if not exists)
CREATE TABLE IF NOT EXISTS organization_features (
    organization_id UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
    plan_type VARCHAR(50) DEFAULT 'basic',
    max_storage_gb INTEGER DEFAULT 10,
    current_storage_gb INTEGER DEFAULT 0,
    max_board_packs INTEGER DEFAULT 50,
    current_board_packs INTEGER DEFAULT 0,
    max_file_size_mb INTEGER DEFAULT 100,
    ai_summarization BOOLEAN DEFAULT false,
    advanced_permissions BOOLEAN DEFAULT false,
    sso_enabled BOOLEAN DEFAULT false,
    api_access BOOLEAN DEFAULT false,
    audit_logs BOOLEAN DEFAULT true,
    white_label BOOLEAN DEFAULT false,
    subscription_ends_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create organization_invitations table (if not exists)
CREATE TABLE IF NOT EXISTS organization_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role organization_role NOT NULL DEFAULT 'member',
    invited_by UUID NOT NULL REFERENCES auth.users(id),
    invitation_token VARCHAR(255) UNIQUE NOT NULL,
    email_verification_code VARCHAR(10) NOT NULL,
    personal_message TEXT,
    status invitation_status DEFAULT 'pending',
    token_expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    accepted_by UUID REFERENCES auth.users(id),
    max_attempts INTEGER DEFAULT 3,
    attempt_count INTEGER DEFAULT 0,
    created_ip INET,
    accepted_ip INET,
    device_fingerprint VARCHAR(255)
);

-- Create required enums (if not exists)
DO $$ BEGIN
    CREATE TYPE organization_role AS ENUM ('owner', 'admin', 'member', 'viewer');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE membership_status AS ENUM ('active', 'inactive', 'pending', 'suspended');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'rejected', 'expired', 'revoked');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_created_by ON organizations(created_by);
CREATE INDEX IF NOT EXISTS idx_organizations_active ON organizations(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_role ON organization_members(role);
CREATE INDEX IF NOT EXISTS idx_org_invitations_token ON organization_invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_org_invitations_email ON organization_invitations(email);
CREATE INDEX IF NOT EXISTS idx_org_invitations_org_id ON organization_invitations(organization_id);
```

### Step 3: Create 10 Synthetic Organizations for test.director

Run this SQL to create realistic test data:

```sql
-- Get test.director user ID
DO $$
DECLARE
    director_user_id UUID;
    org_ids UUID[] := ARRAY[]::UUID[];
    feature_plans TEXT[] := ARRAY['basic', 'professional', 'enterprise'];
    industries TEXT[] := ARRAY['Technology', 'Healthcare', 'Finance', 'Education', 'Manufacturing', 'Retail', 'Consulting', 'Real Estate'];
    sizes TEXT[] := ARRAY['startup', 'small', 'medium', 'large', 'enterprise'];
    org_id UUID;
    i INTEGER;
BEGIN
    -- Get director user ID
    SELECT id INTO director_user_id 
    FROM auth.users 
    WHERE email = 'test.director@appboardguru.com';
    
    IF director_user_id IS NULL THEN
        RAISE EXCEPTION 'test.director user not found. Please run 02-test-user-setup.sql first.';
    END IF;
    
    RAISE NOTICE 'Creating 10 synthetic organizations for test.director (ID: %)', director_user_id;
    
    -- Create 10 organizations
    FOR i IN 1..10 LOOP
        INSERT INTO organizations (
            id,
            name,
            slug,
            description,
            website,
            industry,
            organization_size,
            created_by,
            is_active,
            created_at,
            updated_at
        ) VALUES (
            gen_random_uuid(),
            CASE i
                WHEN 1 THEN 'BoardTech Solutions'
                WHEN 2 THEN 'Executive Analytics Corp'
                WHEN 3 THEN 'Strategic Governance Inc'
                WHEN 4 THEN 'Digital Board Partners'
                WHEN 5 THEN 'Corporate Insights Ltd'
                WHEN 6 THEN 'Modern Governance Co'
                WHEN 7 THEN 'Board Excellence Group'
                WHEN 8 THEN 'Future Directors Alliance'
                WHEN 9 THEN 'Smart Governance Systems'
                WHEN 10 THEN 'Executive Leadership Hub'
            END,
            CASE i
                WHEN 1 THEN 'boardtech-solutions'
                WHEN 2 THEN 'executive-analytics-corp'
                WHEN 3 THEN 'strategic-governance-inc'
                WHEN 4 THEN 'digital-board-partners'
                WHEN 5 THEN 'corporate-insights-ltd'
                WHEN 6 THEN 'modern-governance-co'
                WHEN 7 THEN 'board-excellence-group'
                WHEN 8 THEN 'future-directors-alliance'
                WHEN 9 THEN 'smart-governance-systems'
                WHEN 10 THEN 'executive-leadership-hub'
            END,
            CASE i
                WHEN 1 THEN 'Leading provider of board management technology solutions for modern enterprises.'
                WHEN 2 THEN 'Data-driven insights and analytics platform for executive decision making.'
                WHEN 3 THEN 'Strategic consulting firm specializing in corporate governance best practices.'
                WHEN 4 THEN 'Digital transformation partners for board rooms and executive teams.'
                WHEN 5 THEN 'Corporate intelligence and insights for informed business decisions.'
                WHEN 6 THEN 'Modern governance solutions for contemporary business challenges.'
                WHEN 7 THEN 'Excellence-driven board management and governance consulting services.'
                WHEN 8 THEN 'Alliance of future-focused directors and governance professionals.'
                WHEN 9 THEN 'Smart technology systems for streamlined governance processes.'
                WHEN 10 THEN 'Central hub for executive leadership development and resources.'
            END,
            'https://' || CASE i
                WHEN 1 THEN 'boardtech-solutions'
                WHEN 2 THEN 'executive-analytics-corp'  
                WHEN 3 THEN 'strategic-governance-inc'
                WHEN 4 THEN 'digital-board-partners'
                WHEN 5 THEN 'corporate-insights-ltd'
                WHEN 6 THEN 'modern-governance-co'
                WHEN 7 THEN 'board-excellence-group'
                WHEN 8 THEN 'future-directors-alliance'
                WHEN 9 THEN 'smart-governance-systems'
                WHEN 10 THEN 'executive-leadership-hub'
            END || '.com',
            industries[((i-1) % array_length(industries, 1)) + 1],
            sizes[((i-1) % array_length(sizes, 1)) + 1],
            director_user_id,
            true,
            NOW() - (i * INTERVAL '7 days'), -- Spread creation dates over 10 weeks
            NOW() - (i * INTERVAL '3 days')  -- Recent updates
        ) RETURNING id INTO org_id;
        
        org_ids := org_ids || org_id;
        
        -- Add director as owner of each organization
        INSERT INTO organization_members (
            organization_id,
            user_id,
            role,
            invited_by,
            joined_at,
            last_accessed,
            status,
            is_primary,
            access_count
        ) VALUES (
            org_id,
            director_user_id,
            'owner',
            director_user_id,
            NOW() - (i * INTERVAL '7 days'),
            NOW() - (RANDOM() * INTERVAL '24 hours'), -- Recent activity
            'active',
            i = 1, -- First org is primary
            FLOOR(RANDOM() * 100 + 10)::INTEGER -- 10-110 access count
        );
        
        -- Create organization features
        INSERT INTO organization_features (
            organization_id,
            plan_type,
            max_storage_gb,
            current_storage_gb,
            max_board_packs,
            current_board_packs,
            max_file_size_mb,
            ai_summarization,
            advanced_permissions,
            sso_enabled,
            api_access,
            audit_logs,
            white_label
        ) VALUES (
            org_id,
            feature_plans[((i-1) % 3) + 1], -- Cycle through plans
            CASE 
                WHEN i <= 3 THEN 50   -- Basic: 50GB
                WHEN i <= 7 THEN 200  -- Professional: 200GB
                ELSE 1000             -- Enterprise: 1TB
            END,
            FLOOR(RANDOM() * 20 + 5)::INTEGER, -- 5-25GB used
            CASE 
                WHEN i <= 3 THEN 100
                WHEN i <= 7 THEN 500
                ELSE 2000
            END,
            FLOOR(RANDOM() * 20 + 5)::INTEGER, -- 5-25 board packs
            CASE 
                WHEN i <= 3 THEN 100  -- Basic: 100MB
                WHEN i <= 7 THEN 500  -- Professional: 500MB  
                ELSE 2000             -- Enterprise: 2GB
            END,
            i > 3,  -- AI features for professional+ plans
            i > 3,  -- Advanced permissions for professional+ plans
            i > 7,  -- SSO only for enterprise plans
            i > 3,  -- API access for professional+ plans
            true,   -- Audit logs for all
            i > 7   -- White label only for enterprise
        );
        
        RAISE NOTICE 'Created organization %: % (ID: %)', i, 
            CASE i
                WHEN 1 THEN 'BoardTech Solutions'
                WHEN 2 THEN 'Executive Analytics Corp'
                WHEN 3 THEN 'Strategic Governance Inc'
                WHEN 4 THEN 'Digital Board Partners'
                WHEN 5 THEN 'Corporate Insights Ltd'
                WHEN 6 THEN 'Modern Governance Co'
                WHEN 7 THEN 'Board Excellence Group'
                WHEN 8 THEN 'Future Directors Alliance'
                WHEN 9 THEN 'Smart Governance Systems'
                WHEN 10 THEN 'Executive Leadership Hub'
            END,
            org_id;
    END LOOP;
    
    RAISE NOTICE 'Successfully created 10 organizations with features and memberships!';
END $$;
```

### Step 4: Create Additional Members for Organizations

Add more realistic data with multiple members per organization:

```sql
-- Create additional test users and add them to organizations
DO $$
DECLARE
    director_user_id UUID;
    org_record RECORD;
    member_emails TEXT[] := ARRAY[
        'sarah.chen@boardtech.com',
        'michael.rodriguez@analytics.com',
        'jennifer.williams@governance.com',
        'david.thompson@digital.com', 
        'lisa.anderson@insights.com',
        'robert.taylor@modern.com',
        'emily.davis@excellence.com',
        'james.wilson@future.com',
        'maria.garcia@smart.com',
        'christopher.brown@leadership.com'
    ];
    member_names TEXT[] := ARRAY[
        'Sarah Chen',
        'Michael Rodriguez',
        'Jennifer Williams',
        'David Thompson',
        'Lisa Anderson',
        'Robert Taylor',
        'Emily Davis',
        'James Wilson',
        'Maria Garcia',
        'Christopher Brown'
    ];
    roles organization_role[] := ARRAY['admin', 'member', 'viewer'];
    member_user_id UUID;
    i INTEGER := 1;
BEGIN
    -- Get director user ID
    SELECT id INTO director_user_id 
    FROM auth.users 
    WHERE email = 'test.director@appboardguru.com';
    
    -- Create additional auth users
    FOR i IN 1..10 LOOP
        INSERT INTO auth.users (
            id,
            aud,
            role,
            email,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at
        ) VALUES (
            gen_random_uuid(),
            'authenticated',
            'authenticated',
            member_emails[i],
            NOW() - (RANDOM() * INTERVAL '30 days'),
            '{"provider": "email", "providers": ["email"]}',
            json_build_object('full_name', member_names[i], 'email', member_emails[i]),
            NOW() - (RANDOM() * INTERVAL '90 days'),
            NOW() - (RANDOM() * INTERVAL '7 days')
        )
        ON CONFLICT (email) DO NOTHING;
        
        -- Get the created user ID
        SELECT id INTO member_user_id FROM auth.users WHERE email = member_emails[i];
        
        -- Create user profile
        INSERT INTO users (
            id,
            email,
            full_name,
            role,
            status,
            company,
            position,
            created_at,
            updated_at
        ) VALUES (
            member_user_id,
            member_emails[i],
            member_names[i],
            CASE 
                WHEN i <= 3 THEN 'admin'::user_role
                WHEN i <= 7 THEN 'member'::user_role
                ELSE 'viewer'::user_role
            END,
            'approved'::user_status,
            'BoardTech Partner Company ' || i,
            CASE 
                WHEN i <= 3 THEN 'Senior Manager'
                WHEN i <= 7 THEN 'Team Lead'
                ELSE 'Analyst'
            END,
            NOW() - (RANDOM() * INTERVAL '90 days'),
            NOW() - (RANDOM() * INTERVAL '7 days')
        )
        ON CONFLICT (id) DO NOTHING;
        
        RAISE NOTICE 'Created user %: %', i, member_names[i];
    END LOOP;
    
    -- Add members to organizations (2-3 members per org)
    FOR org_record IN 
        SELECT id, name, slug FROM organizations 
        WHERE created_by = director_user_id 
        ORDER BY created_at
    LOOP
        -- Add 2-3 random members to each organization
        FOR i IN 1..(2 + FLOOR(RANDOM() * 2)::INTEGER) LOOP
            SELECT id INTO member_user_id 
            FROM auth.users 
            WHERE email = member_emails[(FLOOR(RANDOM() * 10) + 1)::INTEGER]
            AND id != director_user_id;
            
            INSERT INTO organization_members (
                organization_id,
                user_id,
                role,
                invited_by,
                joined_at,
                last_accessed,
                status,
                access_count
            ) VALUES (
                org_record.id,
                member_user_id,
                roles[(FLOOR(RANDOM() * 3) + 1)::INTEGER],
                director_user_id,
                NOW() - (RANDOM() * INTERVAL '60 days'),
                NOW() - (RANDOM() * INTERVAL '7 days'),
                'active',
                FLOOR(RANDOM() * 50 + 5)::INTEGER
            )
            ON CONFLICT (organization_id, user_id) DO NOTHING;
        END LOOP;
        
        RAISE NOTICE 'Added members to organization: %', org_record.name;
    END LOOP;
    
    RAISE NOTICE 'Successfully created additional members and added them to organizations!';
END $$;
```

### Step 5: Create Sample Vaults for Organizations

Create realistic vault data:

```sql
-- Create sample vaults for each organization
DO $$
DECLARE
    director_user_id UUID;
    org_record RECORD;
    vault_names TEXT[] := ARRAY[
        'Q4 2024 Board Meeting',
        'Strategic Planning Session',
        'Financial Review Materials',
        'Governance Committee Docs',
        'Risk Assessment Reports',
        'Executive Compensation Review',
        'Merger & Acquisition Analysis',
        'Annual Shareholder Meeting',
        'Audit Committee Materials',
        'Compliance Review Documents'
    ];
    vault_categories TEXT[] := ARRAY['quarterly', 'strategic', 'financial', 'compliance', 'annual'];
    vault_id UUID;
    i INTEGER;
BEGIN
    -- Get director user ID
    SELECT id INTO director_user_id 
    FROM auth.users 
    WHERE email = 'test.director@appboardguru.com';
    
    -- Create 2-3 vaults per organization
    FOR org_record IN 
        SELECT id, name, slug FROM organizations 
        WHERE created_by = director_user_id 
        ORDER BY created_at
    LOOP
        FOR i IN 1..(2 + FLOOR(RANDOM() * 2)::INTEGER) LOOP
            INSERT INTO vaults (
                id,
                name,
                description,
                organization_id,
                created_by,
                category,
                priority,
                status,
                meeting_date,
                location,
                asset_count,
                member_count,
                created_at,
                updated_at
            ) VALUES (
                gen_random_uuid(),
                vault_names[(FLOOR(RANDOM() * 10) + 1)::INTEGER] || ' - ' || org_record.name,
                'Board materials and documents for ' || org_record.name,
                org_record.id,
                director_user_id,
                vault_categories[(FLOOR(RANDOM() * 5) + 1)::INTEGER]::vault_category,
                CASE FLOOR(RANDOM() * 3)
                    WHEN 0 THEN 'high'::vault_priority
                    WHEN 1 THEN 'medium'::vault_priority
                    ELSE 'low'::vault_priority
                END,
                CASE FLOOR(RANDOM() * 4)
                    WHEN 0 THEN 'draft'::vault_status
                    WHEN 1 THEN 'active'::vault_status
                    WHEN 2 THEN 'review'::vault_status
                    ELSE 'archived'::vault_status
                END,
                NOW() + (FLOOR(RANDOM() * 90) + 7) * INTERVAL '1 day', -- Future meeting dates
                'Conference Room ' || chr(65 + FLOOR(RANDOM() * 5)::INTEGER), -- Room A-F
                FLOOR(RANDOM() * 20 + 5)::INTEGER, -- 5-25 assets
                FLOOR(RANDOM() * 8 + 3)::INTEGER,  -- 3-10 members
                NOW() - (RANDOM() * INTERVAL '30 days'),
                NOW() - (RANDOM() * INTERVAL '7 days')
            ) RETURNING id INTO vault_id;
            
            -- Add vault members (director + some org members)
            INSERT INTO vault_members (
                vault_id,
                organization_id,
                user_id,
                role,
                status,
                joined_at
            ) VALUES (
                vault_id,
                org_record.id,
                director_user_id,
                'owner',
                'active',
                NOW() - (RANDOM() * INTERVAL '30 days')
            );
            
        END LOOP;
        
        RAISE NOTICE 'Created vaults for organization: %', org_record.name;
    END LOOP;
    
    RAISE NOTICE 'Successfully created sample vaults for all organizations!';
END $$;
```

### Step 6: Verify Setup

Run this final verification query:

```sql
-- Comprehensive verification of organization setup
SELECT 
    'SUMMARY' as type,
    COUNT(*) as count,
    'Organizations created' as description
FROM organizations 
WHERE created_by = (SELECT id FROM auth.users WHERE email = 'test.director@appboardguru.com')

UNION ALL

SELECT 
    'SUMMARY' as type,
    COUNT(*) as count,
    'Organization memberships' as description
FROM organization_members om
JOIN organizations o ON om.organization_id = o.id
WHERE o.created_by = (SELECT id FROM auth.users WHERE email = 'test.director@appboardguru.com')

UNION ALL

SELECT 
    'SUMMARY' as type,
    COUNT(*) as count,
    'Organization features configured' as description
FROM organization_features of
JOIN organizations o ON of.organization_id = o.id
WHERE o.created_by = (SELECT id FROM auth.users WHERE email = 'test.director@appboardguru.com')

UNION ALL

SELECT 
    'SUMMARY' as type,
    COUNT(*) as count,
    'Vaults in organizations' as description
FROM vaults v
JOIN organizations o ON v.organization_id = o.id
WHERE o.created_by = (SELECT id FROM auth.users WHERE email = 'test.director@appboardguru.com');

-- Detailed organization view
SELECT 
    o.name as organization_name,
    o.slug,
    o.industry,
    o.organization_size,
    of.plan_type,
    of.ai_summarization,
    COUNT(DISTINCT om.user_id) as member_count,
    COUNT(DISTINCT v.id) as vault_count,
    o.created_at
FROM organizations o
LEFT JOIN organization_features of ON o.id = of.organization_id
LEFT JOIN organization_members om ON o.id = om.organization_id
LEFT JOIN vaults v ON o.id = v.organization_id
WHERE o.created_by = (SELECT id FROM auth.users WHERE email = 'test.director@appboardguru.com')
GROUP BY o.id, o.name, o.slug, o.industry, o.organization_size, of.plan_type, of.ai_summarization, o.created_at
ORDER BY o.created_at;
```

## API Testing

After running the database setup, test the API endpoints:

```bash
# Test organization list (replace with actual JWT token)
curl -X GET "http://localhost:3000/api/organizations" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"

# Test organization creation
curl -X POST "http://localhost:3000/api/organizations" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test API Organization",
    "slug": "test-api-org",
    "description": "Created via API testing",
    "industry": "Technology",
    "organization_size": "small"
  }'
```

## Frontend Testing

After setup, you should be able to:

1. **Sign in** as `test.director@appboardguru.com`
2. **View organizations** at `/dashboard/organizations`
3. **Create new organizations** via the UI
4. **Navigate to organization details** by clicking on organizations
5. **Create vaults** within organizations
6. **Manage organization members**

## Troubleshooting

### Common Issues:

1. **"Organization not found" errors**
   - Check that organization_members table has proper entries
   - Verify user has proper role in organization

2. **API permission errors**
   - Ensure JWT token includes proper user ID
   - Check organization membership for the user

3. **Slug conflicts**
   - Organization slugs must be unique
   - Use the `/api/organizations/check-slug` endpoint to verify

### Debug Queries:

```sql
-- Check user's organization memberships
SELECT 
    u.email,
    o.name,
    o.slug,
    om.role,
    om.status
FROM users u
JOIN organization_members om ON u.id = om.user_id
JOIN organizations o ON om.organization_id = o.id
WHERE u.email = 'test.director@appboardguru.com';

-- Check organization features
SELECT 
    o.name,
    of.plan_type,
    of.max_storage_gb,
    of.ai_summarization,
    of.advanced_permissions
FROM organizations o
JOIN organization_features of ON o.id = of.organization_id
WHERE o.created_by = (SELECT id FROM auth.users WHERE email = 'test.director@appboardguru.com');
```

This comprehensive setup will give you 10 realistic organizations with members, features, and vaults to thoroughly test the organization functionality!