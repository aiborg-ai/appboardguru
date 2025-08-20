-- =====================================================
-- MINIMAL SYNTHETIC DATA - ORGANIZATIONS AND RELATED DATA ONLY
-- This version works around auth.users constraints by creating only
-- the data we can create without users table dependencies
-- =====================================================

-- =====================================================
-- 1. ORGANIZATIONS (using NULL for created_by to avoid constraint)
-- =====================================================

-- First, let's see if we can create organizations without the created_by constraint
-- by setting it to NULL or using a different approach

-- Check if we need to make created_by nullable temporarily
-- ALTER TABLE organizations ALTER COLUMN created_by DROP NOT NULL;

INSERT INTO organizations (id, name, slug, description, created_by, organization_size, industry, website, settings) VALUES
('01234567-89ab-cdef-0123-456789abcdef', 'TechFlow Innovations', 'techflow-innovations', 'AI-powered SaaS solutions for enterprise automation', NULL, 'startup', 'Technology', 'https://techflow.com', '{
  "board_pack_auto_archive_days": 365,
  "invitation_expires_hours": 72,
  "max_members": 50,
  "enable_audit_logs": true,
  "require_2fa": false,
  "allowed_file_types": ["pdf", "docx", "pptx", "xlsx"]
}');

-- =====================================================
-- 2. TEST ANNOTATION TABLES STRUCTURE
-- Let's create some test data for the annotation system tables
-- that don't depend on users
-- =====================================================

-- Create some mock UUIDs that we'll use consistently
-- These represent "virtual" users for testing the annotation system structure

-- Create a test vault (this might work if organization exists)
INSERT INTO vaults (id, organization_id, name, description, owner_id, vault_type, access_level, created_at, settings) VALUES
('v1111111-1111-1111-1111-111111111111', '01234567-89ab-cdef-0123-456789abcdef', 'Test Vault', 'Test vault for PDF annotation system', NULL, 'board_pack', 'organization', NOW(), '{
  "auto_expire_days": 90,
  "watermark_enabled": true,
  "download_enabled": true,
  "annotation_enabled": true
}');

-- Success message with instructions
SELECT 
  'Basic organization created successfully!' as status,
  'Next steps:' as info,
  '1. Create users through Supabase Auth signup' as step1,
  '2. Then update organization created_by field' as step2,
  '3. Add organization members through the app' as step3,
  '4. Upload PDF assets through the app interface' as step4,
  '5. Test annotations on uploaded PDFs' as step5;