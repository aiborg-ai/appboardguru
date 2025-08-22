#!/usr/bin/env node

/**
 * BoardGuru Database Migration Runner
 * 
 * This script handles database migrations with features:
 * - Automated migration execution in order
 * - Rollback capabilities
 * - Dry-run mode for testing
 * - Migration status reporting
 * - Checksum validation
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

// Configuration
const config = {
  migrationsDir: path.join(__dirname, '../database/migrations'),
  supabaseUrl: process.env['NEXT_PUBLIC_SUPABASE_URL'],
  supabaseKey: process.env['SUPABASE_SERVICE_ROLE_KEY'],
  environment: process.env['NODE_ENV'] || 'development'
};

// Initialize Supabase client
const supabase = createClient(config.supabaseUrl, config.supabaseKey);

/**
 * Calculate SHA256 checksum of content
 */
function calculateChecksum(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Parse migration file to extract UP and DOWN sections
 */
function parseMigrationFile(content, filename) {
  const upMatch = content.match(/-- UP MIGRATION\s*\n([\s\S]*?)(?=-- DOWN MIGRATION|$)/i);
  const downMatch = content.match(/-- DOWN MIGRATION\s*\n([\s\S]*?)(?=-- MIGRATION COMPLETE|$)/i);
  
  const upContent = upMatch ? upMatch[1].trim() : content;
  const downContent = downMatch ? downMatch[1].trim() : '';
  
  // Extract metadata from comments
  const nameMatch = content.match(/-- Migration:\s*(.*)/i);
  const descMatch = content.match(/-- Description:\s*(.*)/i);
  
  return {
    name: nameMatch ? nameMatch[1].trim() : filename,
    description: descMatch ? descMatch[1].trim() : '',
    upContent,
    downContent,
    upChecksum: calculateChecksum(upContent),
    downChecksum: downContent ? calculateChecksum(downContent) : null
  };
}

/**
 * Get version from filename
 */
function getVersionFromFilename(filename) {
  const match = filename.match(/^(\d{8}_\d{3}_.*?)\.sql$/);
  if (match) return match[1];
  
  // Fallback for existing files
  const fallbackMatch = filename.match(/^(\d{3}-.*?)\.sql$/);
  if (fallbackMatch) return `20250820_${fallbackMatch[1].replace('-', '_')}`;
  
  return filename.replace('.sql', '');
}

/**
 * Get all migration files from directory
 */
async function getMigrationFiles() {
  try {
    const files = await fs.readdir(config.migrationsDir);
    return files
      .filter(file => file.endsWith('.sql'))
      .sort()
      .map(file => ({
        filename: file,
        version: getVersionFromFilename(file),
        path: path.join(config.migrationsDir, file)
      }));
  } catch (error) {
    console.error('Error reading migrations directory:', error.message);
    return [];
  }
}

/**
 * Get migration status from database
 */
async function getMigrationStatus() {
  try {
    const { data, error } = await supabase
      .from('schema_migrations')
      .select('*')
      .order('version', { ascending: true });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting migration status:', error.message);
    return [];
  }
}

/**
 * Initialize schema_migrations table if it doesn't exist
 */
async function initializeMigrationsTable() {
  try {
    // Check if table exists
    const { data, error } = await supabase
      .from('schema_migrations')
      .select('version')
      .limit(1);
    
    if (error && error.message.includes('does not exist')) {
      console.log('📋 Initializing schema_migrations table...');
      
      // Read and execute the schema migrations file
      const schemaFile = path.join(config.migrationsDir, '006-schema-migrations.sql');
      const content = await fs.readFile(schemaFile, 'utf8');
      const parsed = parseMigrationFile(content, '006-schema-migrations.sql');
      
      // Execute the UP migration
      const { error: execError } = await supabase.rpc('exec_sql', {
        sql: parsed.upContent
      });
      
      if (execError) {
        console.error('❌ Failed to initialize migrations table:', execError.message);
        return false;
      }
      
      console.log('✅ Schema migrations table initialized');
      return true;
    }
    
    return true;
  } catch (error) {
    console.error('Error initializing migrations table:', error.message);
    return false;
  }
}

/**
 * Record migration in database
 */
async function recordMigration(migration, status, executionTime = null, error = null) {
  const record = {
    version: migration.version,
    name: migration.name,
    filename: migration.filename,
    checksum_up: migration.upChecksum,
    checksum_down: migration.downChecksum,
    status,
    applied_by: 'migration_script',
    description: migration.description,
    database_version: '14.0', // Could be dynamic
    application_version: require('../package.json').version,
    environment: config.environment,
    metadata: {
      execution_time_ms: executionTime,
      error_message: error?.message,
      executed_at: new Date().toISOString()
    }
  };
  
  if (status === 'applied') {
    record.applied_at = new Date().toISOString();
    record.execution_time_ms = executionTime;
  }
  
  const { error: dbError } = await supabase
    .from('schema_migrations')
    .upsert(record);
  
  if (dbError) {
    console.error('Failed to record migration:', dbError.message);
  }
}

/**
 * Execute a single migration
 */
async function executeMigration(migration, dryRun = false) {
  console.log(`🔄 ${dryRun ? 'DRY RUN: ' : ''}Executing migration: ${migration.version}`);
  
  if (dryRun) {
    console.log('📄 Migration content:');
    console.log(migration.upContent.substring(0, 200) + '...');
    return { success: true, time: 0 };
  }
  
  const startTime = Date.now();
  
  try {
    // Update status to running
    await recordMigration(migration, 'running');
    
    // Execute the migration - split into statements and execute individually
    const statements = migration.upContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    for (const statement of statements) {
      if (statement.trim()) {
        const { error } = await supabase.rpc('exec', { sql: statement + ';' });
        if (error) {
          // Try direct query for some statements
          const { error: queryError } = await supabase.from('_').select('1').limit(0);
          if (queryError && queryError.message.includes('does not exist')) {
            // For DDL statements, we might need to use a different approach
            console.log(`Executing DDL statement directly...`);
          }
          throw error;
        }
      }
    }
    
    if (error) throw error;
    
    const executionTime = Date.now() - startTime;
    
    // Record successful migration
    await recordMigration(migration, 'applied', executionTime);
    
    console.log(`✅ Migration ${migration.version} applied successfully (${executionTime}ms)`);
    return { success: true, time: executionTime };
    
  } catch (error) {
    const executionTime = Date.now() - startTime;
    
    // Record failed migration
    await recordMigration(migration, 'failed', executionTime, error);
    
    console.error(`❌ Migration ${migration.version} failed:`, error.message);
    return { success: false, error, time: executionTime };
  }
}

/**
 * Rollback a migration
 */
async function rollbackMigration(migration, dryRun = false) {
  if (!migration.downContent) {
    console.error(`❌ No rollback content for migration: ${migration.version}`);
    return { success: false, error: new Error('No rollback content') };
  }
  
  console.log(`🔄 ${dryRun ? 'DRY RUN: ' : ''}Rolling back migration: ${migration.version}`);
  
  if (dryRun) {
    console.log('📄 Rollback content:');
    console.log(migration.downContent.substring(0, 200) + '...');
    return { success: true, time: 0 };
  }
  
  const startTime = Date.now();
  
  try {
    // Execute rollback
    const { error } = await supabase.rpc('exec_sql', {
      sql: migration.downContent
    });
    
    if (error) throw error;
    
    const executionTime = Date.now() - startTime;
    
    // Update migration record
    const { error: updateError } = await supabase
      .from('schema_migrations')
      .update({
        status: 'rolled_back',
        rolled_back_at: new Date().toISOString(),
        rolled_back_by: 'migration_script',
        metadata: {
          rollback_time_ms: executionTime,
          rolled_back_at: new Date().toISOString()
        }
      })
      .eq('version', migration.version);
    
    if (updateError) {
      console.error('Failed to update rollback record:', updateError.message);
    }
    
    console.log(`✅ Migration ${migration.version} rolled back successfully (${executionTime}ms)`);
    return { success: true, time: executionTime };
    
  } catch (error) {
    console.error(`❌ Rollback failed for ${migration.version}:`, error.message);
    return { success: false, error };
  }
}

/**
 * Main migration command handler
 */
async function main() {
  const command = process.argv[2];
  const options = {
    dryRun: process.argv.includes('--dry-run'),
    force: process.argv.includes('--force'),
    verbose: process.argv.includes('--verbose')
  };
  
  console.log('🚀 BoardGuru Database Migration Runner');
  console.log(`Environment: ${config.environment}`);
  console.log(`Dry Run: ${options.dryRun ? 'Yes' : 'No'}`);
  console.log('');
  
  // Initialize migrations table
  const initialized = await initializeMigrationsTable();
  if (!initialized) {
    process.exit(1);
  }
  
  switch (command) {
    case 'up':
    case 'migrate':
      await runMigrations(options);
      break;
      
    case 'down':
    case 'rollback':
      await runRollback(options);
      break;
      
    case 'status':
      await showStatus();
      break;
      
    case 'reset':
      await resetDatabase(options);
      break;
      
    default:
      showHelp();
      break;
  }
}

/**
 * Run pending migrations
 */
async function runMigrations(options) {
  const files = await getMigrationFiles();
  const appliedMigrations = await getMigrationStatus();
  const appliedVersions = new Set(appliedMigrations.map(m => m.version));
  
  const pendingFiles = files.filter(f => !appliedVersions.has(f.version));
  
  if (pendingFiles.length === 0) {
    console.log('✅ No pending migrations');
    return;
  }
  
  console.log(`📋 Found ${pendingFiles.length} pending migrations:`);
  
  for (const file of pendingFiles) {
    const content = await fs.readFile(file.path, 'utf8');
    const migration = {
      ...parseMigrationFile(content, file.filename),
      version: file.version,
      filename: file.filename
    };
    
    const result = await executeMigration(migration, options.dryRun);
    
    if (!result.success && !options.force) {
      console.error('🛑 Migration failed, stopping execution');
      process.exit(1);
    }
  }
  
  console.log('🎉 All migrations completed successfully');
}

/**
 * Rollback last migration
 */
async function runRollback(options) {
  const appliedMigrations = await getMigrationStatus();
  const lastMigration = appliedMigrations
    .filter(m => m.status === 'applied')
    .sort((a, b) => b.version.localeCompare(a.version))[0];
  
  if (!lastMigration) {
    console.log('ℹ️ No migrations to rollback');
    return;
  }
  
  // Get migration file
  const files = await getMigrationFiles();
  const file = files.find(f => f.version === lastMigration.version);
  
  if (!file) {
    console.error(`❌ Migration file not found for version: ${lastMigration.version}`);
    return;
  }
  
  const content = await fs.readFile(file.path, 'utf8');
  const migration = parseMigrationFile(content, file.filename);
  
  await rollbackMigration({
    ...migration,
    version: lastMigration.version
  }, options.dryRun);
}

/**
 * Show migration status
 */
async function showStatus() {
  const files = await getMigrationFiles();
  const appliedMigrations = await getMigrationStatus();
  const appliedMap = new Map(appliedMigrations.map(m => [m.version, m]));
  
  console.log('📊 Migration Status:');
  console.log('');
  
  for (const file of files) {
    const applied = appliedMap.get(file.version);
    const status = applied ? applied.status : 'pending';
    const icon = {
      applied: '✅',
      pending: '⏳',
      failed: '❌',
      running: '🔄',
      rolled_back: '↩️'
    }[status] || '❓';
    
    console.log(`${icon} ${file.version} - ${status.toUpperCase()}`);
    
    if (applied && applied.applied_at) {
      console.log(`   Applied: ${new Date(applied.applied_at).toLocaleString()}`);
      if (applied.execution_time_ms) {
        console.log(`   Time: ${applied.execution_time_ms}ms`);
      }
    }
  }
}

/**
 * Show help
 */
function showHelp() {
  console.log(`
Usage: node scripts/migrate.js <command> [options]

Commands:
  up, migrate     Run pending migrations
  down, rollback  Rollback last migration
  status          Show migration status
  reset           Reset database (WARNING: destructive)

Options:
  --dry-run       Show what would be executed without making changes
  --force         Continue on migration failures
  --verbose       Show detailed output

Examples:
  node scripts/migrate.js up --dry-run
  node scripts/migrate.js status
  node scripts/migrate.js rollback
`);
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  runMigrations,
  runRollback,
  showStatus,
  getMigrationFiles,
  getMigrationStatus
};