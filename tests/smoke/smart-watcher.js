#!/usr/bin/env node

/**
 * Smart Test Watcher
 * Monitors changes and runs appropriate tests with memory tracking
 */

const chokidar = require('chokidar');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const { BasicSmokeTestMemory } = require('./basic-smoke-tests');

class SmartTestWatcher {
  constructor() {
    this.memory = new BasicSmokeTestMemory();
    this.testQueue = new Set();
    this.debounceTimer = null;
    this.lastTestTime = 0;
    this.isRunning = false;
    
    this.config = {
      debounceMs: 3000, // Wait 3 seconds after changes
      minTestInterval: 15000, // Minimum 15 seconds between runs
      maxConsecutiveFailures: 3,
      
      // Smart file categorization
      criticalFiles: [
        'src/app/layout.tsx',
        'src/app/page.tsx',
        'src/app/globals.css',
        'package.json',
        'tailwind.config.js',
        'tsconfig.json'
      ],
      
      watchPaths: [
        'src/**/*.{ts,tsx,js,jsx}',
        'src/**/*.css',
        'package.json',
        'tailwind.config.js',
        'tsconfig.json',
        'next.config.js'
      ],
      
      ignorePaths: [
        'node_modules/**',
        '.next/**',
        '.git/**',
        'tests/**',
        '**/*.test.{ts,tsx,js,jsx}',
        '**/*.spec.{ts,tsx,js,jsx}',
        'test-memory.json',
        'basic-test-memory.json',
        'auto-test-history.json'
      ]
    };
  }

  async init() {
    await this.memory.load();
    
    console.log('👁️  Smart Test Watcher initializing...');
    
    const health = this.memory.getHealthReport();
    console.log(`📊 System Health: ${health.overall}`);
    
    if (health.buildHealth.buildFailures > 3) {
      console.log('🚨 Multiple build failures detected - will monitor closely');
    }
    
    if (health.changeImpact.changesWithoutTesting > 5) {
      console.log(`⚠️  ${health.changeImpact.changesWithoutTesting} changes without testing - running tests soon`);
    }

    this.setupFileWatcher();
    
    // Run initial tests if needed
    if (health.changeImpact.changesWithoutTesting > 0 || health.consecutiveFails > 0) {
      console.log('🔄 Running initial tests due to pending changes...');
      setTimeout(() => this.scheduleTest('initial check'), 2000);
    }
  }

  setupFileWatcher() {
    this.watcher = chokidar.watch(this.config.watchPaths, {
      ignored: this.config.ignorePaths,
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 1000,
        pollInterval: 200
      }
    });

    this.watcher
      .on('change', (filePath) => this.handleFileChange('change', filePath))
      .on('add', (filePath) => this.handleFileChange('add', filePath))
      .on('unlink', (filePath) => this.handleFileChange('delete', filePath))
      .on('error', (error) => console.error('🚨 Watcher error:', error))
      .on('ready', () => {
        console.log('✅ Smart Test Watcher ready');
        console.log('🎯 Watching for changes to trigger tests automatically');
      });

