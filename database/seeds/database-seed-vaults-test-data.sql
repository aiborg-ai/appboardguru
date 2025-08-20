-- =====================================================
-- VAULT SYSTEM TEST DATA - SYNTHETIC DATA FOR 4 ORGANIZATIONS
-- Creates realistic test data for comprehensive testing
-- =====================================================

-- First, let's ensure we have some test users
-- Note: In a real environment, these would be created through the auth system

-- Create test users (mock users for demonstration)
-- These INSERT statements may fail if users already exist - that's OK
INSERT INTO auth.users (id, email, created_at, updated_at)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'ceo@techcorp.com', NOW(), NOW()),
  ('22222222-2222-2222-2222-222222222222', 'cfo@techcorp.com', NOW(), NOW()),
  ('33333333-3333-3333-3333-333333333333', 'cto@techcorp.com', NOW(), NOW()),
  ('44444444-4444-4444-4444-444444444444', 'chair@globalfinance.com', NOW(), NOW()),
  ('55555555-5555-5555-5555-555555555555', 'director@globalfinance.com', NOW(), NOW()),
  ('66666666-6666-6666-6666-666666666666', 'advisor@globalfinance.com', NOW(), NOW()),
  ('77777777-7777-7777-7777-777777777777', 'president@healthcarepartners.com', NOW(), NOW()),
  ('88888888-8888-8888-8888-888888888888', 'vp@healthcarepartners.com', NOW(), NOW()),
  ('99999999-9999-9999-9999-999999999999', 'secretary@healthcarepartners.com', NOW(), NOW()),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'dean@educationfoundation.org', NOW(), NOW()),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'treasurer@educationfoundation.org', NOW(), NOW()),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'trustee@educationfoundation.org', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 1. CREATE TEST ORGANIZATIONS
-- =====================================================

-- Clean up any existing test data first
DELETE FROM organization_members WHERE organization_id IN (
  SELECT id FROM organizations WHERE slug IN ('techcorp-industries', 'global-finance-ltd', 'healthcare-partners', 'education-foundation')
);
DELETE FROM organizations WHERE slug IN ('techcorp-industries', 'global-finance-ltd', 'healthcare-partners', 'education-foundation');

-- TechCorp Industries (Technology Company)
INSERT INTO organizations (
  id, name, slug, description, logo_url, website, industry, organization_size,
  created_by, created_at, settings
) VALUES (
  'org-tech-1111-1111-1111-111111111111',
  'TechCorp Industries',
  'techcorp-industries',
  'Leading technology company specializing in enterprise software solutions and AI innovation.',
  '/logos/techcorp.png',
  'https://www.techcorp.com',
  'Technology',
  'large',
  '11111111-1111-1111-1111-111111111111',
  NOW() - INTERVAL '6 months',
  '{
    "board_pack_auto_archive_days": 365,
    "invitation_expires_hours": 72,
    "max_members": 50,
    "require_2fa": true,
    "allow_viewer_downloads": true,
    "auto_approve_domain_users": true,
    "approved_domains": ["techcorp.com"]
  }'::jsonb
);

-- Global Finance Ltd (Financial Services)
INSERT INTO organizations (
  id, name, slug, description, logo_url, website, industry, organization_size,
  created_by, created_at, settings
) VALUES (
  'org-fin-2222-2222-2222-222222222222',
  'Global Finance Ltd',
  'global-finance-ltd',
  'International investment banking and financial services corporation with global reach.',
  '/logos/globalfinance.png',
  'https://www.globalfinance.com',
  'Financial Services',
  'enterprise',
  '44444444-4444-4444-4444-444444444444',
  NOW() - INTERVAL '8 months',
  '{
    "board_pack_auto_archive_days": 180,
    "invitation_expires_hours": 48,
    "max_members": 25,
    "require_2fa": true,
    "allow_viewer_downloads": false,
    "auto_approve_domain_users": false,
    "approved_domains": ["globalfinance.com"]
  }'::jsonb
);

-- Healthcare Partners (Healthcare)
INSERT INTO organizations (
  id, name, slug, description, logo_url, website, industry, organization_size,
  created_by, created_at, settings
) VALUES (
  'org-health-3333-3333-3333-333333333333',
  'Healthcare Partners',
  'healthcare-partners',
  'Integrated healthcare network providing comprehensive medical services and research.',
  '/logos/healthcare.png',
  'https://www.healthcarepartners.com',
  'Healthcare',
  'medium',
  '77777777-7777-7777-7777-777777777777',
  NOW() - INTERVAL '4 months',
  '{
    "board_pack_auto_archive_days": 270,
    "invitation_expires_hours": 96,
    "max_members": 30,
    "require_2fa": false,
    "allow_viewer_downloads": true,
    "auto_approve_domain_users": true,
    "approved_domains": ["healthcarepartners.com"]
  }'::jsonb
);

