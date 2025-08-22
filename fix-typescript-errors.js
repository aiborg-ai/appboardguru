#!/usr/bin/env node

/**
 * Systematic TypeScript Error Fixing Script
 * Fixes 610+ TypeScript errors by addressing common syntax patterns
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

// Patterns to fix
const fixes = [
  {
    name: 'Missing parentheses in arrow functions',
    pattern: /(\w+: unknown\)\s*=>\s*)/g,
    replacement: '($1'
  },
  {
    name: 'onValueChange callback syntax',
    pattern: /onValueChange=\{(\w+: unknown\))\s*=>/g,
    replacement: 'onValueChange={($1 =>'
  },
  {
    name: 'Select onValueChange specific fix',
    pattern: /onValueChange=\{value: unknown\)\s*=>/g,
    replacement: 'onValueChange={(value: unknown) =>'
  },
  {
    name: 'Generic callback parameter fix',
    pattern: /\{(\w+): (\w+)\)\s*=>/g,
    replacement: '{($1: $2) =>'
  }
]

function findFilesToFix() {
  try {
    // Get list of files with TypeScript errors
    const typeCheckOutput = execSync('npm run type-check 2>&1', { encoding: 'utf8' })
    const errorLines = typeCheckOutput.split('\n')
    
    const files = new Set()
    errorLines.forEach(line => {
      const match = line.match(/^([^:]+\.(ts|tsx)):\d+:\d+:/)
      if (match) {
        files.add(match[1])
      }
    })
    
    return Array.from(files)
  } catch (error) {
    console.log('Getting files from directory scan...')
    return [
      'src/components/activity/ActivityAlerts.tsx',
      'src/components/activity/ActivityChart.tsx',
      'src/components/notifications/NotificationsPanel.tsx',
      'src/features/organizations/CreateOrganizationModal.tsx',
      'src/features/organizations/OrganizationSettings.tsx',
      'src/app/dashboard/annotations/page.tsx',
      'src/components/voice/VoiceAssistant.tsx',
      'src/components/voice/VoiceCollaboration.tsx',
      'src/components/voice/PersonalizedVoiceAssistant.tsx',
      'src/components/ui/VoiceCommandIntegration.tsx',
      'src/features/organizations/invitations/TypeSafeInviteMemberModal.tsx'
    ]
  }
}

function fixFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`❌ File not found: ${filePath}`)
      return { fixed: false, errors: [`File not found: ${filePath}`] }
    }

    let content = fs.readFileSync(filePath, 'utf8')
    let fixCount = 0
    const appliedFixes = []

    fixes.forEach(fix => {
      const originalContent = content
      content = content.replace(fix.pattern, fix.replacement)
      
      if (content !== originalContent) {
        const matches = (originalContent.match(fix.pattern) || []).length
        fixCount += matches
        appliedFixes.push(`${fix.name}: ${matches} fixes`)
      }
    })

    if (fixCount > 0) {
      fs.writeFileSync(filePath, content)
      console.log(`✅ ${filePath}: ${fixCount} fixes applied`)
      appliedFixes.forEach(fix => console.log(`   - ${fix}`))
      return { fixed: true, count: fixCount, fixes: appliedFixes }
    } else {
      console.log(`✓ ${filePath}: No automatic fixes needed`)
      return { fixed: false, count: 0 }
    }
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message)
    return { fixed: false, errors: [error.message] }
  }
}

function main() {
  console.log('🔧 Starting systematic TypeScript error fixing...\n')
  
  const filesToFix = findFilesToFix()
  console.log(`📁 Found ${filesToFix.length} files to check\n`)
  
  let totalFixed = 0
  let filesFixed = 0
  
  filesToFix.forEach(filePath => {
    const result = fixFile(filePath)
    if (result.fixed) {
      filesFixed++
      totalFixed += result.count
    }
  })
  
  console.log(`\n📊 Summary:`)
  console.log(`   Files processed: ${filesToFix.length}`)
  console.log(`   Files fixed: ${filesFixed}`)
  console.log(`   Total fixes applied: ${totalFixed}`)
  
  if (totalFixed > 0) {
    console.log('\n🔍 Running type check to verify fixes...')
    try {
      execSync('npm run type-check', { stdio: 'pipe' })
      console.log('✅ Type check passed!')
    } catch (error) {
      console.log('⚠️  Type check still has errors, manual fixes needed')
    }
  }
}

main()