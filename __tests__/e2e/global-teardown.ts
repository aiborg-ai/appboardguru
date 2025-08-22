import { FullConfig } from '@playwright/test'
import { testDb } from '../../tests/utils/test-database'
import fs from 'fs'
import path from 'path'

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting E2E test environment cleanup...')
  
  try {
    // Clean up test database
    console.log('📊 Cleaning up test database...')
    await testDb.cleanup()
    
    // Clean up authentication files
    console.log('🔐 Cleaning up authentication files...')
    const authDir = path.resolve('test-results/auth')
    if (fs.existsSync(authDir)) {
      const authFiles = fs.readdirSync(authDir)
      for (const file of authFiles) {
        if (file.endsWith('.json')) {
          fs.unlinkSync(path.join(authDir, file))
        }
      }
    }
    
    // Clean up test data file
    const testDataFile = 'test-results/test-data.json'
    if (fs.existsSync(testDataFile)) {
      fs.unlinkSync(testDataFile)
    }
    
    // Clean up old screenshots and videos (keep only recent ones)
    console.log('🗑️ Cleaning up old test artifacts...')
    const testResultsDir = 'test-results'
    if (fs.existsSync(testResultsDir)) {
      cleanupOldFiles(testResultsDir, ['.png', '.webm', '.zip'], 7) // Keep files from last 7 runs
    }
    
    console.log('✅ E2E test environment cleanup completed successfully!')
    
  } catch (error) {
    console.error('❌ E2E cleanup failed:', error)
    // Don't throw error as cleanup failures shouldn't fail the test run
  }
}

/**
 * Clean up old files of specific extensions
 */
function cleanupOldFiles(directory: string, extensions: string[], keepCount: number) {
  try {
    if (!fs.existsSync(directory)) return
    
    const files = fs.readdirSync(directory, { withFileTypes: true })
    
    for (const file of files) {
      const filePath = path.join(directory, file.name)
      
      if (file.isDirectory()) {
        cleanupOldFiles(filePath, extensions, keepCount)
      } else if (extensions.some(ext => file.name.endsWith(ext))) {
        const stats = fs.statSync(filePath)
        const now = new Date()
        const fileAge = now.getTime() - stats.mtime.getTime()
        const daysOld = fileAge / (1000 * 60 * 60 * 24)
        
        // Delete files older than keepCount days
        if (daysOld > keepCount) {
          fs.unlinkSync(filePath)
          console.log(`  Deleted old file: ${filePath}`)
        }
      }
    }
  } catch (error) {
    console.warn(`Warning: Could not clean up files in ${directory}:`, error)
  }
}

export default globalTeardown