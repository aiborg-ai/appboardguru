import { Reporter, TestCase, TestResult, TestStep } from '@playwright/test/reporter'
import fs from 'fs'
import path from 'path'

/**
 * Custom Playwright Reporter for MCP Integration
 * 
 * This reporter:
 * - Captures test execution data for AI analysis
 * - Generates actionable insights from test failures
 * - Provides real-time test status to MCP
 * - Creates structured data for test generation
 */

interface MCPTestData {
  testId: string
  title: string
  location: string
  status: 'passed' | 'failed' | 'skipped' | 'timedOut'
  duration: number
  error?: {
    message: string
    stack?: string
  }
  steps: MCPTestStep[]
  annotations: Record<string, any>
  artifacts: string[]
}

interface MCPTestStep {
  title: string
  duration: number
  error?: {
    message: string
    stack?: string
  }
}

export default class MCPReporter implements Reporter {
  private testResults: MCPTestData[] = []
  private outputPath: string
  
  constructor(options: { outputPath?: string } = {}) {
    this.outputPath = options.outputPath || path.join(__dirname, '../reports/mcp-results.json')
  }
  
  onBegin(config: any, suite: any) {
    console.log(`🤖 MCP Reporter: Starting test run with ${suite.allTests().length} tests`)
  }
  
  onTestBegin(test: TestCase, result: TestResult) {
    console.log(`  ▶️  Running: ${test.title}`)
  }
  
  onTestEnd(test: TestCase, result: TestResult) {
    const status = result.status as 'passed' | 'failed' | 'skipped' | 'timedOut'
    const icon = status === 'passed' ? '✅' : status === 'failed' ? '❌' : '⏭️'
    
    console.log(`  ${icon} ${test.title} (${result.duration}ms)`)
    
    // Collect test data for MCP analysis
    const testData: MCPTestData = {
      testId: test.id,
      title: test.title,
      location: `${test.location.file}:${test.location.line}:${test.location.column}`,
      status,
      duration: result.duration,
      steps: this.extractSteps(result.steps),
      annotations: test.annotations.reduce((acc, ann) => {
        acc[ann.type] = ann.description
        return acc
      }, {} as Record<string, any>),
      artifacts: result.attachments.map(att => att.path || '').filter(Boolean),
    }
    
    if (result.error) {
      testData.error = {
        message: result.error.message || '',
        stack: result.error.stack,
      }
      
      // Log detailed error for debugging
      console.error(`     Error: ${result.error.message}`)
      if (result.error.stack) {
        console.error(`     Stack: ${result.error.stack.split('\n')[0]}`)
      }
    }
    
    this.testResults.push(testData)
  }
  
  onEnd(result: any) {
    const summary = {
      totalTests: this.testResults.length,
      passed: this.testResults.filter(t => t.status === 'passed').length,
      failed: this.testResults.filter(t => t.status === 'failed').length,
      skipped: this.testResults.filter(t => t.status === 'skipped').length,
      duration: result.duration,
      startTime: result.startTime,
      tests: this.testResults,
      
      // MCP-specific metadata
      mcp: {
        version: '1.0.0',
        generatedAt: new Date().toISOString(),
        suggestions: this.generateSuggestions(),
        patterns: this.detectPatterns(),
      },
    }
    
    // Write results to file
    const dir = path.dirname(this.outputPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    
    fs.writeFileSync(this.outputPath, JSON.stringify(summary, null, 2))
    
    // Print summary
    console.log('\n📊 MCP Test Summary:')
    console.log(`   Total: ${summary.totalTests}`)
    console.log(`   ✅ Passed: ${summary.passed}`)
    console.log(`   ❌ Failed: ${summary.failed}`)
    console.log(`   ⏭️  Skipped: ${summary.skipped}`)
    console.log(`   ⏱️  Duration: ${(summary.duration / 1000).toFixed(2)}s`)
    
    if (summary.mcp.suggestions.length > 0) {
      console.log('\n💡 MCP Suggestions:')
      summary.mcp.suggestions.forEach(suggestion => {
        console.log(`   • ${suggestion}`)
      })
    }
    
    console.log(`\n📄 Full report saved to: ${this.outputPath}`)
  }
  
  private extractSteps(steps: TestStep[]): MCPTestStep[] {
    return steps.map(step => ({
      title: step.title,
      duration: step.duration,
      error: step.error ? {
        message: step.error.message || '',
        stack: step.error.stack,
      } : undefined,
    }))
  }
  
  private generateSuggestions(): string[] {
    const suggestions: string[] = []
    
    // Analyze failures for patterns
    const failures = this.testResults.filter(t => t.status === 'failed')
    
    if (failures.length > 0) {
      // Check for common error patterns
      const timeoutFailures = failures.filter(t => 
        t.error?.message?.includes('timeout') || 
        t.status === 'timedOut'
      )
      
      if (timeoutFailures.length > 0) {
        suggestions.push(`Consider increasing timeout for ${timeoutFailures.length} tests that timed out`)
      }
      
      const elementNotFound = failures.filter(t =>
        t.error?.message?.includes('element not found') ||
        t.error?.message?.includes('locator')
      )
      
      if (elementNotFound.length > 0) {
        suggestions.push(`Review element locators in ${elementNotFound.length} tests - selectors may have changed`)
      }
      
      // Check for flaky tests
      const longRunningTests = this.testResults.filter(t => t.duration > 10000)
      if (longRunningTests.length > 0) {
        suggestions.push(`${longRunningTests.length} tests took over 10s - consider optimization or splitting`)
      }
    }
    
    // Success patterns
    const allPassed = this.testResults.every(t => t.status === 'passed')
    if (allPassed && this.testResults.length > 10) {
      suggestions.push('All tests passed! Consider adding more edge case scenarios')
    }
    
    return suggestions
  }
  
  private detectPatterns(): Record<string, any> {
    const patterns: Record<string, any> = {}
    
    // Group failures by error type
    const failures = this.testResults.filter(t => t.status === 'failed')
    if (failures.length > 0) {
      patterns.failureTypes = failures.reduce((acc, test) => {
        const errorType = this.categorizeError(test.error?.message || '')
        acc[errorType] = (acc[errorType] || 0) + 1
        return acc
      }, {} as Record<string, number>)
    }
    
    // Performance patterns
    patterns.performance = {
      averageDuration: this.testResults.reduce((sum, t) => sum + t.duration, 0) / this.testResults.length,
      slowestTest: this.testResults.reduce((slowest, t) => 
        t.duration > (slowest?.duration || 0) ? t : slowest, 
        null as MCPTestData | null
      )?.title,
      fastestTest: this.testResults.reduce((fastest, t) => 
        t.duration < (fastest?.duration || Infinity) ? t : fastest,
        null as MCPTestData | null
      )?.title,
    }
    
    // Test distribution
    patterns.distribution = {
      byStatus: this.testResults.reduce((acc, t) => {
        acc[t.status] = (acc[t.status] || 0) + 1
        return acc
      }, {} as Record<string, number>),
    }
    
    return patterns
  }
  
  private categorizeError(message: string): string {
    if (message.includes('timeout')) return 'timeout'
    if (message.includes('element not found') || message.includes('locator')) return 'locator'
    if (message.includes('network') || message.includes('fetch')) return 'network'
    if (message.includes('assertion') || message.includes('expect')) return 'assertion'
    if (message.includes('permission') || message.includes('auth')) return 'auth'
    return 'other'
  }
}