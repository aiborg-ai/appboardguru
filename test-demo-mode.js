#!/usr/bin/env node

/**
 * Test script to verify demo mode setup
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Checking Demo Mode Configuration...\n');

// Files to check
const filesToCheck = [
  'src/contexts/DemoContext.tsx',
  'src/components/providers/ClientProviders.tsx',
  'src/app/providers.tsx',
  'src/features/dashboard/layout/DashboardLayout.tsx',
  'src/contexts/OrganizationContext.tsx'
];

let allGood = true;

// Check if files exist and contain expected patterns
filesToCheck.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`❌ File not found: ${file}`);
    allGood = false;
    return;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Check for specific patterns based on file
  if (file.includes('DemoContext.tsx')) {
    if (content.includes('export function useDemoMode()')) {
      console.log(`✅ ${file} - useDemoMode hook found`);
    } else {
      console.log(`❌ ${file} - Missing useDemoMode hook`);
      allGood = false;
    }
  }
  
  if (file.includes('ClientProviders.tsx')) {
    if (content.includes('DemoProvider') && content.includes('@/features/shared/ui/toaster')) {
      console.log(`✅ ${file} - DemoProvider and correct Toaster import found`);
    } else {
      console.log(`❌ ${file} - Missing DemoProvider or incorrect Toaster import`);
      allGood = false;
    }
  }
  
  if (file.includes('app/providers.tsx')) {
    if (!content.includes('DemoProvider')) {
      console.log(`✅ ${file} - DemoProvider correctly removed (moved to ClientProviders)`);
    } else {
      console.log(`❌ ${file} - Still contains DemoProvider (should be in ClientProviders)`);
      allGood = false;
    }
  }
  
  if (file.includes('DashboardLayout.tsx')) {
    if (content.includes('useDemoMode') && content.includes('from \'@/contexts/DemoContext\'')) {
      console.log(`✅ ${file} - Uses useDemoMode hook from DemoContext`);
    } else {
      console.log(`❌ ${file} - Not using useDemoMode hook`);
      allGood = false;
    }
  }
  
  if (file.includes('OrganizationContext.tsx')) {
    if (content.includes('useDemoMode') && !content.includes('localStorage.getItem(\'boardguru_demo_mode\')')) {
      console.log(`✅ ${file} - Uses useDemoMode hook, no direct localStorage check`);
    } else if (content.includes('localStorage.getItem(\'boardguru_demo_mode\')')) {
      console.log(`⚠️  ${file} - Still has direct localStorage check (should use hook)`);
    }
  }
});

console.log('\n' + '='.repeat(50));

if (allGood) {
  console.log('\n✅ All demo mode configurations look correct!');
  console.log('\nNext steps:');
  console.log('1. Run: npm run dev');
  console.log('2. Navigate to: http://localhost:3000/demo');
  console.log('3. Or add ?demo=true to any URL');
} else {
  console.log('\n❌ Some issues found with demo mode configuration.');
  console.log('Please review the errors above.');
}

console.log('\n💡 Tips:');
console.log('- Clear cache if needed: npm run clean:cache');
console.log('- Check browser console for any errors');
console.log('- Demo mode should bypass authentication automatically');