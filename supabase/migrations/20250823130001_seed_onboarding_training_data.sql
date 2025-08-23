-- Seed data for Board Member Onboarding & Training Platform

-- Insert Training Categories
INSERT INTO training_categories (id, name, description, icon, color, display_order, is_active) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'Governance Fundamentals', 'Core governance principles and board responsibilities', 'gavel', '#3B82F6', 1, true),
('550e8400-e29b-41d4-a716-446655440002', 'Financial Oversight', 'Financial reporting, risk management, and audit responsibilities', 'chart-line', '#10B981', 2, true),
('550e8400-e29b-41d4-a716-446655440003', 'Regulatory Compliance', 'Legal requirements and regulatory frameworks', 'shield-check', '#F59E0B', 3, true),
('550e8400-e29b-41d4-a716-446655440004', 'Cybersecurity Awareness', 'Digital security and data protection for directors', 'lock', '#EF4444', 4, true),
('550e8400-e29b-41d4-a716-446655440005', 'ESG & Sustainability', 'Environmental, Social, and Governance considerations', 'leaf', '#22C55E', 5, true),
('550e8400-e29b-41d4-a716-446655440006', 'Industry-Specific', 'Sector-specific governance requirements', 'building', '#8B5CF6', 6, true),
('550e8400-e29b-41d4-a716-446655440007', 'Leadership Development', 'Board leadership and strategic thinking skills', 'users', '#F97316', 7, true),
('550e8400-e29b-41d4-a716-446655440008', 'Technology & Innovation', 'Digital transformation and technology governance', 'cpu', '#06B6D4', 8, true);

-- Insert subcategories
INSERT INTO training_categories (id, name, description, parent_id, icon, color, display_order, is_active) VALUES
('550e8400-e29b-41d4-a716-446655440011', 'Board Structure & Composition', 'Board size, composition, and diversity', '550e8400-e29b-41d4-a716-446655440001', 'users-cog', '#3B82F6', 1, true),
('550e8400-e29b-41d4-a716-446655440012', 'Director Duties & Responsibilities', 'Fiduciary duties and legal responsibilities', '550e8400-e29b-41d4-a716-446655440001', 'clipboard-check', '#3B82F6', 2, true),
('550e8400-e29b-41d4-a716-446655440013', 'Risk Management', 'Enterprise risk assessment and mitigation', '550e8400-e29b-41d4-a716-446655440002', 'exclamation-triangle', '#10B981', 1, true),
('550e8400-e29b-41d4-a716-446655440014', 'Audit Committee Essentials', 'Audit committee roles and responsibilities', '550e8400-e29b-41d4-a716-446655440002', 'search', '#10B981', 2, true);

-- Insert Sample Training Courses
INSERT INTO training_courses (id, title, description, category_id, course_type, difficulty_level, estimated_duration_hours, learning_objectives, tags, is_required, credits, created_by) VALUES
('660e8400-e29b-41d4-a716-446655440001', 'Board Fundamentals: Your First 100 Days', 'Comprehensive introduction to board service covering key responsibilities, legal framework, and best practices for new directors.', '550e8400-e29b-41d4-a716-446655440001', 'interactive', 'beginner', 4.5, ARRAY['Understand fiduciary duties', 'Learn board meeting protocols', 'Navigate director relationships', 'Master basic governance principles'], ARRAY['new directors', 'governance', 'fundamentals'], true, 4.5, (SELECT id FROM auth.users LIMIT 1)),

('660e8400-e29b-41d4-a716-446655440002', 'Financial Literacy for Directors', 'Essential financial knowledge for board members including reading financial statements, understanding key metrics, and asking the right questions.', '550e8400-e29b-41d4-a716-446655440002', 'video', 'intermediate', 6.0, ARRAY['Read and interpret financial statements', 'Understand key financial ratios', 'Identify red flags in financial reporting', 'Ask effective questions of management'], ARRAY['financial literacy', 'accounting', 'oversight'], true, 6.0, (SELECT id FROM auth.users LIMIT 1)),

