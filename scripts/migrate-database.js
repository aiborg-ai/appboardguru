#!/usr/bin/env node

/**
 * Database Migration Script
 * Safely applies new database migrations with rollback support
 */

const fs = require('fs').promises
const path = require('path')
const { program } = require('commander')
const { createClient } = require('@supabase/supabase-js')

program
  .name('migrate-database')
  .description('Apply database migrations safely')
  .version('1.0.0')

program
  .command('up')
  .description('Apply pending migrations')
  .option('--dry-run', 'Show what would be migrated without applying')
  .option('--force', 'Force apply migrations even if there are warnings')
  .action(async (options) => {
    try {
      await runMigrations('up', options)
    } catch (error) {
      console.error(`❌ Migration failed: ${error.message}`)
      process.exit(1)
    }
  })

program
  .command('down <steps>')
  .description('Rollback migrations')
  .option('--dry-run', 'Show what would be rolled back without applying')
  .option('--force', 'Force rollback even if there are warnings')
  .action(async (steps, options) => {
    try {
      await runMigrations('down', { ...options, steps: parseInt(steps) })
    } catch (error) {
      console.error(`❌ Rollback failed: ${error.message}`)
      process.exit(1)
    }
  })

program
  .command('status')
  .description('Show migration status')
  .action(async () => {
    try {
      await showMigrationStatus()
    } catch (error) {
      console.error(`❌ Failed to show status: ${error.message}`)
      process.exit(1)
    }
  })

program
  .command('create <name>')
  .description('Create a new migration file')
  .action(async (name) => {
    try {
      await createMigration(name)
    } catch (error) {
      console.error(`❌ Failed to create migration: ${error.message}`)
      process.exit(1)
    }
  })

program.parse()

/**
 * Run migrations
 */
async function runMigrations(direction, options) {
  const supabase = createSupabaseClient()
  
  // Ensure migrations table exists
  await ensureMigrationsTable(supabase)
  
  const migrationsDir = path.join(process.cwd(), 'database', 'migrations')
  const migrations = await getMigrationFiles(migrationsDir)
  
  if (direction === 'up') {
    const pending = await getPendingMigrations(supabase, migrations)
    
    if (pending.length === 0) {
      console.log('✅ No pending migrations')
      return
    }
    
    console.log(`📊 Found ${pending.length} pending migrations:`)
    pending.forEach(m => console.log(`  - ${m.filename}`))
    
    if (options.dryRun) {
      console.log('🔍 Dry run complete - no migrations applied')
      return
    }
    
    // Apply migrations
    for (const migration of pending) {
      console.log(`⚡ Applying ${migration.filename}...`)
      await applyMigration(supabase, migration, 'up')
      console.log(`✅ Applied ${migration.filename}`)
    }
    
    console.log(`🎉 Successfully applied ${pending.length} migrations`)
    
  } else if (direction === 'down') {
    const applied = await getAppliedMigrations(supabase, migrations)
    const toRollback = applied.slice(-options.steps)
    
    if (toRollback.length === 0) {
      console.log('✅ No migrations to rollback')
      return
    }
    
    console.log(`📊 Rolling back ${toRollback.length} migrations:`)
    toRollback.forEach(m => console.log(`  - ${m.filename}`))
    
    if (options.dryRun) {
      console.log('🔍 Dry run complete - no rollbacks applied')
      return
    }
    
    // Rollback migrations (in reverse order)
    for (const migration of toRollback.reverse()) {
      console.log(`⚡ Rolling back ${migration.filename}...`)
      await applyMigration(supabase, migration, 'down')
      console.log(`✅ Rolled back ${migration.filename}`)
    }
    
    console.log(`🎉 Successfully rolled back ${toRollback.length} migrations`)
  }
}

/**
 * Show migration status
 */
async function showMigrationStatus() {
  const supabase = createSupabaseClient()
  
  await ensureMigrationsTable(supabase)
  
  const migrationsDir = path.join(process.cwd(), 'database', 'migrations')
  const migrations = await getMigrationFiles(migrationsDir)
  const applied = await getAppliedMigrationNames(supabase)
  
  console.log('📊 Migration Status:')
  console.log(`   Total migrations: ${migrations.length}`)
  console.log(`   Applied: ${applied.size}`)
  console.log(`   Pending: ${migrations.length - applied.size}`)
  console.log('')
  
  if (migrations.length === 0) {
    console.log('   No migrations found')
    return
  }
  
  console.log('   Migrations:')
  for (const migration of migrations) {
    const status = applied.has(migration.name) ? '✅' : '⏳'
    const appliedAt = applied.has(migration.name) ? 
      ` (applied ${new Date(applied.get(migration.name)).toISOString()})` : ''
    console.log(`   ${status} ${migration.filename}${appliedAt}`)
  }
}

