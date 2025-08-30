-- Create Feedback Submissions Table
-- This script creates the feedback_submissions table if it doesn't exist
-- and sets up appropriate RLS policies

-- Create the table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.feedback_submissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    reference_id VARCHAR(50) NOT NULL UNIQUE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_email VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('bug', 'feature', 'improvement', 'other')),
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    screenshot_included BOOLEAN DEFAULT false,
    user_agent TEXT,
    page_url TEXT,
    admin_email_sent BOOLEAN DEFAULT false,
    user_email_sent BOOLEAN DEFAULT false,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved', 'closed')),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    resolution_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_feedback_submissions_reference_id ON public.feedback_submissions(reference_id);
CREATE INDEX IF NOT EXISTS idx_feedback_submissions_user_id ON public.feedback_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_submissions_user_email ON public.feedback_submissions(user_email);
CREATE INDEX IF NOT EXISTS idx_feedback_submissions_type ON public.feedback_submissions(type);
CREATE INDEX IF NOT EXISTS idx_feedback_submissions_status ON public.feedback_submissions(status);
CREATE INDEX IF NOT EXISTS idx_feedback_submissions_created_at ON public.feedback_submissions(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.feedback_submissions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own feedback" ON public.feedback_submissions;
DROP POLICY IF EXISTS "Users can insert their own feedback" ON public.feedback_submissions;
DROP POLICY IF EXISTS "Admins can view all feedback" ON public.feedback_submissions;
DROP POLICY IF EXISTS "Admins can update feedback" ON public.feedback_submissions;
DROP POLICY IF EXISTS "Service role can do everything" ON public.feedback_submissions;
DROP POLICY IF EXISTS "Anonymous users can insert feedback" ON public.feedback_submissions;

-- Policy: Users can view their own feedback
CREATE POLICY "Users can view their own feedback"
    ON public.feedback_submissions
    FOR SELECT
    USING (
        auth.uid() = user_id 
        OR user_email = auth.jwt()->>'email'
    );

-- Policy: Users can insert their own feedback
CREATE POLICY "Users can insert their own feedback"
    ON public.feedback_submissions
    FOR INSERT
    WITH CHECK (
        auth.uid() = user_id 
        OR user_email = auth.jwt()->>'email'
        OR auth.uid() IS NOT NULL -- Any authenticated user can submit feedback
    );

-- Policy: Anonymous users can insert feedback (for demo mode)
-- This allows feedback submission even without authentication
CREATE POLICY "Anonymous users can insert feedback"
    ON public.feedback_submissions
    FOR INSERT
    WITH CHECK (
        user_id IS NULL -- Allow inserts where user_id is null (anonymous feedback)
    );

-- Policy: Admins can view all feedback
-- You'll need to adjust this based on your admin role implementation
CREATE POLICY "Admins can view all feedback"
    ON public.feedback_submissions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = auth.uid()
            AND (
                raw_user_meta_data->>'role' = 'admin'
                OR email IN ('hirendra.vikram@boardguru.ai', 'admin@appboardguru.com')
            )
        )
    );

-- Policy: Admins can update feedback (resolve, add notes, etc.)
CREATE POLICY "Admins can update feedback"
    ON public.feedback_submissions
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = auth.uid()
            AND (
                raw_user_meta_data->>'role' = 'admin'
                OR email IN ('hirendra.vikram@boardguru.ai', 'admin@appboardguru.com')
            )
        )
    );

-- Policy: Service role can do everything (for API operations)
CREATE POLICY "Service role can do everything"
    ON public.feedback_submissions
    FOR ALL
    USING (
        auth.role() = 'service_role'
    );

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create a trigger to automatically update the updated_at column
DROP TRIGGER IF EXISTS update_feedback_submissions_updated_at ON public.feedback_submissions;
CREATE TRIGGER update_feedback_submissions_updated_at
    BEFORE UPDATE ON public.feedback_submissions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.feedback_submissions TO anon, authenticated;
GRANT USAGE ON SEQUENCE public.feedback_submissions_id_seq TO anon, authenticated;

-- Add a comment to the table
COMMENT ON TABLE public.feedback_submissions IS 'Stores user feedback submissions including bug reports, feature requests, and general feedback';

-- Sample data for testing (optional - uncomment if needed)
/*
INSERT INTO public.feedback_submissions (
    reference_id,
    user_email,
    type,
    title,
    description,
    screenshot_included,
    admin_email_sent,
    user_email_sent
) VALUES (
    'FB-TEST-' || substr(md5(random()::text), 1, 8),
    'test@example.com',
    'bug',
    'Test Feedback Submission',
    'This is a test feedback submission to verify the table is working correctly.',
    false,
    false,
    false
);
*/

-- Verify the table was created successfully
SELECT 
    'Table created successfully' as status,
    COUNT(*) as row_count
FROM public.feedback_submissions;