('660e8400-e29b-41d4-a716-446655440003', 'Cybersecurity Governance Essentials', 'Understanding cybersecurity risks and governance frameworks from a board perspective.', '550e8400-e29b-41d4-a716-446655440004', 'interactive', 'intermediate', 3.0, ARRAY['Assess cybersecurity risks', 'Understand governance frameworks', 'Evaluate security programs', 'Respond to cyber incidents'], ARRAY['cybersecurity', 'risk management', 'technology'], false, 3.0, (SELECT id FROM auth.users LIMIT 1)),

('660e8400-e29b-41d4-a716-446655440004', 'ESG Integration and Oversight', 'How to integrate environmental, social, and governance considerations into board oversight and strategic planning.', '550e8400-e29b-41d4-a716-446655440005', 'document', 'advanced', 5.0, ARRAY['Develop ESG strategy', 'Monitor ESG performance', 'Report on ESG initiatives', 'Manage stakeholder expectations'], ARRAY['ESG', 'sustainability', 'strategy'], false, 5.0, (SELECT id FROM auth.users LIMIT 1)),

('660e8400-e29b-41d4-a716-446655440005', 'Audit Committee Deep Dive', 'Comprehensive training for audit committee members covering oversight responsibilities, working with auditors, and financial reporting quality.', '550e8400-e29b-41d4-a716-446655440014', 'interactive', 'advanced', 8.0, ARRAY['Oversee external audit process', 'Evaluate internal controls', 'Review financial reporting quality', 'Manage auditor relationships'], ARRAY['audit committee', 'financial oversight', 'compliance'], true, 8.0, (SELECT id FROM auth.users LIMIT 1)),

('660e8400-e29b-41d4-a716-446655440006', 'Digital Transformation Governance', 'Board oversight of digital transformation initiatives and technology strategy.', '550e8400-e29b-41d4-a716-446655440008', 'video', 'intermediate', 4.0, ARRAY['Evaluate technology strategies', 'Oversee digital initiatives', 'Assess technology risks', 'Guide innovation efforts'], ARRAY['digital transformation', 'technology', 'innovation'], false, 4.0, (SELECT id FROM auth.users LIMIT 1)),

('660e8400-e29b-41d4-a716-446655440007', 'Crisis Management and Business Continuity', 'Preparing boards for crisis situations and ensuring business continuity planning.', '550e8400-e29b-41d4-a716-446655440013', 'interactive', 'advanced', 3.5, ARRAY['Develop crisis response plans', 'Lead during crisis situations', 'Communicate with stakeholders', 'Ensure business continuity'], ARRAY['crisis management', 'business continuity', 'leadership'], false, 3.5, (SELECT id FROM auth.users LIMIT 1)),

('660e8400-e29b-41d4-a716-446655440008', 'Compensation Committee Fundamentals', 'Essential training for compensation committee members on executive compensation design and governance.', '550e8400-e29b-41d4-a716-446655440001', 'document', 'intermediate', 6.0, ARRAY['Design executive compensation', 'Understand pay-for-performance', 'Navigate regulatory requirements', 'Engage with stakeholders'], ARRAY['compensation', 'executive pay', 'performance'], false, 6.0, (SELECT id FROM auth.users LIMIT 1));

-- Insert Knowledge Base Categories
INSERT INTO knowledge_base_categories (id, name, description, icon, display_order, is_active) VALUES
('770e8400-e29b-41d4-a716-446655440001', 'Governance Policies', 'Board governance policies and procedures', 'document-text', 1, true),
('770e8400-e29b-41d4-a716-446655440002', 'Meeting Procedures', 'Board and committee meeting guidelines', 'calendar', 2, true),
('770e8400-e29b-41d4-a716-446655440003', 'Legal & Compliance', 'Legal requirements and compliance guidelines', 'scale', 3, true),
('770e8400-e29b-41d4-a716-446655440004', 'Templates & Forms', 'Standard documents and templates', 'clipboard', 4, true),
('770e8400-e29b-41d4-a716-446655440005', 'FAQs', 'Frequently asked questions', 'question-mark-circle', 5, true),
('770e8400-e29b-41d4-a716-446655440006', 'Organization Structure', 'Company and board organizational information', 'organization-chart', 6, true);

