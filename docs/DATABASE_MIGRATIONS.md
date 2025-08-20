# Database Migrations Guide

This document explains how to use the database migration system in BoardGuru.

## Overview

The migration system provides:
- **Version Control**: Track all database schema changes
- **Automated Execution**: Run migrations in the correct order
- **Rollback Support**: Safely undo migrations when needed
- **Team Collaboration**: Share schema changes across environments
- **Audit Trail**: Complete history of database changes

## Quick Start

```bash
# Check migration status
npm run db:status

# Create a new migration
npm run db:create "Add user preferences table"

# Test migration (dry run)
npm run db:migrate:dry

# Apply migrations
npm run db:migrate

# Rollback last migration
npm run db:rollback
```

## Available Commands

### Migration Management

| Command | Description |
|---------|-------------|
| `npm run db:status` | Show current migration status |
| `npm run db:migrate` | Apply all pending migrations |
| `npm run db:rollback` | Rollback the last applied migration |
| `npm run db:create <name>` | Create a new migration file |

### Testing & Safety

| Command | Description |
|---------|-------------|
| `npm run db:migrate:dry` | Preview migrations without applying |
| `npm run db:rollback:dry` | Preview rollback without executing |

### Advanced Usage

```bash
# Direct script usage with options
node scripts/migrate.js up --dry-run --force
node scripts/migrate.js status --verbose
node scripts/create-migration.js "Migration name" "Description" "Author"
```

## Creating Migrations

### 1. Generate Migration File

```bash
npm run db:create "Add user notifications table"
```

This creates a new file: `database/migrations/YYYYMMDD_NNN_add_user_notifications_table.sql`

### 2. Edit Migration Content

The generated file includes template sections:

```sql
-- =====================================================
-- UP MIGRATION
-- =====================================================

-- Add your schema changes here
CREATE TABLE user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  message TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_notifications_user_id ON user_notifications(user_id);
CREATE INDEX idx_user_notifications_created_at ON user_notifications(created_at DESC);

-- =====================================================
-- DOWN MIGRATION (Rollback)
-- =====================================================

-- Add rollback instructions here
/*
DROP INDEX IF EXISTS idx_user_notifications_created_at;
DROP INDEX IF EXISTS idx_user_notifications_user_id;
DROP TABLE IF EXISTS user_notifications;
*/
```

### 3. Test and Apply

```bash
# Test the migration
npm run db:migrate:dry

# Apply the migration
npm run db:migrate
```

## Migration File Structure

### Naming Convention

Files follow the pattern: `YYYYMMDD_NNN_description.sql`

- `YYYYMMDD`: Date (e.g., 20250820)
- `NNN`: Sequential number for the day (001, 002, etc.)
- `description`: Snake_case description

### File Format

```sql
-- =====================================================
-- MIGRATION HEADER
-- Migration: 20250820_001_add_feature
-- Description: Add new feature to system
-- Author: developer.name
-- Created: 2025-08-20
-- =====================================================

-- =====================================================
-- UP MIGRATION
-- =====================================================

-- Schema changes go here
CREATE TABLE example (...);

-- =====================================================
-- DOWN MIGRATION (Rollback)
-- =====================================================

-- Rollback changes (commented out by default)
/*
DROP TABLE IF EXISTS example;
*/
```

## Best Practices

### Writing Migrations

1. **Always provide rollback instructions** in the DOWN section
2. **Test migrations thoroughly** using dry-run mode
3. **Use IF EXISTS/IF NOT EXISTS** for safety
4. **Add appropriate indexes** for performance
5. **Include constraints and validations**
6. **Document complex changes** with comments

### Migration Content Guidelines

```sql
-- ✅ Good: Safe and reversible
CREATE TABLE IF NOT EXISTS users_temp AS SELECT * FROM users;
ALTER TABLE users ADD COLUMN new_field TEXT;
DROP TABLE IF EXISTS users_temp;

-- ❌ Avoid: Data loss without backup
ALTER TABLE users DROP COLUMN old_field;

-- ✅ Good: Proper constraints
ALTER TABLE users ADD COLUMN email TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD CONSTRAINT uk_users_email UNIQUE(email);

-- ✅ Good: Performance considerations
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);
```

### Rollback Guidelines

1. **Always test rollback** before applying to production
2. **Backup data** before destructive changes
3. **Use transactions** for complex migrations
4. **Document rollback risks** in comments

## Migration Tracking

