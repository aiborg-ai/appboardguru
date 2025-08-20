-- =====================================================
-- SYNTHETIC DATA FOR 4 ORGANIZATIONS WITH ANNOTATIONS
-- Fixed version with proper UUIDs
-- =====================================================

-- Enable necessary extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- UUID MAPPING REFERENCE
-- =====================================================
/*
Organizations:
- TechFlow: 01234567-89ab-cdef-0123-456789abcdef
- FinTech:  02345678-9abc-def0-1234-56789abcdef0  
- MedCare:  03456789-abcd-ef01-2345-6789abcdef01
- Industrial: 04567890-bcde-f012-3456-789abcdef012

Users (TechFlow):
- CEO: 11111111-1111-1111-1111-111111111111
- CTO: 11111111-1111-1111-1111-111111111112
- CFO: 11111111-1111-1111-1111-111111111113
- Legal: 11111111-1111-1111-1111-111111111114

Users (FinTech):
- CEO: 22222222-2222-2222-2222-222222222222
- COO: 22222222-2222-2222-2222-222222222223
- CRO: 22222222-2222-2222-2222-222222222224
- Compliance: 22222222-2222-2222-2222-222222222225

Users (MedCare):
- CEO: 33333333-3333-3333-3333-333333333333
- CMO: 33333333-3333-3333-3333-333333333334
- CFO: 33333333-3333-3333-3333-333333333335
- Quality: 33333333-3333-3333-3333-333333333336

Users (Industrial):
- CEO: 44444444-4444-4444-4444-444444444444
- COO: 44444444-4444-4444-4444-444444444445
- CTO: 44444444-4444-4444-4444-444444444446
- Safety: 44444444-4444-4444-4444-444444444447
*/

-- =====================================================
-- 1. ORGANIZATIONS
-- =====================================================

INSERT INTO organizations (id, name, slug, description, created_by, organization_size, industry, website, settings) VALUES
('01234567-89ab-cdef-0123-456789abcdef', 'TechFlow Innovations', 'techflow-innovations', 'AI-powered SaaS solutions for enterprise automation', '11111111-1111-1111-1111-111111111111', 'startup', 'Technology', 'https://techflow.com', '{
  "board_pack_auto_archive_days": 365,
  "invitation_expires_hours": 72,
  "max_members": 50,
  "require_2fa": true,
  "allow_viewer_downloads": true,
  "auto_approve_domain_users": false,
  "approved_domains": ["techflow.com"]
}'),
('02345678-9abc-def0-1234-56789abcdef0', 'FinTech Global Corp', 'fintech-global-corp', 'Digital banking and investment solutions', '22222222-2222-2222-2222-222222222222', 'medium', 'Financial Services', 'https://fintechglobal.com', '{
  "board_pack_auto_archive_days": 730,
  "invitation_expires_hours": 48,
  "max_members": 200,
  "require_2fa": true,
  "allow_viewer_downloads": false,
  "auto_approve_domain_users": true,
  "approved_domains": ["fintechglobal.com", "ftgc.com"]
}'),
('03456789-abcd-ef01-2345-6789abcdef01', 'MedCare Health Systems', 'medcare-health-systems', 'Integrated healthcare technology platform', '33333333-3333-3333-3333-333333333333', 'large', 'Healthcare', 'https://medcare.health', '{
  "board_pack_auto_archive_days": 2555,
  "invitation_expires_hours": 24,
  "max_members": 500,
  "require_2fa": true,
  "allow_viewer_downloads": true,
  "auto_approve_domain_users": false,
  "approved_domains": ["medcare.health"]
}'),
('04567890-bcde-f012-3456-789abcdef012', 'Industrial Dynamics Ltd', 'industrial-dynamics-ltd', 'Smart manufacturing and IoT solutions', '44444444-4444-4444-4444-444444444444', 'enterprise', 'Manufacturing', 'https://industrialdynamics.com', '{
  "board_pack_auto_archive_days": 1095,
  "invitation_expires_hours": 96,
  "max_members": 1000,
  "require_2fa": true,
  "allow_viewer_downloads": true,
  "auto_approve_domain_users": true,
  "approved_domains": ["industrialdynamics.com", "id-corp.com"]
}');

-- =====================================================
-- 2. USERS
-- =====================================================