-- Insert Sample Knowledge Base Articles
INSERT INTO knowledge_base_articles (id, title, content, summary, category_id, article_type, tags, status, author_id) VALUES
('880e8400-e29b-41d4-a716-446655440001', 'Board Meeting Preparation Checklist', 
'# Board Meeting Preparation Checklist

## Pre-Meeting (1 Week Before)
- [ ] Review meeting agenda and materials
- [ ] Identify key issues requiring discussion
- [ ] Research any unfamiliar topics
- [ ] Prepare questions for management
- [ ] Review previous meeting minutes

## Day Before Meeting
- [ ] Confirm attendance and logistics
- [ ] Review financial reports and KPIs
- [ ] Check for any last-minute materials
- [ ] Prepare notes and questions

## Day of Meeting
- [ ] Arrive 15 minutes early
- [ ] Bring all materials (physical/digital)
- [ ] Have contact information ready
- [ ] Silence mobile devices

This checklist ensures thorough preparation for effective board participation.',
'A comprehensive checklist to help board members prepare effectively for meetings.',
'770e8400-e29b-41d4-a716-446655440002',
'procedure',
ARRAY['meeting preparation', 'checklist', 'best practices'],
'published',
(SELECT id FROM auth.users LIMIT 1)),

('880e8400-e29b-41d4-a716-446655440002', 'Director Conflict of Interest Policy',
'# Director Conflict of Interest Policy

## Purpose
This policy is designed to help directors identify and manage potential conflicts of interest that may arise in their service to the organization.

## Definition of Conflict of Interest
A conflict of interest occurs when a director''s personal, professional, or financial interests compete with their fiduciary duty to the organization.

## Types of Conflicts
### Financial Conflicts
- Direct financial interest in transactions
- Significant shareholdings in competing companies
- Employment or consulting relationships

### Personal Conflicts
- Family relationships with employees or vendors
- Personal relationships affecting judgment
- Competing time commitments

## Disclosure Requirements
1. Annual disclosure statement completion
2. Immediate disclosure of potential conflicts
3. Recusal from relevant discussions and votes
4. Documentation of conflict management

## Management Process
1. **Identification** - Recognize potential conflicts
2. **Disclosure** - Report to board chair or governance committee
3. **Evaluation** - Assess materiality and impact
4. **Management** - Implement appropriate measures
5. **Monitoring** - Ongoing oversight and review

Board members must prioritize the organization''s interests above personal interests at all times.',
'Policy outlining how directors should identify, disclose, and manage conflicts of interest.',
'770e8400-e29b-41d4-a716-446655440001',
'policy',
ARRAY['conflict of interest', 'ethics', 'governance'],
'published',
(SELECT id FROM auth.users LIMIT 1)),

('880e8400-e29b-41d4-a716-446655440003', 'Understanding Fiduciary Duties',
'# Understanding Fiduciary Duties

As a board member, you have three primary fiduciary duties:

## 1. Duty of Care
The duty of care requires directors to:
- Attend board meetings regularly
- Come prepared having reviewed materials
- Ask informed questions
- Seek expert advice when needed
- Make decisions based on adequate information

**Key Question:** "Am I acting as a reasonably prudent person would in similar circumstances?"

## 2. Duty of Loyalty
The duty of loyalty requires directors to:
- Put the organization''s interests first
- Avoid conflicts of interest
- Maintain confidentiality
- Not compete with the organization
- Not usurp corporate opportunities

**Key Question:** "Am I acting in the best interests of the organization?"

## 3. Duty of Obedience
The duty of obedience requires directors to:
- Ensure compliance with laws and regulations
- Follow the organization''s charter and bylaws
- Adhere to the organization''s mission
- Oversee proper use of resources
- Maintain tax-exempt status (if applicable)

**Key Question:** "Are we operating within our legal and mission parameters?"

## Business Judgment Rule Protection
When directors fulfill their fiduciary duties, they are generally protected by the business judgment rule, which presumes that directors act:
- In good faith
- With the care of an ordinarily prudent person
- In the best interests of the organization

Understanding and fulfilling these duties is fundamental to effective board service and personal protection.',
'Comprehensive guide to the three primary fiduciary duties of board members.',
'770e8400-e29b-41d4-a716-446655440003',
'article',
ARRAY['fiduciary duties', 'legal responsibilities', 'governance'],
'published',
(SELECT id FROM auth.users LIMIT 1));

