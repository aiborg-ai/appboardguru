#!/usr/bin/env node

/**
 * Basic Smoke Tests - Works even with build issues
 * Tests core functionality and tracks memory across changes
 */

const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');

// Memory system for tracking test results
const MEMORY_FILE = path.join(__dirname, 'basic-test-memory.json');

class BasicSmokeTestMemory {
  constructor() {
    this.memory = {
      lastRun: null,
      totalRuns: 0,
      consecutivePasses: 0,
      consecutiveFails: 0,
      testHistory: [],
      knownIssues: [],
      buildHealth: {
        lastCleanBuild: null,
        buildFailures: 0,
        cssWorking: false,
        serverRunning: false
      },
      changeImpact: {
        lastChange: null,
        changesWithoutTesting: 0,
        criticalFailures: []
      }
    };
  }

  async load() {
    try {
      const data = await fs.readFile(MEMORY_FILE, 'utf8');
      this.memory = { ...this.memory, ...JSON.parse(data) };
    } catch (error) {
      console.log('📝 Initializing basic test memory...');
    }
  }

  async save() {
    await fs.writeFile(MEMORY_FILE, JSON.stringify(this.memory, null, 2));
  }

  recordTestRun(results, buildStatus) {
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

    // Update build health
    this.memory.buildHealth.cssWorking = buildStatus.cssWorking;
    this.memory.buildHealth.serverRunning = buildStatus.serverRunning;
    
    if (buildStatus.serverRunning && buildStatus.cssWorking) {
      this.memory.buildHealth.lastCleanBuild = now;
      this.memory.buildHealth.buildFailures = 0;
    } else {
      this.memory.buildHealth.buildFailures++;
    }

    // Keep test history
    this.memory.testHistory.unshift({
      timestamp: now,
      passed: allPassed,
      buildHealthy: buildStatus.serverRunning && buildStatus.cssWorking,
      results: results.map(r => ({ test: r.test, passed: r.passed, details: r.details }))
    });
    
    if (this.memory.testHistory.length > 30) {
      this.memory.testHistory = this.memory.testHistory.slice(0, 30);
    }
  }

  recordChange(changePath) {
    this.memory.changeImpact.lastChange = {
      path: changePath,
      timestamp: new Date().toISOString()
    };
    this.memory.changeImpact.changesWithoutTesting++;
  }

  resetChangeCounter() {
    this.memory.changeImpact.changesWithoutTesting = 0;
  }

  getHealthReport() {
    const recent = this.memory.testHistory.slice(0, 5);
    const recentPassRate = recent.length > 0 
      ? (recent.filter(r => r.passed).length / recent.length * 100).toFixed(1)
      : 'N/A';
    
    const buildHealthy = this.memory.buildHealth.cssWorking && this.memory.buildHealth.serverRunning;
    
    return {
      overall: buildHealthy && this.memory.consecutivePasses > 0 ? 'HEALTHY' : 
               buildHealthy ? 'DEGRADED' : 'CRITICAL',
      totalRuns: this.memory.totalRuns,
      consecutivePasses: this.memory.consecutivePasses,
      consecutiveFails: this.memory.consecutiveFails,
      recentPassRate: `${recentPassRate}%`,
      buildHealth: {
        status: buildHealthy ? 'OK' : 'FAILED',
        cssWorking: this.memory.buildHealth.cssWorking,
        serverRunning: this.memory.buildHealth.serverRunning,
        lastCleanBuild: this.memory.buildHealth.lastCleanBuild,
        buildFailures: this.memory.buildHealth.buildFailures
      },
      changeImpact: {
        changesWithoutTesting: this.memory.changeImpact.changesWithoutTesting,
        lastChange: this.memory.changeImpact.lastChange
      }
    };
  }
}

class BasicSmokeTestRunner {
  constructor() {
    this.memory = new BasicSmokeTestMemory();
    this.results = [];
    this.buildStatus = {
      cssWorking: false,
      serverRunning: false,
      buildArtifactsPresent: false
    };
  }

  async init() {
    await this.memory.load();
    console.log('🔥 Basic Smoke Tests Starting...');
    const health = this.memory.getHealthReport();
    console.log(`📊 System Health: ${health.overall}`);
    console.log(`🏗️  Build Status: ${health.buildHealth.status}`);
    console.log(`📈 Total runs: ${health.totalRuns}, Recent pass rate: ${health.recentPassRate}`);
  }

  async testFileStructure() {
    try {
      const criticalPaths = [
        'src/app/page.tsx',
        'src/app/layout.tsx',
        'src/app/globals.css',
        'tailwind.config.js',
        'package.json'
      ];

      let missingFiles = [];
      let presentFiles = [];

      for (const filePath of criticalPaths) {
        try {
          await fs.access(filePath);
          presentFiles.push(filePath);
        } catch {
          missingFiles.push(filePath);
        }
      }

      const allPresent = missingFiles.length === 0;

      return {
        test: 'Critical File Structure',
        passed: allPresent,
        duration: 0,
        details: allPresent 
          ? `All ${presentFiles.length} critical files present`
          : `Missing files: ${missingFiles.join(', ')}`
      };
    } catch (error) {
      return {
        test: 'Critical File Structure',
        passed: false,
        duration: 0,
        details: `Error: ${error.message}`
      };
    }
  }

