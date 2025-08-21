#!/usr/bin/env node

/**
 * Supabase Type Generation Script
 * Generates TypeScript types from Supabase database schema
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const TYPES_DIR = path.join(__dirname, '../src/types/generated');
const DATABASE_TYPES_FILE = path.join(TYPES_DIR, 'database.types.ts');

console.log('🔧 Generating Supabase types...');

// Ensure types directory exists
if (!fs.existsSync(TYPES_DIR)) {
  fs.mkdirSync(TYPES_DIR, { recursive: true });
  console.log('📁 Created types directory');
}

try {
  // Check if npx supabase is available
  execSync('npx supabase --version', { stdio: 'pipe' });
  
  // Generate types from Supabase
  console.log('⚡ Generating database types...');
  const typesOutput = execSync('npx supabase gen types typescript --local', { 
    encoding: 'utf8',
    cwd: __dirname + '/..'
  });
  
  // Write generated types to file
  const typesContent = `/**
 * Generated Supabase Database Types
 * Auto-generated on ${new Date().toISOString()}
 * DO NOT EDIT MANUALLY - Use 'npm run generate:types' to regenerate
 */

${typesOutput}

// Type utilities for better type safety
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']  
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]

// Branded types for IDs
export type UserId = string & { readonly brand: unique symbol }
export type OrganizationId = string & { readonly brand: unique symbol }
export type AssetId = string & { readonly brand: unique symbol }
export type VaultId = string & { readonly brand: unique symbol }

// Utility functions for branded types
export const createUserId = (id: string): UserId => id as UserId
export const createOrganizationId = (id: string): OrganizationId => id as OrganizationId
export const createAssetId = (id: string): AssetId => id as AssetId
export const createVaultId = (id: string): VaultId => id as VaultId
`;

  fs.writeFileSync(DATABASE_TYPES_FILE, typesContent);
  console.log('✅ Database types generated successfully');
  
  // Update main database types file to use generated types
  const mainTypesFile = path.join(__dirname, '../src/types/database.ts');
  if (fs.existsSync(mainTypesFile)) {
    const reExportContent = `/**
 * Database Types
 * Re-exports generated types for easier imports
 */

export * from './generated/database.types'
export type { Database } from './generated/database.types'
`;
    
    // Backup existing file
    const backupFile = mainTypesFile + '.backup.' + Date.now();
    fs.copyFileSync(mainTypesFile, backupFile);
    console.log(`📦 Backed up existing types to ${path.basename(backupFile)}`);
    
    fs.writeFileSync(mainTypesFile, reExportContent);
    console.log('🔄 Updated main database types file');
  }
  
  console.log('🎉 Type generation completed successfully!');
  
} catch (error) {
  console.warn('⚠️  Could not generate types from Supabase:', error.message);
  console.log('📝 Creating fallback type definitions...');
  
  // Create fallback types if Supabase CLI is not available
  const fallbackTypes = `/**
 * Fallback Database Types
 * Manual type definitions - Replace with generated types when Supabase CLI is available
 */

// Re-export existing types for now
export * from '../database'

// Type utilities for better type safety
export type UserId = string & { readonly brand: unique symbol }
export type OrganizationId = string & { readonly brand: unique symbol }
export type AssetId = string & { readonly brand: unique symbol }
export type VaultId = string & { readonly brand: unique symbol }

// Utility functions for branded types
export const createUserId = (id: string): UserId => id as UserId
export const createOrganizationId = (id: string): OrganizationId => id as OrganizationId
export const createAssetId = (id: string): AssetId => id as AssetId
export const createVaultId = (id: string): VaultId => id as VaultId
`;
  
  fs.writeFileSync(DATABASE_TYPES_FILE, fallbackTypes);
  console.log('✅ Fallback types created');
}

console.log('\n📋 Next steps:');
console.log('  1. Run "npm run lint" to check for type safety issues');
console.log('  2. Run "npm run type-check" to verify TypeScript compilation');
console.log('  3. Start migrating "any" types to proper type definitions');
console.log('\n🔍 Type safety metrics:');

// Count type safety issues
try {
  const srcDir = path.join(__dirname, '../src');
  const anyTypesCmd = `find "${srcDir}" -name "*.ts" -o -name "*.tsx" | xargs grep -c ": any" | awk -F: '{sum += $2} END {print sum}'`;
  const anyAssertionsCmd = `find "${srcDir}" -name "*.ts" -o -name "*.tsx" | xargs grep -c "as any" | awk -F: '{sum += $2} END {print sum}'`;
  
  const anyTypes = execSync(anyTypesCmd, { encoding: 'utf8', stdio: 'pipe' }).trim() || '0';
  const anyAssertions = execSync(anyAssertionsCmd, { encoding: 'utf8', stdio: 'pipe' }).trim() || '0';
  
  console.log(`  - ${anyTypes} explicit 'any' type annotations`);
  console.log(`  - ${anyAssertions} 'as any' type assertions`);
  console.log(`  - Total type safety issues: ${parseInt(anyTypes) + parseInt(anyAssertions)}`);
} catch (error) {
  console.log('  - Could not calculate metrics (will be available after migration)');
}