-- Insert Sample Onboarding Templates
INSERT INTO onboarding_templates (id, name, description, role_type, experience_level, estimated_duration_days, created_by) VALUES
('990e8400-e29b-41d4-a716-446655440001', 'New Independent Director Onboarding', 'Comprehensive onboarding program for new independent board members', 'independent_director', 'beginner', 45, (SELECT id FROM auth.users LIMIT 1)),
('990e8400-e29b-41d4-a716-446655440002', 'Audit Committee Member Onboarding', 'Specialized onboarding for new audit committee members', 'audit_committee', 'intermediate', 30, (SELECT id FROM auth.users LIMIT 1)),
('990e8400-e29b-41d4-a716-446655440003', 'Compensation Committee Onboarding', 'Onboarding program for compensation committee members', 'compensation_committee', 'intermediate', 30, (SELECT id FROM auth.users LIMIT 1)),
('990e8400-e29b-41d4-a716-446655440004', 'Experienced Director Fast Track', 'Accelerated onboarding for directors with prior board experience', 'independent_director', 'advanced', 14, (SELECT id FROM auth.users LIMIT 1));

-- Insert Sample Onboarding Steps for Independent Director template
INSERT INTO onboarding_steps (template_id, title, description, step_order, step_type, estimated_duration_hours, is_required, completion_criteria) VALUES
('990e8400-e29b-41d4-a716-446655440001', 'Welcome & Orientation Meeting', 'Initial meeting with board chair and governance team to review role expectations and provide overview of the organization', 1, 'meeting', 2.0, true, 'Attend orientation meeting and complete initial paperwork'),
('990e8400-e29b-41d4-a716-446655440001', 'Review Corporate Governance Documents', 'Study key governance documents including charter, bylaws, board policies, and committee charters', 2, 'document_review', 4.0, true, 'Confirm review of all governance documents'),
('990e8400-e29b-41d4-a716-446655440001', 'Complete Board Fundamentals Training', 'Complete the mandatory Board Fundamentals training course covering fiduciary duties and governance basics', 3, 'training_module', 4.5, true, 'Pass final assessment with 80% or higher'),
('990e8400-e29b-41d4-a716-446655440001', 'Financial Literacy Training', 'Complete financial literacy training to understand financial statements and key metrics', 4, 'training_module', 6.0, true, 'Pass financial literacy assessment'),
('990e8400-e29b-41d4-a716-446655440001', 'Meet Key Management Team', 'Schedule individual meetings with CEO, CFO, and other key executives', 5, 'meeting', 3.0, true, 'Complete meetings with all designated executives'),
('990e8400-e29b-41d4-a716-446655440001', 'Review Historical Board Materials', 'Review last 12 months of board meeting materials to understand recent decisions and ongoing issues', 6, 'document_review', 6.0, true, 'Complete review and submit summary of key issues'),
('990e8400-e29b-41d4-a716-446655440001', 'Facility Tour and Operations Overview', 'Tour company facilities and receive overview of key business operations', 7, 'meeting', 4.0, false, 'Complete facility tour'),
('990e8400-e29b-41d4-a716-446655440001', 'Mentor Assignment and Introduction', 'Meet with assigned board mentor for guidance and support', 8, 'meeting', 1.5, true, 'Complete initial mentor meeting and establish regular check-in schedule'),
('990e8400-e29b-41d4-a716-446655440001', 'First Board Meeting Preparation', 'Prepare for first board meeting with mentor guidance', 9, 'milestone', 2.0, true, 'Attend first board meeting prepared with questions and insights'),
('990e8400-e29b-41d4-a716-446655440001', '30-Day Check-in and Feedback', 'Review onboarding experience and provide feedback', 10, 'assessment', 1.0, true, 'Complete onboarding feedback survey and check-in meeting');

