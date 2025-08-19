-- Demo Data Setup for BoardGuru Testing
-- Run this in your Supabase SQL Editor

-- First, ensure the database schema is set up
-- (Run the main supabase-schema.sql first if not already done)

-- Create a demo user (this will be created when they first sign in, but we can prepare the profile)
-- Note: Supabase auth users are created through the auth flow, so we'll create pending registration requests instead

-- 1. Create demo registration requests for testing the approval flow
INSERT INTO registration_requests (
  id,
  email,
  full_name,
  company,
  position,
  message,
  status,
  created_at
) VALUES 
(
  gen_random_uuid(),
  'demo.director@boardguru.ai',
  'Demo Director',
  'BoardGuru Demo Corp',
  'Chief Executive Officer',
  'This is a demo account for testing the BoardGuru platform approval workflow.',
  'pending',
  NOW()
),
(
  gen_random_uuid(), 
  'jane.smith@techcorp.com',
  'Jane Smith',
  'TechCorp Industries',
  'Board Member',
  'Requesting access to review quarterly board materials and participate in governance activities.',
  'pending',
  NOW()
),
(
  gen_random_uuid(),
  'approved.user@example.com', 
  'Already Approved User',
  'Example Company',
  'Board Chair',
  'This user should be pre-approved for immediate testing.',
  'approved',
  NOW()
);

-- 2. Create some demo users in the users table (these would normally be created after Supabase auth)
-- We'll create them as if they've already gone through the auth process
-- Note: The UUIDs here are fake - in real usage, they come from Supabase auth

-- Insert demo users (simulating post-auth creation)
INSERT INTO users (
  id,
  email,
  full_name,
  role,
  status,
  company,
  position,
  created_at,
  approved_at,
  approved_by
) VALUES 
(
  gen_random_uuid(),
  'demo.director@boardguru.ai',
  'Demo Director',
  'director',
  'approved', 
  'BoardGuru Demo Corp',
  'Chief Executive Officer',
  NOW(),
  NOW(),
  gen_random_uuid()
),
(
  gen_random_uuid(),
  'admin@boardguru.ai',
  'BoardGuru Admin',
  'admin',
  'approved',
  'BoardGuru',
  'Platform Administrator', 
  NOW() - INTERVAL '30 days',
  NOW() - INTERVAL '30 days',
  gen_random_uuid()
);

-- 3. Create some demo board packs for testing
INSERT INTO board_packs (
  id,
  title,
  description,
  file_path,
  file_name,
  file_size,
  file_type,
  uploaded_by,
  status,
  summary,
  created_at,
  watermark_applied
) VALUES
(
  gen_random_uuid(),
  'Q4 2024 Board Package',
  'Complete quarterly board materials including financial reports, strategic updates, and governance matters.',
  '/demo/q4-2024-board-package.pdf',
  'Q4_2024_Board_Package.pdf',
  2500000,
  'application/pdf',
  (SELECT id FROM users WHERE email = 'demo.director@boardguru.ai'),
  'ready',
  'This quarterly board package covers Q4 2024 performance with revenue growth of 15% YoY. Key highlights include successful product launches, expansion into new markets, and strong financial performance. The package includes detailed financial statements, strategic initiatives progress, risk assessment updates, and recommendations for Q1 2025 priorities.',
  NOW() - INTERVAL '2 days',
  true
),
(
  gen_random_uuid(), 
  'Strategic Planning Session Materials',
  'Materials for the upcoming strategic planning session including market analysis and growth opportunities.',
  '/demo/strategic-planning-2025.pdf',
  'Strategic_Planning_2025.pdf',
  1800000,
  'application/pdf',
  (SELECT id FROM users WHERE email = 'demo.director@boardguru.ai'),
  'ready',
  'Strategic planning materials for 2025 focusing on digital transformation, market expansion, and operational efficiency. Includes competitive analysis, market opportunities assessment, resource allocation recommendations, and key performance indicators for the upcoming fiscal year.',
  NOW() - INTERVAL '5 days',
  true
);

-- 4. Create some audit logs for demo activity
INSERT INTO audit_logs (
  id,
  user_id,
  action,
  resource_type,
  resource_id,
  details,
  created_at
) VALUES
(
  gen_random_uuid(),
  (SELECT id FROM users WHERE email = 'demo.director@boardguru.ai'),
  'document_uploaded',
  'board_pack',
  gen_random_uuid(),
  '{"file_name": "Q4_2024_Board_Package.pdf", "file_size": 2500000}',
  NOW() - INTERVAL '2 days'
),
(
  gen_random_uuid(),
  (SELECT id FROM users WHERE email = 'demo.director@boardguru.ai'), 
  'document_summarized',
  'board_pack',
  gen_random_uuid(),
  '{"summary_generated": true, "ai_model": "claude-3-5-sonnet"}',
  NOW() - INTERVAL '2 days'
),
(
  gen_random_uuid(),
  (SELECT id FROM users WHERE email = 'admin@boardguru.ai'),
  'user_approved',
  'registration_request', 
  gen_random_uuid(),
  '{"approved_user": "approved.user@example.com", "approval_method": "email"}',
  NOW() - INTERVAL '1 day'
);

-- 5. Grant necessary permissions and update RLS policies if needed
-- Ensure that the demo users can access their data properly

-- Update RLS policies to allow demo data access (if needed)
-- The existing policies should work, but let's ensure demo users can access their content

COMMENT ON TABLE registration_requests IS 'Demo data created for testing BoardGuru approval workflow';
COMMENT ON TABLE users IS 'Includes demo users for testing authenticated features';
COMMENT ON TABLE board_packs IS 'Demo board packages with pre-generated summaries';
COMMENT ON TABLE audit_logs IS 'Demo audit trail showing platform activity';

-- Instructions for testing:
-- 1. Use demo.director@boardguru.ai for login testing
-- 2. Use the registration requests to test the approval email workflow  
-- 3. The demo board packs can be used to test document viewing and AI features
-- 4. Check audit logs to see activity tracking in action

SELECT 'Demo data setup complete! Ready for testing.' as status;