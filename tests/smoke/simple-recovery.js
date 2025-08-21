#!/usr/bin/env node

/**
 * Simple Auto-Recovery System
 * Monitors system health and provides recovery suggestions
 * Works without external dependencies like chokidar
 */

const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const { BasicSmokeTestMemory } = require('./basic-smoke-tests');

class SimpleRecoverySystem {
  constructor() {
    this.memory = new BasicSmokeTestMemory();
    this.intervalTime = 30000; // Check every 30 seconds
    this.monitoringInterval = null;
  }

  async init() {
    console.log('🔧 Simple Auto-Recovery System initializing...');
    await this.memory.load();
    
    const health = this.memory.getHealthReport();
    console.log(`📊 System Health: ${health.overall}`);
    
    if (health.overall === 'CRITICAL') {
      console.log('🚨 Critical system state detected - running immediate recovery check');
      await this.performRecoveryCheck();
    }
    
    this.startMonitoring();
  }

  startMonitoring() {
    console.log('🔄 Starting continuous health monitoring...');
    console.log(`⏰ Checking system health every ${this.intervalTime/1000} seconds`);
    
    this.monitoringInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, this.intervalTime);

    // Graceful shutdown
    process.on('SIGINT', () => this.shutdown());
    process.on('SIGTERM', () => this.shutdown());
  }

  async performHealthCheck() {
    try {
      await this.memory.load();
      const health = this.memory.getHealthReport();
      
      console.log(`\n🔍 Health Check - ${new Date().toLocaleTimeString()}`);
      console.log(`📊 Status: ${health.overall}`);
      
      // Check for concerning patterns
      if (health.consecutiveFails >= 3) {
        console.log(`🚨 ALERT: ${health.consecutiveFails} consecutive failures detected!`);
        await this.performRecoveryCheck();
      }
      
      if (health.changeImpact.changesWithoutTesting > 10) {
        console.log(`⚠️  Warning: ${health.changeImpact.changesWithoutTesting} changes without testing`);
        console.log('💡 Consider running: npm run test:smoke');
      }
      
      if (!health.buildHealth.cssWorking || !health.buildHealth.serverRunning) {
        console.log('🔧 Build issues detected - running recovery procedures');
        await this.performRecoveryCheck();
      }
      
    } catch (error) {
      console.error('❌ Health check failed:', error.message);
    }
  }

  async performRecoveryCheck() {
    console.log('\n🔧 PERFORMING RECOVERY CHECK');
    console.log('=' .repeat(50));
    
    try {
      // Run basic smoke tests to assess current state
      console.log('1. Running diagnostic tests...');
      const testResult = await this.runDiagnosticTests();
      
      if (testResult.success) {
        console.log('✅ System appears to be recovered');
        return;
      }
      
      // Analyze failures and suggest fixes
      await this.analyzeAndSuggestFixes(testResult);
      
    } catch (error) {
      console.error('🚨 Recovery check failed:', error.message);
    }
  }

  async runDiagnosticTests() {
    return new Promise((resolve) => {
      const testScript = path.join(__dirname, 'basic-smoke-tests.js');
      const testProcess = spawn('node', [testScript], {
        cwd: process.cwd(),
        stdio: 'pipe',
        env: { ...process.env, VERBOSE: '0' }
      });

      let output = '';
      let errorOutput = '';

      testProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      testProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      testProcess.on('close', (code) => {
        resolve({
          success: code === 0,
          exitCode: code,
          output,
          errorOutput
        });
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        testProcess.kill();
        resolve({
          success: false,
          error: 'Diagnostic timeout'
        });
      }, 30000);
    });
  }

  async analyzeAndSuggestFixes(testResult) {
    console.log('\n🔍 ANALYSIS & RECOVERY SUGGESTIONS');
    console.log('=' .repeat(50));
    
    if (testResult.output.includes('Build Directory')) {
      console.log('🔧 Build directory issues detected:');
      console.log('   📝 Try: rm -rf .next && npm run dev');
      console.log('   📝 Or: npm run build');
      
      // Auto-attempt build directory fix
      if (await this.shouldAttemptAutoFix()) {
        console.log('🤖 Attempting automatic build directory fix...');
        await this.attemptBuildFix();
      }
    }
    
    if (testResult.output.includes('CSS Configuration')) {
      console.log('🎨 CSS configuration issues:');
      console.log('   📝 Check: src/app/globals.css has @tailwind directives');
      console.log('   📝 Verify: tailwind.config.js is correct');
    }
    
    if (testResult.output.includes('TypeScript Setup')) {
      console.log('🔷 TypeScript issues:');
      console.log('   📝 Try: npm run type-check');
      console.log('   📝 Fix: TypeScript configuration');
    }
    
    if (testResult.output.includes('Package.json Integrity')) {
      console.log('📦 Package integrity issues:');
      console.log('   📝 Try: npm install');
      console.log('   📝 Consider: rm -rf node_modules && npm install');
    }
    
    console.log('\n💡 Manual Recovery Commands:');
    console.log('   🔄 Full reset: rm -rf .next node_modules && npm install && npm run dev');
    console.log('   🧪 Run tests: npm run test:smoke:verbose');
    console.log('   🏗️  Build check: npm run build');
  }

  async shouldAttemptAutoFix() {
    // Simple heuristic - only auto-fix if we haven't tried recently
    const health = this.memory.getHealthReport();
    return health.buildHealth.buildFailures < 3; // Avoid infinite loops
  }

  async attemptBuildFix() {
    try {
      console.log('🔄 Cleaning .next directory...');
      
      // Check if .next exists before trying to remove it
      try {
        await fs.access('.next');
        await fs.rm('.next', { recursive: true, force: true });
        console.log('✅ Cleaned .next directory');
      } catch (error) {
        console.log('📝 .next directory not present or already clean');
      }
      
      console.log('🏗️  Build fix completed - dev server should rebuild automatically');
      
    } catch (error) {
      console.error('❌ Auto-fix failed:', error.message);
    }
  }

  async shutdown() {
    console.log('\n🛑 Shutting down Simple Auto-Recovery System...');
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    
    await this.memory.save();
    console.log('✅ Auto-Recovery System stopped');
    process.exit(0);
  }

  getStatus() {
    return {
      monitoring: !!this.monitoringInterval,
      intervalTime: this.intervalTime,
      healthReport: this.memory.getHealthReport()
    };
  }
}

// CLI interface
if (require.main === module) {
  const recovery = new SimpleRecoverySystem();
  
  recovery.init().catch(error => {
    console.error('🚨 Failed to start Simple Auto-Recovery System:', error);
    process.exit(1);
  });
}

module.exports = { SimpleRecoverySystem };