INSERT INTO users (id, email, full_name, role, status, company, position, created_at, approved_at, approved_by, password_set) VALUES
-- TechFlow Users
('11111111-1111-1111-1111-111111111111', 'sarah.chen@techflow.com', 'Sarah Chen', 'admin', 'approved', 'TechFlow Innovations', 'CEO & Founder', '2024-01-15T09:00:00Z', '2024-01-15T09:00:00Z', NULL, true),
('11111111-1111-1111-1111-111111111112', 'michael.rodriguez@techflow.com', 'Michael Rodriguez', 'director', 'approved', 'TechFlow Innovations', 'CTO', '2024-01-16T10:30:00Z', '2024-01-16T10:30:00Z', '11111111-1111-1111-1111-111111111111', true),
('11111111-1111-1111-1111-111111111113', 'emily.wang@techflow.com', 'Emily Wang', 'director', 'approved', 'TechFlow Innovations', 'CFO', '2024-01-17T14:15:00Z', '2024-01-17T14:15:00Z', '11111111-1111-1111-1111-111111111111', true),
('11111111-1111-1111-1111-111111111114', 'david.kim@techflow.com', 'David Kim', 'viewer', 'approved', 'TechFlow Innovations', 'Legal Counsel', '2024-01-18T11:45:00Z', '2024-01-18T11:45:00Z', '11111111-1111-1111-1111-111111111111', true),

-- FinTech Users
('22222222-2222-2222-2222-222222222222', 'robert.thomson@fintechglobal.com', 'Robert Thomson', 'admin', 'approved', 'FinTech Global Corp', 'Chief Executive Officer', '2024-01-10T08:00:00Z', '2024-01-10T08:00:00Z', NULL, true),
('22222222-2222-2222-2222-222222222223', 'lisa.martinez@fintechglobal.com', 'Lisa Martinez', 'director', 'approved', 'FinTech Global Corp', 'Chief Operating Officer', '2024-01-11T09:30:00Z', '2024-01-11T09:30:00Z', '22222222-2222-2222-2222-222222222222', true),
('22222222-2222-2222-2222-222222222224', 'james.anderson@fintechglobal.com', 'James Anderson', 'director', 'approved', 'FinTech Global Corp', 'Chief Risk Officer', '2024-01-12T13:20:00Z', '2024-01-12T13:20:00Z', '22222222-2222-2222-2222-222222222222', true),
('22222222-2222-2222-2222-222222222225', 'maria.garcia@fintechglobal.com', 'Maria Garcia', 'viewer', 'approved', 'FinTech Global Corp', 'Compliance Director', '2024-01-13T16:10:00Z', '2024-01-13T16:10:00Z', '22222222-2222-2222-2222-222222222222', true),

-- MedCare Users
('33333333-3333-3333-3333-333333333333', 'dr.patricia.lee@medcare.health', 'Dr. Patricia Lee', 'admin', 'approved', 'MedCare Health Systems', 'Chief Executive Officer', '2024-01-05T07:30:00Z', '2024-01-05T07:30:00Z', NULL, true),
('33333333-3333-3333-3333-333333333334', 'dr.john.davis@medcare.health', 'Dr. John Davis', 'director', 'approved', 'MedCare Health Systems', 'Chief Medical Officer', '2024-01-06T08:45:00Z', '2024-01-06T08:45:00Z', '33333333-3333-3333-3333-333333333333', true),
('33333333-3333-3333-3333-333333333335', 'jennifer.brown@medcare.health', 'Jennifer Brown', 'director', 'approved', 'MedCare Health Systems', 'Chief Financial Officer', '2024-01-07T12:00:00Z', '2024-01-07T12:00:00Z', '33333333-3333-3333-3333-333333333333', true),
('33333333-3333-3333-3333-333333333336', 'dr.susan.miller@medcare.health', 'Dr. Susan Miller', 'viewer', 'approved', 'MedCare Health Systems', 'Quality Assurance Director', '2024-01-08T15:30:00Z', '2024-01-08T15:30:00Z', '33333333-3333-3333-3333-333333333333', true),

-- Industrial Dynamics Users
('44444444-4444-4444-4444-444444444444', 'thomas.wilson@industrialdynamics.com', 'Thomas Wilson', 'admin', 'approved', 'Industrial Dynamics Ltd', 'Chief Executive Officer', '2024-01-01T08:00:00Z', '2024-01-01T08:00:00Z', NULL, true),
('44444444-4444-4444-4444-444444444445', 'amanda.taylor@industrialdynamics.com', 'Amanda Taylor', 'director', 'approved', 'Industrial Dynamics Ltd', 'Chief Operating Officer', '2024-01-02T09:15:00Z', '2024-01-02T09:15:00Z', '44444444-4444-4444-4444-444444444444', true),
('44444444-4444-4444-4444-444444444446', 'christopher.moore@industrialdynamics.com', 'Christopher Moore', 'director', 'approved', 'Industrial Dynamics Ltd', 'Chief Technology Officer', '2024-01-03T10:30:00Z', '2024-01-03T10:30:00Z', '44444444-4444-4444-4444-444444444444', true),
('44444444-4444-4444-4444-444444444447', 'rachel.clark@industrialdynamics.com', 'Rachel Clark', 'viewer', 'approved', 'Industrial Dynamics Ltd', 'Safety & Compliance Director', '2024-01-04T14:45:00Z', '2024-01-04T14:45:00Z', '44444444-4444-4444-4444-444444444444', true);

