-- =====================================================
-- SIMPLIFIED SYNTHETIC DATA FOR TESTING
-- This version works around the auth.users constraint
-- =====================================================

-- Create synthetic data for the annotation system testing
-- Note: This assumes we're working with a development environment

-- Temporarily disable the foreign key constraint to auth.users
-- (This should only be done in development/testing environments)
ALTER TABLE users DISABLE TRIGGER ALL;

-- =====================================================
-- 1. USERS
-- =====================================================

INSERT INTO users (id, email, full_name, role, status, created_at, updated_at, avatar_url, company, position) VALUES
-- TechFlow Innovations Users
('11111111-1111-1111-1111-111111111111', 'ceo@techflow.com', 'Sarah Chen', 'admin', 'approved', NOW() - INTERVAL '30 days', NOW(), 'https://api.dicebear.com/7.x/avataaars/svg?seed=sarah', 'TechFlow Innovations', 'Chief Executive Officer'),
('11111111-1111-1111-1111-111111111112', 'cto@techflow.com', 'Marcus Rodriguez', 'director', 'approved', NOW() - INTERVAL '28 days', NOW(), 'https://api.dicebear.com/7.x/avataaars/svg?seed=marcus', 'TechFlow Innovations', 'Chief Technology Officer'),
('11111111-1111-1111-1111-111111111113', 'cfo@techflow.com', 'Lisa Zhang', 'director', 'approved', NOW() - INTERVAL '25 days', NOW(), 'https://api.dicebear.com/7.x/avataaars/svg?seed=lisa', 'TechFlow Innovations', 'Chief Financial Officer'),
('11111111-1111-1111-1111-111111111114', 'legal@techflow.com', 'David Kumar', 'viewer', 'approved', NOW() - INTERVAL '22 days', NOW(), 'https://api.dicebear.com/7.x/avataaars/svg?seed=david', 'TechFlow Innovations', 'Legal Counsel');

-- Re-enable triggers after user creation
ALTER TABLE users ENABLE TRIGGER ALL;

-- =====================================================
-- 2. ORGANIZATIONS 
-- =====================================================

INSERT INTO organizations (id, name, slug, description, created_by, organization_size, industry, website, settings) VALUES
('01234567-89ab-cdef-0123-456789abcdef', 'TechFlow Innovations', 'techflow-innovations', 'AI-powered SaaS solutions for enterprise automation', '11111111-1111-1111-1111-111111111111', 'startup', 'Technology', 'https://techflow.com', '{
  "board_pack_auto_archive_days": 365,
  "invitation_expires_hours": 72,
  "max_members": 50,
  "enable_audit_logs": true,
  "require_2fa": false,
  "allowed_file_types": ["pdf", "docx", "pptx", "xlsx"]
}');

-- =====================================================
-- 3. ORGANIZATION MEMBERS
-- =====================================================

INSERT INTO organization_members (organization_id, user_id, role, status, joined_at, is_primary) VALUES
-- TechFlow Members
('01234567-89ab-cdef-0123-456789abcdef', '11111111-1111-1111-1111-111111111111', 'owner', 'active', NOW() - INTERVAL '30 days', true),
('01234567-89ab-cdef-0123-456789abcdef', '11111111-1111-1111-1111-111111111112', 'admin', 'active', NOW() - INTERVAL '28 days', false),
('01234567-89ab-cdef-0123-456789abcdef', '11111111-1111-1111-1111-111111111113', 'member', 'active', NOW() - INTERVAL '25 days', false),
('01234567-89ab-cdef-0123-456789abcdef', '11111111-1111-1111-1111-111111111114', 'viewer', 'active', NOW() - INTERVAL '22 days', false);

-- =====================================================
-- 4. VAULTS
-- =====================================================

INSERT INTO vaults (id, organization_id, name, description, owner_id, vault_type, access_level, created_at, settings) VALUES
('v1111111-1111-1111-1111-111111111111', '01234567-89ab-cdef-0123-456789abcdef', 'Q1 2024 Board Meeting', 'First quarter board meeting materials and strategic planning documents', '11111111-1111-1111-1111-111111111111', 'board_pack', 'organization', NOW() - INTERVAL '20 days', '{
  "auto_expire_days": 90,
  "watermark_enabled": true,
  "download_enabled": true,
  "annotation_enabled": true
}'),
('v1111111-1111-1111-1111-111111111112', '01234567-89ab-cdef-0123-456789abcdef', 'Annual Strategy 2024', 'Annual strategic planning and financial projections', '11111111-1111-1111-1111-111111111111', 'document_set', 'restricted', NOW() - INTERVAL '15 days', '{
  "auto_expire_days": 365,
  "watermark_enabled": true,
  "download_enabled": false,
  "annotation_enabled": true
}');