-- Insert Skill Framework
INSERT INTO skill_frameworks (id, name, description, version, framework_type) VALUES
('aa0e8400-e29b-41d4-a716-446655440001', 'Board Director Competency Framework', 'Comprehensive competency framework for board directors covering governance, financial, strategic, and leadership skills', '2.0', 'competency');

-- Insert Sample Skills
INSERT INTO skills (id, framework_id, name, description, category, skill_level, assessment_criteria) VALUES
('bb0e8400-e29b-41d4-a716-446655440001', 'aa0e8400-e29b-41d4-a716-446655440001', 'Financial Literacy', 'Understanding of financial statements, ratios, and financial analysis', 'Financial', 'foundational', 'Can read and interpret financial statements, understand key ratios, identify financial red flags'),
('bb0e8400-e29b-41d4-a716-446655440002', 'aa0e8400-e29b-41d4-a716-446655440001', 'Strategic Thinking', 'Ability to think strategically about business direction and long-term planning', 'Strategic', 'intermediate', 'Can contribute to strategic planning, evaluate strategic initiatives, understand competitive landscape'),
('bb0e8400-e29b-41d4-a716-446655440003', 'aa0e8400-e29b-41d4-a716-446655440001', 'Risk Management', 'Understanding of enterprise risk management principles and practices', 'Governance', 'intermediate', 'Can identify key risks, evaluate risk management processes, understand risk appetite'),
('bb0e8400-e29b-41d4-a716-446655440004', 'aa0e8400-e29b-41d4-a716-446655440001', 'Industry Knowledge', 'Deep understanding of the specific industry and market dynamics', 'Strategic', 'advanced', 'Expert knowledge of industry trends, regulatory environment, and competitive dynamics'),
('bb0e8400-e29b-41d4-a716-446655440005', 'aa0e8400-e29b-41d4-a716-446655440001', 'Corporate Governance', 'Knowledge of governance principles, board responsibilities, and best practices', 'Governance', 'foundational', 'Understands fiduciary duties, governance frameworks, and board effectiveness principles'),
('bb0e8400-e29b-41d4-a716-446655440006', 'aa0e8400-e29b-41d4-a716-446655440001', 'Leadership & Communication', 'Effective leadership and communication skills in board settings', 'Leadership', 'intermediate', 'Can lead discussions, communicate effectively, influence outcomes, and work collaboratively'),
('bb0e8400-e29b-41d4-a716-446655440007', 'aa0e8400-e29b-41d4-a716-446655440001', 'Technology & Digital Literacy', 'Understanding of technology trends and digital transformation', 'Technology', 'intermediate', 'Can evaluate technology strategies, understand digital risks and opportunities'),
('bb0e8400-e29b-41d4-a716-446655440008', 'aa0e8400-e29b-41d4-a716-446655440001', 'ESG & Sustainability', 'Knowledge of environmental, social, and governance considerations', 'Strategic', 'intermediate', 'Can evaluate ESG initiatives, understand sustainability impacts, and stakeholder expectations');

