#!/usr/bin/env node

/**
 * Auto Test Watcher
 * Monitors file changes and automatically runs smoke tests
 */

const chokidar = require('chokidar');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

class AutoTestWatcher {
  constructor() {
    this.isRunning = false;
    this.testQueue = new Set();
    this.debounceTimer = null;
    this.lastTestTime = 0;
    this.testHistory = [];
    
    this.config = {
      debounceMs: 2000, // Wait 2 seconds after last change before testing
      minTestInterval: 10000, // Minimum 10 seconds between test runs
      watchPaths: [
        'src/**/*.{ts,tsx,js,jsx}',
        'src/**/*.css',
        'public/**/*',
        'package.json',
        'tailwind.config.js',
        'next.config.js'
      ],
      ignorePaths: [
        'node_modules/**',
        '.next/**',
        '.git/**',
        'tests/**',
        '**/*.test.{ts,tsx,js,jsx}',
        '**/*.spec.{ts,tsx,js,jsx}'
      ]
    };
  }

  async init() {
    console.log('👁️  Auto Test Watcher initializing...');
    console.log('📁 Watching paths:', this.config.watchPaths);
    
    // Create tests directory if it doesn't exist
    await this.ensureTestDirectory();
    
    // Initialize file watcher
    this.watcher = chokidar.watch(this.config.watchPaths, {
      ignored: this.config.ignorePaths,
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 500,
        pollInterval: 100
      }
    });

    // Set up event handlers
    this.watcher
      .on('change', (path) => this.handleFileChange('change', path))
      .on('add', (path) => this.handleFileChange('add', path))
      .on('unlink', (path) => this.handleFileChange('delete', path))
      .on('error', (error) => console.error('🚨 Watcher error:', error))
      .on('ready', () => {
        console.log('✅ Auto Test Watcher ready');
        console.log('🔥 Will run smoke tests automatically when files change');
        
        // Run initial smoke tests
        this.scheduleTest('initial startup');
      });

    // Graceful shutdown
    process.on('SIGINT', () => this.shutdown());
    process.on('SIGTERM', () => this.shutdown());
  }

  async ensureTestDirectory() {
    const testDir = path.join(process.cwd(), 'tests', 'smoke');
    try {
      await fs.mkdir(testDir, { recursive: true });
    } catch (error) {
      // Directory already exists
    }
  }

  handleFileChange(event, filePath) {
    if (this.shouldIgnoreFile(filePath)) return;
    
    const relativePath = path.relative(process.cwd(), filePath);
    console.log(`📝 File ${event}: ${relativePath}`);
    
    this.testQueue.add({
      event,
      path: relativePath,
      timestamp: Date.now()
    });
    
    this.scheduleTest(`file ${event}: ${relativePath}`);
  }

  shouldIgnoreFile(filePath) {
    // Additional runtime ignores
    const ignorePatterns = [
      /\.log$/,
      /\.tmp$/,
      /~$/,
      /\.swp$/,
      /test-memory\.json$/
    ];
    
    return ignorePatterns.some(pattern => pattern.test(filePath));
  }

  scheduleTest(reason) {
    // Clear existing timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    
    // Schedule new test run
    this.debounceTimer = setTimeout(() => {
      this.runSmokeTests(reason);
    }, this.config.debounceMs);
  }

  async runSmokeTests(reason) {
    const now = Date.now();
    
    // Rate limiting
    if (now - this.lastTestTime < this.config.minTestInterval) {
      console.log('⏳ Skipping test run (too soon since last test)');
      return;
    }
    
    if (this.isRunning) {
      console.log('⏳ Test already running, skipping...');
      return;
    }
    
    this.isRunning = true;
    this.lastTestTime = now;
    
    console.log(`\n🚀 Running smoke tests (triggered by: ${reason})`);
    console.log('⏰', new Date().toLocaleTimeString());
    
    try {
      const testResult = await this.executeSmokeTests();
      this.recordTestResult(reason, testResult);
      
      if (testResult.success) {
        console.log('✅ Smoke tests passed - changes look good!');
      } else {
        console.log('❌ Smoke tests failed - please check the issues');
        this.notifyFailure(testResult);
      }
      
    } catch (error) {
      console.error('🚨 Error running smoke tests:', error.message);
      this.recordTestResult(reason, { success: false, error: error.message });
    }
    
    // Clear test queue
    this.testQueue.clear();
    this.isRunning = false;
    
    console.log('👁️  Watching for more changes...\n');
  }

  executeSmokeTests() {
    return new Promise((resolve) => {
      const testScript = path.join(__dirname, 'smoke-tests.js');
      const testProcess = spawn('node', [testScript], {
        cwd: process.cwd(),
        stdio: 'pipe'
      });

      let output = '';
      let errorOutput = '';

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
          duration: Date.now() - this.lastTestTime
        });
      });

      // Timeout after 60 seconds
      setTimeout(() => {
        testProcess.kill();
        resolve({
          success: false,
          error: 'Test timeout',
          duration: 60000
        });
      }, 60000);
    });
  }

  recordTestResult(reason, result) {
    const record = {
      timestamp: new Date().toISOString(),
      reason,
      success: result.success,
      duration: result.duration,
      exitCode: result.exitCode,
      changedFiles: Array.from(this.testQueue).map(item => item.path)
    };
    
    this.testHistory.unshift(record);
    
    // Keep last 20 test runs
    if (this.testHistory.length > 20) {
      this.testHistory = this.testHistory.slice(0, 20);
    }
    
    // Save to file for persistence
    this.saveTestHistory();
  }

  async saveTestHistory() {
    try {
      const historyFile = path.join(__dirname, 'auto-test-history.json');
      await fs.writeFile(historyFile, JSON.stringify({
        lastUpdate: new Date().toISOString(),
        history: this.testHistory
      }, null, 2));
    } catch (error) {
      console.error('Failed to save test history:', error.message);
    }
  }

  notifyFailure(result) {
    // Could be extended to send notifications, emails, etc.
    console.log('\n🚨 SMOKE TEST FAILURE DETECTED 🚨');
    console.log(`Exit code: ${result.exitCode}`);
    
    if (result.errorOutput) {
      console.log('Error output:', result.errorOutput);
    }
    
    console.log('💡 Consider checking the recent changes:');
    Array.from(this.testQueue).forEach(item => {
      console.log(`  - ${item.event}: ${item.path}`);
    });
  }

  getStats() {
    const recent = this.testHistory.slice(0, 10);
    const passRate = recent.length > 0 
      ? (recent.filter(r => r.success).length / recent.length * 100).toFixed(1)
      : 0;
    
    return {
      totalTests: this.testHistory.length,
      recentPassRate: `${passRate}%`,
      isWatching: this.watcher ? this.watcher.getWatched() : null,
      lastTest: this.testHistory[0]?.timestamp
    };
  }

  async shutdown() {
    console.log('\n🛑 Shutting down Auto Test Watcher...');
    
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    
    if (this.watcher) {
      await this.watcher.close();
    }
    
    await this.saveTestHistory();
    
    console.log('✅ Auto Test Watcher stopped');
    process.exit(0);
  }
}

// CLI interface
if (require.main === module) {
  const watcher = new AutoTestWatcher();
  
  watcher.init().catch(error => {
    console.error('🚨 Failed to start Auto Test Watcher:', error);
    process.exit(1);
  });
}

module.exports = { AutoTestWatcher };