-- Feedback System Migration
-- Creates tables for storing user feedback submissions

-- Create feedback submissions table
CREATE TABLE IF NOT EXISTS feedback_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference_id VARCHAR(50) UNIQUE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    user_email VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('bug', 'feature', 'improvement', 'other')),
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    screenshot_included BOOLEAN DEFAULT FALSE,
    user_agent TEXT,
    page_url TEXT,
    admin_email_sent BOOLEAN DEFAULT FALSE,
    user_email_sent BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'new' CHECK (status IN ('new', 'in_review', 'resolved', 'closed')),
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_feedback_submissions_user_id ON feedback_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_submissions_type ON feedback_submissions(type);
CREATE INDEX IF NOT EXISTS idx_feedback_submissions_status ON feedback_submissions(status);
CREATE INDEX IF NOT EXISTS idx_feedback_submissions_created_at ON feedback_submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_submissions_reference_id ON feedback_submissions(reference_id);

-- Create feedback statistics view for admin dashboard (optional)
CREATE OR REPLACE VIEW feedback_statistics AS
SELECT 
    COUNT(*) as total_submissions,
    COUNT(CASE WHEN status = 'new' THEN 1 END) as pending_count,
    COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_count,
    COUNT(CASE WHEN type = 'bug' THEN 1 END) as bug_reports,
    COUNT(CASE WHEN type = 'feature' THEN 1 END) as feature_requests,
    COUNT(CASE WHEN type = 'improvement' THEN 1 END) as improvements,
    COUNT(CASE WHEN type = 'other' THEN 1 END) as general_feedback,
    COUNT(CASE WHEN screenshot_included THEN 1 END) as with_screenshots,
    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as last_7_days,
    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as last_30_days
FROM feedback_submissions;

-- Enable Row Level Security
ALTER TABLE feedback_submissions ENABLE ROW LEVEL SECURITY;

-- Create policy for users to see only their own feedback
CREATE POLICY "Users can view their own feedback" 
ON feedback_submissions 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create policy for users to insert their own feedback
CREATE POLICY "Users can insert their own feedback" 
ON feedback_submissions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create policy for admins to see all feedback (this would need to be adjusted based on your admin role system)
-- CREATE POLICY "Admins can view all feedback" 
-- ON feedback_submissions 
-- FOR ALL 
-- USING (auth.jwt()->>'role' = 'admin');

-- Update function for updated_at timestamp
CREATE OR REPLACE FUNCTION update_feedback_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER feedback_submissions_updated_at
    BEFORE UPDATE ON feedback_submissions
    FOR EACH ROW
    EXECUTE FUNCTION update_feedback_updated_at();

-- Add comment for documentation
COMMENT ON TABLE feedback_submissions IS 'Stores user feedback submissions including bug reports, feature requests, and general feedback';
COMMENT ON COLUMN feedback_submissions.reference_id IS 'Unique reference ID shown to users for tracking their feedback';
COMMENT ON COLUMN feedback_submissions.type IS 'Type of feedback: bug, feature, improvement, or other';
COMMENT ON COLUMN feedback_submissions.screenshot_included IS 'Whether the user included a screenshot with their feedback';
COMMENT ON COLUMN feedback_submissions.status IS 'Current status of the feedback: new, in_review, resolved, or closed';