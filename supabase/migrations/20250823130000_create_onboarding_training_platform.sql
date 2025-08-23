-- Board Member Onboarding & Training Platform Schema
-- This migration creates the complete database structure for director development and education

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Onboarding Templates for different board roles
CREATE TABLE onboarding_templates (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    role_type VARCHAR(100) NOT NULL, -- 'independent_director', 'audit_committee', 'compensation_committee', etc.
    experience_level VARCHAR(50) NOT NULL DEFAULT 'beginner', -- 'beginner', 'intermediate', 'advanced'
    estimated_duration_days INTEGER DEFAULT 30,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Onboarding Steps within templates
CREATE TABLE onboarding_steps (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    template_id UUID NOT NULL REFERENCES onboarding_templates(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    step_order INTEGER NOT NULL,
    step_type VARCHAR(50) NOT NULL, -- 'document_review', 'training_module', 'meeting', 'assessment', 'milestone'
    estimated_duration_hours DECIMAL(4,2),
    is_required BOOLEAN DEFAULT true,
    prerequisites JSON, -- Array of step IDs that must be completed first
    resources JSON, -- Links to documents, videos, etc.
    completion_criteria TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Individual board member onboarding instances
CREATE TABLE member_onboarding (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    board_id UUID REFERENCES boards(id),
    template_id UUID NOT NULL REFERENCES onboarding_templates(id),
    status VARCHAR(50) DEFAULT 'not_started', -- 'not_started', 'in_progress', 'completed', 'paused'
    start_date DATE,
    target_completion_date DATE,
    actual_completion_date DATE,
    progress_percentage DECIMAL(5,2) DEFAULT 0,
    current_step_id UUID REFERENCES onboarding_steps(id),
    notes TEXT,
    assigned_mentor_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Track individual step completion
CREATE TABLE member_onboarding_progress (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    onboarding_id UUID NOT NULL REFERENCES member_onboarding(id) ON DELETE CASCADE,
    step_id UUID NOT NULL REFERENCES onboarding_steps(id),
    status VARCHAR(50) DEFAULT 'not_started', -- 'not_started', 'in_progress', 'completed', 'skipped'
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    time_spent_minutes INTEGER,
    feedback TEXT,
    attachments JSON, -- Uploaded documents or completion evidence
    score DECIMAL(5,2), -- For assessments
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(onboarding_id, step_id)
);

-- Training Course Categories
CREATE TABLE training_categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES training_categories(id),
    icon VARCHAR(100),
    color VARCHAR(7), -- Hex color code
    display_order INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Training Courses/Modules
CREATE TABLE training_courses (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category_id UUID NOT NULL REFERENCES training_categories(id),
    course_type VARCHAR(50) NOT NULL, -- 'interactive', 'video', 'document', 'assessment', 'webinar'
    difficulty_level VARCHAR(50) DEFAULT 'beginner', -- 'beginner', 'intermediate', 'advanced'
    estimated_duration_hours DECIMAL(4,2),
    content_url TEXT, -- Link to course content
    content_data JSON, -- Structured course content for interactive modules
    prerequisites JSON, -- Array of course IDs
    learning_objectives TEXT[],
    tags TEXT[],
    is_required BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    provider_name VARCHAR(255), -- External provider if applicable
    provider_url TEXT,
    credits DECIMAL(3,1), -- Professional development credits
    expiry_months INTEGER, -- Course completion expiry
    thumbnail_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- User course enrollments and progress
CREATE TABLE training_enrollments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    course_id UUID NOT NULL REFERENCES training_courses(id),
    enrollment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(50) DEFAULT 'enrolled', -- 'enrolled', 'in_progress', 'completed', 'failed', 'expired'
    progress_percentage DECIMAL(5,2) DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    expiry_date TIMESTAMP WITH TIME ZONE,
    final_score DECIMAL(5,2),
    certificate_url TEXT,
    time_spent_minutes INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, course_id)
);

-- Track detailed progress within courses
CREATE TABLE training_progress (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    enrollment_id UUID NOT NULL REFERENCES training_enrollments(id) ON DELETE CASCADE,
    module_id VARCHAR(255) NOT NULL, -- Internal module identifier
    module_title VARCHAR(255),
    progress_data JSON, -- Module-specific progress data
    completed_at TIMESTAMP WITH TIME ZONE,
    score DECIMAL(5,2),
    attempts INTEGER DEFAULT 1,
    time_spent_minutes INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(enrollment_id, module_id)
);

-- Digital Board Manual Knowledge Base
CREATE TABLE knowledge_base_categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES knowledge_base_categories(id),
    icon VARCHAR(100),
    display_order INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Knowledge base articles
CREATE TABLE knowledge_base_articles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    summary TEXT,
    category_id UUID NOT NULL REFERENCES knowledge_base_categories(id),
    article_type VARCHAR(50) DEFAULT 'article', -- 'article', 'policy', 'procedure', 'faq', 'template'
    tags TEXT[],
    status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'review', 'published', 'archived'
    version INTEGER DEFAULT 1,
    previous_version_id UUID REFERENCES knowledge_base_articles(id),
    is_searchable BOOLEAN DEFAULT true,
    view_count INTEGER DEFAULT 0,
    helpful_count INTEGER DEFAULT 0,
    not_helpful_count INTEGER DEFAULT 0,
    last_reviewed_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    attachments JSON, -- Related documents/files
    author_id UUID NOT NULL REFERENCES auth.users(id),
    reviewer_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Article access and feedback tracking
CREATE TABLE knowledge_base_interactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    article_id UUID NOT NULL REFERENCES knowledge_base_articles(id),
    interaction_type VARCHAR(50) NOT NULL, -- 'view', 'helpful', 'not_helpful', 'bookmark'
    feedback TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Mentor profiles and capabilities
CREATE TABLE mentor_profiles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) UNIQUE,
    bio TEXT,
    expertise_areas TEXT[], -- Array of expertise keywords
    industries TEXT[], -- Array of industry experience
    board_roles TEXT[], -- Array of board roles experienced
    years_experience INTEGER,
    max_mentees INTEGER DEFAULT 3,
    current_mentees INTEGER DEFAULT 0,
    is_available BOOLEAN DEFAULT true,
    languages TEXT[] DEFAULT ARRAY['English'],
    time_zone VARCHAR(50),
    preferred_communication JSON, -- Communication preferences
    mentoring_style TEXT,
    achievements TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Mentorship matching and relationships
CREATE TABLE mentorship_relationships (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    mentor_id UUID NOT NULL REFERENCES mentor_profiles(user_id),
    mentee_id UUID NOT NULL REFERENCES auth.users(id),
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'active', 'completed', 'paused', 'cancelled'
    match_score DECIMAL(5,2), -- Algorithm-generated compatibility score
    matching_criteria JSON, -- Criteria used for matching
    start_date DATE,
    end_date DATE,
    program_duration_months INTEGER DEFAULT 6,
    goals TEXT[],
    meeting_frequency VARCHAR(50), -- 'weekly', 'biweekly', 'monthly'
    progress_notes TEXT,
    satisfaction_rating DECIMAL(3,2), -- 1-5 rating
    completion_feedback TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(mentor_id, mentee_id)
);

-- Mentorship session tracking
CREATE TABLE mentorship_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    relationship_id UUID NOT NULL REFERENCES mentorship_relationships(id) ON DELETE CASCADE,
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    session_type VARCHAR(50) DEFAULT 'video_call', -- 'video_call', 'phone', 'in_person', 'email'
    status VARCHAR(50) DEFAULT 'scheduled', -- 'scheduled', 'completed', 'cancelled', 'no_show'
    agenda TEXT,
    notes TEXT,
    action_items JSON, -- Array of action items with due dates
    next_session_date TIMESTAMP WITH TIME ZONE,
    mentor_rating DECIMAL(3,2),
    mentee_rating DECIMAL(3,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- External learning providers integration
CREATE TABLE learning_providers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    website_url TEXT,
    api_endpoint TEXT,
    api_key_encrypted TEXT, -- Encrypted API credentials
    provider_type VARCHAR(50), -- 'lms', 'webinar', 'conference', 'certification'
    integration_status VARCHAR(50) DEFAULT 'inactive', -- 'active', 'inactive', 'error'
    sync_frequency VARCHAR(50) DEFAULT 'daily', -- How often to sync data
    last_sync_at TIMESTAMP WITH TIME ZONE,
    supported_features JSON, -- What features this provider supports
    configuration JSON, -- Provider-specific configuration
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- External courses from learning providers
CREATE TABLE external_courses (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    provider_id UUID NOT NULL REFERENCES learning_providers(id),
    external_course_id VARCHAR(255) NOT NULL, -- Provider's course ID
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(255),
    duration_hours DECIMAL(4,2),
    credits DECIMAL(3,1),
    cost DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'USD',
    enrollment_url TEXT,
    skill_level VARCHAR(50),
    prerequisites TEXT,
    tags TEXT[],
    rating DECIMAL(3,2),
    review_count INTEGER,
    is_available BOOLEAN DEFAULT true,
    last_updated_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(provider_id, external_course_id)
);

-- User skills assessment framework
CREATE TABLE skill_frameworks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    version VARCHAR(50) DEFAULT '1.0',
    framework_type VARCHAR(50) DEFAULT 'competency', -- 'competency', 'behavioral', 'technical'
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Individual skills within frameworks
CREATE TABLE skills (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    framework_id UUID NOT NULL REFERENCES skill_frameworks(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    parent_skill_id UUID REFERENCES skills(id),
    skill_level VARCHAR(50), -- 'foundational', 'intermediate', 'advanced', 'expert'
    assessment_criteria TEXT,
    training_recommendations JSON, -- Suggested courses for this skill
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User skill assessments
CREATE TABLE user_skill_assessments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    skill_id UUID NOT NULL REFERENCES skills(id),
    assessment_date DATE NOT NULL,
    current_level INTEGER CHECK (current_level >= 1 AND current_level <= 5), -- 1-5 proficiency scale
    target_level INTEGER CHECK (target_level >= 1 AND target_level <= 5),
    self_assessment_score INTEGER CHECK (self_assessment_score >= 1 AND self_assessment_score <= 5),
    manager_assessment_score INTEGER CHECK (manager_assessment_score >= 1 AND manager_assessment_score <= 5),
    peer_assessment_score DECIMAL(3,2), -- Average of peer assessments
    evidence TEXT, -- Supporting evidence for the assessment
    development_plan TEXT,
    next_review_date DATE,
    assessor_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, skill_id, assessment_date)
);

-- Learning paths and development plans
CREATE TABLE learning_paths (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    target_role VARCHAR(100), -- Target board role or career objective
    difficulty_level VARCHAR(50) DEFAULT 'beginner',
    estimated_duration_months INTEGER,
    required_courses UUID[], -- Array of course IDs
    optional_courses UUID[], -- Array of optional course IDs
    milestones JSON, -- Key milestones and checkpoints
    prerequisites TEXT,
    learning_outcomes TEXT[],
    is_template BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User enrollment in learning paths
CREATE TABLE user_learning_paths (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    path_id UUID NOT NULL REFERENCES learning_paths(id),
    enrollment_date DATE DEFAULT CURRENT_DATE,
    target_completion_date DATE,
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'paused', 'completed', 'abandoned'
    progress_percentage DECIMAL(5,2) DEFAULT 0,
    current_course_id UUID REFERENCES training_courses(id),
    personalized_plan JSON, -- Customized version of the learning path
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, path_id)
);

-- Certifications and achievements
CREATE TABLE certifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    issuing_organization VARCHAR(255),
    certification_type VARCHAR(50), -- 'course_completion', 'assessment', 'external', 'pathway'
    requirements JSON, -- What's needed to earn this certification
    badge_image_url TEXT,
    certificate_template TEXT, -- HTML template for certificate generation
    validity_months INTEGER, -- How long the certification is valid
    renewal_requirements TEXT,
    credits DECIMAL(3,1), -- Professional development credits awarded
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User earned certifications
CREATE TABLE user_certifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    certification_id UUID NOT NULL REFERENCES certifications(id),
    earned_date DATE NOT NULL,
    expiry_date DATE,
    certificate_number VARCHAR(100) UNIQUE,
    certificate_url TEXT, -- URL to downloadable certificate
    verification_code VARCHAR(100) UNIQUE,
    renewal_date DATE,
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'expired', 'revoked'
    earned_through JSON, -- How the certification was earned (courses, assessments, etc.)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Analytics and reporting tables
CREATE TABLE learning_analytics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    metric_type VARCHAR(100) NOT NULL, -- 'course_completion', 'time_spent', 'skill_improvement', etc.
    metric_value DECIMAL(10,4),
    metric_date DATE NOT NULL,
    context JSON, -- Additional context about the metric
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI Assistant conversation history for board manual
CREATE TABLE manual_ai_conversations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    session_id UUID NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    confidence_score DECIMAL(3,2), -- AI confidence in the answer
    sources JSON, -- References to knowledge base articles used
    feedback_rating INTEGER CHECK (feedback_rating >= 1 AND feedback_rating <= 5),
    feedback_comment TEXT,
    response_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_member_onboarding_user_id ON member_onboarding(user_id);
CREATE INDEX idx_member_onboarding_board_id ON member_onboarding(board_id);
CREATE INDEX idx_member_onboarding_status ON member_onboarding(status);
CREATE INDEX idx_training_enrollments_user_id ON training_enrollments(user_id);
CREATE INDEX idx_training_enrollments_status ON training_enrollments(status);
CREATE INDEX idx_training_courses_category ON training_courses(category_id);
CREATE INDEX idx_training_courses_active ON training_courses(is_active);
CREATE INDEX idx_knowledge_base_articles_category ON knowledge_base_articles(category_id);
CREATE INDEX idx_knowledge_base_articles_status ON knowledge_base_articles(status);
CREATE INDEX idx_knowledge_base_articles_searchable ON knowledge_base_articles(is_searchable);
CREATE INDEX idx_mentorship_relationships_mentor ON mentorship_relationships(mentor_id);
CREATE INDEX idx_mentorship_relationships_mentee ON mentorship_relationships(mentee_id);
CREATE INDEX idx_mentorship_relationships_status ON mentorship_relationships(status);
CREATE INDEX idx_user_skill_assessments_user ON user_skill_assessments(user_id);
CREATE INDEX idx_user_learning_paths_user ON user_learning_paths(user_id);
CREATE INDEX idx_learning_analytics_user_date ON learning_analytics(user_id, metric_date);

-- Add RLS policies (Row Level Security)
ALTER TABLE onboarding_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_onboarding ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_onboarding_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentorship_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentorship_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_frameworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_skill_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_learning_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE manual_ai_conversations ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies for user data access
CREATE POLICY "Users can view their own onboarding" ON member_onboarding
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own onboarding progress" ON member_onboarding_progress
    FOR ALL USING (
        onboarding_id IN (
            SELECT id FROM member_onboarding WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can view their own training enrollments" ON training_enrollments
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own training progress" ON training_progress
    FOR ALL USING (
        enrollment_id IN (
            SELECT id FROM training_enrollments WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can view published knowledge base articles" ON knowledge_base_articles
    FOR SELECT USING (status = 'published');

CREATE POLICY "Users can track their own article interactions" ON knowledge_base_interactions
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can view their mentor profile" ON mentor_profiles
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can view their mentorship relationships" ON mentorship_relationships
    FOR SELECT USING (mentor_id = auth.uid() OR mentee_id = auth.uid());

CREATE POLICY "Users can view their skill assessments" ON user_skill_assessments
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can view their learning paths" ON user_learning_paths
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can view their certifications" ON user_certifications
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can view their learning analytics" ON learning_analytics
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can view their AI conversations" ON manual_ai_conversations
    FOR ALL USING (user_id = auth.uid());

-- Create functions for common operations
CREATE OR REPLACE FUNCTION calculate_onboarding_progress(onboarding_id UUID)
RETURNS DECIMAL(5,2)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    total_steps INTEGER;
    completed_steps INTEGER;
    progress DECIMAL(5,2);
BEGIN
    -- Count total steps in the onboarding template
    SELECT COUNT(*)
    INTO total_steps
    FROM onboarding_steps os
    JOIN member_onboarding mo ON mo.template_id = os.template_id
    WHERE mo.id = onboarding_id;
    
    -- Count completed steps
    SELECT COUNT(*)
    INTO completed_steps
    FROM member_onboarding_progress mop
    WHERE mop.onboarding_id = onboarding_id
    AND mop.status = 'completed';
    
    -- Calculate progress percentage
    IF total_steps = 0 THEN
        progress := 0;
    ELSE
        progress := (completed_steps::DECIMAL / total_steps::DECIMAL) * 100;
    END IF;
    
    -- Update the onboarding record
    UPDATE member_onboarding
    SET progress_percentage = progress,
        updated_at = NOW()
    WHERE id = onboarding_id;
    
    RETURN progress;
END;
$$;

-- Function to calculate mentor compatibility score
CREATE OR REPLACE FUNCTION calculate_mentor_match_score(
    p_mentor_id UUID,
    p_mentee_id UUID,
    p_criteria JSON DEFAULT '{}'::JSON
)
RETURNS DECIMAL(5,2)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    score DECIMAL(5,2) := 0;
    mentor_profile RECORD;
    mentee_profile RECORD;
    expertise_match INTEGER := 0;
    industry_match INTEGER := 0;
    role_match INTEGER := 0;
BEGIN
    -- Get mentor profile
    SELECT * INTO mentor_profile
    FROM mentor_profiles
    WHERE user_id = p_mentor_id;
    
    -- Get mentee information (would need user profile data)
    -- This is a simplified scoring algorithm
    -- Real implementation would consider more factors
    
    -- Base availability score
    IF mentor_profile.is_available AND mentor_profile.current_mentees < mentor_profile.max_mentees THEN
        score := score + 20;
    END IF;
    
    -- Experience level compatibility
    IF mentor_profile.years_experience >= 10 THEN
        score := score + 30;
    ELSIF mentor_profile.years_experience >= 5 THEN
        score := score + 20;
    END IF;
    
    -- Additional matching logic would go here based on:
    -- - Expertise areas overlap
    -- - Industry experience match
    -- - Board roles experience
    -- - Geographic/timezone compatibility
    -- - Communication preferences
    
    -- Ensure score is between 0 and 100
    score := GREATEST(0, LEAST(100, score));
    
    RETURN score;
END;
$$;

-- Trigger to update onboarding progress when steps are completed
CREATE OR REPLACE FUNCTION update_onboarding_progress_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        PERFORM calculate_onboarding_progress(NEW.onboarding_id);
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER onboarding_progress_update
    AFTER UPDATE ON member_onboarding_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_onboarding_progress_trigger();

-- Add updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to all relevant tables
CREATE TRIGGER update_onboarding_templates_updated_at BEFORE UPDATE ON onboarding_templates FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_onboarding_steps_updated_at BEFORE UPDATE ON onboarding_steps FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_member_onboarding_updated_at BEFORE UPDATE ON member_onboarding FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_member_onboarding_progress_updated_at BEFORE UPDATE ON member_onboarding_progress FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_training_categories_updated_at BEFORE UPDATE ON training_categories FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_training_courses_updated_at BEFORE UPDATE ON training_courses FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_training_enrollments_updated_at BEFORE UPDATE ON training_enrollments FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_training_progress_updated_at BEFORE UPDATE ON training_progress FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_knowledge_base_categories_updated_at BEFORE UPDATE ON knowledge_base_categories FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_knowledge_base_articles_updated_at BEFORE UPDATE ON knowledge_base_articles FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_mentor_profiles_updated_at BEFORE UPDATE ON mentor_profiles FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_mentorship_relationships_updated_at BEFORE UPDATE ON mentorship_relationships FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_mentorship_sessions_updated_at BEFORE UPDATE ON mentorship_sessions FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_learning_providers_updated_at BEFORE UPDATE ON learning_providers FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_external_courses_updated_at BEFORE UPDATE ON external_courses FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_skill_frameworks_updated_at BEFORE UPDATE ON skill_frameworks FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_skills_updated_at BEFORE UPDATE ON skills FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_user_skill_assessments_updated_at BEFORE UPDATE ON user_skill_assessments FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_learning_paths_updated_at BEFORE UPDATE ON learning_paths FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_user_learning_paths_updated_at BEFORE UPDATE ON user_learning_paths FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_certifications_updated_at BEFORE UPDATE ON certifications FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_user_certifications_updated_at BEFORE UPDATE ON user_certifications FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();