-- Migration: Add CMS system for managing dropdown options
-- Description: Create tables to dynamically manage industry and organization size options
-- Version: 009
-- Created: 2025-08-21

-- Create dropdown_option_categories table
CREATE TABLE IF NOT EXISTS dropdown_option_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    label TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    is_system BOOLEAN DEFAULT false, -- System categories cannot be deleted
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create dropdown_options table
CREATE TABLE IF NOT EXISTS dropdown_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES dropdown_option_categories(id) ON DELETE CASCADE,
    value TEXT NOT NULL,
    label TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    is_system BOOLEAN DEFAULT false, -- System options cannot be deleted
    sort_order INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(category_id, value)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_dropdown_options_category ON dropdown_options(category_id);
CREATE INDEX IF NOT EXISTS idx_dropdown_options_active ON dropdown_options(is_active);
CREATE INDEX IF NOT EXISTS idx_dropdown_options_sort ON dropdown_options(category_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_dropdown_option_categories_active ON dropdown_option_categories(is_active);

-- Add updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_dropdown_option_categories_updated_at 
    BEFORE UPDATE ON dropdown_option_categories 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dropdown_options_updated_at 
    BEFORE UPDATE ON dropdown_options 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default categories
INSERT INTO dropdown_option_categories (name, label, description, is_system, sort_order) VALUES
('industry', 'Industries', 'Organization industry types', true, 1),
('organization_size', 'Organization Sizes', 'Organization size categories', true, 2),
('compliance_standards', 'Compliance Standards', 'Compliance and regulatory standards', true, 3),
('asset_categories', 'Asset Categories', 'Document and asset categories', true, 4),
('meeting_types', 'Meeting Types', 'Types of board meetings', true, 5)
ON CONFLICT (name) DO NOTHING;

-- Insert default industry options
WITH industry_category AS (
    SELECT id FROM dropdown_option_categories WHERE name = 'industry'
)
INSERT INTO dropdown_options (category_id, value, label, description, is_system, sort_order) 
SELECT 
    industry_category.id,
    LOWER(REPLACE(industry_data.label, ' & ', '_and_')),
    industry_data.label,
    industry_data.description,
    true,
    industry_data.sort_order
FROM industry_category,
(VALUES
    ('Technology', 'Software, hardware, and tech services', 1),
    ('Finance & Banking', 'Financial services, banking, and investment', 2),
    ('Healthcare & Life Sciences', 'Medical, pharmaceutical, and health services', 3),
    ('Education', 'Educational institutions and learning services', 4),
    ('Manufacturing', 'Industrial production and manufacturing', 5),
    ('Retail & E-commerce', 'Retail trade and online commerce', 6),
    ('Real Estate', 'Property development and real estate services', 7),
    ('Legal Services', 'Law firms and legal service providers', 8),
    ('Consulting', 'Professional consulting and advisory services', 9),
    ('Media & Entertainment', 'Media production and entertainment services', 10),
    ('Energy & Utilities', 'Power generation and utility services', 11),
    ('Transportation & Logistics', 'Shipping, logistics, and transportation', 12),
    ('Food & Beverage', 'Food production and beverage services', 13),
    ('Non-Profit', 'Non-profit organizations and charities', 14),
    ('Government', 'Government agencies and public sector', 15),
    ('Agriculture', 'Farming and agricultural services', 16),
    ('Construction', 'Building and construction services', 17),
    ('Insurance', 'Insurance and risk management services', 18),
    ('Telecommunications', 'Communication and telecom services', 19),
    ('Other', 'Other industries not listed above', 20)
) AS industry_data(label, description, sort_order)
ON CONFLICT (category_id, value) DO NOTHING;

-- Insert default organization size options
WITH size_category AS (
    SELECT id FROM dropdown_option_categories WHERE name = 'organization_size'
)
INSERT INTO dropdown_options (category_id, value, label, description, is_system, sort_order, metadata) 
SELECT 
    size_category.id,
    size_data.value,
    size_data.label,
    size_data.description,
    true,
    size_data.sort_order,
    json_build_object('employee_range', size_data.employee_range)
FROM size_category,
(VALUES
    ('startup', 'Startup', '1-10 employees', 1, '1-10'),
    ('small', 'Small Business', '11-50 employees', 2, '11-50'),
    ('medium', 'Medium Business', '51-250 employees', 3, '51-250'),
    ('large', 'Large Business', '251-1000 employees', 4, '251-1000'),
    ('enterprise', 'Enterprise', '1000+ employees', 5, '1000+')
) AS size_data(value, label, description, sort_order, employee_range)
ON CONFLICT (category_id, value) DO NOTHING;

-- Insert default compliance standards
WITH compliance_category AS (
    SELECT id FROM dropdown_option_categories WHERE name = 'compliance_standards'
)
INSERT INTO dropdown_options (category_id, value, label, description, is_system, sort_order) 
SELECT 
    compliance_category.id,
    LOWER(REPLACE(REPLACE(compliance_data.value, ' ', '_'), '(', '')),
    compliance_data.label,
    compliance_data.description,
    true,
    compliance_data.sort_order
FROM compliance_category,
(VALUES
    ('SOX', 'SOX (Sarbanes-Oxley)', 'Financial reporting and corporate governance', 1),
    ('GDPR', 'GDPR (General Data Protection Regulation)', 'EU data protection and privacy regulation', 2),
    ('HIPAA', 'HIPAA (Health Insurance Portability)', 'Healthcare data protection standards', 3),
    ('SOC_2', 'SOC 2 (Service Organization Control 2)', 'Security, availability, and confidentiality standards', 4),
    ('ISO_27001', 'ISO 27001', 'Information security management systems', 5),
    ('PCI_DSS', 'PCI DSS (Payment Card Industry)', 'Payment card data security standards', 6),
    ('CCPA', 'CCPA (California Consumer Privacy Act)', 'California privacy regulation', 7),
    ('CUSTOM', 'Custom Internal Standards', 'Organization-specific compliance requirements', 8)
) AS compliance_data(value, label, description, sort_order)
ON CONFLICT (category_id, value) DO NOTHING;

-- Insert default asset categories
WITH asset_category AS (
    SELECT id FROM dropdown_option_categories WHERE name = 'asset_categories'
)
INSERT INTO dropdown_options (category_id, value, label, description, is_system, sort_order) 
SELECT 
    asset_category.id,
    LOWER(REPLACE(asset_data.value, ' ', '_')),
    asset_data.label,
    asset_data.description,
    true,
    asset_data.sort_order
FROM asset_category,
(VALUES
    ('board_pack', 'Board Packs', 'Complete board meeting packages', 1),
    ('meeting_notes', 'Meeting Notes', 'Meeting minutes and notes', 2),
    ('agenda', 'Agenda', 'Meeting agendas and schedules', 3),
    ('notes', 'Notes', 'General notes and documentation', 4),
    ('financial_report', 'Financial Reports', 'Financial statements and reports', 5),
    ('legal_document', 'Legal Documents', 'Contracts and legal papers', 6),
    ('presentation', 'Presentations', 'Slide decks and presentations', 7),
    ('policy', 'Policies & Procedures', 'Corporate policies and procedures', 8),
    ('other', 'Other', 'Miscellaneous documents', 9)
) AS asset_data(value, label, description, sort_order)
ON CONFLICT (category_id, value) DO NOTHING;

-- Insert default meeting types
WITH meeting_category AS (
    SELECT id FROM dropdown_option_categories WHERE name = 'meeting_types'
)
INSERT INTO dropdown_options (category_id, value, label, description, is_system, sort_order) 
SELECT 
    meeting_category.id,
    meeting_data.value,
    meeting_data.label,
    meeting_data.description,
    true,
    meeting_data.sort_order
FROM meeting_category,
(VALUES
    ('agm', 'Annual General Meeting', 'Yearly shareholder meeting', 1),
    ('board', 'Board Meeting', 'Regular board of directors meeting', 2),
    ('committee', 'Committee Meeting', 'Specialized committee meeting', 3),
    ('emergency', 'Emergency Meeting', 'Urgent matters requiring immediate attention', 4),
    ('strategy', 'Strategy Session', 'Strategic planning and review', 5),
    ('audit', 'Audit Committee', 'Audit and compliance review', 6),
    ('compensation', 'Compensation Committee', 'Executive compensation review', 7),
    ('nomination', 'Nomination Committee', 'Board member nomination and governance', 8),
    ('other', 'Other', 'Other meeting types', 9)
) AS meeting_data(value, label, description, sort_order)
ON CONFLICT (category_id, value) DO NOTHING;

-- Add RLS policies
ALTER TABLE dropdown_option_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE dropdown_options ENABLE ROW LEVEL SECURITY;

-- Policy: All users can read active categories and options
CREATE POLICY "Users can read active dropdown categories" ON dropdown_option_categories
    FOR SELECT USING (is_active = true);

CREATE POLICY "Users can read active dropdown options" ON dropdown_options
    FOR SELECT USING (is_active = true);

-- Policy: Only admins can modify dropdown options
CREATE POLICY "Only admins can modify dropdown categories" ON dropdown_option_categories
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'director')
        )
    );

