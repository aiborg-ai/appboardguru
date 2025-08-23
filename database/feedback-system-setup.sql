-- =====================================================
-- FEEDBACK SYSTEM COMPLETE SETUP
-- Step-by-step instructions for setting up the feedback system
-- Run this in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- STEP 1: CREATE OR UPDATE FEEDBACK TABLE SCHEMA
-- =====================================================

-- First, drop the old feedback_submissions table if it has wrong schema
DROP TABLE IF EXISTS feedback_submissions CASCADE;

-- Create the correct feedback_submissions table matching our code
CREATE TABLE feedback_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference_id VARCHAR(50) UNIQUE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    user_email VARCHAR(255) NOT NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('bug', 'feature', 'improvement', 'other')),
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    screenshot_included BOOLEAN DEFAULT FALSE,
    user_agent TEXT,
    page_url TEXT,
    admin_email_sent BOOLEAN DEFAULT FALSE,
    user_email_sent BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'new' CHECK (status IN ('new', 'in_review', 'resolved', 'closed')),
    priority VARCHAR(10) CHECK (priority IN ('low', 'medium', 'high')),
    admin_notes TEXT,
    resolution_notes TEXT,
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- Add table and column comments
COMMENT ON TABLE feedback_submissions IS 'Stores user feedback submissions including bug reports, feature requests, and general feedback';
COMMENT ON COLUMN feedback_submissions.reference_id IS 'Unique reference ID shown to users for tracking their feedback (e.g., FB-1234567890)';
COMMENT ON COLUMN feedback_submissions.type IS 'Type of feedback: bug, feature, improvement, or other';
COMMENT ON COLUMN feedback_submissions.title IS 'Brief title/summary of the feedback (max 200 chars)';
COMMENT ON COLUMN feedback_submissions.description IS 'Detailed feedback description (max 2000 chars)';
COMMENT ON COLUMN feedback_submissions.screenshot_included IS 'Whether the user included a screenshot with their feedback';
COMMENT ON COLUMN feedback_submissions.status IS 'Current status: new, in_review, resolved, or closed';
COMMENT ON COLUMN feedback_submissions.priority IS 'Priority level set by admin: low, medium, or high';
COMMENT ON COLUMN feedback_submissions.admin_notes IS 'Internal notes added by administrators';
COMMENT ON COLUMN feedback_submissions.resolution_notes IS 'Notes about how the feedback was resolved';
COMMENT ON COLUMN feedback_submissions.assigned_to IS 'User ID of admin assigned to handle this feedback';

-- =====================================================
-- STEP 2: CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Create indexes for better query performance
CREATE INDEX idx_feedback_submissions_user_id ON feedback_submissions(user_id);
CREATE INDEX idx_feedback_submissions_organization_id ON feedback_submissions(organization_id);
CREATE INDEX idx_feedback_submissions_type ON feedback_submissions(type);
CREATE INDEX idx_feedback_submissions_status ON feedback_submissions(status);
CREATE INDEX idx_feedback_submissions_priority ON feedback_submissions(priority);
CREATE INDEX idx_feedback_submissions_created_at ON feedback_submissions(created_at DESC);
CREATE INDEX idx_feedback_submissions_reference_id ON feedback_submissions(reference_id);
CREATE INDEX idx_feedback_submissions_assigned_to ON feedback_submissions(assigned_to);

-- =====================================================
-- STEP 3: CREATE TRIGGER FOR UPDATED_AT
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_feedback_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER feedback_submissions_updated_at
    BEFORE UPDATE ON feedback_submissions
    FOR EACH ROW
    EXECUTE FUNCTION update_feedback_updated_at();

-- =====================================================
-- STEP 4: CREATE STATISTICS VIEW
-- =====================================================

-- Create feedback statistics view for admin dashboard
CREATE OR REPLACE VIEW feedback_statistics AS
SELECT 
    COUNT(*) as total_submissions,
    COUNT(CASE WHEN status = 'new' THEN 1 END) as new_count,
    COUNT(CASE WHEN status = 'in_review' THEN 1 END) as in_review_count,
    COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_count,
    COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed_count,
    COUNT(CASE WHEN type = 'bug' THEN 1 END) as bug_reports,
    COUNT(CASE WHEN type = 'feature' THEN 1 END) as feature_requests,
    COUNT(CASE WHEN type = 'improvement' THEN 1 END) as improvements,
    COUNT(CASE WHEN type = 'other' THEN 1 END) as general_feedback,
    COUNT(CASE WHEN screenshot_included THEN 1 END) as with_screenshots,
    COUNT(CASE WHEN priority = 'high' THEN 1 END) as high_priority,
    COUNT(CASE WHEN priority = 'medium' THEN 1 END) as medium_priority,
    COUNT(CASE WHEN priority = 'low' THEN 1 END) as low_priority,
    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as last_7_days,
    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as last_30_days,
    AVG(CASE WHEN resolved_at IS NOT NULL AND created_at IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (resolved_at - created_at))/86400.0 END) as avg_resolution_days
FROM feedback_submissions;

-- =====================================================
-- STEP 5: SETUP ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on the table
ALTER TABLE feedback_submissions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own feedback
CREATE POLICY "Users can view their own feedback" 
ON feedback_submissions 
FOR SELECT 
USING (auth.uid() = user_id);

-- Policy: Users can insert their own feedback
CREATE POLICY "Users can insert their own feedback" 
ON feedback_submissions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own feedback (limited fields)
CREATE POLICY "Users can update their own feedback" 
ON feedback_submissions 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (
    auth.uid() = user_id AND 
    -- Users can only update title and description, not status or admin fields
    OLD.status = NEW.status AND
    OLD.priority IS NOT DISTINCT FROM NEW.priority AND
    OLD.admin_notes IS NOT DISTINCT FROM NEW.admin_notes AND
    OLD.assigned_to IS NOT DISTINCT FROM NEW.assigned_to
);

-- Policy: Admins can do everything (you'll need to adjust based on your admin role system)
-- For now, we'll create a placeholder policy that you can customize
-- CREATE POLICY "Admins can manage all feedback" 
-- ON feedback_submissions 
-- FOR ALL 
-- USING (
--     EXISTS (
--         SELECT 1 FROM users 
--         WHERE users.id = auth.uid() 
--         AND users.role = 'admin'
--     )
-- );

-- =====================================================
-- STEP 6: VERIFY TABLE STRUCTURE
-- =====================================================

-- Display table structure for verification
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'feedback_submissions' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Display constraints
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu 
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'feedback_submissions'
ORDER BY tc.constraint_type, tc.constraint_name;

-- Display indexes
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'feedback_submissions'
ORDER BY indexname;

-- Success message
DO $$ 
BEGIN 
    RAISE NOTICE '';
    RAISE NOTICE '=== FEEDBACK TABLE SETUP COMPLETE ===';
    RAISE NOTICE 'Table: feedback_submissions created with proper schema';
    RAISE NOTICE 'Indexes: Created for optimal performance';
    RAISE NOTICE 'RLS: Enabled with user access policies';
    RAISE NOTICE 'View: feedback_statistics created for admin dashboard';
    RAISE NOTICE '';
    RAISE NOTICE 'Next: Run the synthetic data creation script';
END $$;