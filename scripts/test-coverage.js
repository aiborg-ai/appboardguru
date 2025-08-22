#!/usr/bin/env node

/**
 * Test coverage analysis and reporting script
 * 
 * This script:
 * 1. Runs all test suites with coverage
 * 2. Combines coverage reports from different test types
 * 3. Generates comprehensive coverage analysis
 * 4. Checks coverage thresholds
 * 5. Generates coverage reports in multiple formats
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')
const glob = require('glob')

// Coverage configuration
const COVERAGE_CONFIG = {
  thresholds: {
    global: {
      statements: 70,
      branches: 65,
      functions: 70,
      lines: 70,
    },
    repositories: {
      statements: 80,
      branches: 75,
      functions: 80,
      lines: 80,
    },
    services: {
      statements: 75,
      branches: 70,
      functions: 75,
      lines: 75,
    },
    components: {
      statements: 65,
      branches: 60,
      functions: 65,
      lines: 65,
    },
    utils: {
      statements: 85,
      branches: 80,
      functions: 85,
      lines: 85,
    },
  },
  exclude: [
    'src/types/**',
    'src/config/**',
    '**/*.config.{js,ts}',
    '**/*.d.ts',
    'src/**/*.stories.{js,jsx,ts,tsx}',
    'src/**/*.test.{js,jsx,ts,tsx}',
    'src/**/*.spec.{js,jsx,ts,tsx}',
  ],
  outputDir: 'coverage',
  formats: ['html', 'lcov', 'json', 'text-summary'],
}

class CoverageAnalyzer {
  constructor() {
    this.coverageDir = COVERAGE_CONFIG.outputDir
    this.reports = {}
    this.combinedReport = null
  }

  /**
   * Run all test suites with coverage
   */
  async runAllTests() {
    console.log('🧪 Running all test suites with coverage...\n')

    try {
      // Clean previous coverage
      this.cleanCoverage()

      // Run unit tests
      console.log('📊 Running unit tests...')
      execSync('npm run test -- --coverage --watchAll=false --passWithNoTests', {
        stdio: 'inherit',
        env: { ...process.env, CI: 'true' },
      })

      // Run integration tests
      console.log('\n🔗 Running integration tests...')
      execSync('npm run test:integration -- --coverage --watchAll=false', {
        stdio: 'inherit',
        env: { ...process.env, CI: 'true' },
      })

      // Run component tests
      console.log('\n⚛️ Running component tests...')
      execSync('npm run test:components -- --coverage --watchAll=false', {
        stdio: 'inherit',
        env: { ...process.env, CI: 'true' },
      })

      console.log('\n✅ All tests completed successfully!')
      
    } catch (error) {
      console.error('❌ Tests failed:', error.message)
      process.exit(1)
    }
  }

  /**
   * Combine coverage reports from different test types
   */
  async combineCoverageReports() {
    console.log('\n📋 Combining coverage reports...')

    const coverageFiles = glob.sync('coverage-*/coverage-final.json')
    
    if (coverageFiles.length === 0) {
      console.warn('⚠️  No coverage files found to combine')
      return
    }

    const combinedCoverage = {}

    // Merge all coverage files
    for (const file of coverageFiles) {
      const coverage = JSON.parse(fs.readFileSync(file, 'utf8'))
      Object.assign(combinedCoverage, coverage)
    }

    // Write combined coverage
    const combinedFile = path.join(this.coverageDir, 'coverage-combined.json')
    fs.writeFileSync(combinedFile, JSON.stringify(combinedCoverage, null, 2))

    console.log(`✅ Combined coverage report saved to ${combinedFile}`)
    
    return combinedCoverage
  }

  /**
   * Analyze coverage data
   */
  async analyzeCoverage() {
    console.log('\n📊 Analyzing coverage data...')

    // Load coverage data
    const coverageFile = path.join(this.coverageDir, 'coverage-summary.json')
    if (!fs.existsSync(coverageFile)) {
      console.error('❌ Coverage summary not found. Run tests first.')
      return
    }

    const coverageData = JSON.parse(fs.readFileSync(coverageFile, 'utf8'))
    this.combinedReport = coverageData

    // Analyze by file type/location
    const analysis = this.analyzeByFileType(coverageData)
    
    // Generate detailed report
    this.generateDetailedReport(analysis)
    
    // Check thresholds
    this.checkCoverageThresholds(analysis)

    return analysis
  }