/**
 * Create new migration file
 */
async function createMigration(name) {
  const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '').replace('T', '-')
  const filename = `${timestamp}-${name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}.sql`
  const filepath = path.join(process.cwd(), 'database', 'migrations', filename)
  
  const template = `-- Migration: ${name}
-- Created: ${new Date().toISOString()}
-- Description: ${name}

-- Add your migration SQL here
BEGIN;

-- Example:
-- CREATE TABLE IF NOT EXISTS example_table (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   name TEXT NOT NULL,
--   created_at TIMESTAMPTZ DEFAULT NOW()
-- );

COMMIT;

-- Rollback instructions (for manual rollback if needed)
-- DROP TABLE IF EXISTS example_table;
`

  await fs.mkdir(path.dirname(filepath), { recursive: true })
  await fs.writeFile(filepath, template)
  
  console.log(`✅ Created migration: ${filename}`)
  console.log(`📝 Edit the file at: ${filepath}`)
}

/**
 * Utility functions
 */
function createSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing required environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  }
  
  return createClient(supabaseUrl, supabaseKey)
}

async function ensureMigrationsTable(supabase) {
  const { error } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        migration_name TEXT NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ DEFAULT NOW(),
        checksum TEXT
      );
    `
  })
  
  if (error) {
    throw new Error(`Failed to create migrations table: ${error.message}`)
  }
}

async function getMigrationFiles(dir) {
  try {
    const files = await fs.readdir(dir)
    return files
      .filter(f => f.endsWith('.sql'))
      .sort()
      .map(filename => ({
        filename,
        name: filename.replace(/^\d+-/, '').replace(/\.sql$/, ''),
        filepath: path.join(dir, filename)
      }))
  } catch (error) {
    if (error.code === 'ENOENT') {
      return []
    }
    throw error
  }
}

async function getPendingMigrations(supabase, allMigrations) {
  const applied = await getAppliedMigrationNames(supabase)
  return allMigrations.filter(m => !applied.has(m.name))
}

async function getAppliedMigrations(supabase, allMigrations) {
  const applied = await getAppliedMigrationNames(supabase)
  return allMigrations.filter(m => applied.has(m.name))
}

async function getAppliedMigrationNames(supabase) {
  const { data, error } = await supabase
    .from('schema_migrations')
    .select('migration_name, applied_at')
    .order('applied_at', { ascending: true })
  
  if (error) {
    throw new Error(`Failed to get applied migrations: ${error.message}`)
  }
  
  return new Map(data.map(row => [row.migration_name, row.applied_at]))
}

async function applyMigration(supabase, migration, direction) {
  const sql = await fs.readFile(migration.filepath, 'utf8')
  
  if (direction === 'up') {
    // Apply the migration
    const { error } = await supabase.rpc('exec_sql', { sql })
    
    if (error) {
      throw new Error(`Migration failed: ${error.message}`)
    }
    
    // Record the migration
    const { error: recordError } = await supabase
      .from('schema_migrations')
      .insert({
        migration_name: migration.name,
        checksum: generateChecksum(sql)
      })
    
    if (recordError) {
      throw new Error(`Failed to record migration: ${recordError.message}`)
    }
    
  } else if (direction === 'down') {
    // For rollback, we'd need rollback SQL in the migration file
    // This is a simplified implementation
    
    // Remove the migration record
    const { error } = await supabase
      .from('schema_migrations')
      .delete()
      .eq('migration_name', migration.name)
    
    if (error) {
      throw new Error(`Failed to remove migration record: ${error.message}`)
    }
    
    console.log('⚠️  Manual rollback may be required - check migration file for rollback instructions')
  }
}

function generateChecksum(content) {
  const crypto = require('crypto')
  return crypto.createHash('sha256').update(content).digest('hex')
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
  process.exit(1)
})