  async testPackageJsonIntegrity() {
    try {
      const packageData = await fs.readFile('package.json', 'utf8');
      const pkg = JSON.parse(packageData);
      
      const hasDevScript = pkg.scripts && pkg.scripts.dev;
      const hasBuildScript = pkg.scripts && pkg.scripts.build;
      const hasNextDep = pkg.dependencies && pkg.dependencies.next;
      const hasTailwind = pkg.devDependencies && pkg.devDependencies.tailwindcss;
      
      const allGood = hasDevScript && hasBuildScript && hasNextDep && hasTailwind;

      return {
        test: 'Package.json Integrity',
        passed: allGood,
        duration: 0,
        details: allGood 
          ? 'All critical scripts and dependencies present'
          : `Missing: ${[
              !hasDevScript && 'dev script',
              !hasBuildScript && 'build script',
              !hasNextDep && 'Next.js',
              !hasTailwind && 'Tailwind CSS'
            ].filter(Boolean).join(', ')}`
      };
    } catch (error) {
      return {
        test: 'Package.json Integrity',
        passed: false,
        duration: 0,
        details: `Error: ${error.message}`
      };
    }
  }

  async testTailwindConfig() {
    try {
      const tailwindExists = await fs.access('tailwind.config.js').then(() => true).catch(() => false);
      if (!tailwindExists) {
        return {
          test: 'Tailwind Configuration',
          passed: false,
          duration: 0,
          details: 'tailwind.config.js not found'
        };
      }

      const configContent = await fs.readFile('tailwind.config.js', 'utf8');
      const hasContent = configContent.includes('content:') && configContent.includes('./src/');
      const hasTheme = configContent.includes('theme:') || configContent.includes('extend:');

      return {
        test: 'Tailwind Configuration',
        passed: hasContent && hasTheme,
        duration: 0,
        details: hasContent && hasTheme 
          ? 'Tailwind config appears valid'
          : 'Tailwind config missing content paths or theme'
      };
    } catch (error) {
      return {
        test: 'Tailwind Configuration',
        passed: false,
        duration: 0,
        details: `Error: ${error.message}`
      };
    }
  }

  async testBuildDirectory() {
    try {
      const nextDirExists = await fs.access('.next').then(() => true).catch(() => false);
      
      if (!nextDirExists) {
        this.buildStatus.buildArtifactsPresent = false;
        return {
          test: 'Build Directory',
          passed: false,
          duration: 0,
          details: '.next directory not found - run npm run build or npm run dev'
        };
      }

      // Check for key build artifacts
      const artifacts = ['.next/static', '.next/server'];
      let presentArtifacts = 0;

      for (const artifact of artifacts) {
        try {
          await fs.access(artifact);
          presentArtifacts++;
        } catch {}
      }

      const buildHealthy = presentArtifacts === artifacts.length;
      this.buildStatus.buildArtifactsPresent = buildHealthy;

      return {
        test: 'Build Directory',
        passed: buildHealthy,
        duration: 0,
        details: buildHealthy 
          ? 'Build artifacts present'
          : `Missing artifacts: ${presentArtifacts}/${artifacts.length} present`
      };
    } catch (error) {
      return {
        test: 'Build Directory',
        passed: false,
        duration: 0,
        details: `Error: ${error.message}`
      };
    }
  }

  async testTypeScriptSetup() {
    try {
      const tsconfigExists = await fs.access('tsconfig.json').then(() => true).catch(() => false);
      if (!tsconfigExists) {
        return {
          test: 'TypeScript Setup',
          passed: false,
          duration: 0,
          details: 'tsconfig.json not found'
        };
      }

      const tsconfigContent = await fs.readFile('tsconfig.json', 'utf8');
      const tsconfig = JSON.parse(tsconfigContent);
      
      const hasBaseUrl = tsconfig.compilerOptions && tsconfig.compilerOptions.baseUrl;
      const hasPaths = tsconfig.compilerOptions && tsconfig.compilerOptions.paths;
      const hasStrict = tsconfig.compilerOptions && tsconfig.compilerOptions.strict;

      const isGood = hasBaseUrl && hasPaths && hasStrict;

      return {
        test: 'TypeScript Setup',
        passed: isGood,
        duration: 0,
        details: isGood 
          ? 'TypeScript configuration looks good'
          : 'TypeScript config may need attention'
      };
    } catch (error) {
      return {
        test: 'TypeScript Setup',
        passed: false,
        duration: 0,
        details: `Error parsing tsconfig.json: ${error.message}`
      };
    }
  }

