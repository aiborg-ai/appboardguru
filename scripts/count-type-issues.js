#!/usr/bin/env node

/**
 * Type Safety Issue Counter
 * Counts and reports type safety issues in the codebase
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '../src');

console.log('🔍 Analyzing type safety issues...\n');

try {
  // Count different types of issues
  const metrics = {
    explicitAny: 0,
    asAnyAssertions: 0,
    tsIgnoreComments: 0,
    totalFiles: 0,
    typedFiles: 0
  };

  // Helper function to count pattern in files
  function countPattern(pattern, description) {
    try {
      const cmd = `find "${SRC_DIR}" -name "*.ts" -o -name "*.tsx" | xargs grep -h "${pattern}" | wc -l`;
      const result = execSync(cmd, { encoding: 'utf8', stdio: 'pipe' }).trim();
      return parseInt(result) || 0;
    } catch (error) {
      console.warn(`Could not count ${description}: ${error.message}`);
      return 0;
    }
  }

  // Count total files
  function countFiles() {
    try {
      const cmd = `find "${SRC_DIR}" -name "*.ts" -o -name "*.tsx" | wc -l`;
      const result = execSync(cmd, { encoding: 'utf8', stdio: 'pipe' }).trim();
      return parseInt(result) || 0;
    } catch (error) {
      return 0;
    }
  }

  // Get detailed breakdown by directory
  function getDirectoryBreakdown() {
    const directories = ['components', 'lib', 'hooks', 'types', 'app'];
    const breakdown = {};

    directories.forEach(dir => {
      const dirPath = path.join(SRC_DIR, dir);
      if (fs.existsSync(dirPath)) {
        try {
          const cmd = `find "${dirPath}" -name "*.ts" -o -name "*.tsx" | xargs grep -c ": any" 2>/dev/null | awk -F: '{sum += $2} END {print sum}'`;
          const result = execSync(cmd, { encoding: 'utf8', stdio: 'pipe' }).trim();
          breakdown[dir] = parseInt(result) || 0;
        } catch (error) {
          breakdown[dir] = 0;
        }
      }
    });

    return breakdown;
  }

  // Count metrics
  metrics.explicitAny = countPattern(': any', 'explicit any types');
  metrics.asAnyAssertions = countPattern('as any', 'as any assertions');
  metrics.tsIgnoreComments = countPattern('@ts-ignore\\|@ts-nocheck\\|@ts-expect-error', 'TS suppression comments');
  metrics.totalFiles = countFiles();

  const directoryBreakdown = getDirectoryBreakdown();

  // Display results
  console.log('📊 Type Safety Report');
  console.log('=' .repeat(50));
  console.log(`Total TypeScript files: ${metrics.totalFiles}`);
  console.log(`Explicit 'any' types: ${metrics.explicitAny}`);
  console.log(`'as any' assertions: ${metrics.asAnyAssertions}`);
  console.log(`TS suppression comments: ${metrics.tsIgnoreComments}`);
  console.log(`Total type safety issues: ${metrics.explicitAny + metrics.asAnyAssertions + metrics.tsIgnoreComments}`);

  console.log('\n📂 Issues by Directory:');
  console.log('-'.repeat(30));
  Object.entries(directoryBreakdown).forEach(([dir, count]) => {
    console.log(`${dir.padEnd(15)}: ${count} issues`);
  });

  // Calculate type safety score
  const totalIssues = metrics.explicitAny + metrics.asAnyAssertions + metrics.tsIgnoreComments;
  const typeSafetyScore = Math.max(0, 100 - (totalIssues / metrics.totalFiles * 10));
  
  console.log('\n🎯 Type Safety Score:');
  console.log('-'.repeat(30));
  console.log(`${typeSafetyScore.toFixed(1)}% type safe`);
  
  if (typeSafetyScore >= 95) {
    console.log('🟢 Excellent type safety!');
  } else if (typeSafetyScore >= 80) {
    console.log('🟡 Good type safety, room for improvement');
  } else if (typeSafetyScore >= 60) {
    console.log('🟠 Moderate type safety issues');
  } else {
    console.log('🔴 Significant type safety issues need attention');
  }

  // Top priority files to fix
  console.log('\n🔧 Top Priority Files:');
  console.log('-'.repeat(30));
  
  try {
    const topFilesCmd = `find "${SRC_DIR}" -name "*.ts" -o -name "*.tsx" | xargs grep -l ": any\\|as any" | head -10`;
    const topFiles = execSync(topFilesCmd, { encoding: 'utf8', stdio: 'pipe' }).trim().split('\n').filter(Boolean);
    
    topFiles.forEach((file, index) => {
      const relativePath = path.relative(process.cwd(), file);
      console.log(`${index + 1}. ${relativePath}`);
    });
  } catch (error) {
    console.log('Could not identify top priority files');
  }

  console.log('\n📋 Recommendations:');
  console.log('-'.repeat(30));
  
  if (metrics.explicitAny > 50) {
    console.log('• Start by replacing explicit "any" types with proper interfaces');
  }
  if (metrics.asAnyAssertions > 20) {
    console.log('• Review "as any" assertions and replace with type guards');
  }
  if (metrics.tsIgnoreComments > 5) {
    console.log('• Investigate and fix @ts-ignore suppressions');
  }
  
  console.log('• Run "npm run lint" to see specific type safety violations');
  console.log('• Use "npm run generate:types" to update database types');

  // Exit with error code if too many issues
  if (totalIssues > 100) {
    console.log('\n❌ Too many type safety issues detected');
    process.exit(1);
  }

} catch (error) {
  console.error('Error analyzing type safety:', error.message);
  process.exit(1);
}

console.log('\n✅ Type safety analysis completed');