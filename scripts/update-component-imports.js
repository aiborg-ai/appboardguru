#!/usr/bin/env node

/**
 * Component Import Update Script
 * 
 * Updates all component imports to use the new atomic design structure
 * following CLAUDE.md guidelines for component organization.
 */

const fs = require('fs')
const path = require('path')

// Import mapping from old paths to new atomic structure
const IMPORT_MAPPINGS = {
  // UI atoms moved to atomic structure
  '@/components/ui/button': '@/components/atoms/Button',
  '@/components/ui/input': '@/components/atoms/form/input',
  '@/components/ui/textarea': '@/components/atoms/form/textarea',
  '@/components/ui/checkbox': '@/components/atoms/form/checkbox',
  '@/components/ui/switch': '@/components/atoms/form/switch',
  '@/components/ui/slider': '@/components/atoms/form/slider',
  '@/components/ui/badge': '@/components/atoms/display/badge',
  '@/components/ui/avatar': '@/components/atoms/display/avatar',
  '@/components/ui/skeleton': '@/components/atoms/display/skeleton',
  '@/components/ui/progress': '@/components/atoms/display/progress',
  '@/components/ui/separator': '@/components/atoms/display/separator',
  '@/components/ui/toast': '@/components/atoms/feedback/toast',
  '@/components/ui/alert': '@/components/atoms/feedback/alert',
  '@/components/ui/tooltip': '@/components/atoms/feedback/tooltip',
  '@/components/ui/info-tooltip': '@/components/atoms/feedback/info-tooltip',
  '@/components/ui/info-tooltip-enhanced': '@/components/atoms/feedback/info-tooltip-enhanced',

  // UI molecules moved to atomic structure  
  '@/components/ui/card': '@/components/molecules/cards/card',

  // Organization components moved to features
  '@/components/organizations/BulkActionBar': '@/components/features/organizations/BulkActionBar',
  '@/components/organizations/SelectableOrganizationCard': '@/components/molecules/cards/SelectableOrganizationCard',
  '@/components/organizations/EnhancedSearchBar': '@/components/features/organizations/EnhancedSearchBar',
  '@/components/organizations/FilterPanel': '@/components/features/organizations/FilterPanel',
  '@/components/organizations/ActivityIndicator': '@/components/features/organizations/ActivityIndicator',
  '@/components/organizations/AnimationDemo': '@/components/features/organizations/AnimationDemo',
  '@/components/organizations/CardAnimations': '@/components/features/organizations/CardAnimations',
  '@/components/organizations/EnhancedOrganizationsGrid': '@/components/features/organizations/EnhancedOrganizationsGrid',
  '@/components/organizations/OrganizationAnalytics': '@/components/features/organizations/OrganizationAnalytics',
  '@/components/organizations/OrganizationCardSkeleton': '@/components/features/organizations/OrganizationCardSkeleton',

  // Voice components moved to organisms/features
  '@/components/voice/VoiceTranslator': '@/components/organisms/features/VoiceTranslator',
  '@/components/voice/VoiceBiometricAuth': '@/components/organisms/features/VoiceBiometricAuth',
  '@/components/voice/PersonalizedVoiceAssistant': '@/components/organisms/features/PersonalizedVoiceAssistant',
  '@/components/voice/VoiceAnalyticsDashboard': '@/components/organisms/features/VoiceAnalyticsDashboard',
  '@/components/voice/VoiceAssistant': '@/components/organisms/features/VoiceAssistant',
  '@/components/voice/VoiceCollaboration': '@/components/organisms/features/VoiceCollaboration',
  '@/components/voice/VoicePDFAnnotations': '@/components/organisms/features/VoicePDFAnnotations',
  '@/components/voice/VoiceTrainingSystem': '@/components/organisms/features/VoiceTrainingSystem',

  // Boardmate components moved to features
  '@/components/boardmates/BoardMateCard': '@/components/molecules/cards/BoardMateCard',
  '@/components/boardmates/AIMemberRecommendationsPanel': '@/components/features/boardmates/AIMemberRecommendationsPanel',
  '@/components/boardmates/AssociationManager': '@/components/features/boardmates/AssociationManager',
  '@/components/boardmates/ComplianceCheckPanel': '@/components/features/boardmates/ComplianceCheckPanel',
  '@/components/boardmates/ExecutiveAnalyticsDashboard': '@/components/features/boardmates/ExecutiveAnalyticsDashboard',
  '@/components/boardmates/LinkedInButton': '@/components/features/boardmates/LinkedInButton',
  '@/components/boardmates/RealTimeCollaborationPanel': '@/components/features/boardmates/RealTimeCollaborationPanel',
  '@/components/boardmates/VoiceCommandPanel': '@/components/features/boardmates/VoiceCommandPanel',

  // Asset components moved to features
  '@/components/assets/AnnotationSidebar': '@/components/features/assets/AnnotationSidebar',
  '@/components/assets/CollaboratorsList': '@/components/features/assets/CollaboratorsList',
  '@/components/assets/PDFViewerWithAnnotations': '@/components/features/assets/PDFViewerWithAnnotations',

  // Notification components moved to features
  '@/components/notifications/NotificationsButton': '@/components/features/notifications/NotificationsButton',
  '@/components/notifications/NotificationsPanel': '@/components/features/notifications/NotificationsPanel',
}

