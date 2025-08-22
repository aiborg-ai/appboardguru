-- =====================================================
-- SYNTHETIC ORGANIZATIONS FOR DEMO/TESTING
-- Creates 5 diverse organizations with realistic data
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create organizations table if it doesn't exist
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic Information
  name TEXT NOT NULL CHECK (length(name) >= 2 AND length(name) <= 100),
  slug TEXT UNIQUE NOT NULL CHECK (slug ~ '^[a-z0-9-]+$' AND length(slug) >= 2),
  description TEXT CHECK (length(description) <= 500),
  
  -- Branding & Identity
  logo_url TEXT,
  website TEXT CHECK (website ~ '^https?://'),
  industry TEXT,
  organization_size TEXT CHECK (organization_size IN ('startup', 'small', 'medium', 'large', 'enterprise')),
  
  -- Ownership & Timestamps
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Soft Delete & Archival
  is_active BOOLEAN DEFAULT true,
  deleted_at TIMESTAMPTZ,
  deletion_scheduled_for TIMESTAMPTZ,
  
  -- Settings & Configuration
  settings JSONB DEFAULT '{}',
  compliance_settings JSONB DEFAULT '{}',
  billing_settings JSONB DEFAULT '{}'
);

-- Create organization_members table if it doesn't exist
CREATE TABLE IF NOT EXISTS organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'viewer')) DEFAULT 'member',
  status TEXT NOT NULL CHECK (status IN ('active', 'suspended', 'pending_activation')) DEFAULT 'active',
  invited_by UUID REFERENCES users(id),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(organization_id, user_id)
);

-- First, we need a test user to create organizations (if one doesn't exist)
-- Insert into auth.users first
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
) VALUES (
    '00000000-0000-0000-0000-000000000000', 
    '12345678-1234-5678-9012-123456789012', 
    'authenticated', 
    'authenticated', 
    'demo@appboardguru.com', 
    crypt('demo123', gen_salt('bf')), 
    NOW(), 
    '{"provider":"email","providers":["email"]}', 
    '{}', 
    NOW(), 
    NOW(), 
    '', 
    '', 
    '', 
    ''
) ON CONFLICT (id) DO NOTHING;

-- Then insert into public.users table
INSERT INTO users (
    id, 
    email, 
    full_name, 
    role, 
    status, 
    created_at, 
    updated_at,
    avatar_url,
    company,
    position
) VALUES (
    '12345678-1234-5678-9012-123456789012',
    'demo@appboardguru.com',
    'Demo User',
    'admin',
    'approved',
    NOW(),
    NOW(),
    'https://api.dicebear.com/7.x/avataaars/svg?seed=demo',
    'AppBoardGuru',
    'Platform Administrator'
) ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- INSERT SYNTHETIC ORGANIZATIONS
-- =====================================================

-- Organization 1: TechVision Solutions (Technology/SaaS)
INSERT INTO organizations (
    id,
    name,
    slug,
    description,
    logo_url,
    website,
    industry,
    organization_size,
    created_by,
    created_at,
    updated_at,
    is_active,
    settings,
    compliance_settings,
    billing_settings
) VALUES (
    '11111111-2222-3333-4444-555555555555',
    'TechVision Solutions',
    'techvision-solutions',
    'Leading provider of AI-powered enterprise software solutions. We help organizations transform their operations through innovative technology and data-driven insights.',
    'https://api.dicebear.com/7.x/shapes/svg?seed=techvision&backgroundColor=3b82f6',
    'https://www.techvisionsolutions.com',
    'Technology',
    'medium',
    '12345678-1234-5678-9012-123456789012',
    NOW() - INTERVAL '180 days',
    NOW() - INTERVAL '7 days',
    true,
    '{"theme": "dark", "notifications": true, "timezone": "UTC"}',
    '{"framework": "SOC2", "certified": true, "last_audit": "2024-01-15"}',
    '{"plan": "enterprise", "billing_cycle": "annual", "seats": 50}'
),

-- Organization 2: GreenLeaf Financial (Finance/Investment)
(
    '22222222-3333-4444-5555-666666666666',
    'GreenLeaf Financial',
    'greenleaf-financial',
    'Sustainable investment firm focused on ESG-compliant portfolios and responsible wealth management. We believe in profitable investments that make a positive impact.',
    'https://api.dicebear.com/7.x/shapes/svg?seed=greenleaf&backgroundColor=10b981',
    'https://www.greenleaffinancial.com',
    'Financial Services',
    'small',
    '12345678-1234-5678-9012-123456789012',
    NOW() - INTERVAL '145 days',
    NOW() - INTERVAL '3 days',
    true,
    '{"theme": "light", "notifications": true, "timezone": "America/New_York"}',
    '{"framework": "SEC", "certified": true, "last_audit": "2024-02-01"}',
    '{"plan": "professional", "billing_cycle": "monthly", "seats": 25}'
),