-- Insert Learning Paths
INSERT INTO learning_paths (id, name, description, target_role, difficulty_level, estimated_duration_months, required_courses, optional_courses, learning_outcomes, created_by) VALUES
('cc0e8400-e29b-41d4-a716-446655440001', 'New Board Member Certification Path', 'Comprehensive learning path for new board members to develop essential governance skills', 'Independent Director', 'beginner', 6, 
ARRAY['660e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440002']::UUID[], 
ARRAY['660e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440004']::UUID[], 
ARRAY['Understand core governance principles', 'Develop financial literacy', 'Master board meeting dynamics', 'Complete first year successfully'], 
(SELECT id FROM auth.users LIMIT 1)),

('cc0e8400-e29b-41d4-a716-446655440002', 'Audit Committee Mastery Path', 'Specialized learning path for audit committee members', 'Audit Committee Chair', 'advanced', 4, 
ARRAY['660e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440005']::UUID[], 
ARRAY['660e8400-e29b-41d4-a716-446655440007']::UUID[], 
ARRAY['Master financial oversight', 'Excel in audit committee leadership', 'Understand complex financial issues'], 
(SELECT id FROM auth.users LIMIT 1)),

('cc0e8400-e29b-41d4-a716-446655440003', 'Digital Director Excellence Path', 'Learning path focused on technology governance and digital transformation oversight', 'Technology-Savvy Director', 'intermediate', 5, 
ARRAY['660e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440006']::UUID[], 
ARRAY['660e8400-e29b-41d4-a716-446655440007']::UUID[], 
ARRAY['Understand cybersecurity governance', 'Oversee digital transformation', 'Evaluate technology strategies'], 
(SELECT id FROM auth.users LIMIT 1));

-- Insert Learning Providers
INSERT INTO learning_providers (id, name, description, website_url, provider_type, integration_status, is_active) VALUES
('dd0e8400-e29b-41d4-a716-446655440001', 'National Association of Corporate Directors (NACD)', 'Leading provider of board education and director certification programs', 'https://nacdonline.org', 'certification', 'inactive', true),
('dd0e8400-e29b-41d4-a716-446655440002', 'Directors & Boards Institute', 'Professional development programs for board members and executives', 'https://directorsandboards.com', 'lms', 'inactive', true),
('dd0e8400-e29b-41d4-a716-446655440003', 'Governance Professionals of Canada', 'Canadian governance education and certification provider', 'https://gpcanada.org', 'certification', 'inactive', true),
('dd0e8400-e29b-41d4-a716-446655440004', 'BoardProspects Webinar Series', 'Monthly webinars on current governance topics', 'https://boardprospects.com', 'webinar', 'inactive', true);

-- Insert Certifications
INSERT INTO certifications (id, name, description, issuing_organization, certification_type, requirements, validity_months, credits) VALUES
('ee0e8400-e29b-41d4-a716-446655440001', 'Board Ready Certificate', 'Foundational certification for new board members', 'BoardGuru Academy', 'course_completion', 
'{"required_courses": ["660e8400-e29b-41d4-a716-446655440001", "660e8400-e29b-41d4-a716-446655440002"], "minimum_score": 80, "experience_requirement": false}', 
24, 10.5),

('ee0e8400-e29b-41d4-a716-446655440002', 'Audit Committee Excellence Certificate', 'Advanced certification for audit committee members', 'BoardGuru Academy', 'assessment', 
'{"required_courses": ["660e8400-e29b-41d4-a716-446655440002", "660e8400-e29b-41d4-a716-446655440005"], "assessment_required": true, "experience_requirement": "2 years board experience"}', 
36, 14.0),

('ee0e8400-e29b-41d4-a716-446655440003', 'Digital Governance Leader Certificate', 'Specialized certification in technology governance', 'BoardGuru Academy', 'pathway', 
'{"learning_path": "cc0e8400-e29b-41d4-a716-446655440003", "capstone_project": true, "peer_review": true}', 
24, 12.5),

('ee0e8400-e29b-41d4-a716-446655440004', 'Continuing Education Certificate', 'Annual continuing education requirement completion', 'BoardGuru Academy', 'external', 
'{"annual_credits": 20, "external_credits_allowed": 10, "variety_requirement": true}', 
12, 20.0);