-- Education Foundation (Non-Profit Education)
INSERT INTO organizations (
  id, name, slug, description, logo_url, website, industry, organization_size,
  created_by, created_at, settings
) VALUES (
  'org-edu-4444-4444-4444-444444444444',
  'Education Foundation',
  'education-foundation',
  'Non-profit foundation dedicated to advancing educational opportunities and research.',
  '/logos/education.png',
  'https://www.educationfoundation.org',
  'Non-Profit',
  'small',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  NOW() - INTERVAL '10 months',
  '{
    "board_pack_auto_archive_days": 365,
    "invitation_expires_hours": 168,
    "max_members": 15,
    "require_2fa": false,
    "allow_viewer_downloads": true,
    "auto_approve_domain_users": false,
    "approved_domains": ["educationfoundation.org"]
  }'::jsonb
);

-- =====================================================
-- 2. CREATE ORGANIZATION MEMBERS
-- =====================================================

-- TechCorp Industries Members
INSERT INTO organization_members (
  organization_id, user_id, role, status, invited_by, joined_at, is_primary
) VALUES 
  ('org-tech-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'owner', 'active', NULL, NOW() - INTERVAL '6 months', true),
  ('org-tech-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'admin', 'active', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '5 months', false),
  ('org-tech-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'member', 'active', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '4 months', false);

-- Global Finance Ltd Members  
INSERT INTO organization_members (
  organization_id, user_id, role, status, invited_by, joined_at, is_primary
) VALUES 
  ('org-fin-2222-2222-2222-222222222222', '44444444-4444-4444-4444-444444444444', 'owner', 'active', NULL, NOW() - INTERVAL '8 months', true),
  ('org-fin-2222-2222-2222-222222222222', '55555555-5555-5555-5555-555555555555', 'admin', 'active', '44444444-4444-4444-4444-444444444444', NOW() - INTERVAL '7 months', false),
  ('org-fin-2222-2222-2222-222222222222', '66666666-6666-6666-6666-666666666666', 'member', 'active', '44444444-4444-4444-4444-444444444444', NOW() - INTERVAL '6 months', false);

-- Healthcare Partners Members
INSERT INTO organization_members (
  organization_id, user_id, role, status, invited_by, joined_at, is_primary
) VALUES 
  ('org-health-3333-3333-3333-333333333333', '77777777-7777-7777-7777-777777777777', 'owner', 'active', NULL, NOW() - INTERVAL '4 months', true),
  ('org-health-3333-3333-3333-333333333333', '88888888-8888-8888-8888-888888888888', 'admin', 'active', '77777777-7777-7777-7777-777777777777', NOW() - INTERVAL '3 months', false),
  ('org-health-3333-3333-3333-333333333333', '99999999-9999-9999-9999-999999999999', 'member', 'active', '77777777-7777-7777-7777-777777777777', NOW() - INTERVAL '2 months', false);

-- Education Foundation Members
INSERT INTO organization_members (
  organization_id, user_id, role, status, invited_by, joined_at, is_primary
) VALUES 
  ('org-edu-4444-4444-4444-444444444444', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'owner', 'active', NULL, NOW() - INTERVAL '10 months', true),
  ('org-edu-4444-4444-4444-444444444444', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'admin', 'active', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', NOW() - INTERVAL '9 months', false),
  ('org-edu-4444-4444-4444-444444444444', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'member', 'active', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', NOW() - INTERVAL '8 months', false);

-- =====================================================
-- 3. CREATE ORGANIZATION FEATURES
-- =====================================================

INSERT INTO organization_features (
  organization_id, ai_summarization, advanced_permissions, sso_enabled,
  audit_logs, api_access, white_label, max_board_packs, max_file_size_mb,
  max_storage_gb, current_board_packs, current_storage_gb, plan_type
) VALUES 
  -- TechCorp (Enterprise plan)
  ('org-tech-1111-1111-1111-111111111111', true, true, true, true, true, true, 500, 100, 50.0, 12, 8.5, 'enterprise'),
  -- Global Finance (Professional plan)
  ('org-fin-2222-2222-2222-222222222222', true, true, false, true, false, false, 200, 75, 25.0, 8, 5.2, 'professional'),
  -- Healthcare Partners (Professional plan)
  ('org-health-3333-3333-3333-333333333333', true, false, false, true, false, false, 150, 50, 20.0, 6, 3.8, 'professional'),
  -- Education Foundation (Free plan)
  ('org-edu-4444-4444-4444-444444444444', false, false, false, false, false, false, 50, 25, 5.0, 4, 1.2, 'free');

-- =====================================================
-- 4. CREATE TEST ASSETS FOR EACH ORGANIZATION
-- =====================================================

-- Note: In a real system, these would be uploaded files
-- For testing, we'll create mock asset records

-- TechCorp Assets
INSERT INTO assets (
  id, owner_id, title, description, file_name, original_file_name,
  file_path, file_size, file_type, mime_type, category, tags,
  visibility, created_at
) VALUES 
  -- Q1 Board Meeting Assets
  ('asset-tech-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Q1 2025 Board Meeting Agenda', 'Comprehensive agenda for Q1 board meeting', 'q1-agenda-2025.pdf', 'Q1 Board Meeting Agenda.pdf', 'techcorp/board/q1-agenda-2025.pdf', 245760, 'pdf', 'application/pdf', 'board_documents', ARRAY['agenda', 'q1', '2025'], 'shared', NOW() - INTERVAL '2 weeks'),
  ('asset-tech-1111-1111-1111-111111111112', '22222222-2222-2222-2222-222222222222', 'TechCorp Q1 Financial Report', 'Quarterly financial performance and projections', 'techcorp-q1-financials.pdf', 'TechCorp Q1 Financial Report.pdf', 'techcorp/financials/q1-report.pdf', 1048576, 'pdf', 'application/pdf', 'financial_reports', ARRAY['financials', 'q1', 'revenue'], 'shared', NOW() - INTERVAL '10 days'),
  ('asset-tech-1111-1111-1111-111111111113', '33333333-3333-3333-3333-333333333333', 'AI Strategy Roadmap 2025', 'Strategic roadmap for AI initiatives', 'ai-strategy-2025.pptx', 'AI Strategy Roadmap 2025.pptx', 'techcorp/strategy/ai-roadmap.pptx', 2097152, 'pptx', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'presentations', ARRAY['ai', 'strategy', 'roadmap'], 'shared', NOW() - INTERVAL '1 week'),
  
  -- Product Strategy Assets  
  ('asset-tech-1111-1111-1111-111111111114', '11111111-1111-1111-1111-111111111111', 'Product Development Pipeline', 'Overview of upcoming product releases', 'product-pipeline.xlsx', 'Product Development Pipeline.xlsx', 'techcorp/products/pipeline.xlsx', 524288, 'xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'general', ARRAY['products', 'pipeline', 'development'], 'shared', NOW() - INTERVAL '5 days'),
  ('asset-tech-1111-1111-1111-111111111115', '33333333-3333-3333-3333-333333333333', 'Technology Architecture Review', 'Comprehensive review of current tech stack', 'tech-architecture-review.pdf', 'Technology Architecture Review.pdf', 'techcorp/technical/architecture.pdf', 1536000, 'pdf', 'application/pdf', 'technical_documents', ARRAY['architecture', 'review', 'technology'], 'shared', NOW() - INTERVAL '3 days');

-- Global Finance Assets
INSERT INTO assets (
  id, owner_id, title, description, file_name, original_file_name,
  file_path, file_size, file_type, mime_type, category, tags,
  visibility, created_at
) VALUES 
  -- Annual Audit Assets
  ('asset-fin-2222-2222-2222-222222222221', '44444444-4444-4444-4444-444444444444', 'Annual Audit Report 2024', 'Complete external audit findings', 'annual-audit-2024.pdf', 'Annual Audit Report 2024.pdf', 'globalfinance/audit/annual-2024.pdf', 3145728, 'pdf', 'application/pdf', 'compliance', ARRAY['audit', '2024', 'compliance'], 'shared', NOW() - INTERVAL '3 weeks'),
  ('asset-fin-2222-2222-2222-222222222222', '55555555-5555-5555-5555-555555555555', 'Risk Assessment Framework', 'Updated enterprise risk management framework', 'risk-framework.docx', 'Risk Assessment Framework.docx', 'globalfinance/risk/framework.docx', 786432, 'docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'risk_management', ARRAY['risk', 'framework', 'management'], 'shared', NOW() - INTERVAL '1 week'),
  ('asset-fin-2222-2222-2222-222222222223', '66666666-6666-6666-6666-666666666666', 'Regulatory Compliance Update', 'Latest regulatory changes and impacts', 'compliance-update.pdf', 'Regulatory Compliance Update.pdf', 'globalfinance/compliance/update.pdf', 655360, 'pdf', 'application/pdf', 'compliance', ARRAY['regulatory', 'compliance', 'update'], 'shared', NOW() - INTERVAL '4 days'),
  
  -- Investment Committee Assets
  ('asset-fin-2222-2222-2222-222222222224', '44444444-4444-4444-4444-444444444444', 'Investment Portfolio Review', 'Q4 portfolio performance analysis', 'portfolio-review-q4.xlsx', 'Investment Portfolio Review Q4.xlsx', 'globalfinance/investments/q4-review.xlsx', 1048576, 'xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'financial_reports', ARRAY['investments', 'portfolio', 'q4'], 'shared', NOW() - INTERVAL '6 days');

-- Healthcare Partners Assets
INSERT INTO assets (
  id, owner_id, title, description, file_name, original_file_name,
  file_path, file_size, file_type, mime_type, category, tags,
  visibility, created_at
) VALUES 
  -- Medical Board Assets
  ('asset-health-3333-3333-3333-333333333331', '77777777-7777-7777-7777-777777777777', 'Medical Board Review Agenda', 'Monthly medical board meeting agenda', 'med-board-agenda.pdf', 'Medical Board Review Agenda.pdf', 'healthcare/medical/agenda.pdf', 327680, 'pdf', 'application/pdf', 'board_documents', ARRAY['medical', 'board', 'agenda'], 'shared', NOW() - INTERVAL '1 week'),
  ('asset-health-3333-3333-3333-333333333332', '88888888-8888-8888-8888-888888888888', 'Patient Safety Report', 'Quarterly patient safety and quality metrics', 'patient-safety-q1.pdf', 'Patient Safety Report Q1.pdf', 'healthcare/safety/q1-report.pdf', 983040, 'pdf', 'application/pdf', 'quality_reports', ARRAY['patient', 'safety', 'quality'], 'shared', NOW() - INTERVAL '2 weeks'),
  ('asset-health-3333-3333-3333-333333333333', '99999999-9999-9999-9999-999999999999', 'Partnership Agreements', 'Strategic partnership proposals', 'partnerships.docx', 'Partnership Agreements.docx', 'healthcare/partnerships/agreements.docx', 524288, 'docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'legal_documents', ARRAY['partnerships', 'agreements', 'strategic'], 'shared', NOW() - INTERVAL '5 days'),
  
  -- Research Committee Assets
  ('asset-health-3333-3333-3333-333333333334', '77777777-7777-7777-7777-777777777777', 'Research Initiatives Update', 'Current research projects and findings', 'research-update.pptx', 'Research Initiatives Update.pptx', 'healthcare/research/update.pptx', 1572864, 'pptx', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'presentations', ARRAY['research', 'initiatives', 'update'], 'shared', NOW() - INTERVAL '3 days');

-- Education Foundation Assets
INSERT INTO assets (
  id, owner_id, title, description, file_name, original_file_name,
  file_path, file_size, file_type, mime_type, category, tags,
  visibility, created_at
) VALUES 
  -- Curriculum Planning Assets
  ('asset-edu-4444-4444-4444-444444444441', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Curriculum Planning Framework', 'Educational curriculum development guidelines', 'curriculum-framework.pdf', 'Curriculum Planning Framework.pdf', 'education/curriculum/framework.pdf', 1310720, 'pdf', 'application/pdf', 'educational_materials', ARRAY['curriculum', 'planning', 'framework'], 'shared', NOW() - INTERVAL '2 weeks'),
  ('asset-edu-4444-4444-4444-444444444442', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Budget Allocation 2025', 'Annual budget planning and allocation', 'budget-2025.xlsx', 'Budget Allocation 2025.xlsx', 'education/budget/allocation-2025.xlsx', 892000, 'xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'financial_reports', ARRAY['budget', '2025', 'allocation'], 'shared', NOW() - INTERVAL '1 week'),
  ('asset-edu-4444-4444-4444-444444444443', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Stakeholder Impact Report', 'Annual impact assessment and outcomes', 'stakeholder-report.pdf', 'Stakeholder Impact Report.pdf', 'education/reports/stakeholder-impact.pdf', 2048000, 'pdf', 'application/pdf', 'impact_reports', ARRAY['stakeholder', 'impact', 'outcomes'], 'shared', NOW() - INTERVAL '4 days');

-- =====================================================
-- 5. CREATE VAULTS FOR EACH ORGANIZATION
-- =====================================================

-- TechCorp Vaults
INSERT INTO vaults (
  id, organization_id, name, description, meeting_date, location,
  created_by, status, priority, category, tags, settings, 
  member_count, asset_count, created_at
) VALUES 
  -- Q1 2025 Board Meeting
  ('vault-tech-1111-1111-1111-111111111111', 'org-tech-1111-1111-1111-111111111111', 'Q1 2025 Board Meeting', 'Quarterly board meeting focusing on financial performance and strategic initiatives', '2025-03-15 14:00:00+00', 'TechCorp HQ - Boardroom A', '11111111-1111-1111-1111-111111111111', 'active', 'high', 'board_meeting', ARRAY['q1', '2025', 'quarterly'], '{"allow_comments": true, "allow_downloads": true, "auto_archive_after_meeting": true}', 3, 3, NOW() - INTERVAL '2 weeks'),
  
  -- Product Strategy Session
  ('vault-tech-1111-1111-1111-111111111112', 'org-tech-1111-1111-1111-111111111111', 'Product Strategy Session', 'Strategic planning session for 2025 product roadmap', '2025-02-20 10:00:00+00', 'TechCorp HQ - Conference Room B', '33333333-3333-3333-3333-333333333333', 'active', 'medium', 'strategy', ARRAY['product', 'strategy', '2025'], '{"allow_comments": true, "allow_downloads": true}', 2, 2, NOW() - INTERVAL '1 week'),
  
  -- Financial Review Vault
  ('vault-tech-1111-1111-1111-111111111113', 'org-tech-1111-1111-1111-111111111111', 'Financial Review 2024', 'Year-end financial review and audit preparation', '2025-01-30 09:00:00+00', 'Virtual Meeting', '22222222-2222-2222-2222-222222222222', 'archived', 'medium', 'financial_review', ARRAY['financial', '2024', 'review'], '{"allow_comments": false, "allow_downloads": true}', 3, 1, NOW() - INTERVAL '3 weeks');

-- Global Finance Vaults
INSERT INTO vaults (
  id, organization_id, name, description, meeting_date, location,
  created_by, status, priority, category, tags, settings,
  member_count, asset_count, created_at
) VALUES 
  -- Annual Audit Vault
  ('vault-fin-2222-2222-2222-222222222221', 'org-fin-2222-2222-2222-222222222222', 'Annual Audit Review', 'Comprehensive review of 2024 external audit findings', '2025-02-28 11:00:00+00', 'Global Finance Tower - Executive Boardroom', '44444444-4444-4444-4444-444444444444', 'active', 'urgent', 'audit', ARRAY['audit', '2024', 'review'], '{"allow_comments": true, "allow_downloads": false, "require_approval_for_uploads": true}', 3, 3, NOW() - INTERVAL '3 weeks'),
  
  -- Risk Assessment Vault
  ('vault-fin-2222-2222-2222-222222222222', 'org-fin-2222-2222-2222-222222222222', 'Risk Assessment Update', 'Quarterly risk assessment and mitigation strategies', '2025-03-10 14:30:00+00', 'Risk Management Center', '55555555-5555-5555-5555-555555555555', 'active', 'high', 'risk_management', ARRAY['risk', 'assessment', 'mitigation'], '{"allow_comments": true, "allow_downloads": true}', 2, 1, NOW() - INTERVAL '10 days');

-- Healthcare Partners Vaults  
INSERT INTO vaults (
  id, organization_id, name, description, meeting_date, location,
  created_by, status, priority, category, tags, settings,
  member_count, asset_count, created_at
) VALUES 
  -- Medical Board Review
  ('vault-health-3333-3333-3333-333333333331', 'org-health-3333-3333-3333-333333333333', 'Medical Board Review', 'Monthly medical staff and quality review meeting', '2025-02-25 16:00:00+00', 'Healthcare Partners - Medical Center', '77777777-7777-7777-7777-777777777777', 'active', 'medium', 'medical_review', ARRAY['medical', 'quality', 'review'], '{"allow_comments": true, "allow_downloads": true}', 3, 3, NOW() - INTERVAL '1 week'),
  
  -- Partnership Discussions
  ('vault-health-3333-3333-3333-333333333332', 'org-health-3333-3333-3333-333333333333', 'Partnership Agreements', 'Strategic partnership evaluation and agreements', '2025-03-05 13:00:00+00', 'Healthcare Partners - Executive Suite', '88888888-8888-8888-8888-888888888888', 'active', 'high', 'partnerships', ARRAY['partnerships', 'strategic', 'agreements'], '{"allow_comments": true, "allow_downloads": false}', 2, 1, NOW() - INTERVAL '5 days');

-- Education Foundation Vaults
INSERT INTO vaults (
  id, organization_id, name, description, meeting_date, location,
  created_by, status, priority, category, tags, settings,
  member_count, asset_count, created_at
) VALUES 
  -- Curriculum Planning
  ('vault-edu-4444-4444-4444-444444444441', 'org-edu-4444-4444-4444-444444444444', 'Curriculum Planning', 'Annual curriculum review and development planning', '2025-03-12 10:00:00+00', 'Education Foundation - Conference Room', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'active', 'medium', 'curriculum', ARRAY['curriculum', 'planning', 'education'], '{"allow_comments": true, "allow_downloads": true}', 3, 2, NOW() - INTERVAL '2 weeks'),
  
  -- Budget Allocation
  ('vault-edu-4444-4444-4444-444444444442', 'org-edu-4444-4444-4444-444444444444', 'Budget Allocation 2025', 'Annual budget planning and resource allocation', '2025-02-18 14:00:00+00', 'Education Foundation - Boardroom', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'active', 'high', 'budget', ARRAY['budget', '2025', 'allocation'], '{"allow_comments": true, "allow_downloads": true}', 2, 2, NOW() - INTERVAL '1 week');

-- =====================================================
-- 6. CREATE VAULT MEMBERS
-- =====================================================

-- TechCorp Vault Members
INSERT INTO vault_members (
  vault_id, user_id, organization_id, role, status, joined_at, invitation_id
) VALUES 
  -- Q1 2025 Board Meeting Members
  ('vault-tech-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'org-tech-1111-1111-1111-111111111111', 'owner', 'active', NOW() - INTERVAL '2 weeks', NULL),
  ('vault-tech-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'org-tech-1111-1111-1111-111111111111', 'admin', 'active', NOW() - INTERVAL '2 weeks', NULL),
  ('vault-tech-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'org-tech-1111-1111-1111-111111111111', 'contributor', 'active', NOW() - INTERVAL '2 weeks', NULL),
  
  -- Product Strategy Session Members
  ('vault-tech-1111-1111-1111-111111111112', '33333333-3333-3333-3333-333333333333', 'org-tech-1111-1111-1111-111111111111', 'owner', 'active', NOW() - INTERVAL '1 week', NULL),
  ('vault-tech-1111-1111-1111-111111111112', '11111111-1111-1111-1111-111111111111', 'org-tech-1111-1111-1111-111111111111', 'admin', 'active', NOW() - INTERVAL '1 week', NULL),
  
  -- Financial Review Members
  ('vault-tech-1111-1111-1111-111111111113', '22222222-2222-2222-2222-222222222222', 'org-tech-1111-1111-1111-111111111111', 'owner', 'active', NOW() - INTERVAL '3 weeks', NULL),
  ('vault-tech-1111-1111-1111-111111111113', '11111111-1111-1111-1111-111111111111', 'org-tech-1111-1111-1111-111111111111', 'admin', 'active', NOW() - INTERVAL '3 weeks', NULL),
  ('vault-tech-1111-1111-1111-111111111113', '33333333-3333-3333-3333-333333333333', 'org-tech-1111-1111-1111-111111111111', 'viewer', 'active', NOW() - INTERVAL '3 weeks', NULL);

-- Global Finance Vault Members
INSERT INTO vault_members (
  vault_id, user_id, organization_id, role, status, joined_at, invitation_id
) VALUES 
  -- Annual Audit Members
  ('vault-fin-2222-2222-2222-222222222221', '44444444-4444-4444-4444-444444444444', 'org-fin-2222-2222-2222-222222222222', 'owner', 'active', NOW() - INTERVAL '3 weeks', NULL),
  ('vault-fin-2222-2222-2222-222222222221', '55555555-5555-5555-5555-555555555555', 'org-fin-2222-2222-2222-222222222222', 'admin', 'active', NOW() - INTERVAL '3 weeks', NULL),
  ('vault-fin-2222-2222-2222-222222222221', '66666666-6666-6666-6666-666666666666', 'org-fin-2222-2222-2222-222222222222', 'contributor', 'active', NOW() - INTERVAL '3 weeks', NULL),
  
  -- Risk Assessment Members
  ('vault-fin-2222-2222-2222-222222222222', '55555555-5555-5555-5555-555555555555', 'org-fin-2222-2222-2222-222222222222', 'owner', 'active', NOW() - INTERVAL '10 days', NULL),
  ('vault-fin-2222-2222-2222-222222222222', '44444444-4444-4444-4444-444444444444', 'org-fin-2222-2222-2222-222222222222', 'admin', 'active', NOW() - INTERVAL '10 days', NULL);

-- Healthcare Partners Vault Members
INSERT INTO vault_members (
  vault_id, user_id, organization_id, role, status, joined_at, invitation_id
) VALUES 
  -- Medical Board Members
  ('vault-health-3333-3333-3333-333333333331', '77777777-7777-7777-7777-777777777777', 'org-health-3333-3333-3333-333333333333', 'owner', 'active', NOW() - INTERVAL '1 week', NULL),
  ('vault-health-3333-3333-3333-333333333331', '88888888-8888-8888-8888-888888888888', 'org-health-3333-3333-3333-333333333333', 'admin', 'active', NOW() - INTERVAL '1 week', NULL),
  ('vault-health-3333-3333-3333-333333333331', '99999999-9999-9999-9999-999999999999', 'org-health-3333-3333-3333-333333333333', 'contributor', 'active', NOW() - INTERVAL '1 week', NULL),
  
  -- Partnership Members
  ('vault-health-3333-3333-3333-333333333332', '88888888-8888-8888-8888-888888888888', 'org-health-3333-3333-3333-333333333333', 'owner', 'active', NOW() - INTERVAL '5 days', NULL),
  ('vault-health-3333-3333-3333-333333333332', '77777777-7777-7777-7777-777777777777', 'org-health-3333-3333-3333-333333333333', 'admin', 'active', NOW() - INTERVAL '5 days', NULL);

-- Education Foundation Vault Members
INSERT INTO vault_members (
  vault_id, user_id, organization_id, role, status, joined_at, invitation_id
) VALUES 
  -- Curriculum Planning Members
  ('vault-edu-4444-4444-4444-444444444441', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'org-edu-4444-4444-4444-444444444444', 'owner', 'active', NOW() - INTERVAL '2 weeks', NULL),
  ('vault-edu-4444-4444-4444-444444444441', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'org-edu-4444-4444-4444-444444444444', 'admin', 'active', NOW() - INTERVAL '2 weeks', NULL),
  ('vault-edu-4444-4444-4444-444444444441', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'org-edu-4444-4444-4444-444444444444', 'contributor', 'active', NOW() - INTERVAL '2 weeks', NULL),
  
  -- Budget Allocation Members
  ('vault-edu-4444-4444-4444-444444444442', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'org-edu-4444-4444-4444-444444444444', 'owner', 'active', NOW() - INTERVAL '1 week', NULL),
  ('vault-edu-4444-4444-4444-444444444442', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'org-edu-4444-4444-4444-444444444444', 'admin', 'active', NOW() - INTERVAL '1 week', NULL);

-- =====================================================
-- 7. ADD ASSETS TO VAULTS
-- =====================================================

-- TechCorp Vault Assets
INSERT INTO vault_assets (
  vault_id, asset_id, organization_id, added_by_user_id, 
  folder_path, display_order, is_featured, is_required_reading
) VALUES 
  -- Q1 Board Meeting Assets
  ('vault-tech-1111-1111-1111-111111111111', 'asset-tech-1111-1111-1111-111111111111', 'org-tech-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', '/agenda', 1, true, true),
  ('vault-tech-1111-1111-1111-111111111111', 'asset-tech-1111-1111-1111-111111111112', 'org-tech-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '/financial', 2, true, true),
  ('vault-tech-1111-1111-1111-111111111111', 'asset-tech-1111-1111-1111-111111111113', 'org-tech-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', '/presentations', 3, true, false),
  
  -- Product Strategy Assets
  ('vault-tech-1111-1111-1111-111111111112', 'asset-tech-1111-1111-1111-111111111114', 'org-tech-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', '/', 1, true, true),
  ('vault-tech-1111-1111-1111-111111111112', 'asset-tech-1111-1111-1111-111111111115', 'org-tech-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', '/technical', 2, false, false),
  
  -- Financial Review Assets
  ('vault-tech-1111-1111-1111-111111111113', 'asset-tech-1111-1111-1111-111111111112', 'org-tech-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '/', 1, true, true);

-- Global Finance Vault Assets
INSERT INTO vault_assets (
  vault_id, asset_id, organization_id, added_by_user_id,
  folder_path, display_order, is_featured, is_required_reading
) VALUES 
  -- Annual Audit Assets
  ('vault-fin-2222-2222-2222-222222222221', 'asset-fin-2222-2222-2222-222222222221', 'org-fin-2222-2222-2222-222222222222', '44444444-4444-4444-4444-444444444444', '/audit', 1, true, true),
  ('vault-fin-2222-2222-2222-222222222221', 'asset-fin-2222-2222-2222-222222222222', 'org-fin-2222-2222-2222-222222222222', '55555555-5555-5555-5555-555555555555', '/risk', 2, true, true),
  ('vault-fin-2222-2222-2222-222222222221', 'asset-fin-2222-2222-2222-222222222223', 'org-fin-2222-2222-2222-222222222222', '66666666-6666-6666-6666-666666666666', '/compliance', 3, false, true),
  
  -- Risk Assessment Assets
  ('vault-fin-2222-2222-2222-222222222222', 'asset-fin-2222-2222-2222-222222222224', 'org-fin-2222-2222-2222-222222222222', '55555555-5555-5555-5555-555555555555', '/', 1, true, true);

-- Healthcare Vault Assets
INSERT INTO vault_assets (
  vault_id, asset_id, organization_id, added_by_user_id,
  folder_path, display_order, is_featured, is_required_reading
) VALUES 
  -- Medical Board Assets
  ('vault-health-3333-3333-3333-333333333331', 'asset-health-3333-3333-3333-333333333331', 'org-health-3333-3333-3333-333333333333', '77777777-7777-7777-7777-777777777777', '/agenda', 1, true, true),
  ('vault-health-3333-3333-3333-333333333331', 'asset-health-3333-3333-3333-333333333332', 'org-health-3333-3333-3333-333333333333', '88888888-8888-8888-8888-888888888888', '/reports', 2, true, true),
  ('vault-health-3333-3333-3333-333333333331', 'asset-health-3333-3333-3333-333333333334', 'org-health-3333-3333-3333-333333333333', '77777777-7777-7777-7777-777777777777', '/research', 3, false, false),
  
  -- Partnership Assets
  ('vault-health-3333-3333-3333-333333333332', 'asset-health-3333-3333-3333-333333333333', 'org-health-3333-3333-3333-333333333333', '88888888-8888-8888-8888-888888888888', '/legal', 1, true, true);

-- Education Foundation Vault Assets
INSERT INTO vault_assets (
  vault_id, asset_id, organization_id, added_by_user_id,
  folder_path, display_order, is_featured, is_required_reading
) VALUES 
  -- Curriculum Planning Assets
  ('vault-edu-4444-4444-4444-444444444441', 'asset-edu-4444-4444-4444-444444444441', 'org-edu-4444-4444-4444-444444444444', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '/curriculum', 1, true, true),
  ('vault-edu-4444-4444-4444-444444444441', 'asset-edu-4444-4444-4444-444444444443', 'org-edu-4444-4444-4444-444444444444', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '/reports', 2, false, true),
  
  -- Budget Allocation Assets
  ('vault-edu-4444-4444-4444-444444444442', 'asset-edu-4444-4444-4444-444444444442', 'org-edu-4444-4444-4444-444444444444', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '/budget', 1, true, true),
  ('vault-edu-4444-4444-4444-444444444442', 'asset-edu-4444-4444-4444-444444444443', 'org-edu-4444-4444-4444-444444444444', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '/reports', 2, false, false);

-- =====================================================
-- 8. CREATE SAMPLE VAULT INVITATIONS
-- =====================================================

-- Create some pending invitations for cross-organization collaboration
INSERT INTO vault_invitations (
  id, vault_id, invited_user_id, invited_by_user_id, organization_id,
  permission_level, personal_message, status, expires_at
) VALUES 
  -- TechCorp inviting Global Finance user to Product Strategy
  ('invite-1111-1111-1111-1111-1111111111', 'vault-tech-1111-1111-1111-111111111112', '44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'org-tech-1111-1111-1111-111111111111', 'viewer', 'We would value your financial perspective on our product strategy discussions.', 'pending', NOW() + INTERVAL '5 days'),
  
  -- Healthcare inviting Education Foundation to Medical Board for health education collaboration
  ('invite-2222-2222-2222-2222-2222222222', 'vault-health-3333-3333-3333-333333333331', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '77777777-7777-7777-7777-777777777777', 'org-health-3333-3333-3333-333333333333', 'viewer', 'Your expertise in education would be valuable for our medical education initiatives.', 'pending', NOW() + INTERVAL '7 days'),
  
  -- Global Finance inviting TechCorp CFO to Risk Assessment  
  ('invite-3333-3333-3333-3333-3333333333', 'vault-fin-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', '44444444-4444-4444-4444-444444444444', 'org-fin-2222-2222-2222-222222222222', 'contributor', 'We would like your input on technology-related financial risks.', 'pending', NOW() + INTERVAL '3 days');

-- =====================================================
-- 9. CREATE ACTIVITY LOGS
-- =====================================================

-- Sample activity logs for recent vault activities
INSERT INTO vault_activity_log (
  vault_id, organization_id, activity_type, performed_by_user_id,
  affected_user_id, affected_asset_id, activity_details, timestamp
) VALUES 
  -- TechCorp Q1 Board Meeting Activities
  ('vault-tech-1111-1111-1111-111111111111', 'org-tech-1111-1111-1111-111111111111', 'vault_created', '11111111-1111-1111-1111-111111111111', NULL, NULL, '{"vault_name": "Q1 2025 Board Meeting", "created_via": "web"}', NOW() - INTERVAL '2 weeks'),
  ('vault-tech-1111-1111-1111-111111111111', 'org-tech-1111-1111-1111-111111111111', 'asset_added', '11111111-1111-1111-1111-111111111111', NULL, 'asset-tech-1111-1111-1111-111111111111', '{"asset_title": "Q1 2025 Board Meeting Agenda", "folder_path": "/agenda"}', NOW() - INTERVAL '2 weeks'),
  ('vault-tech-1111-1111-1111-111111111111', 'org-tech-1111-1111-1111-111111111111', 'member_joined', '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', NULL, '{"joined_via": "direct_add", "role": "admin"}', NOW() - INTERVAL '2 weeks'),
  
  -- Global Finance Activities
  ('vault-fin-2222-2222-2222-222222222221', 'org-fin-2222-2222-2222-222222222222', 'asset_viewed', '55555555-5555-5555-5555-555555555555', NULL, 'asset-fin-2222-2222-2222-222222222221', '{"asset_title": "Annual Audit Report 2024", "view_method": "web"}', NOW() - INTERVAL '1 day'),
  ('vault-fin-2222-2222-2222-222222222221', 'org-fin-2222-2222-2222-222222222222', 'asset_downloaded', '66666666-6666-6666-6666-666666666666', NULL, 'asset-fin-2222-2222-2222-222222222223', '{"asset_title": "Regulatory Compliance Update", "download_method": "direct"}', NOW() - INTERVAL '2 hours');

-- =====================================================
-- 10. UPDATE VAULT STATISTICS
-- =====================================================

-- Update vault member and asset counts (these should be automatically updated by triggers, but let's ensure consistency)
UPDATE vaults SET 
  member_count = (SELECT COUNT(*) FROM vault_members WHERE vault_id = vaults.id AND status = 'active'),
  asset_count = (SELECT COUNT(*) FROM vault_assets WHERE vault_id = vaults.id),
  last_activity_at = GREATEST(
    created_at,
    COALESCE((SELECT MAX(timestamp) FROM vault_activity_log WHERE vault_id = vaults.id), created_at)
  );

-- Update organization features with current usage
UPDATE organization_features SET 
  current_board_packs = (
    SELECT COUNT(*) FROM vaults 
    WHERE organization_id = organization_features.organization_id 
    AND status IN ('draft', 'active')
  ),
  current_storage_gb = ROUND(
    COALESCE((
      SELECT SUM(a.file_size) / (1024.0 * 1024.0 * 1024.0)
      FROM vault_assets va
      JOIN assets a ON va.asset_id = a.id
      JOIN vaults v ON va.vault_id = v.id
      WHERE v.organization_id = organization_features.organization_id
    ), 0)::numeric, 2
  );

-- =====================================================
-- SUCCESS CONFIRMATION
-- =====================================================

SELECT 'Vault system test data created successfully!' as message,
       (SELECT COUNT(*) FROM organizations WHERE slug LIKE '%-%') as organizations_created,
       (SELECT COUNT(*) FROM vaults) as vaults_created,
       (SELECT COUNT(*) FROM vault_members) as vault_members_created,
       (SELECT COUNT(*) FROM vault_assets) as vault_assets_created,
       (SELECT COUNT(*) FROM vault_invitations) as invitations_created,
       (SELECT COUNT(*) FROM assets WHERE title LIKE '%Q1%' OR title LIKE '%Annual%' OR title LIKE '%Medical%' OR title LIKE '%Curriculum%') as assets_created;