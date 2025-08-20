#!/usr/bin/env node

/**
 * BoardGuru Migration Template Generator
 * 
 * Creates new migration files with proper naming and template structure
 */

const fs = require('fs').promises;
const path = require('path');

// Configuration
const config = {
  migrationsDir: path.join(__dirname, '../database/migrations')
};

/**
 * Generate timestamp in YYYYMMDD format
 */
function generateTimestamp() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

/**
 * Get next migration number for today
 */
async function getNextMigrationNumber(timestamp) {
  try {
    const files = await fs.readdir(config.migrationsDir);
    const todayFiles = files.filter(file => file.startsWith(timestamp));
    
    if (todayFiles.length === 0) {
      return '001';
    }
    
    const numbers = todayFiles
      .map(file => {
        const match = file.match(new RegExp(`${timestamp}_(\\d{3})_`));
        return match ? parseInt(match[1]) : 0;
      })
      .filter(num => num > 0);
    
    const maxNumber = Math.max(...numbers, 0);
    return String(maxNumber + 1).padStart(3, '0');
    
  } catch (error) {
    return '001';
  }
}

/**
 * Sanitize migration name for filename
 */
function sanitizeName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

/**
 * Generate migration template content
 */
function generateTemplate(version, name, description, author) {
  const timestamp = new Date().toISOString();
  
  return `-- =====================================================
-- ${name.toUpperCase()}
-- Migration: ${version}
-- Description: ${description}
-- Author: ${author}
-- Created: ${timestamp.split('T')[0]}
-- =====================================================

-- =====================================================
-- UP MIGRATION
-- =====================================================

-- Add your schema changes here
-- Example:
-- CREATE TABLE example_table (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   name TEXT NOT NULL,
--   created_at TIMESTAMPTZ DEFAULT NOW()
-- );

-- CREATE INDEX idx_example_table_name ON example_table(name);

-- Don't forget to:
-- 1. Add appropriate constraints
-- 2. Create necessary indexes
-- 3. Set up RLS policies if needed
-- 4. Grant permissions as required

-- Your migration code goes here:



-- =====================================================
-- DOWN MIGRATION (Rollback)
-- =====================================================

-- Add rollback instructions here (reverse of UP migration)
-- Example:
-- DROP INDEX IF EXISTS idx_example_table_name;
-- DROP TABLE IF EXISTS example_table;

-- IMPORTANT: Test your rollback thoroughly!
-- Rollback code goes here:

/*

-- Uncomment and add rollback code:


*/

-- =====================================================
-- MIGRATION NOTES
-- =====================================================

-- Additional notes about this migration:
-- - What problem does this solve?
-- - Any special considerations?
-- - Breaking changes?
-- - Performance impact?
-- - Required application changes?

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
`;
}

/**
 * Create a new migration file
 */
async function createMigration(name, description, author = 'developer') {
  try {
    // Ensure migrations directory exists
    await fs.mkdir(config.migrationsDir, { recursive: true });
    
    // Generate version
    const timestamp = generateTimestamp();
    const number = await getNextMigrationNumber(timestamp);
    const sanitizedName = sanitizeName(name);
    const version = `${timestamp}_${number}_${sanitizedName}`;
    
    // Generate filename
    const filename = `${version}.sql`;
    const filepath = path.join(config.migrationsDir, filename);
    
    // Check if file already exists
    try {
      await fs.access(filepath);
      console.error(`❌ Migration file already exists: ${filename}`);
      return false;
    } catch {
      // File doesn't exist, which is what we want
    }
    
    // Generate content
    const content = generateTemplate(version, name, description, author);
    
    // Write file
    await fs.writeFile(filepath, content, 'utf8');
    
    console.log('✅ Migration created successfully!');
    console.log('');
    console.log(`📄 File: ${filename}`);
    console.log(`📍 Path: ${filepath}`);
    console.log(`🔢 Version: ${version}`);
    console.log('');
    console.log('Next steps:');
    console.log('1. Edit the migration file and add your schema changes');
    console.log('2. Test the migration with: npm run db:migrate -- --dry-run');
    console.log('3. Apply the migration with: npm run db:migrate');
    console.log('');
    
    return { version, filename, filepath };
    
  } catch (error) {
    console.error('❌ Failed to create migration:', error.message);
    return false;
  }
}

/**
 * Show help
 */
function showHelp() {
  console.log(`
📋 BoardGuru Migration Generator

Usage: node scripts/create-migration.js <name> [description] [author]

Arguments:
  name         Migration name (required) - will be sanitized for filename
  description  Migration description (optional)
  author       Migration author (optional, defaults to 'developer')

Options:
  --help, -h   Show this help message

Examples:
  node scripts/create-migration.js "Add user preferences table"
  node scripts/create-migration.js "Update asset permissions" "Add new permission levels for assets" "john.doe"
  node scripts/create-migration.js "Create indexes for performance" "Add database indexes for common queries"

Generated filename format: YYYYMMDD_NNN_migration_name.sql
Where:
  YYYYMMDD = Current date
  NNN      = Sequential number for the day (001, 002, etc.)
  
The migration will include:
- Proper header with metadata
- UP migration section for changes
- DOWN migration section for rollback
- Template comments and examples
- Best practices reminders
`);
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }
  
  const name = args[0];
  const description = args[1] || `Migration: ${name}`;
  const author = args[2] || process.env.USER || process.env.USERNAME || 'developer';
  
  if (!name || name.trim().length === 0) {
    console.error('❌ Migration name is required');
    showHelp();
    process.exit(1);
  }
  
  console.log('🚀 Creating new migration...');
  console.log(`📝 Name: ${name}`);
  console.log(`📖 Description: ${description}`);
  console.log(`👤 Author: ${author}`);
  console.log('');
  
  const result = await createMigration(name, description, author);
  
  if (!result) {
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  createMigration,
  generateTimestamp,
  getNextMigrationNumber,
  sanitizeName
};