-- Simple Demo Data Setup for BoardGuru Testing
-- This only creates registration requests to test the approval workflow
-- Run this in your Supabase SQL Editor

-- Clean up any existing demo data first
DELETE FROM registration_requests WHERE email IN (
  'demo.director@boardguru.ai',
  'jane.smith@techcorp.com', 
  'approved.user@example.com'
);

-- Create demo registration requests for testing the approval flow
INSERT INTO registration_requests (
  email,
  full_name,
  company,
  position,
  message,
  status,
  created_at
) VALUES 
(
  'demo.director@boardguru.ai',
  'Demo Director',
  'BoardGuru Demo Corp',
  'Chief Executive Officer',
  'This is a demo account for testing the BoardGuru platform approval workflow.',
  'pending',
  NOW()
),
(
  'jane.smith@techcorp.com',
  'Jane Smith',
  'TechCorp Industries',
  'Board Member',
  'Requesting access to review quarterly board materials and participate in governance activities.',
  'pending',
  NOW()
),
(
  'test.approved@example.com', 
  'Pre-Approved User',
  'Example Company',
  'Board Chair',
  'This user should be pre-approved for immediate testing.',
  'approved',
  NOW()
);

-- Verify the demo data was created
SELECT 
  email, 
  full_name, 
  company, 
  status, 
  created_at 
FROM registration_requests 
WHERE email IN (
  'demo.director@boardguru.ai',
  'jane.smith@techcorp.com',
  'test.approved@example.com'
)
ORDER BY created_at;

SELECT 'Simple demo data setup complete! Ready for approval workflow testing.' as status;