-- =====================================================
-- 5. ASSETS (PDF DOCUMENTS)
-- =====================================================

INSERT INTO assets (id, vault_id, organization_id, owner_id, name, file_type, file_size, file_path, storage_path, upload_status, processing_status, created_at, metadata) VALUES
('a1111111-1111-1111-1111-111111111111', 'v1111111-1111-1111-1111-111111111111', '01234567-89ab-cdef-0123-456789abcdef', '11111111-1111-1111-1111-111111111111', 'Q1-2024-Financial-Report.pdf', 'pdf', 2458432, '/storage/techflow/q1-financial-report.pdf', 'techflow/q1-financial-report.pdf', 'completed', 'completed', NOW() - INTERVAL '18 days', '{
  "page_count": 24,
  "has_summary": true,
  "has_audio": true,
  "content_type": "financial_report",
  "classification": "confidential"
}'),
('a1111111-1111-1111-1111-111111111112', 'v1111111-1111-1111-1111-111111111111', '01234567-89ab-cdef-0123-456789abcdef', '11111111-1111-1111-1111-111111111112', 'Strategic-Plan-Q2-Q4.pdf', 'pdf', 3247891, '/storage/techflow/strategic-plan-q2-q4.pdf', 'techflow/strategic-plan-q2-q4.pdf', 'completed', 'completed', NOW() - INTERVAL '16 days', '{
  "page_count": 18,
  "has_summary": true,
  "has_audio": false,
  "content_type": "strategic_plan",
  "classification": "restricted"
}');

-- =====================================================
-- 6. ANNOTATIONS
-- =====================================================

