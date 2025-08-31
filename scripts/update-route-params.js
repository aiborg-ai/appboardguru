/**
 * Script to update all route handlers to use Promise params
 * As per Next.js 14 best practices
 */

const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  'src/app/api/integration-hub/financial/[connectionId]/market-data/route.ts',
  'src/app/api/integration-hub/erp/[connectionId]/route.ts',
  'src/app/api/integration-hub/erp/[connectionId]/sync/route.ts',
  'src/app/api/virtual-board-room/[sessionId]/recordings/route.ts',
  'src/app/api/virtual-board-room/[sessionId]/route.ts',
  'src/app/api/virtual-board-room/[sessionId]/join/route.ts',
  'src/app/api/virtual-board-room/[sessionId]/voting/[voteId]/cast/route.ts',
  'src/app/api/virtual-board-room/[sessionId]/voting/route.ts',
  'src/app/api/integration-hub/marketplace/extensions/[extensionId]/install/route.ts',
];

function updateFile(filePath) {
  const fullPath = path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`Skipping ${filePath} - file not found`);
    return;
  }
  
  let content = fs.readFileSync(fullPath, 'utf8');
  let updated = false;
  
  // Pattern 1: Update function signatures with single param
  content = content.replace(
    /\{\s*params\s*\}\s*:\s*\{\s*params:\s*\{\s*(\w+):\s*string\s*\}\s*\}/g,
    (match, paramName) => {
      updated = true;
      return `{ params }: { params: Promise<{ ${paramName}: string }> }`;
    }
  );
  
  // Pattern 2: Update function signatures with multiple params
  content = content.replace(
    /\{\s*params\s*\}\s*:\s*\{\s*params:\s*\{\s*(\w+):\s*string;\s*(\w+):\s*string\s*\}\s*\}/g,
    (match, param1, param2) => {
      updated = true;
      return `{ params }: { params: Promise<{ ${param1}: string; ${param2}: string }> }`;
    }
  );
  
  // Pattern 3: Add await for params usage in the function body
  // Find all function definitions and add await
  content = content.replace(
    /(export\s+async\s+function\s+\w+\([^)]*\{\s*params\s*\}[^)]*\)\s*\{)/g,
    (match) => {
      if (!content.includes('await params')) {
        const insertPoint = match + '\n  const resolvedParams = await params;';
        content = content.replace(match, insertPoint);
        
        // Replace params. usage with resolvedParams.
        content = content.replace(/params\./g, 'resolvedParams.');
        updated = true;
      }
      return match;
    }
  );
  
  if (updated) {
    fs.writeFileSync(fullPath, content);
    console.log(`✅ Updated ${filePath}`);
  } else {
    console.log(`⏭️  No changes needed for ${filePath}`);
  }
}

console.log('Updating route handlers to use Promise params...\n');

filesToUpdate.forEach(file => {
  try {
    updateFile(file);
  } catch (error) {
    console.error(`❌ Error updating ${file}:`, error.message);
  }
});

console.log('\n✅ Route params update complete!');