const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m',
  bright: '\x1b[1m'
}

function log(message, color = colors.white) {
  console.log(`${color}${message}${colors.reset}`)
}

function logSuccess(message) {
  log(`✅ ${message}`, colors.green)
}

function logError(message) {
  log(`❌ ${message}`, colors.red)
}

function logInfo(message) {
  log(`ℹ️  ${message}`, colors.blue)
}

function updateImportsInFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8')
    let updatedContent = content
    let changesMade = 0

    // Update each import mapping
    Object.entries(IMPORT_MAPPINGS).forEach(([oldPath, newPath]) => {
      // Handle various import formats
      const patterns = [
        // import { Component } from 'path'
        new RegExp(`from ['"]${oldPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`, 'g'),
        // import Component from 'path'
        new RegExp(`import\\s+[^{]*from\\s+['"]${oldPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`, 'g'),
        // import * as Component from 'path'
        new RegExp(`import\\s+\\*\\s+as\\s+[^\\s]+\\s+from\\s+['"]${oldPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`, 'g')
      ]

      patterns.forEach(pattern => {
        if (pattern.test(updatedContent)) {
          updatedContent = updatedContent.replace(pattern, (match) => {
            changesMade++
            return match.replace(oldPath, newPath)
          })
        }
      })
    })

    // Write back to file if changes were made
    if (changesMade > 0) {
      fs.writeFileSync(filePath, updatedContent, 'utf8')
      logSuccess(`Updated ${changesMade} import(s) in ${filePath}`)
      return changesMade
    }

    return 0
  } catch (error) {
    logError(`Failed to update ${filePath}: ${error.message}`)
    return 0
  }
}

// Recursively find files with specific extensions
function findFiles(dir, extensions = ['.tsx', '.ts']) {
  const files = []
  
  function walk(currentPath) {
    const items = fs.readdirSync(currentPath)
    
    for (const item of items) {
      const fullPath = path.join(currentPath, item)
      const stat = fs.statSync(fullPath)
      
      if (stat.isDirectory()) {
        // Skip certain directories
        if (['node_modules', '.git', '.next', '__tests__'].includes(item)) {
          continue
        }
        walk(fullPath)
      } else if (stat.isFile()) {
        const ext = path.extname(item)
        const basename = path.basename(item, ext)
        
        // Skip test files and files in ui directory
        if (extensions.includes(ext) && 
            !basename.includes('.test') && 
            !basename.includes('.spec') &&
            !fullPath.includes('/components/ui/')) {
          files.push(fullPath)
        }
      }
    }
  }
  
  walk(dir)
  return files
}

function main() {
  log('🔄 Starting Component Import Update...', colors.cyan + colors.bright)
  log('Following CLAUDE.md atomic design structure', colors.cyan)
  log('')

  try {
    // Find all TypeScript and React files
    const files = findFiles('src')
    
    logInfo(`Found ${files.length} files to process`)
    log('')

    let totalChanges = 0
    let filesUpdated = 0

    for (const filePath of files) {
      const changes = updateImportsInFile(filePath)
      if (changes > 0) {
        totalChanges += changes
        filesUpdated++
      }
    }

    log('')
    log('📊 Import Update Summary', colors.cyan + colors.bright)
    log(`Files processed: ${files.length}`, colors.white)
    log(`Files updated: ${filesUpdated}`, filesUpdated > 0 ? colors.green : colors.white)
    log(`Total imports updated: ${totalChanges}`, totalChanges > 0 ? colors.green : colors.white)
    
    if (totalChanges > 0) {
      log('')
      logSuccess('🎉 Component imports successfully updated!')
      logInfo('All imports now follow atomic design structure per CLAUDE.md')
    } else {
      log('')
      logInfo('No import updates needed - all imports are already up to date')
    }

  } catch (error) {
    logError(`Import update failed: ${error.message}`)
    process.exit(1)
  }
}

// Run the script
main()