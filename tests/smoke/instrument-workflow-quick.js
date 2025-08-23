#!/usr/bin/env node

/**
 * Quick Instrument Workflow Smoke Test
 * Fast validation of instrument workflow components and API endpoints
 */

const http = require('http');
const fs = require('fs').promises;
const path = require('path');

const CONFIG = {
  baseUrl: 'http://localhost:3004',
  timeout: 5000,
  instruments: [
    'board-pack-ai',
    'annual-report-ai', 
    'calendar',
    'board-effectiveness',
    'risk-dashboard',
    'esg-scorecard',
    'compliance-tracker',
    'performance-analytics',
    'peer-benchmarking'
  ]
};

class InstrumentWorkflowTester {
  constructor() {
    this.results = [];
    this.passed = 0;
    this.failed = 0;
  }

  async makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const req = http.get(url, { timeout: CONFIG.timeout, ...options }, (res) => {
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

  async postRequest(url, data) {
    return new Promise((resolve, reject) => {
      const postData = JSON.stringify(data);
      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        },
        timeout: CONFIG.timeout
      };

      const req = http.request(url, options, (res) => {
        let responseData = '';
        res.on('data', chunk => responseData += chunk);
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            body: responseData,
            headers: res.headers
          });
        });
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.on('error', reject);
      req.write(postData);
      req.end();
    });
  }

  log(test, passed, details, duration = 0) {
    const result = { test, passed, details, duration };
    this.results.push(result);
    
    if (passed) {
      this.passed++;
      console.log(`✅ ${test} (${duration}ms)`);
    } else {
      this.failed++;
      console.log(`❌ ${test}`);
      console.log(`   ${details}`);
    }
  }

  async testServerRunning() {
    try {
      const response = await this.makeRequest(CONFIG.baseUrl);
      const passed = response.statusCode === 200;
      this.log('Server Running', passed, 
        `Status: ${response.statusCode}`, response.duration);
    } catch (error) {
      this.log('Server Running', false, `Error: ${error.message}`);
    }
  }

  async testInstrumentsPage() {
    try {
      const response = await this.makeRequest(`${CONFIG.baseUrl}/dashboard/instruments`);
      const passed = response.statusCode === 200 && 
        response.body.includes('All Instruments') &&
        response.body.includes('Launch Instrument');
      
      this.log('Instruments Page', passed, 
        `Status: ${response.statusCode}, Has content: ${passed}`, response.duration);
    } catch (error) {
      this.log('Instruments Page', false, `Error: ${error.message}`);
    }
  }

  async testWorkflowRoutes() {
    let passedRoutes = 0;
    const totalRoutes = CONFIG.instruments.length;

    for (const instrumentId of CONFIG.instruments) {
      try {
        const response = await this.makeRequest(
          `${CONFIG.baseUrl}/dashboard/instruments/play/${instrumentId}`
        );
        
        if (response.statusCode === 200 && 
            response.body.includes('Select Goal')) {
          passedRoutes++;
        }
      } catch (error) {
        // Route failed, but we continue testing others
      }
    }

    const passed = passedRoutes === totalRoutes;
    this.log('Workflow Routes', passed, 
      `${passedRoutes}/${totalRoutes} instrument routes working`);
  }

  async testAnalysisAPI() {
    try {
      const testData = {
        instrumentId: 'board-pack-ai',
        goal: {
          id: 'test-goal',
          title: 'Test Goal'
        },
        assets: [{
          name: 'test.pdf',
          type: 'pdf',
          size: 1024
        }],
        saveOptions: {
          saveToVault: { enabled: false },
          saveAsAsset: { enabled: false },
          shareOptions: { enabled: false },
          exportOptions: {}
        }
      };

      const response = await this.postRequest(
        `${CONFIG.baseUrl}/api/instruments/analyze`, testData
      );

      let responseJson;
      try {
        responseJson = JSON.parse(response.body);
      } catch {
        responseJson = {};
      }

      const passed = response.statusCode === 200 && 
        responseJson.success === true;
      
      this.log('Analysis API', passed, 
        `Status: ${response.statusCode}, Success: ${responseJson.success}`);
    } catch (error) {
      this.log('Analysis API', false, `Error: ${error.message}`);
    }
  }

  async testFileStructure() {
    const requiredFiles = [
      'src/features/instruments/InstrumentPlayWizard.tsx',
      'src/features/instruments/steps/GoalSelectionStep.tsx', 
      'src/features/instruments/steps/InstrumentAssetsStep.tsx',
      'src/features/instruments/steps/DashboardStep.tsx',
      'src/features/instruments/steps/ActionsStep.tsx',
      'src/lib/instruments/instrument-configs.ts',
      'src/app/dashboard/instruments/play/[instrumentId]/page.tsx',
      'src/app/api/instruments/analyze/route.ts'
    ];

    let existingFiles = 0;
    const missingFiles = [];

    for (const filePath of requiredFiles) {
      try {
        await fs.access(path.join(process.cwd(), filePath));
        existingFiles++;
      } catch {
        missingFiles.push(filePath);
      }
    }

    const passed = existingFiles === requiredFiles.length;
    const details = passed ? 
      'All required files exist' : 
      `Missing files: ${missingFiles.join(', ')}`;
    
    this.log('File Structure', passed, details);
  }

  async testImportResolution() {
    // Test if key TypeScript files can be parsed (basic syntax check)
    const keyFiles = [
      'src/features/instruments/InstrumentPlayWizard.tsx',
      'src/lib/instruments/instrument-configs.ts'
    ];

    let validFiles = 0;
    const invalidFiles = [];

    for (const filePath of keyFiles) {
      try {
        const content = await fs.readFile(path.join(process.cwd(), filePath), 'utf8');
        
        // Basic syntax checks
        const hasValidImports = content.includes('import') && 
          !content.includes('import from ""');
        const hasValidExports = content.includes('export');
        const noSyntaxErrors = !content.includes('ERROR:') && 
          !content.includes('FIXME:');
        
        if (hasValidImports && hasValidExports && noSyntaxErrors) {
          validFiles++;
        } else {
          invalidFiles.push(filePath);
        }
      } catch {
        invalidFiles.push(filePath);
      }
    }

    const passed = validFiles === keyFiles.length;
    const details = passed ?
      'All key files have valid syntax' :
      `Files with issues: ${invalidFiles.join(', ')}`;
    
    this.log('Import Resolution', passed, details);
  }

  async testInstrumentConfigs() {
    try {
      const configPath = path.join(process.cwd(), 'src/lib/instruments/instrument-configs.ts');
      const content = await fs.readFile(configPath, 'utf8');
      
      // Check that all instruments are configured
      let configuredInstruments = 0;
      for (const instrumentId of CONFIG.instruments) {
        if (content.includes(`'${instrumentId}'`) || content.includes(`"${instrumentId}"`)) {
          configuredInstruments++;
        }
      }

      const passed = configuredInstruments === CONFIG.instruments.length;
      this.log('Instrument Configs', passed, 
        `${configuredInstruments}/${CONFIG.instruments.length} instruments configured`);
    } catch (error) {
      this.log('Instrument Configs', false, `Error: ${error.message}`);
    }
  }

  async runAllTests() {
    console.log('🔥 Instrument Workflow Quick Smoke Tests');
    console.log('==========================================\n');

    // Run tests sequentially to avoid overwhelming the server
    await this.testServerRunning();
    await this.testFileStructure();
    await this.testImportResolution();
    await this.testInstrumentConfigs();
    await this.testInstrumentsPage();
    await this.testWorkflowRoutes();
    await this.testAnalysisAPI();
    
    this.displaySummary();
    return this.failed === 0;
  }

  displaySummary() {
    console.log('\n==========================================');
    console.log(`📊 Summary: ${this.passed}/${this.results.length} tests passed`);
    
    if (this.failed === 0) {
      console.log('🎉 All smoke tests passed!');
      console.log('✨ Instrument workflow is ready for testing');
    } else {
      console.log(`🚨 ${this.failed} test(s) failed!`);
      console.log('💡 Check the errors above and fix issues');
    }
    
    // Performance summary
    const avgDuration = this.results
      .filter(r => r.duration > 0)
      .reduce((sum, r) => sum + r.duration, 0) / 
      this.results.filter(r => r.duration > 0).length || 0;
    
    if (avgDuration > 0) {
      console.log(`⚡ Average response time: ${avgDuration.toFixed(0)}ms`);
    }
  }
}

// Main execution
async function main() {
  const tester = new InstrumentWorkflowTester();
  
  try {
    const success = await tester.runAllTests();
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

module.exports = { InstrumentWorkflowTester };