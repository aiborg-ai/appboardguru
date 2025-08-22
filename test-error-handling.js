// Quick test to validate enhanced error handling
const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3000/api';

async function testErrorHandling() {
  console.log('Testing Enhanced Error Handling for Organizations API...\n');

  // Test 1: Validation Error - Invalid organization name
  console.log('1. Testing validation error (invalid characters in name)...');
  try {
    const response = await fetch(`${API_BASE}/organizations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Org@#$%',
        slug: 'invalid-org'
      })
    });
    
    const result = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.log('Error:', error.message);
  }
  console.log('');

  // Test 2: Validation Error - Reserved slug
  console.log('2. Testing validation error (reserved slug)...');
  try {
    const response = await fetch(`${API_BASE}/organizations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Test Organization',
        slug: 'api'
      })
    });
    
    const result = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.log('Error:', error.message);
  }
  console.log('');

  // Test 3: Authentication Error
  console.log('3. Testing authentication error (no token)...');
  try {
    const response = await fetch(`${API_BASE}/organizations`, {
      method: 'GET'
    });
    
    const result = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.log('Error:', error.message);
  }
  console.log('');

  // Test 4: Validation Error - Invalid UUID in URL
  console.log('4. Testing validation error (invalid UUID)...');
  try {
    const response = await fetch(`${API_BASE}/organizations?id=invalid-uuid`, {
      method: 'GET'
    });
    
    const result = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.log('Error:', error.message);
  }
  console.log('');

  // Test 5: Rate Limiting (would need multiple rapid requests)
  console.log('5. Testing rate limiting...');
  const promises = [];
  for (let i = 0; i < 3; i++) {
    promises.push(
      fetch(`${API_BASE}/organizations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: `Test Org ${i}`,
          slug: `test-org-${i}`
        })
      })
    );
  }

  try {
    const responses = await Promise.all(promises);
    for (let i = 0; i < responses.length; i++) {
      const response = responses[i];
      const result = await response.json();
      console.log(`Request ${i + 1} - Status: ${response.status}`);
      if (response.status === 429) {
        console.log('Rate limit response:', JSON.stringify(result, null, 2));
        break;
      }
    }
  } catch (error) {
    console.log('Error:', error.message);
  }

  console.log('\nError handling tests completed!');
}

// Run the tests
testErrorHandling().catch(console.error);