-- =====================================================
-- 3. ORGANIZATION MEMBERS
-- =====================================================

INSERT INTO organization_members (organization_id, user_id, role, status, joined_at, is_primary) VALUES
-- TechFlow Members
('01234567-89ab-cdef-0123-456789abcdef', '11111111-1111-1111-1111-111111111111', 'owner', 'active', '2024-01-15T09:00:00Z', true),
('01234567-89ab-cdef-0123-456789abcdef', '11111111-1111-1111-1111-111111111112', 'admin', 'active', '2024-01-16T10:30:00Z', false),
('01234567-89ab-cdef-0123-456789abcdef', '11111111-1111-1111-1111-111111111113', 'member', 'active', '2024-01-17T14:15:00Z', false),
('01234567-89ab-cdef-0123-456789abcdef', '11111111-1111-1111-1111-111111111114', 'viewer', 'active', '2024-01-18T11:45:00Z', false),

-- FinTech Members
('02345678-9abc-def0-1234-56789abcdef0', '22222222-2222-2222-2222-222222222222', 'owner', 'active', '2024-01-10T08:00:00Z', true),
('02345678-9abc-def0-1234-56789abcdef0', '22222222-2222-2222-2222-222222222223', 'admin', 'active', '2024-01-11T09:30:00Z', false),
('02345678-9abc-def0-1234-56789abcdef0', '22222222-2222-2222-2222-222222222224', 'member', 'active', '2024-01-12T13:20:00Z', false),
('02345678-9abc-def0-1234-56789abcdef0', '22222222-2222-2222-2222-222222222225', 'viewer', 'active', '2024-01-13T16:10:00Z', false),

-- MedCare Members
('03456789-abcd-ef01-2345-6789abcdef01', '33333333-3333-3333-3333-333333333333', 'owner', 'active', '2024-01-05T07:30:00Z', true),
('03456789-abcd-ef01-2345-6789abcdef01', '33333333-3333-3333-3333-333333333334', 'admin', 'active', '2024-01-06T08:45:00Z', false),
('03456789-abcd-ef01-2345-6789abcdef01', '33333333-3333-3333-3333-333333333335', 'member', 'active', '2024-01-07T12:00:00Z', false),
('03456789-abcd-ef01-2345-6789abcdef01', '33333333-3333-3333-3333-333333333336', 'viewer', 'active', '2024-01-08T15:30:00Z', false),

-- Industrial Dynamics Members
('04567890-bcde-f012-3456-789abcdef012', '44444444-4444-4444-4444-444444444444', 'owner', 'active', '2024-01-01T08:00:00Z', true),
('04567890-bcde-f012-3456-789abcdef012', '44444444-4444-4444-4444-444444444445', 'admin', 'active', '2024-01-02T09:15:00Z', false),
('04567890-bcde-f012-3456-789abcdef012', '44444444-4444-4444-4444-444444444446', 'member', 'active', '2024-01-03T10:30:00Z', false),
('04567890-bcde-f012-3456-789abcdef012', '44444444-4444-4444-4444-444444444447', 'viewer', 'active', '2024-01-04T14:45:00Z', false);

-- =====================================================
-- 4. VAULTS
-- =====================================================

INSERT INTO vaults (id, organization_id, name, description, created_by, status, category, meeting_date, location) VALUES
-- TechFlow Vaults
('a1111111-1111-1111-1111-111111111111', '01234567-89ab-cdef-0123-456789abcdef', 'Q1 2024 Board Meeting', 'Quarterly board review and strategic planning', '11111111-1111-1111-1111-111111111111', 'active', 'quarterly_board', '2024-03-15T14:00:00Z', 'San Francisco HQ'),
('a1111111-1111-1111-1111-111111111112', '01234567-89ab-cdef-0123-456789abcdef', 'Annual Audit 2024', 'Financial audit and compliance review', '11111111-1111-1111-1111-111111111113', 'active', 'audit', '2024-02-28T10:00:00Z', 'Virtual'),

-- FinTech Vaults
('a2222222-2222-2222-2222-222222222221', '02345678-9abc-def0-1234-56789abcdef0', 'Monthly Board Review - January', 'Monthly governance and risk assessment', '22222222-2222-2222-2222-222222222222', 'active', 'monthly_board', '2024-01-25T15:00:00Z', 'New York Office'),
('a2222222-2222-2222-2222-222222222222', '02345678-9abc-def0-1234-56789abcdef0', 'Risk Committee Q1', 'Quarterly risk management review', '22222222-2222-2222-2222-222222222224', 'active', 'risk_committee', '2024-02-15T11:00:00Z', 'Chicago Office'),

