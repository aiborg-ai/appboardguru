-- Migration: Add asset categories support
-- Description: Add category field to assets table with predefined types
-- Version: 008
-- Created: 2025-08-21

-- Add category column to board_packs table
ALTER TABLE board_packs 
ADD COLUMN IF NOT EXISTS category TEXT CHECK (category IN (
    'board_pack',
    'meeting_notes', 
    'agenda',
    'notes',
    'financial_report',
    'legal_document',
    'presentation',
    'other'
)) DEFAULT 'other';

-- Create index for category filtering
CREATE INDEX IF NOT EXISTS idx_board_packs_category ON board_packs(category);

-- Create composite index for organization + category filtering
CREATE INDEX IF NOT EXISTS idx_board_packs_org_category ON board_packs(organization_id, category);

-- Update existing board_packs to have a default category based on file name
UPDATE board_packs 
SET category = CASE 
    WHEN LOWER(title) LIKE '%board%pack%' OR LOWER(title) LIKE '%board%book%' THEN 'board_pack'
    WHEN LOWER(title) LIKE '%meeting%' OR LOWER(title) LIKE '%minutes%' THEN 'meeting_notes'
    WHEN LOWER(title) LIKE '%agenda%' THEN 'agenda'
    WHEN LOWER(title) LIKE '%financial%' OR LOWER(title) LIKE '%finance%' THEN 'financial_report'
    WHEN LOWER(title) LIKE '%legal%' OR LOWER(title) LIKE '%contract%' THEN 'legal_document'
    WHEN LOWER(title) LIKE '%presentation%' OR LOWER(title) LIKE '%slide%' THEN 'presentation'
    WHEN LOWER(title) LIKE '%note%' THEN 'notes'
    ELSE 'other'
END
WHERE category = 'other' OR category IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN board_packs.category IS 'Asset category for filtering and organization';
COMMENT ON INDEX idx_board_packs_category IS 'Index for fast category-based filtering';
COMMENT ON INDEX idx_board_packs_org_category IS 'Composite index for organization and category filtering';

-- Rollback instructions (for reference)
-- To rollback this migration:
-- DROP INDEX IF EXISTS idx_board_packs_org_category;
-- DROP INDEX IF EXISTS idx_board_packs_category;
-- ALTER TABLE board_packs DROP COLUMN IF EXISTS category;