  async testDevServerStart() {
    return new Promise((resolve) => {
      // Quick test to see if dev server can start
      const devProcess = spawn('npm', ['run', 'dev'], {
        cwd: process.cwd(),
        stdio: 'pipe'
      });

      let output = '';
      let started = false;

      devProcess.stdout.on('data', (data) => {
        output += data.toString();
        if (output.includes('Ready in') || output.includes('started server')) {
          started = true;
          devProcess.kill();
        }
      });

      devProcess.stderr.on('data', (data) => {
        output += data.toString();
      });

      devProcess.on('exit', () => {
        this.buildStatus.serverRunning = started;
        resolve({
          test: 'Dev Server Start',
          passed: started,
          duration: 0,
          details: started ? 'Dev server can start successfully' : 'Dev server failed to start'
        });
      });

      // Kill after 15 seconds
      setTimeout(() => {
        if (!started) {
          devProcess.kill();
          this.buildStatus.serverRunning = false;
          resolve({
            test: 'Dev Server Start',
            passed: false,
            duration: 0,
            details: 'Dev server start timed out'
          });
        }
      }, 15000);
    });
  }

  async testCSSGeneration() {
    try {
      // Check if globals.css exists and has content
      const globalsCss = await fs.readFile('src/app/globals.css', 'utf8');
      const hasTailwindDirectives = globalsCss.includes('@tailwind base') && 
                                  globalsCss.includes('@tailwind components') && 
                                  globalsCss.includes('@tailwind utilities');
      
      this.buildStatus.cssWorking = hasTailwindDirectives;

      return {
        test: 'CSS Configuration',
        passed: hasTailwindDirectives,
        duration: 0,
        details: hasTailwindDirectives 
          ? 'CSS file has proper Tailwind directives'
          : 'CSS file missing Tailwind directives'
      };
    } catch (error) {
      this.buildStatus.cssWorking = false;
      return {
        test: 'CSS Configuration',
        passed: false,
        duration: 0,
        details: `Error reading CSS: ${error.message}`
      };
    }
  }

  async runAllTests() {
    console.log('\n🧪 Running basic smoke tests...\n');
    
    // Run lightweight tests that don't require a running server
    const testPromises = [
      this.testFileStructure(),
      this.testPackageJsonIntegrity(),
      this.testTailwindConfig(),
      this.testBuildDirectory(),
      this.testTypeScriptSetup(),
      this.testCSSGeneration()
    ];
    
    this.results = await Promise.all(testPromises);
    
    // Record results
    this.memory.recordTestRun(this.results, this.buildStatus);
    this.memory.resetChangeCounter();
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
      console.log(`${status} ${result.test}`);
      if (!result.passed || process.env.VERBOSE) {
        console.log(`   ${result.details}`);
      }
    });
    
    console.log('='.repeat(60));
    console.log(`📊 Summary: ${passed}/${total} tests passed`);
    
    // Build status summary
    const buildHealthy = this.buildStatus.cssWorking && this.buildStatus.buildArtifactsPresent;
    console.log(`🏗️  Build Health: ${buildHealthy ? '✅ OK' : '❌ ISSUES'}`);
    console.log(`   CSS Working: ${this.buildStatus.cssWorking ? '✅' : '❌'}`);
    console.log(`   Build Artifacts: ${this.buildStatus.buildArtifactsPresent ? '✅' : '❌'}`);
    
    if (allPassed) {
      console.log('🎉 All basic tests passed!');
    } else {
      console.log('🚨 Some tests failed - check the issues above');
    }

    const health = this.memory.getHealthReport();
    console.log(`📈 System Health: ${health.overall}`);
    console.log(`🔄 Consecutive passes: ${health.consecutivePasses}, fails: ${health.consecutiveFails}`);
    
    return allPassed;
  }

  generateRecoveryPlan() {
    const issues = this.results.filter(r => !r.passed);
    if (issues.length === 0) return null;

    console.log('\n🔧 Recovery Plan:');
    console.log('='.repeat(40));

    issues.forEach(issue => {
      switch (issue.test) {
        case 'Critical File Structure':
          console.log('• Check that all source files are present');
          console.log('  Run: ls -la src/app/');
          break;
        case 'Package.json Integrity':
          console.log('• Restore package.json dependencies');
          console.log('  Run: npm install');
          break;
        case 'Build Directory':
          console.log('• Clean and rebuild Next.js');
          console.log('  Run: rm -rf .next && npm run dev');
          break;
        case 'CSS Configuration':
          console.log('• Fix Tailwind CSS setup');
          console.log('  Check src/app/globals.css has @tailwind directives');
          break;
        case 'Dev Server Start':
          console.log('• Investigate server startup issues');
          console.log('  Check for port conflicts or build errors');
          break;
      }
    });
  }
}

// Main execution
async function main() {
  const runner = new BasicSmokeTestRunner();
  
  try {
    await runner.init();
    await runner.runAllTests();
    const success = runner.displayResults();
    
    if (!success) {
      runner.generateRecoveryPlan();
    }
    
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('🔥 Basic smoke tests failed to run:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { BasicSmokeTestRunner, BasicSmokeTestMemory };