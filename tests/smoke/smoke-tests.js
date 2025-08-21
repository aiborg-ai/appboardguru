#!/usr/bin/env node

/**
 * BoardGuru Smoke Tests
 * Runs critical functionality tests to ensure the application is working properly
 */

const http = require('http');
const https = require('https');
const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

// Test configuration
const CONFIG = {
  baseUrl: 'http://localhost:3001',
  timeout: 10000,
  retries: 3,
  criticalPaths: [
    '/',
    '/demo',
    '/auth/signin',
    '/auth/signup'
  ],
  apiEndpoints: [
    '/api/health',
    '/api/auth/session'
  ],
  staticAssets: [
    '/_next/static/css/',
    '/favicon.ico'
  ]
};

// Memory system for tracking test results
const MEMORY_FILE = path.join(__dirname, 'test-memory.json');

class SmokeTestMemory {
  constructor() {
    this.memory = {
      lastRun: null,
      totalRuns: 0,
      consecutivePasses: 0,
      consecutiveFails: 0,
      testHistory: [],
      knownIssues: [],
      performanceBaseline: {}
    };
  }

  async load() {
    try {
      const data = await fs.readFile(MEMORY_FILE, 'utf8');
      this.memory = { ...this.memory, ...JSON.parse(data) };
    } catch (error) {
      // File doesn't exist yet, use defaults
      console.log('📝 Initializing test memory...');
    }
  }

  async save() {
    await fs.writeFile(MEMORY_FILE, JSON.stringify(this.memory, null, 2));
  }

  recordTestRun(results) {
    const now = new Date().toISOString();
    const allPassed = results.every(r => r.passed);
    
    this.memory.lastRun = now;
    this.memory.totalRuns++;
    
    if (allPassed) {
      this.memory.consecutivePasses++;
      this.memory.consecutiveFails = 0;
    } else {
      this.memory.consecutiveFails++;
      this.memory.consecutivePasses = 0;
    }

    // Keep last 50 test runs
    this.memory.testHistory.unshift({
      timestamp: now,
      passed: allPassed,
      results: results.map(r => ({ test: r.test, passed: r.passed, duration: r.duration }))
    });
    
    if (this.memory.testHistory.length > 50) {
      this.memory.testHistory = this.memory.testHistory.slice(0, 50);
    }
  }

  getStats() {
    const recent = this.memory.testHistory.slice(0, 10);
    const recentPassRate = recent.length > 0 
      ? (recent.filter(r => r.passed).length / recent.length * 100).toFixed(1)
      : 'N/A';

    return {
      totalRuns: this.memory.totalRuns,
      consecutivePasses: this.memory.consecutivePasses,
      consecutiveFails: this.memory.consecutiveFails,
      recentPassRate: `${recentPassRate}%`,
      lastRun: this.memory.lastRun
    };
  }
}

class SmokeTestRunner {
  constructor() {
    this.memory = new SmokeTestMemory();
    this.results = [];
  }

  async init() {
    await this.memory.load();
    console.log('🔥 BoardGuru Smoke Tests Starting...');
    console.log('📊 Test Stats:', this.memory.getStats());
  }

  async makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const protocol = url.startsWith('https') ? https : http;
      
