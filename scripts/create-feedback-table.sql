-- Create feedback_submissions table
CREATE TABLE IF NOT EXISTS public.feedback_submissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    reference_id VARCHAR(50) UNIQUE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_email VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('bug', 'feature', 'improvement', 'other')),
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    screenshot_included BOOLEAN DEFAULT false,
    user_agent TEXT,
    page_url TEXT,
    admin_email_sent BOOLEAN DEFAULT false,
    user_email_sent BOOLEAN DEFAULT false,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'in_progress', 'resolved', 'closed')),
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_feedback_submissions_user_id ON public.feedback_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_submissions_user_email ON public.feedback_submissions(user_email);
CREATE INDEX IF NOT EXISTS idx_feedback_submissions_type ON public.feedback_submissions(type);
CREATE INDEX IF NOT EXISTS idx_feedback_submissions_status ON public.feedback_submissions(status);
CREATE INDEX IF NOT EXISTS idx_feedback_submissions_created_at ON public.feedback_submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_submissions_reference_id ON public.feedback_submissions(reference_id);

-- Enable RLS (Row Level Security)
ALTER TABLE public.feedback_submissions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can insert their own feedback" ON public.feedback_submissions;
DROP POLICY IF EXISTS "Users can view their own feedback" ON public.feedback_submissions;
DROP POLICY IF EXISTS "Admins can view all feedback" ON public.feedback_submissions;
DROP POLICY IF EXISTS "Admins can update feedback" ON public.feedback_submissions;
DROP POLICY IF EXISTS "Anonymous users can insert feedback" ON public.feedback_submissions;

-- Policy: Users can insert their own feedback
CREATE POLICY "Users can insert their own feedback" ON public.feedback_submissions
    FOR INSERT
    WITH CHECK (
        auth.uid() = user_id OR 
        user_id IS NULL -- Allow anonymous feedback
    );

-- Policy: Users can view their own feedback
CREATE POLICY "Users can view their own feedback" ON public.feedback_submissions
    FOR SELECT
    USING (
        auth.uid() = user_id OR
        user_email = auth.jwt()->>'email'
    );

-- Policy: Allow anonymous feedback submissions
CREATE POLICY "Anonymous users can insert feedback" ON public.feedback_submissions
    FOR INSERT
    WITH CHECK (
        user_id IS NULL
    );

-- Policy: Service role can do everything (for admin operations)
-- This is automatically handled by service role key

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_feedback_submissions_updated_at ON public.feedback_submissions;
CREATE TRIGGER update_feedback_submissions_updated_at
    BEFORE UPDATE ON public.feedback_submissions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.feedback_submissions TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Add comment to table
COMMENT ON TABLE public.feedback_submissions IS 'Stores user feedback submissions including bug reports, feature requests, and improvements';
COMMENT ON COLUMN public.feedback_submissions.reference_id IS 'Unique reference ID for tracking (e.g., FB-ABC123)';
COMMENT ON COLUMN public.feedback_submissions.type IS 'Type of feedback: bug, feature, improvement, or other';
COMMENT ON COLUMN public.feedback_submissions.status IS 'Current status of the feedback: pending, reviewed, in_progress, resolved, or closed';