CREATE POLICY "Only admins can modify dropdown options" ON dropdown_options
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'director')
        )
    );

-- Add comments for documentation
COMMENT ON TABLE dropdown_option_categories IS 'Categories for organizing dropdown options across the application';
COMMENT ON TABLE dropdown_options IS 'Dynamic dropdown options that can be managed through CMS';
COMMENT ON COLUMN dropdown_option_categories.is_system IS 'System categories cannot be deleted by users';
COMMENT ON COLUMN dropdown_options.is_system IS 'System options cannot be deleted by users';
COMMENT ON COLUMN dropdown_options.metadata IS 'Additional data for options (e.g., employee ranges, colors, etc.)';

-- Rollback instructions (for reference)
-- To rollback this migration:
-- DROP POLICY IF EXISTS "Only admins can modify dropdown options" ON dropdown_options;
-- DROP POLICY IF EXISTS "Only admins can modify dropdown categories" ON dropdown_option_categories;
-- DROP POLICY IF EXISTS "Users can read active dropdown options" ON dropdown_options;
-- DROP POLICY IF EXISTS "Users can read active dropdown categories" ON dropdown_option_categories;
-- DROP TRIGGER IF EXISTS update_dropdown_options_updated_at ON dropdown_options;
-- DROP TRIGGER IF EXISTS update_dropdown_option_categories_updated_at ON dropdown_option_categories;
-- DROP INDEX IF EXISTS idx_dropdown_option_categories_active;
-- DROP INDEX IF EXISTS idx_dropdown_options_sort;
-- DROP INDEX IF EXISTS idx_dropdown_options_active;
-- DROP INDEX IF EXISTS idx_dropdown_options_category;
-- DROP TABLE IF EXISTS dropdown_options;
-- DROP TABLE IF EXISTS dropdown_option_categories;