  /**
   * Analyze coverage by file type/directory
   */
  analyzeByFileType(coverageData) {
    const analysis = {
      repositories: { files: [], coverage: { statements: 0, branches: 0, functions: 0, lines: 0 } },
      services: { files: [], coverage: { statements: 0, branches: 0, functions: 0, lines: 0 } },
      components: { files: [], coverage: { statements: 0, branches: 0, functions: 0, lines: 0 } },
      utils: { files: [], coverage: { statements: 0, branches: 0, functions: 0, lines: 0 } },
      other: { files: [], coverage: { statements: 0, branches: 0, functions: 0, lines: 0 } },
    }

    // Categorize files
    for (const [filePath, fileData] of Object.entries(coverageData)) {
      if (filePath === 'total') continue

      let category = 'other'
      
      if (filePath.includes('/repositories/')) {
        category = 'repositories'
      } else if (filePath.includes('/services/')) {
        category = 'services'
      } else if (filePath.includes('/components/')) {
        category = 'components'
      } else if (filePath.includes('/utils/') || filePath.includes('/lib/')) {
        category = 'utils'
      }

      analysis[category].files.push({
        path: filePath,
        coverage: fileData,
      })
    }

    // Calculate category averages
    for (const [category, data] of Object.entries(analysis)) {
      if (data.files.length > 0) {
        const totals = data.files.reduce((acc, file) => ({
          statements: acc.statements + file.coverage.statements.pct,
          branches: acc.branches + file.coverage.branches.pct,
          functions: acc.functions + file.coverage.functions.pct,
          lines: acc.lines + file.coverage.lines.pct,
        }), { statements: 0, branches: 0, functions: 0, lines: 0 })

        data.coverage = {
          statements: Math.round(totals.statements / data.files.length),
          branches: Math.round(totals.branches / data.files.length),
          functions: Math.round(totals.functions / data.files.length),
          lines: Math.round(totals.lines / data.files.length),
        }
      }
    }

    return analysis
  }

  /**
   * Generate detailed coverage report
   */
  generateDetailedReport(analysis) {
    console.log('\n📈 Coverage Analysis Report')
    console.log('=' .repeat(50))

    // Overall coverage
    if (this.combinedReport.total) {
      const { total } = this.combinedReport
      console.log('\n🌍 Overall Coverage:')
      console.log(`  Statements: ${total.statements.pct}% (${total.statements.covered}/${total.statements.total})`)
      console.log(`  Branches:   ${total.branches.pct}% (${total.branches.covered}/${total.branches.total})`)
      console.log(`  Functions:  ${total.functions.pct}% (${total.functions.covered}/${total.functions.total})`)
      console.log(`  Lines:      ${total.lines.pct}% (${total.lines.covered}/${total.lines.total})`)
    }

    // Coverage by category
    console.log('\n📂 Coverage by Category:')
    for (const [category, data] of Object.entries(analysis)) {
      if (data.files.length > 0) {
        console.log(`\n  ${category.toUpperCase()} (${data.files.length} files):`)
        console.log(`    Statements: ${data.coverage.statements}%`)
        console.log(`    Branches:   ${data.coverage.branches}%`)
        console.log(`    Functions:  ${data.coverage.functions}%`)
        console.log(`    Lines:      ${data.coverage.lines}%`)
      }
    }

    // Files with low coverage
    console.log('\n⚠️  Files with Low Coverage (<60%):')
    let lowCoverageFiles = []
    
    for (const [category, data] of Object.entries(analysis)) {
      for (const file of data.files) {
        if (file.coverage.statements.pct < 60 || file.coverage.lines.pct < 60) {
          lowCoverageFiles.push({
            path: file.path,
            statements: file.coverage.statements.pct,
            lines: file.coverage.lines.pct,
          })
        }
      }
    }

    if (lowCoverageFiles.length > 0) {
      lowCoverageFiles
        .sort((a, b) => a.statements - b.statements)
        .slice(0, 10) // Show worst 10
        .forEach(file => {
          console.log(`    ${file.path}: ${file.statements}% statements, ${file.lines}% lines`)
        })
    } else {
      console.log('    ✅ All files have good coverage!')
    }

    // Generate HTML report link
    const htmlReport = path.join(this.coverageDir, 'lcov-report/index.html')
    if (fs.existsSync(htmlReport)) {
      console.log(`\n🌐 Detailed HTML report: file://${path.resolve(htmlReport)}`)
    }
  }