-- MedCare Vaults
('a3333333-3333-3333-3333-333333333331', '03456789-abcd-ef01-2345-6789abcdef01', 'Board Meeting - February 2024', 'Strategic healthcare initiatives review', '33333333-3333-3333-3333-333333333333', 'active', 'monthly_board', '2024-02-20T13:00:00Z', 'Boston Medical Center'),
('a3333333-3333-3333-3333-333333333332', '03456789-abcd-ef01-2345-6789abcdef01', 'Quality Assurance Review', 'Patient safety and quality metrics', '33333333-3333-3333-3333-333333333336', 'active', 'quality_review', '2024-02-10T09:00:00Z', 'Quality Dept Conference Room'),

-- Industrial Dynamics Vaults
('a4444444-4444-4444-4444-444444444441', '04567890-bcde-f012-3456-789abcdef012', 'Q4 2023 Board Review', 'Year-end performance and 2024 planning', '44444444-4444-4444-4444-444444444444', 'active', 'quarterly_board', '2024-01-30T16:00:00Z', 'Detroit Manufacturing Plant'),
('a4444444-4444-4444-4444-444444444442', '04567890-bcde-f012-3456-789abcdef012', 'Safety Committee January', 'Monthly safety and compliance review', '44444444-4444-4444-4444-444444444447', 'active', 'safety_committee', '2024-01-15T08:00:00Z', 'Safety Training Center');

-- =====================================================
-- 5. ASSETS (PDF DOCUMENTS)
-- =====================================================

INSERT INTO assets (id, owner_id, title, description, file_name, original_file_name, file_path, file_size, file_type, mime_type, storage_bucket, category, visibility, created_at) VALUES
-- TechFlow Assets
('b1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Q1 2024 Board Pack', 'Comprehensive board materials for Q1 review', 'techflow_q1_2024_board_pack.pdf', 'TechFlow Q1 2024 Board Pack.pdf', '/uploads/techflow/board_packs/q1_2024.pdf', 2547200, 'pdf', 'application/pdf', 'assets', 'board_pack', 'organization', '2024-03-10T10:00:00Z'),
('b1111111-1111-1111-1111-111111111112', '11111111-1111-1111-1111-111111111113', 'Q1 Financial Statements', 'Detailed financial performance Q1 2024', 'techflow_q1_financials.pdf', 'TechFlow Q1 Financials.pdf', '/uploads/techflow/financials/q1_2024.pdf', 1856400, 'pdf', 'application/pdf', 'assets', 'financial', 'organization', '2024-03-08T15:30:00Z'),

-- FinTech Assets  
('b2222222-2222-2222-2222-222222222221', '22222222-2222-2222-2222-222222222224', 'Risk Assessment Report Q1', 'Comprehensive risk analysis and mitigation strategies', 'fintech_risk_assessment_q1.pdf', 'FinTech Risk Assessment Q1.pdf', '/uploads/fintech/risk/q1_2024.pdf', 3145728, 'pdf', 'application/pdf', 'assets', 'risk_management', 'organization', '2024-02-10T11:15:00Z'),
('b2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222225', 'Regulatory Compliance Update', 'Latest regulatory changes and compliance status', 'fintech_compliance_update.pdf', 'FinTech Compliance Update.pdf', '/uploads/fintech/compliance/jan_2024.pdf', 1245184, 'pdf', 'application/pdf', 'assets', 'compliance', 'organization', '2024-01-20T14:20:00Z'),

-- MedCare Assets
('b3333333-3333-3333-3333-333333333331', '33333333-3333-3333-3333-333333333336', 'Patient Quality Metrics Q1', 'Comprehensive patient safety and quality indicators', 'medcare_quality_metrics_q1.pdf', 'MedCare Quality Metrics Q1.pdf', '/uploads/medcare/quality/q1_2024.pdf', 2097152, 'pdf', 'application/pdf', 'assets', 'quality_metrics', 'organization', '2024-02-05T09:45:00Z'),
('b3333333-3333-3333-3333-333333333332', '33333333-3333-3333-3333-333333333333', 'Strategic Plan 2024-2026', 'Three-year strategic healthcare initiatives plan', 'medcare_strategic_plan_2024.pdf', 'MedCare Strategic Plan 2024-2026.pdf', '/uploads/medcare/strategy/2024_plan.pdf', 4194304, 'pdf', 'application/pdf', 'assets', 'strategic_plan', 'organization', '2024-02-15T13:00:00Z'),