    // Graceful shutdown
    process.on('SIGINT', () => this.shutdown());
    process.on('SIGTERM', () => this.shutdown());
  }

  handleFileChange(event, filePath) {
    const relativePath = path.relative(process.cwd(), filePath);
    
    // Skip if we should ignore this file
    if (this.shouldSkipFile(relativePath)) return;
    
    const isCritical = this.config.criticalFiles.some(f => relativePath === f);
    const changeType = isCritical ? 'CRITICAL' : 'standard';
    
    console.log(`📝 ${changeType} file ${event}: ${relativePath}`);
    
    // Record the change in memory
    this.memory.recordChange(relativePath);
    
    this.testQueue.add({
      event,
      path: relativePath,
      timestamp: Date.now(),
      critical: isCritical
    });
    
    // Schedule test with urgency based on file type
    const urgencyMultiplier = isCritical ? 0.5 : 1.0;
    this.scheduleTest(`${event}: ${relativePath}`, urgencyMultiplier);
  }

  shouldSkipFile(filePath) {
    const skipPatterns = [
      /\.log$/,
      /\.tmp$/,
      /~$/,
      /\.swp$/,
      /-memory\.json$/,
      /lock-verify\.json$/
    ];
    
    return skipPatterns.some(pattern => pattern.test(filePath));
  }

  scheduleTest(reason, urgencyMultiplier = 1.0) {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    
    const debounceTime = Math.max(1000, this.config.debounceMs * urgencyMultiplier);
    
    this.debounceTimer = setTimeout(() => {
      this.runTests(reason);
    }, debounceTime);
  }

  async runTests(reason) {
    const now = Date.now();
    
    // Rate limiting
    if (now - this.lastTestTime < this.config.minTestInterval) {
      console.log('⏳ Skipping tests (rate limited)');
      return;
    }
    
    if (this.isRunning) {
      console.log('⏳ Tests already running, skipping...');
      return;
    }
    
    this.isRunning = true;
    this.lastTestTime = now;
    
    console.log(`\n🚀 Running smart tests (triggered by: ${reason})`);
    console.log('⏰', new Date().toLocaleTimeString());
    
    // Analyze what changed
    const criticalChanges = Array.from(this.testQueue).filter(c => c.critical);
    const hasChanged = this.testQueue.size > 0;
    
    if (criticalChanges.length > 0) {
      console.log(`🔥 Critical changes detected: ${criticalChanges.map(c => c.path).join(', ')}`);
    }
    
    try {
      const testResult = await this.executeTests();
      await this.processTestResults(reason, testResult, hasChanged);
      
    } catch (error) {
      console.error('🚨 Error running tests:', error.message);
      await this.handleTestError(reason, error);
    }
    
    this.testQueue.clear();
    this.isRunning = false;
    
    console.log('👁️  Watching for more changes...\n');
  }

  executeTests() {
    return new Promise((resolve) => {
      const testScript = path.join(__dirname, 'basic-smoke-tests.js');
      const testProcess = spawn('node', [testScript], {
        cwd: process.cwd(),
        stdio: 'pipe',
        env: { ...process.env, VERBOSE: '0' }
      });

      let output = '';
      let errorOutput = '';
      const startTime = Date.now();

      testProcess.stdout.on('data', (data) => {
        const text = data.toString();
        process.stdout.write(text);
        output += text;
      });

      testProcess.stderr.on('data', (data) => {
        const text = data.toString();
        process.stderr.write(text);
        errorOutput += text;
      });

      testProcess.on('close', (code) => {
        resolve({
          success: code === 0,
          exitCode: code,
          output,
          errorOutput,
          duration: Date.now() - startTime
        });
      });

      // Timeout after 45 seconds
      setTimeout(() => {
        testProcess.kill();
        resolve({
          success: false,
          error: 'Test timeout',
          duration: 45000
        });
      }, 45000);
    });
  }

  async processTestResults(reason, result, hasChanged) {
    if (result.success) {
      console.log('✅ Tests passed - changes look good!');
      
      if (hasChanged) {
        console.log('📈 System appears stable after changes');
      }
      
    } else {
      console.log('❌ Tests failed - investigating issues');
      
      // Reload memory to get latest state
      await this.memory.load();
      const health = this.memory.getHealthReport();
      
      if (health.consecutiveFails >= this.config.maxConsecutiveFailures) {
        console.log(`🚨 ALERT: ${health.consecutiveFails} consecutive failures!`);
        console.log('🔧 Consider running recovery procedures');
        await this.suggestRecoveryActions(health);
      }
      
      this.logFailureContext();
    }
  }

  async handleTestError(reason, error) {
    console.error('🚨 Test execution failed:', error.message);
    
    // Record as a failure
    await this.memory.load();
    const dummyResults = [{ test: 'Test Execution', passed: false, details: error.message }];
    const dummyBuildStatus = { cssWorking: false, serverRunning: false };
    this.memory.recordTestRun(dummyResults, dummyBuildStatus);
    await this.memory.save();
  }

  logFailureContext() {
    const changedFiles = Array.from(this.testQueue).map(c => c.path);
    
    if (changedFiles.length > 0) {
      console.log('\n🔍 Context - Recently changed files:');
      changedFiles.forEach(file => console.log(`  • ${file}`));
    }
    
    console.log('\n💡 Quick fixes to try:');
    console.log('  • rm -rf .next && npm run dev');
    console.log('  • Check src/app/globals.css for @tailwind directives');
    console.log('  • Run: npm run test:smoke:verbose for details');
  }

  async suggestRecoveryActions(health) {
    console.log('\n🔧 RECOVERY MODE - Suggested actions:');
    console.log('=' .repeat(50));
    
    if (!health.buildHealth.cssWorking) {
      console.log('1. Fix CSS issues:');
      console.log('   • Check src/app/globals.css has @tailwind directives');
      console.log('   • Verify tailwind.config.js is correct');
    }
    
    if (!health.buildHealth.serverRunning) {
      console.log('2. Fix server issues:');
      console.log('   • rm -rf .next');
      console.log('   • npm run dev');
    }
    
    if (health.buildHealth.buildFailures > 5) {
      console.log('3. Deep clean:');
      console.log('   • rm -rf node_modules package-lock.json');
      console.log('   • npm install');
    }
    
    console.log('\n📞 To get detailed diagnostics: npm run test:smoke:verbose');
  }

  async shutdown() {
    console.log('\n🛑 Shutting down Smart Test Watcher...');
    
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    
    if (this.watcher) {
      await this.watcher.close();
    }
    
    await this.memory.save();
    console.log('✅ Smart Test Watcher stopped');
    process.exit(0);
  }

  getStats() {
    return this.memory.getHealthReport();
  }
}

// CLI interface
if (require.main === module) {
  const watcher = new SmartTestWatcher();
  
  watcher.init().catch(error => {
    console.error('🚨 Failed to start Smart Test Watcher:', error);
    process.exit(1);
  });
}

module.exports = { SmartTestWatcher };