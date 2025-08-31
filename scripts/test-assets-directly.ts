import { chromium } from 'playwright';
import fs from 'fs';

async function testAssetsDirectly() {
  console.log('Starting direct assets test...');
  
  const browser = await chromium.launch({ 
    headless: false,
    executablePath: '/home/vik/.cache/ms-playwright/chromium-1187/chrome-linux/chrome'
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Navigate to the application
    console.log('1. Navigating to login page...');
    await page.goto('http://localhost:3000/auth/signin', { waitUntil: 'networkidle' });
    
    // Fill login form
    console.log('2. Filling login form...');
    await page.fill('input[placeholder*="email" i]', 'test.director@appboardguru.com');
    await page.fill('input[type="password"]', 'TestDirector123!');
    
    // Take screenshot before login
    await page.screenshot({ path: 'screenshots/test-01-login.png' });
    
    // Click login button
    console.log('3. Clicking Sign In button...');
    await page.click('button:has-text("Sign In")');
    
    // Wait for dashboard to load
    console.log('4. Waiting for dashboard to load...');
    try {
      await page.waitForURL('**/dashboard**', { timeout: 10000 });
      console.log('   ✓ Reached dashboard');
    } catch (e) {
      console.log('   - Waiting for navigation...');
      await page.waitForLoadState('networkidle');
    }
    
    // Wait for loading to complete
    await page.waitForTimeout(5000);
    
    // Take screenshot of dashboard
    await page.screenshot({ path: 'screenshots/test-02-dashboard.png', fullPage: true });
    console.log('   Dashboard screenshot saved');
    
    // Try to navigate directly to vaults page
    console.log('5. Navigating directly to vaults page...');
    await page.goto('http://localhost:3000/dashboard/vaults', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    
    // Take screenshot of vaults page
    await page.screenshot({ path: 'screenshots/test-03-vaults.png', fullPage: true });
    console.log('   Vaults page screenshot saved');
    
    // Check if we can see the vault "2023 Annual Reports"
    const pageContent = await page.content();
    const hasVault = pageContent.includes('2023 Annual Reports') || 
                     pageContent.includes('Fortune 500 Companies');
    
    if (hasVault) {
      console.log('   ✓ Found "2023 Annual Reports" vault!');
      
      // Try to click on the vault
      const vaultLink = await page.$('*:has-text("2023 Annual Reports")');
      if (vaultLink) {
        console.log('6. Clicking on "2023 Annual Reports" vault...');
        await vaultLink.click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3000);
        
        // Take screenshot of vault details
        await page.screenshot({ path: 'screenshots/test-04-vault-details.png', fullPage: true });
        console.log('   Vault details screenshot saved');
        
        // Check for annual reports
        const vaultContent = await page.content();
        const reports = [
          'Amazon',
          'Apple', 
          'Berkshire',
          'JPMorgan',
          'Microsoft',
          'Tesla'
        ];
        
        console.log('\n7. Checking for annual reports:');
        for (const report of reports) {
          if (vaultContent.includes(report)) {
            console.log(`   ✓ Found ${report} report`);
          } else {
            console.log(`   ✗ ${report} report NOT found`);
          }
        }
      }
    } else {
      console.log('   ✗ Could not find "2023 Annual Reports" vault');
      
      // Try assets page directly
      console.log('\n6. Trying assets page directly...');
      await page.goto('http://localhost:3000/dashboard/assets', { waitUntil: 'networkidle' });
      await page.waitForTimeout(3000);
      
      // Take screenshot of assets page
      await page.screenshot({ path: 'screenshots/test-05-assets.png', fullPage: true });
      console.log('   Assets page screenshot saved');
      
      // Check for any assets
      const assetsContent = await page.content();
      if (assetsContent.includes('Annual Report') || assetsContent.includes('.pdf')) {
        console.log('   ✓ Found assets on the assets page');
      } else {
        console.log('   ✗ No assets found on the assets page');
      }
    }
    
    // Get all navigation links to understand the structure
    console.log('\n8. Available navigation links:');
    const navLinks = await page.$$eval('nav a, aside a', links => 
      links.map(link => ({
        text: link.textContent?.trim(),
        href: link.getAttribute('href')
      }))
    );
    
    for (const link of navLinks) {
      if (link.text && link.href) {
        console.log(`   - ${link.text}: ${link.href}`);
      }
    }
    
  } catch (error) {
    console.error('Error during test:', error);
    await page.screenshot({ path: 'screenshots/test-error.png', fullPage: true });
  } finally {
    await browser.close();
    console.log('\nBrowser closed');
  }
}

// Create screenshots directory
if (!fs.existsSync('screenshots')) {
  fs.mkdirSync('screenshots');
}

testAssetsDirectly().catch(console.error);