-- Industrial Dynamics Assets
('b4444444-4444-4444-4444-444444444441', '44444444-4444-4444-4444-444444444447', 'Safety Performance Report 2023', 'Annual safety statistics and improvement initiatives', 'industrial_safety_report_2023.pdf', 'Industrial Safety Report 2023.pdf', '/uploads/industrial/safety/2023_annual.pdf', 2621440, 'pdf', 'application/pdf', 'assets', 'safety_report', 'organization', '2024-01-10T08:30:00Z'),
('b4444444-4444-4444-4444-444444444442', '44444444-4444-4444-4444-444444444445', 'Operations Review Q4 2023', 'Manufacturing efficiency and operational metrics', 'industrial_operations_q4_2023.pdf', 'Industrial Operations Q4 2023.pdf', '/uploads/industrial/operations/q4_2023.pdf', 3355443, 'pdf', 'application/pdf', 'assets', 'operations', 'organization', '2024-01-25T12:15:00Z');

-- =====================================================
-- 6. ANNOTATIONS
-- =====================================================

INSERT INTO asset_annotations (id, asset_id, organization_id, created_by, annotation_type, content, page_number, position, selected_text, comment_text, color, opacity, created_at) VALUES
-- TechFlow Board Pack Annotations
('c1111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111', '01234567-89ab-cdef-0123-456789abcdef', '11111111-1111-1111-1111-111111111112', 'highlight', 
 '{"text": "Q1 revenue exceeded projections by 23%"}', 1, 
 '{"pageNumber": 1, "rects": [{"x1": 100, "y1": 200, "x2": 350, "y2": 220, "width": 250, "height": 20}], "boundingRect": {"x1": 100, "y1": 200, "x2": 350, "y2": 220, "width": 250, "height": 20}}',
 'Q1 revenue exceeded projections by 23%', 'Great news! This puts us ahead of our annual targets.', '#FFFF00', 0.3, '2024-03-11T09:15:00Z'),

('c1111111-1111-1111-1111-111111111112', 'b1111111-1111-1111-1111-111111111111', '01234567-89ab-cdef-0123-456789abcdef', '11111111-1111-1111-1111-111111111113', 'highlight',
 '{"text": "Cash flow positive for the first time"}', 2,
 '{"pageNumber": 2, "rects": [{"x1": 120, "y1": 150, "x2": 400, "y2": 170, "width": 280, "height": 20}], "boundingRect": {"x1": 120, "y1": 150, "x2": 400, "y2": 170, "width": 280, "height": 20}}',
 'Cash flow positive for the first time', 'This is a major milestone! We should highlight this to investors.', '#00FF00', 0.3, '2024-03-11T10:30:00Z'),

-- FinTech Risk Report Annotations
('c2222222-2222-2222-2222-222222222221', 'b2222222-2222-2222-2222-222222222221', '02345678-9abc-def0-1234-56789abcdef0', '22222222-2222-2222-2222-222222222222', 'highlight',
 '{"text": "Credit risk exposure increased by 12% YoY"}', 3,
 '{"pageNumber": 3, "rects": [{"x1": 80, "y1": 300, "x2": 380, "y2": 320, "width": 300, "height": 20}], "boundingRect": {"x1": 80, "y1": 300, "x2": 380, "y2": 320, "width": 300, "height": 20}}',
 'Credit risk exposure increased by 12% YoY', 'We need to discuss mitigation strategies in our next risk committee meeting.', '#FFA500', 0.3, '2024-02-12T14:20:00Z'),

('c2222222-2222-2222-2222-222222222222', 'b2222222-2222-2222-2222-222222222221', '02345678-9abc-def0-1234-56789abcdef0', '22222222-2222-2222-2222-222222222225', 'highlight',
 '{"text": "New Basel III requirements take effect Q2"}', 4,
 '{"pageNumber": 4, "rects": [{"x1": 150, "y1": 180, "x2": 420, "y2": 200, "width": 270, "height": 20}], "boundingRect": {"x1": 150, "y1": 180, "x2": 420, "y2": 200, "width": 270, "height": 20}}',
 'New Basel III requirements take effect Q2', 'I have prepared the compliance roadmap for these new requirements.', '#0080FF', 0.3, '2024-02-13T11:45:00Z'),

-- MedCare Quality Metrics Annotations
('c3333333-3333-3333-3333-333333333331', 'b3333333-3333-3333-3333-333333333331', '03456789-abcd-ef01-2345-6789abcdef01', '33333333-3333-3333-3333-333333333333', 'highlight',
 '{"text": "Patient satisfaction scores improved to 4.8/5"}', 1,
 '{"pageNumber": 1, "rects": [{"x1": 90, "y1": 250, "x2": 370, "y2": 270, "width": 280, "height": 20}], "boundingRect": {"x1": 90, "y1": 250, "x2": 370, "y2": 270, "width": 280, "height": 20}}',
 'Patient satisfaction scores improved to 4.8/5', 'Excellent work by the patient care team! This is our highest score ever.', '#00FF00', 0.3, '2024-02-06T15:30:00Z'),

