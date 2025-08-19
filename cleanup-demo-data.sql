-- Cleanup existing demo data before running demo-data.sql
-- Run this in Supabase SQL Editor first

-- Delete existing demo data (in correct order due to foreign key constraints)
DELETE FROM audit_logs WHERE user_id IN (
  SELECT id FROM users WHERE email IN (
    'demo.director@boardguru.ai', 
    'admin@boardguru.ai'
  )
);

DELETE FROM board_packs WHERE uploaded_by IN (
  SELECT id FROM users WHERE email IN (
    'demo.director@boardguru.ai', 
    'admin@boardguru.ai'
  )
);

DELETE FROM users WHERE email IN (
  'demo.director@boardguru.ai', 
  'admin@boardguru.ai'
);

DELETE FROM registration_requests WHERE email IN (
  'demo.director@boardguru.ai',
  'admin@boardguru.ai', 
  'jane.smith@techcorp.com',
  'approved.user@example.com'
);

-- Verify cleanup
SELECT 'Cleanup complete - ready for fresh demo data' as status;
SELECT COUNT(*) as remaining_demo_users FROM users WHERE email LIKE '%demo%' OR email LIKE '%admin@boardguru%';
SELECT COUNT(*) as remaining_demo_requests FROM registration_requests WHERE email LIKE '%demo%' OR email LIKE '%jane.smith%';