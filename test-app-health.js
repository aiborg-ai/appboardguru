#!/usr/bin/env node

const http = require('http');
const https = require('https');

const tests = [
  {
    name: 'Homepage loads',
    url: 'http://localhost:3000',
    expectedStatus: 200
  },
  {
    name: 'API health check',
    url: 'http://localhost:3000/api/health',
    expectedStatus: [200, 404] // May not exist
  },
  {
    name: 'Auth API exists',
    url: 'http://localhost:3000/api/auth/login',
    expectedStatus: [405, 400] // Should reject GET
  },
  {
    name: 'Assets API exists',
    url: 'http://localhost:3000/api/assets',
    expectedStatus: [401, 200] // Requires auth
  }
];

console.log('🧪 Running App Health Checks...\n');

async function runTest(test) {
  return new Promise((resolve) => {
    const url = new URL(test.url);
    const client = url.protocol === 'https:' ? https : http;
    
    const req = client.get(test.url, (res) => {
      const expectedStatuses = Array.isArray(test.expectedStatus) 
        ? test.expectedStatus 
        : [test.expectedStatus];
      
      const passed = expectedStatuses.includes(res.statusCode);
      
      console.log(
        `${passed ? '✅' : '❌'} ${test.name}: ${res.statusCode} ${passed ? 'PASS' : 'FAIL'}`
      );
      
      resolve({ test: test.name, passed, status: res.statusCode });
    });
    
    req.on('error', (err) => {
      console.log(`❌ ${test.name}: Connection error - ${err.message}`);
      resolve({ test: test.name, passed: false, error: err.message });
    });
    
    req.setTimeout(5000, () => {
      req.destroy();
      console.log(`❌ ${test.name}: Timeout`);
      resolve({ test: test.name, passed: false, error: 'Timeout' });
    });
  });
}

async function runAllTests() {
  const results = [];
  
  for (const test of tests) {
    const result = await runTest(test);
    results.push(result);
  }
  
  console.log('\n📊 Summary:');
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  console.log(`  Passed: ${passed}/${results.length}`);
  console.log(`  Failed: ${failed}/${results.length}`);
  
  if (failed > 0) {
    console.log('\n❌ Failed tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.test}: ${r.error || `Status ${r.status}`}`);
    });
  }
  
  return results;
}

runAllTests().then(() => {
  console.log('\n✨ Health check complete');
}).catch(err => {
  console.error('Error running tests:', err);
  process.exit(1);
});