-- Insert some sample external courses
INSERT INTO external_courses (id, provider_id, external_course_id, title, description, category, duration_hours, credits, cost, enrollment_url, skill_level, tags) VALUES
('ff0e8400-e29b-41d4-a716-446655440001', 'dd0e8400-e29b-41d4-a716-446655440001', 'NACD-DIR-101', 'NACD Director Fundamentals', 'Comprehensive program covering essential director knowledge and skills', 'Governance', 16.0, 16.0, 2500.00, 'https://nacdonline.org/director-fundamentals', 'beginner', ARRAY['governance', 'fundamentals', 'certification']),

('ff0e8400-e29b-41d4-a716-446655440002', 'dd0e8400-e29b-41d4-a716-446655440002', 'DB-CYBER-2024', 'Cybersecurity Oversight for Directors', 'Understanding cyber risks and board oversight responsibilities', 'Risk Management', 4.0, 4.0, 495.00, 'https://directorsandboards.com/cybersecurity-oversight', 'intermediate', ARRAY['cybersecurity', 'risk management', 'technology']),

('ff0e8400-e29b-41d4-a716-446655440003', 'dd0e8400-e29b-41d4-a716-446655440003', 'GPC-ESG-ADV', 'Advanced ESG Governance', 'Deep dive into environmental, social, and governance oversight', 'ESG & Sustainability', 8.0, 8.0, 750.00, 'https://gpcanada.org/esg-governance', 'advanced', ARRAY['ESG', 'sustainability', 'stakeholder management']);

-- Create some sample analytics data patterns (these would typically be generated by user activity)
-- This is just sample data to show the structure
INSERT INTO learning_analytics (user_id, metric_type, metric_value, metric_date, context) 
SELECT 
    u.id,
    'course_completion_rate',
    ROUND((RANDOM() * 40 + 60)::numeric, 2), -- Random completion rate between 60-100%
    CURRENT_DATE - (RANDOM() * 30)::int,
    '{"period": "monthly", "category": "governance"}'::json
FROM auth.users u
LIMIT 5;

INSERT INTO learning_analytics (user_id, metric_type, metric_value, metric_date, context) 
SELECT 
    u.id,
    'time_spent_learning',
    ROUND((RANDOM() * 20 + 5)::numeric, 2), -- Random hours between 5-25
    CURRENT_DATE - (RANDOM() * 7)::int,
    '{"period": "weekly", "activity_type": "interactive_training"}'::json
FROM auth.users u
LIMIT 5;

-- Add some sample mentor profiles (this would typically be done through the application)
INSERT INTO mentor_profiles (user_id, bio, expertise_areas, industries, board_roles, years_experience, max_mentees, languages, time_zone, mentoring_style) 
SELECT 
    u.id,
    'Experienced board member with extensive background in corporate governance and strategic leadership. Passionate about developing the next generation of board directors.',
    ARRAY['Corporate Governance', 'Financial Oversight', 'Strategic Planning', 'Risk Management'],
    ARRAY['Financial Services', 'Technology', 'Healthcare'],
    ARRAY['Independent Director', 'Audit Committee Chair', 'Compensation Committee Member'],
    15,
    3,
    ARRAY['English'],
    'America/New_York',
    'Collaborative and hands-on approach focused on practical application of governance principles.'
FROM auth.users u
LIMIT 2;

-- Add indexes for commonly queried data
CREATE INDEX idx_training_courses_tags ON training_courses USING GIN(tags);
CREATE INDEX idx_knowledge_base_articles_tags ON knowledge_base_articles USING GIN(tags);
CREATE INDEX idx_external_courses_tags ON external_courses USING GIN(tags);
CREATE INDEX idx_skills_category ON skills(category);
CREATE INDEX idx_learning_analytics_metric_type ON learning_analytics(metric_type);
CREATE INDEX idx_learning_analytics_metric_date ON learning_analytics(metric_date);

