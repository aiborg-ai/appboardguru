-- =====================================================
-- TEST ANNOTATION SYSTEM DATA CREATION SCRIPT
-- This script helps you create test data after setting up users properly
-- =====================================================

-- INSTRUCTIONS:
-- 1. First, create users through your app's signup process or Supabase Auth
-- 2. Get their actual user IDs from the users table
-- 3. Replace the placeholder UUIDs below with real user IDs
-- 4. Then run this script

-- =====================================================
-- STEP 1: Check existing users (run this first)
-- =====================================================
-- Uncomment to see existing users:
-- SELECT id, email, full_name, role, status FROM users ORDER BY created_at DESC LIMIT 10;

-- =====================================================
-- STEP 2: Variables to replace with actual user IDs
-- =====================================================
-- Replace these with actual user IDs from your users table:
-- USER_1_ID: First user (will be org owner)
-- USER_2_ID: Second user  
-- USER_3_ID: Third user
-- USER_4_ID: Fourth user

-- =====================================================
-- TEMPLATE: Replace 'USER_X_ID' with actual UUIDs
-- =====================================================

-- Create organization
INSERT INTO organizations (id, name, slug, description, created_by, organization_size, industry, website, settings) VALUES
('01234567-89ab-cdef-0123-456789abcdef', 'TechFlow Innovations', 'techflow-innovations', 'AI-powered SaaS solutions for enterprise automation', 'USER_1_ID', 'startup', 'Technology', 'https://techflow.com', '{
  "board_pack_auto_archive_days": 365,
  "invitation_expires_hours": 72,
  "max_members": 50,
  "enable_audit_logs": true,
  "require_2fa": false,
  "allowed_file_types": ["pdf", "docx", "pptx", "xlsx"]
}');

-- Add organization members
INSERT INTO organization_members (organization_id, user_id, role, status, joined_at, is_primary) VALUES
('01234567-89ab-cdef-0123-456789abcdef', 'USER_1_ID', 'owner', 'active', NOW(), true),
('01234567-89ab-cdef-0123-456789abcdef', 'USER_2_ID', 'admin', 'active', NOW(), false),
('01234567-89ab-cdef-0123-456789abcdef', 'USER_3_ID', 'member', 'active', NOW(), false),
('01234567-89ab-cdef-0123-456789abcdef', 'USER_4_ID', 'viewer', 'active', NOW(), false);

-- Create vault
INSERT INTO vaults (id, organization_id, name, description, owner_id, vault_type, access_level, created_at, settings) VALUES
('v1111111-1111-1111-1111-111111111111', '01234567-89ab-cdef-0123-456789abcdef', 'Q1 2024 Board Meeting', 'Test vault with PDF for annotations', 'USER_1_ID', 'board_pack', 'organization', NOW(), '{
  "auto_expire_days": 90,
  "watermark_enabled": true,
  "download_enabled": true,
  "annotation_enabled": true
}');

-- Create test PDF asset
INSERT INTO assets (id, vault_id, organization_id, owner_id, name, file_type, file_size, file_path, storage_path, upload_status, processing_status, created_at, metadata) VALUES
('a1111111-1111-1111-1111-111111111111', 'v1111111-1111-1111-1111-111111111111', '01234567-89ab-cdef-0123-456789abcdef', 'USER_1_ID', 'Test-Board-Report.pdf', 'pdf', 2458432, '/test/board-report.pdf', 'test/board-report.pdf', 'completed', 'completed', NOW(), '{
  "page_count": 10,
  "has_summary": true,
  "has_audio": false,
  "content_type": "board_report",
  "classification": "confidential"
}');

-- Create test annotations
INSERT INTO asset_annotations (id, asset_id, vault_id, organization_id, created_by, annotation_type, content, page_number, position, selected_text, comment_text, color, opacity, is_private, created_at) VALUES
-- Annotation by user 2
('ann11111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 'v1111111-1111-1111-1111-111111111111', '01234567-89ab-cdef-0123-456789abcdef', 'USER_2_ID', 'highlight', '{"text": "Revenue increased by 15%"}', 1, '{
  "pageNumber": 1,
  "rects": [{"x1": 120, "y1": 200, "x2": 350, "y2": 220, "width": 230, "height": 20}],
  "boundingRect": {"x1": 120, "y1": 200, "x2": 350, "y2": 220, "width": 230, "height": 20}
}', 'Revenue increased by 15%', 'Excellent performance this quarter!', '#FFFF00', 0.3, false, NOW() - INTERVAL '5 days'),

-- Annotation by user 3
('ann11111-1111-1111-1111-111111111112', 'a1111111-1111-1111-1111-111111111111', 'v1111111-1111-1111-1111-111111111111', '01234567-89ab-cdef-0123-456789abcdef', 'USER_3_ID', 'highlight', '{"text": "Operating costs need review"}', 2, '{
  "pageNumber": 2,
  "rects": [{"x1": 80, "y1": 300, "x2": 380, "y2": 320, "width": 300, "height": 20}],
  "boundingRect": {"x1": 80, "y1": 300, "x2": 380, "y2": 320, "width": 300, "height": 20}
}', 'Operating costs need review', 'We should analyze this in detail next meeting.', '#FF6B6B', 0.3, false, NOW() - INTERVAL '3 days');

-- Create test replies
INSERT INTO annotation_replies (id, annotation_id, parent_reply_id, reply_text, created_by, created_at) VALUES
('rep11111-1111-1111-1111-111111111111', 'ann11111-1111-1111-1111-111111111111', NULL, 'I agree, our Q1 performance exceeded expectations!', 'USER_3_ID', NOW() - INTERVAL '4 days'),
('rep11111-1111-1111-1111-111111111112', 'ann11111-1111-1111-1111-111111111112', NULL, 'Should we schedule a deep dive session on this?', 'USER_1_ID', NOW() - INTERVAL '2 days');

-- Create test reactions
INSERT INTO annotation_reactions (id, annotation_id, reply_id, user_id, emoji, created_at) VALUES
('react111-1111-1111-1111-111111111111', 'ann11111-1111-1111-1111-111111111111', NULL, 'USER_1_ID', '👍', NOW() - INTERVAL '4 days'),
('react111-1111-1111-1111-111111111112', 'ann11111-1111-1111-1111-111111111111', NULL, 'USER_4_ID', '🎉', NOW() - INTERVAL '4 days'),
('react111-1111-1111-1111-111111111113', NULL, 'rep11111-1111-1111-1111-111111111111', 'USER_2_ID', '💡', NOW() - INTERVAL '3 days');

-- Show success message
SELECT 'Test annotation data template created!' as result,
       'Remember to replace USER_X_ID with actual user IDs before running!' as important_note;