('c3333333-3333-3333-3333-333333333332', 'b3333333-3333-3333-3333-333333333331', '03456789-abcd-ef01-2345-6789abcdef01', '33333333-3333-3333-3333-333333333334', 'highlight',
 '{"text": "Readmission rates decreased by 8% this quarter"}', 2,
 '{"pageNumber": 2, "rects": [{"x1": 110, "y1": 320, "x2": 390, "y2": 340, "width": 280, "height": 20}], "boundingRect": {"x1": 110, "y1": 320, "x2": 390, "y2": 340, "width": 280, "height": 20}}',
 'Readmission rates decreased by 8% this quarter', 'The new discharge protocols are working well. Let''s document best practices.', '#FFFF00', 0.3, '2024-02-07T09:20:00Z'),

-- Industrial Safety Report Annotations
('c4444444-4444-4444-4444-444444444441', 'b4444444-4444-4444-4444-444444444441', '04567890-bcde-f012-3456-789abcdef012', '44444444-4444-4444-4444-444444444444', 'highlight',
 '{"text": "Zero workplace accidents for 120 consecutive days"}', 1,
 '{"pageNumber": 1, "rects": [{"x1": 100, "y1": 280, "x2": 420, "y2": 300, "width": 320, "height": 20}], "boundingRect": {"x1": 100, "y1": 280, "x2": 420, "y2": 300, "width": 320, "height": 20}}',
 'Zero workplace accidents for 120 consecutive days', 'Outstanding safety performance! This deserves company-wide recognition.', '#00FF00', 0.3, '2024-01-12T16:45:00Z'),

('c4444444-4444-4444-4444-444444444442', 'b4444444-4444-4444-4444-444444444441', '04567890-bcde-f012-3456-789abcdef012', '44444444-4444-4444-4444-444444444445', 'highlight',
 '{"text": "New safety training program shows 95% completion rate"}', 3,
 '{"pageNumber": 3, "rects": [{"x1": 120, "y1": 200, "x2": 450, "y2": 220, "width": 330, "height": 20}], "boundingRect": {"x1": 120, "y1": 200, "x2": 450, "y2": 220, "width": 330, "height": 20}}',
 'New safety training program shows 95% completion rate', 'The digital training platform is working well. Should we expand to other sites?', '#0080FF', 0.3, '2024-01-13T10:30:00Z');

-- =====================================================
-- 7. ANNOTATION REPLIES
-- =====================================================