INSERT INTO asset_annotations (id, asset_id, vault_id, organization_id, created_by, annotation_type, content, page_number, position, selected_text, comment_text, color, opacity, is_private, created_at) VALUES
-- Annotations on Q1 Financial Report
('ann11111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 'v1111111-1111-1111-1111-111111111111', '01234567-89ab-cdef-0123-456789abcdef', '11111111-1111-1111-1111-111111111112', 'highlight', '{"text": "Revenue increased by 23% compared to Q4 2023"}', 3, '{
  "pageNumber": 3,
  "rects": [{"x1": 120, "y1": 200, "x2": 450, "y2": 220, "width": 330, "height": 20}],
  "boundingRect": {"x1": 120, "y1": 200, "x2": 450, "y2": 220, "width": 330, "height": 20}
}', 'Revenue increased by 23% compared to Q4 2023', 'Great performance! This exceeds our projections.', '#FFFF00', 0.3, false, NOW() - INTERVAL '10 days'),

('ann11111-1111-1111-1111-111111111112', 'a1111111-1111-1111-1111-111111111111', 'v1111111-1111-1111-1111-111111111111', '01234567-89ab-cdef-0123-456789abcdef', '11111111-1111-1111-1111-111111111113', 'highlight', '{"text": "Operating expenses increased by 15%"}', 5, '{
  "pageNumber": 5,
  "rects": [{"x1": 80, "y1": 350, "x2": 380, "y2": 370, "width": 300, "height": 20}],
  "boundingRect": {"x1": 80, "y1": 350, "x2": 380, "y2": 370, "width": 300, "height": 20}
}', 'Operating expenses increased by 15%', 'We need to review these expenses in detail next quarter.', '#FF6B6B', 0.3, false, NOW() - INTERVAL '8 days'),

-- Annotations on Strategic Plan
('ann11111-1111-1111-1111-111111111113', 'a1111111-1111-1111-1111-111111111112', 'v1111111-1111-1111-1111-111111111111', '01234567-89ab-cdef-0123-456789abcdef', '11111111-1111-1111-1111-111111111111', 'highlight', '{"text": "AI integration roadmap for Q3-Q4"}', 2, '{
  "pageNumber": 2,
  "rects": [{"x1": 150, "y1": 180, "x2": 420, "y2": 200, "width": 270, "height": 20}],
  "boundingRect": {"x1": 150, "y1": 180, "x2": 420, "y2": 200, "width": 270, "height": 20}
}', 'AI integration roadmap for Q3-Q4', 'This aligns perfectly with our technology strategy. Approved.', '#4ECDC4', 0.3, false, NOW() - INTERVAL '7 days');

-- =====================================================
-- 7. ANNOTATION REPLIES
-- =====================================================

INSERT INTO annotation_replies (id, annotation_id, parent_reply_id, reply_text, created_by, created_at) VALUES
-- Replies to revenue growth annotation
('rep11111-1111-1111-1111-111111111111', 'ann11111-1111-1111-1111-111111111111', NULL, 'Agreed! Our new product launches really paid off this quarter.', '11111111-1111-1111-1111-111111111113', NOW() - INTERVAL '9 days'),
('rep11111-1111-1111-1111-111111111112', 'ann11111-1111-1111-1111-111111111111', 'rep11111-1111-1111-1111-111111111111', 'The marketing spend ROI was particularly strong in the enterprise segment.', '11111111-1111-1111-1111-111111111114', NOW() - INTERVAL '8 days'),

-- Replies to expenses annotation  
('rep11111-1111-1111-1111-111111111113', 'ann11111-1111-1111-1111-111111111112', NULL, 'Most of this increase is due to strategic hires in engineering and sales.', '11111111-1111-1111-1111-111111111112', NOW() - INTERVAL '7 days'),
('rep11111-1111-1111-1111-111111111114', 'ann11111-1111-1111-1111-111111111112', NULL, 'We should create a detailed expense breakdown for the next board meeting.', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '6 days');

-- =====================================================
-- 8. ANNOTATION REACTIONS
-- =====================================================

INSERT INTO annotation_reactions (id, annotation_id, reply_id, user_id, emoji, created_at) VALUES
-- Reactions to annotations
('react111-1111-1111-1111-111111111111', 'ann11111-1111-1111-1111-111111111111', NULL, '11111111-1111-1111-1111-111111111113', '👍', NOW() - INTERVAL '9 days'),
('react111-1111-1111-1111-111111111112', 'ann11111-1111-1111-1111-111111111111', NULL, '11111111-1111-1111-1111-111111111114', '🎉', NOW() - INTERVAL '8 days'),
('react111-1111-1111-1111-111111111113', 'ann11111-1111-1111-1111-111111111112', NULL, '11111111-1111-1111-1111-111111111111', '🤔', NOW() - INTERVAL '7 days'),

-- Reactions to replies
('react111-1111-1111-1111-111111111114', NULL, 'rep11111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111112', '💡', NOW() - INTERVAL '8 days'),
('react111-1111-1111-1111-111111111115', NULL, 'rep11111-1111-1111-1111-111111111113', '11111111-1111-1111-1111-111111111114', '👏', NOW() - INTERVAL '6 days');

-- =====================================================
-- 9. AUDIT LOGS
-- =====================================================

INSERT INTO audit_logs (id, organization_id, user_id, event_type, event_category, action, resource_type, resource_id, event_description, outcome, details, created_at) VALUES
('audit111-1111-1111-1111-111111111111', '01234567-89ab-cdef-0123-456789abcdef', '11111111-1111-1111-1111-111111111111', 'user_action', 'assets', 'create_asset', 'asset', 'a1111111-1111-1111-1111-111111111111', 'Uploaded Q1 Financial Report', 'success', '{"file_name": "Q1-2024-Financial-Report.pdf", "file_size": 2458432}', NOW() - INTERVAL '18 days'),
('audit111-1111-1111-1111-111111111112', '01234567-89ab-cdef-0123-456789abcdef', '11111111-1111-1111-1111-111111111112', 'user_action', 'annotations', 'create_annotation', 'asset_annotation', 'ann11111-1111-1111-1111-111111111111', 'Created annotation on financial report', 'success', '{"annotation_type": "highlight", "page_number": 3}', NOW() - INTERVAL '10 days'),
('audit111-1111-1111-1111-111111111113', '01234567-89ab-cdef-0123-456789abcdef', '11111111-1111-1111-1111-111111111113', 'user_action', 'annotations', 'create_reply', 'annotation_reply', 'rep11111-1111-1111-1111-111111111111', 'Replied to revenue annotation', 'success', '{"annotation_id": "ann11111-1111-1111-1111-111111111111"}', NOW() - INTERVAL '9 days');

-- Success message
SELECT 'Synthetic data created successfully! Ready to test PDF annotation system.' as result;