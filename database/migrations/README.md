# Database Migrations

This directory contains all database migration files for BoardGuru.

## Quick Reference

```bash
# Create new migration
npm run db:create "Migration description"

# Check status
npm run db:status

# Apply migrations
npm run db:migrate

# Rollback last migration
npm run db:rollback
```

## File Naming Convention

Migration files follow the pattern: `YYYYMMDD_NNN_description.sql`

- `YYYYMMDD`: Date (e.g., 20250820)
- `NNN`: Sequential number for the day (001, 002, etc.)
- `description`: Snake_case description of changes

## Current Migrations

| Version | File | Description | Status |
|---------|------|-------------|---------|
| 001 | `001-organizations-core.sql` | Core organizations system | Applied |
| 002 | `002-asset-permissions.sql` | Asset permission system | Applied |
| 003 | `003-audit-security.sql` | Audit and security features | Applied |
| 004 | `004-rls-policies.sql` | Row Level Security policies | Applied |
| 005 | `005-otp-codes.sql` | OTP codes for authentication | Applied |
| 006 | `006-schema-migrations.sql` | Migration tracking system | Applied |

## Migration Structure

Each migration file contains:

### UP Migration
The forward changes to apply to the database.

### DOWN Migration  
The rollback instructions to undo the changes (usually commented out).

### Example

```sql
-- =====================================================
-- UP MIGRATION
-- =====================================================

CREATE TABLE example (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL
);

-- =====================================================
-- DOWN MIGRATION
-- =====================================================

/*
DROP TABLE IF EXISTS example;
*/
```

## Important Notes

1. **Never edit applied migrations** - create new ones instead
2. **Always include rollback instructions** in DOWN section
3. **Test migrations** with dry-run before applying
4. **Backup production** before running migrations
5. **Follow naming conventions** for consistency

## Documentation

See [DATABASE_MIGRATIONS.md](../DATABASE_MIGRATIONS.md) for complete documentation.

## Support

- Check migration status: `npm run db:status`  
- Dry run test: `npm run db:migrate:dry`
- Force rollback: `npm run db:rollback`
- Create new: `npm run db:create "Description"`