      const req = protocol.get(url, {
        timeout: CONFIG.timeout,
        ...options
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data,
            duration: Date.now() - startTime
          });
        });
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.on('error', reject);
    });
  }

  async testServerRunning() {
    try {
      const response = await this.makeRequest(CONFIG.baseUrl);
      return {
        test: 'Server Running',
        passed: response.statusCode === 200,
        duration: response.duration,
        details: `Status: ${response.statusCode}, Response time: ${response.duration}ms`
      };
    } catch (error) {
      return {
        test: 'Server Running',
        passed: false,
        duration: 0,
        details: `Error: ${error.message}`
      };
    }
  }

  async testCriticalPages() {
    const results = [];
    
    for (const path of CONFIG.criticalPaths) {
      try {
        const response = await this.makeRequest(`${CONFIG.baseUrl}${path}`);
        const isValid = response.statusCode === 200 && response.body.includes('<!DOCTYPE html');
        
        results.push({
          test: `Page: ${path}`,
          passed: isValid,
          duration: response.duration,
          details: `Status: ${response.statusCode}, Has HTML: ${response.body.includes('<!DOCTYPE html')}`
        });
      } catch (error) {
        results.push({
          test: `Page: ${path}`,
          passed: false,
          duration: 0,
          details: `Error: ${error.message}`
        });
      }
    }
    
    return results;
  }

  async testCSSLoading() {
    try {
      // First get the main page to find CSS URLs
      const mainPage = await this.makeRequest(CONFIG.baseUrl);
      const cssMatch = mainPage.body.match(/href="([^"]*\.css[^"]*)"/);
      
      if (!cssMatch) {
        return {
          test: 'CSS Loading',
          passed: false,
          duration: 0,
          details: 'No CSS files found in HTML'
        };
      }

      const cssUrl = cssMatch[1].startsWith('http') 
        ? cssMatch[1] 
        : `${CONFIG.baseUrl}${cssMatch[1]}`;
      
      const cssResponse = await this.makeRequest(cssUrl);
      const isValidCSS = cssResponse.statusCode === 200 && 
        (cssResponse.body.includes('@font-face') || cssResponse.body.includes('/*'));

      return {
        test: 'CSS Loading',
        passed: isValidCSS,
        duration: cssResponse.duration,
        details: `CSS URL: ${cssUrl}, Status: ${cssResponse.statusCode}, Is CSS: ${isValidCSS}`
      };
    } catch (error) {
      return {
        test: 'CSS Loading',
        passed: false,
        duration: 0,
        details: `Error: ${error.message}`
      };
    }
  }

  async testTailwindClasses() {
    try {
      const response = await this.makeRequest(CONFIG.baseUrl);
      const hasTailwindClasses = /class="[^"]*(?:bg-|text-|flex|grid|p-|m-|w-|h-)[^"]*"/.test(response.body);
      
      return {
        test: 'Tailwind CSS Classes',
        passed: hasTailwindClasses,
        duration: response.duration,
        details: `Found Tailwind classes: ${hasTailwindClasses}`
      };
    } catch (error) {
      return {
        test: 'Tailwind CSS Classes',
        passed: false,
        duration: 0,
        details: `Error: ${error.message}`
      };
    }
  }

  async testBuildArtifacts() {
    const results = [];
    
    try {
      // Check if .next directory exists and has content
      const nextDir = path.join(process.cwd(), '.next');
      const stats = await fs.stat(nextDir);
      
      results.push({
        test: 'Build Directory Exists',
        passed: stats.isDirectory(),
        duration: 0,
        details: `.next directory exists: ${stats.isDirectory()}`
      });

      // Check for critical build files
      const criticalFiles = [
        '.next/static',
        '.next/server',
      ];

      for (const file of criticalFiles) {
        try {
          const filePath = path.join(process.cwd(), file);
          const fileStats = await fs.stat(filePath);
          results.push({
            test: `Build File: ${file}`,
            passed: true,
            duration: 0,
            details: `Exists: ${fileStats.isDirectory() ? 'directory' : 'file'}`
          });
        } catch {
          results.push({
            test: `Build File: ${file}`,
            passed: false,
            duration: 0,
            details: 'Missing build artifact'
          });
        }
      }
    } catch (error) {
      results.push({
        test: 'Build Directory Exists',
        passed: false,
        duration: 0,
        details: `Error: ${error.message}`
      });
    }
    
    return results;
  }

  async testTypeScriptCompilation() {
    return new Promise((resolve) => {
      const tsc = spawn('npx', ['tsc', '--noEmit'], {
        cwd: process.cwd(),
        stdio: 'pipe'
      });

      let output = '';
      let errorOutput = '';

      tsc.stdout.on('data', (data) => output += data.toString());
      tsc.stderr.on('data', (data) => errorOutput += data.toString());

      tsc.on('close', (code) => {
        const passed = code === 0;
        resolve({
          test: 'TypeScript Compilation',
          passed,
          duration: 0,
          details: passed ? 'No type errors' : `Type errors found: ${errorOutput.split('\n').length - 1} issues`
        });
      });

      // Kill process after 30 seconds
      setTimeout(() => {
        tsc.kill();
        resolve({
          test: 'TypeScript Compilation',
          passed: false,
          duration: 0,
          details: 'TypeScript check timed out'
        });
      }, 30000);
    });
  }

  async runAllTests() {
    console.log('\n🧪 Running smoke tests...\n');
    
    // Run tests in parallel where possible
    const testPromises = [
      this.testServerRunning(),
      this.testCSSLoading(),
      this.testTailwindClasses(),
      this.testTypeScriptCompilation(),
      this.testBuildArtifacts()
    ];

    // Critical pages test (sequential to avoid overwhelming server)
    const pageResults = await this.testCriticalPages();
    
    // Wait for other tests
    const otherResults = await Promise.all(testPromises);
    
    this.results = [...otherResults, ...pageResults];
    
    // Record results in memory
    this.memory.recordTestRun(this.results);
    await this.memory.save();
  }

  displayResults() {
    const passed = this.results.filter(r => r.passed).length;
    const total = this.results.length;
    const allPassed = passed === total;
    
    console.log('\n📋 Test Results:');
    console.log('='.repeat(60));
    
    this.results.forEach(result => {
      const status = result.passed ? '✅' : '❌';
      const duration = result.duration > 0 ? ` (${result.duration}ms)` : '';
      console.log(`${status} ${result.test}${duration}`);
      if (!result.passed || process.env.VERBOSE) {
        console.log(`   ${result.details}`);
      }
    });
    
    console.log('='.repeat(60));
    console.log(`📊 Summary: ${passed}/${total} tests passed`);
    
    if (allPassed) {
      console.log('🎉 All smoke tests passed!');
      console.log(`🔥 Consecutive passes: ${this.memory.memory.consecutivePasses}`);
    } else {
      console.log('🚨 Some tests failed!');
      console.log(`💥 Consecutive fails: ${this.memory.memory.consecutiveFails}`);
    }

    const stats = this.memory.getStats();
    console.log(`📈 Total runs: ${stats.totalRuns}, Recent pass rate: ${stats.recentPassRate}`);
    
    return allPassed;
  }
}

// Main execution
async function main() {
  const runner = new SmokeTestRunner();
  
  try {
    await runner.init();
    await runner.runAllTests();
    const success = runner.displayResults();
    
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('🔥 Smoke tests failed to run:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { SmokeTestRunner, SmokeTestMemory };