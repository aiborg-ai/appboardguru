-- Migration: Add token columns to registration_requests table
-- Run this in your Supabase SQL Editor

-- Add approval token and expiration columns
ALTER TABLE registration_requests 
ADD COLUMN IF NOT EXISTS approval_token TEXT,
ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ;

-- Create index for token lookups (performance optimization)
CREATE INDEX IF NOT EXISTS idx_registration_requests_approval_token 
ON registration_requests(approval_token) 
WHERE approval_token IS NOT NULL;

-- Create index for token expiration cleanup
CREATE INDEX IF NOT EXISTS idx_registration_requests_token_expires_at 
ON registration_requests(token_expires_at) 
WHERE token_expires_at IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN registration_requests.approval_token IS 'Secure token for email approval/rejection links';
COMMENT ON COLUMN registration_requests.token_expires_at IS 'Token expiration timestamp (24-48 hours from creation)';

-- Update the main schema file reference (for future deployments)
-- This migration adds token-based security for registration approval workflow