The system uses a `schema_migrations` table to track:

- **Version**: Unique migration identifier
- **Status**: applied, pending, failed, rolled_back
- **Checksums**: Verify migration integrity
- **Timing**: When and how long migrations took
- **Metadata**: Environment, author, application version

### Viewing Migration History

```sql
-- Check current status
SELECT * FROM current_migration_status;

-- View migration history
SELECT * FROM migration_history ORDER BY applied_at DESC;

-- Check specific migration
SELECT * FROM schema_migrations WHERE version = '20250820_001_example';
```

## Environment Management

### Development

```bash
# Regular development workflow
npm run db:create "Feature description"
npm run db:migrate:dry  # Test first
npm run db:migrate      # Apply
```

### Staging/Production

```bash
# Always test first
npm run db:migrate:dry

# Apply with environment variable
NODE_ENV=production npm run db:migrate

# Check status
npm run db:status
```

## Troubleshooting

### Failed Migration

If a migration fails:

1. **Check the error message** in the output
2. **Review migration status**: `npm run db:status`
3. **Fix the issue** in the migration file
4. **Update the checksum** will be handled automatically
5. **Re-run**: `npm run db:migrate`

### Rollback Issues

If rollback fails:

1. **Check if DOWN section exists** and is uncommented
2. **Manually fix** the database state if needed
3. **Update migration status** in `schema_migrations` table

### Checksum Mismatch

If you need to modify an applied migration:

1. **Create a new migration** instead (recommended)
2. **Or manually update** the checksum in `schema_migrations`

### Emergency Recovery

```sql
-- Reset migration status (DANGER: Use with caution)
UPDATE schema_migrations 
SET status = 'pending' 
WHERE version = 'problematic_version';

-- Skip migration (mark as applied without running)
UPDATE schema_migrations 
SET status = 'applied', applied_at = NOW() 
WHERE version = 'version_to_skip';
```

## Integration with Supabase

The migration system works with:

- **Supabase CLI**: Compatible with `supabase db push`
- **Local Development**: Works with local Supabase instances
- **Remote Database**: Direct connection to Supabase cloud
- **Row Level Security**: Migrations can include RLS policies

### Supabase Integration

```bash
# Generate Supabase types after migration
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/database.ts

# Or for local development
npx supabase gen types typescript --local > src/types/database.ts
```

## Security Considerations

1. **Service Role Required**: Migrations need service_role permissions
2. **Environment Variables**: Keep credentials secure
3. **Production Safety**: Always test in staging first
4. **Audit Trail**: All changes are logged
5. **Access Control**: Restrict migration execution to authorized users

## File Organization

```
database/
├── migrations/
│   ├── 001-organizations-core.sql
│   ├── 002-asset-permissions.sql
│   ├── 006-schema-migrations.sql
│   └── 20250820_001_new_feature.sql
└── README.md

scripts/
├── migrate.js              # Migration runner
└── create-migration.js     # Template generator
```

## Team Workflow

### Feature Development

1. **Create feature branch**
2. **Generate migration**: `npm run db:create "Feature name"`
3. **Develop and test** migration
4. **Commit migration file** with feature code
5. **Create pull request**

### Code Review

- **Review migration logic** for correctness
- **Check rollback instructions** are provided
- **Verify naming conventions** are followed
- **Test migration** in review environment

### Deployment

1. **Staging deployment** with migration test
2. **Production deployment** with migration
3. **Verification** that migration succeeded
4. **Rollback plan** if issues arise

## Advanced Features

### Custom Migration Metadata

```sql
-- Add custom metadata to migrations
INSERT INTO schema_migrations (metadata) VALUES ('{
  "jira_ticket": "BOARD-123",
  "reviewer": "senior.dev",
  "performance_impact": "low",
  "breaking_change": false
}');
```

### Batch Operations

```bash
# Run specific migration
node scripts/migrate.js up --version 20250820_001_example

# Force continue on errors
node scripts/migrate.js up --force

# Verbose output
node scripts/migrate.js status --verbose
```

### Custom Environments

```bash
# Different environment configurations
NODE_ENV=staging npm run db:migrate
NODE_ENV=production npm run db:migrate
```

## Support

For issues with the migration system:

1. **Check this documentation** first
2. **Review error messages** carefully
3. **Test in development** environment
4. **Create GitHub issue** if needed
5. **Contact team lead** for production issues

---

**Remember**: Always backup your database before running migrations in production!