-- Organization 3: MedCore Healthcare (Healthcare/Medical)
(
    '33333333-4444-5555-6666-777777777777',
    'MedCore Healthcare',
    'medcore-healthcare',
    'Integrated healthcare system providing comprehensive medical services across 12 locations. Committed to patient-centered care and medical innovation.',
    'https://api.dicebear.com/7.x/shapes/svg?seed=medcore&backgroundColor=ef4444',
    'https://www.medcorehealthcare.com',
    'Healthcare',
    'large',
    '12345678-1234-5678-9012-123456789012',
    NOW() - INTERVAL '220 days',
    NOW() - INTERVAL '1 day',
    true,
    '{"theme": "light", "notifications": true, "timezone": "America/Chicago"}',
    '{"framework": "HIPAA", "certified": true, "last_audit": "2024-03-01"}',
    '{"plan": "enterprise", "billing_cycle": "annual", "seats": 150}'
),

-- Organization 4: EduBridge Academy (Education/Non-profit)
(
    '44444444-5555-6666-7777-888888888888',
    'EduBridge Academy',
    'edubridge-academy',
    'Private educational institution serving K-12 students with innovative STEM curriculum and personalized learning approaches. Building tomorrow''s leaders today.',
    'https://api.dicebear.com/7.x/shapes/svg?seed=edubridge&backgroundColor=8b5cf6',
    'https://www.edubridgeacademy.org',
    'Education',
    'small',
    '12345678-1234-5678-9012-123456789012',
    NOW() - INTERVAL '95 days',
    NOW() - INTERVAL '5 days',
    true,
    '{"theme": "light", "notifications": true, "timezone": "America/Los_Angeles"}',
    '{"framework": "FERPA", "certified": true, "last_audit": "2024-01-20"}',
    '{"plan": "standard", "billing_cycle": "annual", "seats": 35}'
),

-- Organization 5: Atlas Manufacturing (Manufacturing/Industrial)
(
    '55555555-6666-7777-8888-999999999999',
    'Atlas Manufacturing',
    'atlas-manufacturing',
    'Global manufacturer of precision industrial components and automation systems. Serving aerospace, automotive, and energy sectors for over 30 years.',
    'https://api.dicebear.com/7.x/shapes/svg?seed=atlas&backgroundColor=f59e0b',
    'https://www.atlasmanufacturing.com',
    'Manufacturing',
    'enterprise',
    '12345678-1234-5678-9012-123456789012',
    NOW() - INTERVAL '300 days',
    NOW() - INTERVAL '2 days',
    true,
    '{"theme": "dark", "notifications": true, "timezone": "America/Detroit"}',
    '{"framework": "ISO9001", "certified": true, "last_audit": "2024-02-15"}',
    '{"plan": "enterprise_plus", "billing_cycle": "annual", "seats": 200}'
);

-- =====================================================
-- CREATE ORGANIZATION MEMBERSHIPS
-- =====================================================

-- Create organization_members table entries so the user is part of each organization
INSERT INTO organization_members (
    id,
    organization_id,
    user_id,
    role,
    status,
    invited_by,
    joined_at,
    created_at,
    updated_at
) VALUES 
-- TechVision Solutions - Owner
(
    gen_random_uuid(),
    '11111111-2222-3333-4444-555555555555',
    '12345678-1234-5678-9012-123456789012',
    'owner',
    'active',
    '12345678-1234-5678-9012-123456789012',
    NOW() - INTERVAL '180 days',
    NOW() - INTERVAL '180 days',
    NOW() - INTERVAL '7 days'
),
-- GreenLeaf Financial - Admin
(
    gen_random_uuid(),
    '22222222-3333-4444-5555-666666666666',
    '12345678-1234-5678-9012-123456789012',
    'admin',
    'active',
    '12345678-1234-5678-9012-123456789012',
    NOW() - INTERVAL '145 days',
    NOW() - INTERVAL '145 days',
    NOW() - INTERVAL '3 days'
),
-- MedCore Healthcare - Member
(
    gen_random_uuid(),
    '33333333-4444-5555-6666-777777777777',
    '12345678-1234-5678-9012-123456789012',
    'member',
    'active',
    '12345678-1234-5678-9012-123456789012',
    NOW() - INTERVAL '220 days',
    NOW() - INTERVAL '220 days',
    NOW() - INTERVAL '1 day'
),
-- EduBridge Academy - Admin
(
    gen_random_uuid(),
    '44444444-5555-6666-7777-888888888888',
    '12345678-1234-5678-9012-123456789012',
    'admin',
    'active',
    '12345678-1234-5678-9012-123456789012',
    NOW() - INTERVAL '95 days',
    NOW() - INTERVAL '95 days',
    NOW() - INTERVAL '5 days'
),
-- Atlas Manufacturing - Owner
(
    gen_random_uuid(),
    '55555555-6666-7777-8888-999999999999',
    '12345678-1234-5678-9012-123456789012',
    'owner',
    'active',
    '12345678-1234-5678-9012-123456789012',
    NOW() - INTERVAL '300 days',
    NOW() - INTERVAL '300 days',
    NOW() - INTERVAL '2 days'
);

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
SELECT 'Successfully created 5 synthetic organizations with memberships!' as result;