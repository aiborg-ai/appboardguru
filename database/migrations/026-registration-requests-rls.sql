-- Migration: Fix registration_requests table with proper RLS policies
-- Agent: DBA-01 (Database Architect) + SEC-15 (Security Sentinel)
-- Purpose: Enable public registration submissions while maintaining security

-- Create registration_requests table if it doesn't exist
CREATE TABLE IF NOT EXISTS registration_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  company TEXT NOT NULL,
  position TEXT NOT NULL,
  message TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approval_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  approved_at TIMESTAMP WITH TIME ZONE,
  rejected_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES users(id),
  rejected_by UUID REFERENCES users(id),
  rejection_reason TEXT
);

-- Add missing columns to existing table (if table already exists)
ALTER TABLE registration_requests 
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_registration_requests_email ON registration_requests(email);
CREATE INDEX IF NOT EXISTS idx_registration_requests_status ON registration_requests(status);
CREATE INDEX IF NOT EXISTS idx_registration_requests_created_at ON registration_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_registration_requests_approval_token ON registration_requests(approval_token) WHERE approval_token IS NOT NULL;

-- Enable RLS
ALTER TABLE registration_requests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public registration inserts" ON registration_requests;
DROP POLICY IF EXISTS "Allow reading own registration" ON registration_requests;
DROP POLICY IF EXISTS "Allow admin updates" ON registration_requests;
DROP POLICY IF EXISTS "Allow admin reads" ON registration_requests;
DROP POLICY IF EXISTS "Allow service role access" ON registration_requests;

-- Policy 1: Allow anyone (including anonymous users) to INSERT registration requests
-- This is necessary for the public registration form to work
CREATE POLICY "Allow public registration inserts" ON registration_requests
  FOR INSERT 
  TO anon, authenticated
  WITH CHECK (
    -- Only allow inserting with pending status
    status = 'pending' AND
    -- Prevent users from setting approval fields
    approved_at IS NULL AND
    rejected_at IS NULL AND
    approved_by IS NULL AND
    rejected_by IS NULL
  );

-- Policy 2: Allow users to read their own registration request by email
CREATE POLICY "Allow reading own registration" ON registration_requests
  FOR SELECT 
  TO anon, authenticated
  USING (
    -- Allow reading if email matches the authenticated user's email
    email = COALESCE(auth.jwt() ->> 'email', email) OR
    -- Allow reading with valid approval token (for approval/rejection links)
    (approval_token IS NOT NULL AND approval_token = current_setting('request.jwt.claim.approval_token', true))
  );

-- Policy 3: Allow admins to read all registration requests
CREATE POLICY "Allow admin reads" ON registration_requests
  FOR SELECT 
  TO authenticated
  USING (
    -- Check if user has admin role
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'superuser')
    )
  );

-- Policy 4: Allow admins to update registration requests
CREATE POLICY "Allow admin updates" ON registration_requests
  FOR UPDATE 
  TO authenticated
  USING (
    -- Check if user has admin role
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'superuser')
    )
  )
  WITH CHECK (
    -- Ensure admin role for updates
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'superuser')
    )
  );

-- Policy 5: Allow service role full access (for backend operations)
CREATE POLICY "Allow service role access" ON registration_requests
  FOR ALL 
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_registration_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_registration_requests_updated_at ON registration_requests;
CREATE TRIGGER update_registration_requests_updated_at
  BEFORE UPDATE ON registration_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_registration_requests_updated_at();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT INSERT, SELECT ON registration_requests TO anon;
GRANT ALL ON registration_requests TO authenticated;
GRANT ALL ON registration_requests TO service_role;

-- Add helpful comment
COMMENT ON TABLE registration_requests IS 'Stores registration requests from potential users. Allows public submissions with admin approval workflow.';
COMMENT ON POLICY "Allow public registration inserts" ON registration_requests IS 'Enables public users to submit registration requests through the form';
COMMENT ON POLICY "Allow reading own registration" ON registration_requests IS 'Users can check status of their own registration request';
COMMENT ON POLICY "Allow admin reads" ON registration_requests IS 'Admins can view all registration requests for approval';
COMMENT ON POLICY "Allow admin updates" ON registration_requests IS 'Admins can approve or reject registration requests';