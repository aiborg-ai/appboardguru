-- Migration: Add missing updated_at column if it doesn't exist
-- Agent: DBA-01 (Database Architect)
-- Purpose: Fix the registration_requests table to include updated_at column
-- Date: 2025-08-29

-- Add the updated_at column if it doesn't exist
ALTER TABLE registration_requests 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Create or replace the trigger function for updating updated_at
CREATE OR REPLACE FUNCTION update_registration_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop the trigger if it exists and recreate it
DROP TRIGGER IF EXISTS update_registration_requests_updated_at ON registration_requests;
CREATE TRIGGER update_registration_requests_updated_at
  BEFORE UPDATE ON registration_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_registration_requests_updated_at();

-- Update existing rows to have updated_at if null
UPDATE registration_requests 
SET updated_at = COALESCE(updated_at, created_at, now())
WHERE updated_at IS NULL;

-- Add comment
COMMENT ON COLUMN registration_requests.updated_at IS 'Timestamp of last update, automatically maintained by trigger';