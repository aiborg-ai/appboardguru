#!/usr/bin/env npx tsx

console.log(`
📊 MANUAL SETUP REQUIRED for Feedback Table
==========================================

The feedback_submissions table needs to be created in Supabase.

Please follow these steps:

1. Go to Supabase SQL Editor:
   https://supabase.com/dashboard/project/pgeuvjihhfmzqymoygwb/sql/new

2. Copy and paste this SQL:

-- Create feedback_submissions table
CREATE TABLE IF NOT EXISTS public.feedback_submissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    reference_id VARCHAR(50) UNIQUE NOT NULL,
    user_id UUID,
    user_email VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    screenshot_included BOOLEAN DEFAULT false,
    user_agent TEXT,
    page_url TEXT,
    admin_email_sent BOOLEAN DEFAULT false,
    user_email_sent BOOLEAN DEFAULT false,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS but allow all operations for now
ALTER TABLE public.feedback_submissions ENABLE ROW LEVEL SECURITY;

-- Create a permissive policy for testing
CREATE POLICY "Enable all operations for testing" ON public.feedback_submissions
    FOR ALL
    USING (true)
    WITH CHECK (true);

3. Click "Run" button

4. Verify the table was created by checking the Table Editor

Once done, the feedback system will work properly.
`);