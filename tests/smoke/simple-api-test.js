#!/usr/bin/env node

/**
 * Simple API smoke test for organization creation
 * Tests core functionality without requiring frontend
 */

const http = require('http');
const https = require('https');

class SimpleApiTest {
  constructor() {
    this.baseUrl = 'http://localhost:3000';
    this.results = [];
  }

  log(message, status = 'INFO') {
    const timestamp = new Date().toISOString();
    const result = `[${timestamp}] ${status}: ${message}`;
    console.log(result);
    this.results.push({ timestamp, status, message });
  }

  async makeRequest(path, options = {}) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.baseUrl);
      const requestOptions = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      };

      const req = http.request(requestOptions, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const parsedData = data ? JSON.parse(data) : {};
            resolve({
              status: res.statusCode,
              headers: res.headers,
              data: parsedData
            });
          } catch (e) {
            resolve({
              status: res.statusCode,
              headers: res.headers,
              data: data
            });
          }
        });
      });

      req.on('error', reject);

      if (options.body) {
        req.write(JSON.stringify(options.body));
      }

      req.end();
    });
  }

  async testApiEndpointExists() {
    this.log('Testing if organizations API endpoint exists...');
    try {
      const response = await this.makeRequest('/api/organizations');
      
      if (response.status === 200 || response.status === 401) {
        this.log('✅ Organizations API endpoint exists and responds', 'PASS');
        return true;
      } else {
        this.log(`❌ Organizations API returned unexpected status: ${response.status}`, 'FAIL');
        return false;
      }
    } catch (error) {
      this.log(`❌ Failed to reach organizations API: ${error.message}`, 'FAIL');
      return false;
    }
  }

  async testUnauthenticatedAccess() {
    this.log('Testing unauthenticated access to organizations API...');
    try {
      const response = await this.makeRequest('/api/organizations');
      
      if (response.status === 401) {
        this.log('✅ Unauthenticated requests properly rejected', 'PASS');
        return true;
      } else {
        this.log(`❌ Expected 401, got ${response.status}`, 'FAIL');
        return false;
      }
    } catch (error) {
      this.log(`❌ Request failed: ${error.message}`, 'FAIL');
      return false;
    }
  }

  async testPostValidation() {
    this.log('Testing POST request validation...');
    try {
      const response = await this.makeRequest('/api/organizations', {
        method: 'POST',
        body: { invalid: 'data' }
      });
      
      if (response.status === 400 || response.status === 401) {
        this.log('✅ Invalid POST data properly handled', 'PASS');
        return true;
      } else {
        this.log(`❌ Expected 400/401, got ${response.status}`, 'FAIL');
        return false;
      }
    } catch (error) {
      this.log(`❌ Request failed: ${error.message}`, 'FAIL');
      return false;
    }
  }

  async testHealthCheck() {
    this.log('Testing if server is responsive...');
    try {
      const response = await this.makeRequest('/');
      
      if (response.status >= 200 && response.status < 500) {
        this.log('✅ Server is responsive', 'PASS');
        return true;
      } else {
        this.log(`❌ Server returned ${response.status}`, 'FAIL');
        return false;
      }
    } catch (error) {
      this.log(`❌ Server not reachable: ${error.message}`, 'FAIL');
      return false;
    }
  }

  async runAllTests() {
    this.log('Starting organization creation smoke tests...', 'START');
    
    const tests = [
      { name: 'Health Check', fn: () => this.testHealthCheck() },
      { name: 'API Endpoint Exists', fn: () => this.testApiEndpointExists() },
      { name: 'Unauthenticated Access', fn: () => this.testUnauthenticatedAccess() },
      { name: 'POST Validation', fn: () => this.testPostValidation() }
    ];

    let passed = 0;
    let failed = 0;

    for (const test of tests) {
      this.log(`Running test: ${test.name}`);
      try {
        const result = await test.fn();
        if (result) {
          passed++;
        } else {
          failed++;
        }
      } catch (error) {
        this.log(`❌ Test "${test.name}" threw an error: ${error.message}`, 'FAIL');
        failed++;
      }
    }

    this.log('', 'SUMMARY');
    this.log(`Tests completed: ${passed + failed}`, 'SUMMARY');
    this.log(`Passed: ${passed}`, 'SUMMARY');
    this.log(`Failed: ${failed}`, 'SUMMARY');
    
    if (failed === 0) {
      this.log('🎉 All smoke tests passed!', 'SUCCESS');
      process.exit(0);
    } else {
      this.log('💥 Some tests failed', 'ERROR');
      process.exit(1);
    }
  }
}

// Check if server is running before starting tests
async function checkServerRunning() {
  try {
    const response = await new SimpleApiTest().makeRequest('/');
    return true;
  } catch (error) {
    console.log('❌ Server not running on http://localhost:3000');
    console.log('Please start the development server with: npm run dev');
    process.exit(1);
  }
}

async function main() {
  console.log('Organization Creation Smoke Test');
  console.log('================================');
  
  await checkServerRunning();
  
  const tester = new SimpleApiTest();
  await tester.runAllTests();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = SimpleApiTest;