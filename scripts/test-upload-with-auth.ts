import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

async function testAssetUpload() {
  console.log('🚀 Starting Asset Upload Test with Authentication...\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500 // Slow down for visibility
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Create a test file
  const testFilePath = path.join(__dirname, 'test-upload.txt');
  fs.writeFileSync(testFilePath, 'This is a test file for upload verification.\nCreated at: ' + new Date().toISOString());
  console.log('✓ Created test file: test-upload.txt');
  
  try {
    // 1. Login
    console.log('\n1. Logging in...');
    await page.goto('http://localhost:3000/auth/signin');
    await page.fill('input[placeholder*="email" i]', 'test.director@appboardguru.com');
    await page.fill('input[type="password"]', 'TestDirector123!');
    await page.click('button:has-text("Sign In")');
    
    // Wait for dashboard
    await page.waitForURL('**/dashboard**', { timeout: 10000 });
    console.log('   ✓ Login successful');
    
    // 2. Navigate to Assets page
    console.log('\n2. Navigating to Assets page...');
    await page.goto('http://localhost:3000/dashboard/assets');
    await page.waitForLoadState('networkidle');
    console.log('   ✓ Assets page loaded');
    
    // 3. Check if organization is selected
    const orgText = await page.textContent('body');
    if (orgText?.includes('Select an organization')) {
      console.log('\n⚠️  No organization selected. Selecting one...');
      // Try to select an organization from sidebar if available
      const orgButton = await page.$('button:has-text("TechFlow")');
      if (orgButton) {
        await orgButton.click();
        await page.waitForTimeout(2000);
        console.log('   ✓ Organization selected');
      }
    }
    
    // 4. Open upload dialog
    console.log('\n3. Opening upload dialog...');
    const uploadButton = await page.$('button:has-text("Upload Files")');
    if (!uploadButton) {
      console.log('   ❌ Upload button not found!');
      console.log('   This might mean no organization is selected.');
      await browser.close();
      return;
    }
    
    await uploadButton.click();
    await page.waitForTimeout(1000);
    console.log('   ✓ Upload dialog opened');
    
    // 5. Upload file
    console.log('\n4. Uploading test file...');
    const fileInput = await page.$('input[type="file"]');
    if (fileInput) {
      await fileInput.setInputFiles(testFilePath);
      console.log('   ✓ File selected');
      
      // Wait for upload to process
      await page.waitForTimeout(3000);
      
      // Check for success or error messages
      const pageContent = await page.content();
      
      if (pageContent.includes('success') || pageContent.includes('Success')) {
        console.log('   ✅ Upload successful!');
      } else if (pageContent.includes('error') || pageContent.includes('Error')) {
        console.log('   ❌ Upload failed!');
        
        // Try to get error details
        const errorElement = await page.$('.text-red-500, .text-red-600, [class*="error"]');
        if (errorElement) {
          const errorText = await errorElement.textContent();
          console.log('   Error message:', errorText);
        }
      } else {
        console.log('   ⚠️  Upload status unclear');
      }
      
      // Take screenshot
      await page.screenshot({ 
        path: 'screenshots/upload-test-result.png',
        fullPage: true 
      });
      console.log('   📸 Screenshot saved: screenshots/upload-test-result.png');
      
    } else {
      console.log('   ❌ File input not found!');
    }
    
    // 6. Check if file appears in list
    console.log('\n5. Checking if file appears in assets list...');
    await page.waitForTimeout(2000);
    
    // Close upload dialog if still open
    const closeButton = await page.$('button:has-text("✕")');
    if (closeButton) {
      await closeButton.click();
      await page.waitForTimeout(1000);
    }
    
    // Check for the uploaded file
    const assetsContent = await page.content();
    if (assetsContent.includes('test-upload.txt')) {
      console.log('   ✅ File appears in assets list!');
    } else {
      console.log('   ⚠️  File not visible in assets list yet');
      console.log('   (It may take a moment to appear, or there might be an issue)');
    }
    
  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
  } finally {
    // Clean up
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
      console.log('\n✓ Cleaned up test file');
    }
    
    console.log('\n📊 Test Summary:');
    console.log('1. Check screenshots/upload-test-result.png for visual confirmation');
    console.log('2. Check browser console for any errors (F12)');
    console.log('3. Check server logs in terminal for backend errors');
    
    // Keep browser open for inspection
    console.log('\n⏸️  Browser will stay open for 10 seconds for inspection...');
    await page.waitForTimeout(10000);
    
    await browser.close();
  }
}

// Run the test
testAssetUpload().catch(console.error);