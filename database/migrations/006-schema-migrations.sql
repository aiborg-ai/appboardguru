-- =====================================================
-- SCHEMA MIGRATIONS SYSTEM
-- Migration: 006-schema-migrations.sql
-- Description: Initialize database versioning and migration tracking system
-- Created: 2025-08-20
-- =====================================================

-- =====================================================
-- UP MIGRATION
-- =====================================================

-- Create schema_migrations table to track migration history
CREATE TABLE IF NOT EXISTS schema_migrations (
  id SERIAL PRIMARY KEY,
  
  -- Migration Identity
  version VARCHAR(255) NOT NULL UNIQUE, -- e.g., "20250820_001_organizations_core"
  name VARCHAR(255) NOT NULL,           -- Human readable migration name
  filename VARCHAR(255) NOT NULL,       -- Original migration filename
  
  -- Migration Content Integrity
  checksum_up TEXT NOT NULL,            -- SHA256 of UP migration content
  checksum_down TEXT,                   -- SHA256 of DOWN migration content (if exists)
  
  -- Execution Tracking
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'running', 'applied', 'failed', 'rolled_back')
  ),
  applied_at TIMESTAMPTZ,               -- When migration was successfully applied
  applied_by VARCHAR(255),              -- User/system that applied the migration
  execution_time_ms INTEGER,            -- How long the migration took to run
  
  -- Rollback Tracking
  rolled_back_at TIMESTAMPTZ,           -- When migration was rolled back
  rolled_back_by VARCHAR(255),          -- User/system that rolled back
  rollback_reason TEXT,                 -- Why the migration was rolled back
  
  -- Metadata
  description TEXT,                     -- Detailed description of changes
  database_version VARCHAR(50),         -- PostgreSQL version when applied
  application_version VARCHAR(50),      -- Application version when applied
  environment VARCHAR(50),              -- Environment (dev, staging, prod)
  
  -- Audit Trail
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Additional metadata in JSON format
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_schema_migrations_version ON schema_migrations(version);
CREATE INDEX IF NOT EXISTS idx_schema_migrations_status ON schema_migrations(status);
CREATE INDEX IF NOT EXISTS idx_schema_migrations_applied_at ON schema_migrations(applied_at DESC);
CREATE INDEX IF NOT EXISTS idx_schema_migrations_environment ON schema_migrations(environment);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_schema_migrations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_schema_migrations_updated_at
  BEFORE UPDATE ON schema_migrations
  FOR EACH ROW
  EXECUTE FUNCTION update_schema_migrations_updated_at();

-- Create migration_history view for easier querying
CREATE OR REPLACE VIEW migration_history AS
SELECT 
  version,
  name,
  status,
  applied_at,
  applied_by,
  execution_time_ms,
  rolled_back_at,
  rolled_back_by,
  description,
  environment,
  created_at
FROM schema_migrations
ORDER BY version ASC;

-- Create current_migration_status view
CREATE OR REPLACE VIEW current_migration_status AS
SELECT 
  COUNT(*) as total_migrations,
  COUNT(*) FILTER (WHERE status = 'applied') as applied_migrations,
  COUNT(*) FILTER (WHERE status = 'pending') as pending_migrations,
  COUNT(*) FILTER (WHERE status = 'failed') as failed_migrations,
  COUNT(*) FILTER (WHERE status = 'rolled_back') as rolled_back_migrations,
  MAX(applied_at) as last_migration_date,
  MAX(version) FILTER (WHERE status = 'applied') as current_version
FROM schema_migrations;

-- Insert migration record for this migration itself
INSERT INTO schema_migrations (
  version,
  name,
  filename,
  checksum_up,
  status,
  applied_at,
  applied_by,
  description,
  database_version,
  environment
) VALUES (
  '20250820_006_schema_migrations',
  'Initialize Schema Migrations System',
  '006-schema-migrations.sql',
  'initial', -- Will be updated by migration runner
  'applied',
  NOW(),
  'system',
  'Create schema_migrations table and supporting infrastructure for database versioning',
  (SELECT version() FROM version()),
  COALESCE(current_setting('app.environment', true), 'development')
) ON CONFLICT (version) DO NOTHING;

-- Grant appropriate permissions
GRANT SELECT ON schema_migrations TO authenticated;
GRANT SELECT ON migration_history TO authenticated;
GRANT SELECT ON current_migration_status TO authenticated;

-- Only service role can modify migrations
GRANT ALL ON schema_migrations TO service_role;

-- Enable RLS
ALTER TABLE schema_migrations ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow service_role full access, others read-only
CREATE POLICY "Service role full access to schema_migrations" ON schema_migrations
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated users read schema_migrations" ON schema_migrations
  FOR SELECT USING (auth.role() = 'authenticated');

-- =====================================================
-- DOWN MIGRATION
-- =====================================================

/*
-- Uncomment to enable rollback (WARNING: This will lose migration history)

-- Drop RLS policies
DROP POLICY IF EXISTS "Service role full access to schema_migrations" ON schema_migrations;
DROP POLICY IF EXISTS "Authenticated users read schema_migrations" ON schema_migrations;

-- Drop views
DROP VIEW IF EXISTS current_migration_status;
DROP VIEW IF EXISTS migration_history;

-- Drop trigger and function
DROP TRIGGER IF EXISTS trigger_schema_migrations_updated_at ON schema_migrations;
DROP FUNCTION IF EXISTS update_schema_migrations_updated_at();

-- Drop indexes
DROP INDEX IF EXISTS idx_schema_migrations_environment;
DROP INDEX IF EXISTS idx_schema_migrations_applied_at;
DROP INDEX IF EXISTS idx_schema_migrations_status;
DROP INDEX IF EXISTS idx_schema_migrations_version;

-- Drop table
DROP TABLE IF EXISTS schema_migrations;

*/

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================