  /**
   * Check coverage against thresholds
   */
  checkCoverageThresholds(analysis) {
    console.log('\n🎯 Checking Coverage Thresholds')
    console.log('=' .repeat(40))

    let passed = true
    const failures = []

    // Check global thresholds
    if (this.combinedReport.total) {
      const global = this.combinedReport.total
      const thresholds = COVERAGE_CONFIG.thresholds.global

      const checks = [
        { name: 'statements', actual: global.statements.pct, threshold: thresholds.statements },
        { name: 'branches', actual: global.branches.pct, threshold: thresholds.branches },
        { name: 'functions', actual: global.functions.pct, threshold: thresholds.functions },
        { name: 'lines', actual: global.lines.pct, threshold: thresholds.lines },
      ]

      console.log('\n🌍 Global Thresholds:')
      for (const check of checks) {
        const status = check.actual >= check.threshold ? '✅' : '❌'
        console.log(`  ${status} ${check.name}: ${check.actual}% (min: ${check.threshold}%)`)
        
        if (check.actual < check.threshold) {
          passed = false
          failures.push(`Global ${check.name}: ${check.actual}% < ${check.threshold}%`)
        }
      }
    }

    // Check category thresholds
    console.log('\n📂 Category Thresholds:')
    for (const [category, data] of Object.entries(analysis)) {
      if (data.files.length > 0 && COVERAGE_CONFIG.thresholds[category]) {
        const thresholds = COVERAGE_CONFIG.thresholds[category]
        
        console.log(`\n  ${category.toUpperCase()}:`)
        const checks = [
          { name: 'statements', actual: data.coverage.statements, threshold: thresholds.statements },
          { name: 'branches', actual: data.coverage.branches, threshold: thresholds.branches },
          { name: 'functions', actual: data.coverage.functions, threshold: thresholds.functions },
          { name: 'lines', actual: data.coverage.lines, threshold: thresholds.lines },
        ]

        for (const check of checks) {
          const status = check.actual >= check.threshold ? '✅' : '❌'
          console.log(`    ${status} ${check.name}: ${check.actual}% (min: ${check.threshold}%)`)
          
          if (check.actual < check.threshold) {
            passed = false
            failures.push(`${category} ${check.name}: ${check.actual}% < ${check.threshold}%`)
          }
        }
      }
    }

    // Summary
    console.log('\n' + '='.repeat(50))
    if (passed) {
      console.log('✅ All coverage thresholds passed!')
    } else {
      console.log('❌ Coverage thresholds failed:')
      failures.forEach(failure => console.log(`   - ${failure}`))
      
      if (process.env.CI === 'true') {
        console.log('\n💡 In CI mode, failing due to coverage thresholds.')
        process.exit(1)
      }
    }

    return passed
  }

  /**
   * Generate coverage badges
   */
  async generateBadges() {
    console.log('\n🏷️  Generating coverage badges...')

    if (!this.combinedReport || !this.combinedReport.total) {
      console.log('⚠️  No coverage data available for badge generation')
      return
    }

    const coverage = this.combinedReport.total.statements.pct
    const color = coverage >= 80 ? 'brightgreen' : coverage >= 60 ? 'yellow' : 'red'
    
    const badgeData = {
      schemaVersion: 1,
      label: 'coverage',
      message: `${coverage}%`,
      color: color,
    }

    const badgeFile = path.join(this.coverageDir, 'coverage-badge.json')
    fs.writeFileSync(badgeFile, JSON.stringify(badgeData, null, 2))

    console.log(`✅ Coverage badge data saved to ${badgeFile}`)
  }

  /**
   * Clean coverage directory
   */
  cleanCoverage() {
    console.log('🧹 Cleaning previous coverage data...')
    
    if (fs.existsSync(this.coverageDir)) {
      fs.rmSync(this.coverageDir, { recursive: true, force: true })
    }
    
    // Also clean individual coverage directories
    const coverageDirs = glob.sync('coverage-*/')
    for (const dir of coverageDirs) {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  }

  /**
   * Main execution
   */
  async run() {
    const startTime = Date.now()

    try {
      // Run tests
      await this.runAllTests()

      // Combine reports
      await this.combineCoverageReports()

      // Analyze coverage
      await this.analyzeCoverage()

      // Generate badges
      await this.generateBadges()

      const duration = Date.now() - startTime
      console.log(`\n🎉 Coverage analysis completed in ${Math.round(duration / 1000)}s`)

    } catch (error) {
      console.error('❌ Coverage analysis failed:', error)
      process.exit(1)
    }
  }
}

// Run if called directly
if (require.main === module) {
  const analyzer = new CoverageAnalyzer()
  analyzer.run()
}

module.exports = CoverageAnalyzer