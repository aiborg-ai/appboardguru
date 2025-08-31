#!/bin/bash

echo "🧪 Testing file upload via curl"
echo ""

# Create a test file
echo "This is a test document for upload verification." > test-upload.txt

# First authenticate to get the session token
echo "📤 Authenticating as test director..."
AUTH_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test.director@appboardguru.com",
    "password": "TestDirector123!"
  }' \
  -c cookies.txt)

echo "$AUTH_RESPONSE"

# Now upload the file with cookies
echo ""
echo "📤 Uploading test file..."
UPLOAD_RESPONSE=$(curl -s -X POST http://localhost:3000/api/assets/upload \
  -b cookies.txt \
  -F "file=@test-upload.txt" \
  -F "title=Test Upload Document" \
  -F "description=Testing upload functionality" \
  -F "category=test" \
  -F "folderPath=/test" \
  -F "organizationId=01490829-abab-4469-8137-c37b5da52b87")

echo "$UPLOAD_RESPONSE" | jq '.'

# Clean up
rm -f test-upload.txt cookies.txt

echo ""
echo "✅ Test complete"