INSERT INTO annotation_replies (id, annotation_id, reply_text, created_by, created_at) VALUES
-- Replies to TechFlow annotations
('d1111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 'Absolutely! We should prepare a detailed investor update highlighting this achievement.', '11111111-1111-1111-1111-111111111111', '2024-03-11T09:30:00Z'),
('d1111111-1111-1111-1111-111111111112', 'c1111111-1111-1111-1111-111111111111', 'I can prepare the financial breakdown showing the key drivers of this growth.', '11111111-1111-1111-1111-111111111113', '2024-03-11T11:15:00Z'),
('d1111111-1111-1111-1111-111111111113', 'c1111111-1111-1111-1111-111111111112', 'I agree - this milestone should be prominently featured in our next funding round materials.', '11111111-1111-1111-1111-111111111111', '2024-03-11T10:45:00Z'),

-- Replies to FinTech annotations  
('d2222222-2222-2222-2222-222222222221', 'c2222222-2222-2222-2222-222222222221', 'Let''s schedule a deep dive session to review the specific sectors driving this increase.', '22222222-2222-2222-2222-222222222223', '2024-02-12T15:00:00Z'),
('d2222222-2222-2222-2222-222222222222', 'c2222222-2222-2222-2222-222222222221', 'I recommend we stress test our current risk models against this new exposure level.', '22222222-2222-2222-2222-222222222224', '2024-02-12T16:30:00Z'),
('d2222222-2222-2222-2222-222222222223', 'c2222222-2222-2222-2222-222222222222', 'Thanks Maria! Can you present the roadmap at next week''s board meeting?', '22222222-2222-2222-2222-222222222222', '2024-02-13T12:00:00Z'),

-- Replies to MedCare annotations
('d3333333-3333-3333-3333-333333333331', 'c3333333-3333-3333-3333-333333333331', 'This is fantastic! The patient experience improvement initiative is clearly working.', '33333333-3333-3333-3333-333333333334', '2024-02-06T16:00:00Z'),
('d3333333-3333-3333-3333-333333333332', 'c3333333-3333-3333-3333-333333333332', 'Yes, let''s schedule a knowledge sharing session with other departments.', '33333333-3333-3333-3333-333333333336', '2024-02-07T10:15:00Z'),
('d3333333-3333-3333-3333-333333333333', 'c3333333-3333-3333-3333-333333333331', 'We should nominate the patient care team for the quarterly excellence award.', '33333333-3333-3333-3333-333333333335', '2024-02-06T17:30:00Z'),

-- Replies to Industrial annotations
('d4444444-4444-4444-4444-444444444441', 'c4444444-4444-4444-4444-444444444441', 'This achievement should be celebrated across all our manufacturing sites!', '44444444-4444-4444-4444-444444444445', '2024-01-12T17:00:00Z'),
('d4444444-4444-4444-4444-444444444442', 'c4444444-4444-4444-4444-444444444442', 'Yes, the Detroit site would be perfect for the pilot expansion.', '44444444-4444-4444-4444-444444444447', '2024-01-13T11:00:00Z'),
('d4444444-4444-4444-4444-444444444443', 'c4444444-4444-4444-4444-444444444441', 'I''ll work with HR to plan a safety achievement celebration event.', '44444444-4444-4444-4444-444444444445', '2024-01-12T18:15:00Z');

-- =====================================================
-- 8. ANNOTATION REACTIONS
-- =====================================================

INSERT INTO annotation_reactions (annotation_id, user_id, emoji, created_at) VALUES
-- Reactions to positive annotations
('c1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', '🎉', '2024-03-11T09:20:00Z'),
('c1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111114', '👍', '2024-03-11T12:00:00Z'),
('c1111111-1111-1111-1111-111111111112', '11111111-1111-1111-1111-111111111112', '🚀', '2024-03-11T10:35:00Z'),
('c1111111-1111-1111-1111-111111111112', '11111111-1111-1111-1111-111111111111', '💰', '2024-03-11T10:50:00Z'),

('c3333333-3333-3333-3333-333333333331', '33333333-3333-3333-3333-333333333334', '❤️', '2024-02-06T15:45:00Z'),
('c3333333-3333-3333-3333-333333333331', '33333333-3333-3333-3333-333333333335', '👏', '2024-02-06T17:00:00Z'),
('c3333333-3333-3333-3333-333333333332', '33333333-3333-3333-3333-333333333333', '✅', '2024-02-07T09:30:00Z'),

('c4444444-4444-4444-4444-444444444441', '44444444-4444-4444-4444-444444444445', '🏆', '2024-01-12T16:50:00Z'),
('c4444444-4444-4444-4444-444444444441', '44444444-4444-4444-4444-444444444446', '💪', '2024-01-12T19:00:00Z'),
('c4444444-4444-4444-4444-444444444442', '44444444-4444-4444-4444-444444444444', '📚', '2024-01-13T11:15:00Z');

-- =====================================================
-- 9. USER ANNOTATION PREFERENCES
-- =====================================================

INSERT INTO user_annotation_preferences (user_id, default_color, default_opacity, show_all_annotations, notify_on_mentions, notify_on_replies, created_at) VALUES
('11111111-1111-1111-1111-111111111111', '#FFFF00', 0.3, true, true, true, '2024-03-11T09:00:00Z'),
('11111111-1111-1111-1111-111111111112', '#00FF00', 0.4, true, true, false, '2024-03-11T09:05:00Z'),
('11111111-1111-1111-1111-111111111113', '#0080FF', 0.3, true, true, true, '2024-03-11T09:10:00Z'),
('11111111-1111-1111-1111-111111111114', '#FFA500', 0.2, false, true, false, '2024-03-11T09:15:00Z'),

('22222222-2222-2222-2222-222222222222', '#FF69B4', 0.3, true, true, true, '2024-02-12T14:00:00Z'),
('22222222-2222-2222-2222-222222222223', '#8A2BE2', 0.3, true, true, true, '2024-02-12T14:05:00Z'),
('22222222-2222-2222-2222-222222222224', '#FF4444', 0.4, true, true, true, '2024-02-12T14:10:00Z'),
('22222222-2222-2222-2222-222222222225', '#0080FF', 0.3, true, true, false, '2024-02-12T14:15:00Z'),

('33333333-3333-3333-3333-333333333333', '#00FF00', 0.3, true, true, true, '2024-02-06T15:00:00Z'),
('33333333-3333-3333-3333-333333333334', '#FFFF00', 0.3, true, true, true, '2024-02-06T15:05:00Z'),
('33333333-3333-3333-3333-333333333335', '#0080FF', 0.3, true, true, false, '2024-02-06T15:10:00Z'),
('33333333-3333-3333-3333-333333333336', '#FFA500', 0.3, true, true, true, '2024-02-06T15:15:00Z'),

('44444444-4444-4444-4444-444444444444', '#FF69B4', 0.3, true, true, true, '2024-01-12T16:30:00Z'),
('44444444-4444-4444-4444-444444444445', '#00FF00', 0.4, true, true, true, '2024-01-12T16:35:00Z'),
('44444444-4444-4444-4444-444444444446', '#8A2BE2', 0.3, true, true, false, '2024-01-12T16:40:00Z'),
('44444444-4444-4444-4444-444444444447', '#FF4444', 0.3, true, true, true, '2024-01-12T16:45:00Z');

-- =====================================================
-- 10. SAMPLE AUDIT LOGS
-- =====================================================

INSERT INTO audit_logs (organization_id, user_id, event_type, event_category, action, resource_type, resource_id, event_description, outcome, severity, ip_address, created_at) VALUES
-- TechFlow audit events
('01234567-89ab-cdef-0123-456789abcdef', '11111111-1111-1111-1111-111111111112', 'user_action', 'annotations', 'create_annotation', 'asset_annotation', 'c1111111-1111-1111-1111-111111111111', 'Created annotation on Q1 board pack', 'success', 'low', '192.168.1.101', '2024-03-11T09:15:00Z'),
('01234567-89ab-cdef-0123-456789abcdef', '11111111-1111-1111-1111-111111111113', 'user_action', 'annotations', 'create_annotation', 'asset_annotation', 'c1111111-1111-1111-1111-111111111112', 'Created annotation on Q1 board pack', 'success', 'low', '192.168.1.102', '2024-03-11T10:30:00Z'),
('01234567-89ab-cdef-0123-456789abcdef', '11111111-1111-1111-1111-111111111111', 'user_action', 'annotations', 'create_reply', 'annotation_reply', 'd1111111-1111-1111-1111-111111111111', 'Replied to annotation on Q1 board pack', 'success', 'low', '192.168.1.100', '2024-03-11T09:30:00Z'),

-- FinTech audit events  
('02345678-9abc-def0-1234-56789abcdef0', '22222222-2222-2222-2222-222222222222', 'user_action', 'annotations', 'create_annotation', 'asset_annotation', 'c2222222-2222-2222-2222-222222222221', 'Created annotation on risk report', 'success', 'low', '10.0.1.100', '2024-02-12T14:20:00Z'),
('02345678-9abc-def0-1234-56789abcdef0', '22222222-2222-2222-2222-222222222225', 'user_action', 'annotations', 'create_annotation', 'asset_annotation', 'c2222222-2222-2222-2222-222222222222', 'Created annotation on risk report', 'success', 'low', '10.0.1.104', '2024-02-13T11:45:00Z'),

-- MedCare audit events
('03456789-abcd-ef01-2345-6789abcdef01', '33333333-3333-3333-3333-333333333333', 'user_action', 'annotations', 'create_annotation', 'asset_annotation', 'c3333333-3333-3333-3333-333333333331', 'Created annotation on quality metrics', 'success', 'low', '172.16.1.100', '2024-02-06T15:30:00Z'),
('03456789-abcd-ef01-2345-6789abcdef01', '33333333-3333-3333-3333-333333333334', 'user_action', 'annotations', 'create_annotation', 'asset_annotation', 'c3333333-3333-3333-3333-333333333332', 'Created annotation on quality metrics', 'success', 'low', '172.16.1.102', '2024-02-07T09:20:00Z'),

-- Industrial audit events
('04567890-bcde-f012-3456-789abcdef012', '44444444-4444-4444-4444-444444444444', 'user_action', 'annotations', 'create_annotation', 'asset_annotation', 'c4444444-4444-4444-4444-444444444441', 'Created annotation on safety report', 'success', 'low', '203.0.113.100', '2024-01-12T16:45:00Z'),
('04567890-bcde-f012-3456-789abcdef012', '44444444-4444-4444-4444-444444444445', 'user_action', 'annotations', 'create_annotation', 'asset_annotation', 'c4444444-4444-4444-4444-444444444442', 'Created annotation on safety report', 'success', 'low', '203.0.113.101', '2024-01-13T10:30:00Z');

-- =====================================================
-- SUMMARY
-- =====================================================

/*
FIXED VERSION WITH PROPER UUIDs

This synthetic data creates:
✅ 4 Organizations with realistic business profiles
✅ 16 Users (4 per organization) with proper roles
✅ 16 Organization memberships with correct permissions  
✅ 8 Vaults for different meeting types
✅ 8 PDF Assets with business-relevant content
✅ 8 Annotations with realistic business comments
✅ 12 Threaded replies showing collaboration
✅ 10 Emoji reactions celebrating achievements
✅ 16 User annotation preferences
✅ 8 Audit log entries tracking activities

All IDs are now proper UUIDs compatible with PostgreSQL!
*/