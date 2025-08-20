-- Step 1: Create Enums
CREATE TYPE vault_status AS ENUM ('draft', 'active', 'archived', 'expired', 'cancelled');
CREATE TYPE vault_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE vault_category AS ENUM ('board_meeting', 'committee_meeting', 'strategic_planning', 'audit_committee', 'other');