-- Create a view for course completion statistics
CREATE OR REPLACE VIEW course_completion_stats AS
SELECT 
    tc.id as course_id,
    tc.title,
    tc.category_id,
    COUNT(te.id) as total_enrollments,
    COUNT(CASE WHEN te.status = 'completed' THEN 1 END) as completions,
    ROUND(
        (COUNT(CASE WHEN te.status = 'completed' THEN 1 END)::decimal / 
         NULLIF(COUNT(te.id), 0) * 100), 2
    ) as completion_rate,
    AVG(te.final_score) as average_score,
    AVG(te.time_spent_minutes) as average_time_minutes
FROM training_courses tc
LEFT JOIN training_enrollments te ON tc.id = te.course_id
WHERE tc.is_active = true
GROUP BY tc.id, tc.title, tc.category_id;

-- Create a view for onboarding progress tracking
CREATE OR REPLACE VIEW onboarding_progress_summary AS
SELECT 
    mo.id as onboarding_id,
    mo.user_id,
    mo.status,
    mo.progress_percentage,
    ot.name as template_name,
    ot.role_type,
    COUNT(os.id) as total_steps,
    COUNT(CASE WHEN mop.status = 'completed' THEN 1 END) as completed_steps,
    COUNT(CASE WHEN mop.status = 'in_progress' THEN 1 END) as in_progress_steps,
    mo.start_date,
    mo.target_completion_date,
    CASE 
        WHEN mo.target_completion_date < CURRENT_DATE AND mo.status != 'completed' 
        THEN true 
        ELSE false 
    END as is_overdue
FROM member_onboarding mo
JOIN onboarding_templates ot ON mo.template_id = ot.id
JOIN onboarding_steps os ON ot.id = os.template_id
LEFT JOIN member_onboarding_progress mop ON mo.id = mop.onboarding_id AND os.id = mop.step_id
GROUP BY mo.id, mo.user_id, mo.status, mo.progress_percentage, ot.name, ot.role_type, mo.start_date, mo.target_completion_date;

-- Create a view for mentor availability and matching
CREATE OR REPLACE VIEW mentor_availability AS
SELECT 
    mp.user_id,
    mp.expertise_areas,
    mp.industries,
    mp.board_roles,
    mp.years_experience,
    mp.max_mentees,
    mp.current_mentees,
    (mp.max_mentees - mp.current_mentees) as available_slots,
    mp.is_available,
    mp.languages,
    mp.time_zone,
    COUNT(mr.id) as total_mentorships,
    COUNT(CASE WHEN mr.status = 'active' THEN 1 END) as active_mentorships,
    AVG(mr.satisfaction_rating) as average_satisfaction
FROM mentor_profiles mp
LEFT JOIN mentorship_relationships mr ON mp.user_id = mr.mentor_id
GROUP BY mp.user_id, mp.expertise_areas, mp.industries, mp.board_roles, mp.years_experience, 
         mp.max_mentees, mp.current_mentees, mp.is_available, mp.languages, mp.time_zone;

COMMENT ON TABLE onboarding_templates IS 'Templates defining different onboarding workflows for various board roles and experience levels';
COMMENT ON TABLE training_courses IS 'Catalog of all training courses and modules available in the platform';
COMMENT ON TABLE knowledge_base_articles IS 'Digital board manual articles and documentation with versioning and AI-assistant support';
COMMENT ON TABLE mentor_profiles IS 'Profiles of experienced directors available for mentoring relationships';
COMMENT ON TABLE mentorship_relationships IS 'Active and historical mentoring relationships with matching algorithms';
COMMENT ON TABLE user_skill_assessments IS 'Skills assessments and development tracking for board members';
COMMENT ON TABLE learning_paths IS 'Structured learning journeys for different career development goals';
COMMENT ON TABLE certifications IS 'Available certifications and achievement recognition programs';
COMMENT ON TABLE learning_analytics IS 'Comprehensive analytics for tracking learning progress and effectiveness';