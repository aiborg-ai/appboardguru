import { chromium } from 'playwright';
import fs from 'fs';

async function testSwitchOrganization() {
  console.log('Starting organization switch test...');
  
  const browser = await chromium.launch({ 
    headless: false,
    executablePath: '/home/vik/.cache/ms-playwright/chromium-1187/chrome-linux/chrome'
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Navigate to login
    console.log('1. Logging in...');
    await page.goto('http://localhost:3000/auth/signin', { waitUntil: 'networkidle' });
    await page.fill('input[placeholder*="email" i]', 'test.director@appboardguru.com');
    await page.fill('input[type="password"]', 'TestDirector123!');
    await page.click('button:has-text("Sign In")');
    
    // Wait for dashboard
    await page.waitForURL('**/dashboard**', { timeout: 10000 });
    await page.waitForTimeout(3000);
    console.log('   ✓ Logged in successfully');
    
    // Click on the organization dropdown
    console.log('2. Looking for organization switcher...');
    
    // The organization name appears to be in the top right
    const orgDropdown = await page.$('button:has-text("TechCorp Solutions"), [data-testid*="org"], div:has-text("TechCorp Solutions")');
    
    if (orgDropdown) {
      console.log('   Found organization dropdown, clicking...');
      await orgDropdown.click();
      await page.waitForTimeout(1000);
      
      // Take screenshot of dropdown
      await page.screenshot({ path: 'screenshots/org-01-dropdown.png' });
      console.log('   Organization dropdown screenshot saved');
      
      // Look for Fortune 500 Companies in the dropdown
      const fortune500 = await page.$('*:has-text("Fortune 500 Companies")');
      
      if (fortune500) {
        console.log('3. Found "Fortune 500 Companies", switching...');
        await fortune500.click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3000);
        
        // Take screenshot after switching
        await page.screenshot({ path: 'screenshots/org-02-after-switch.png' });
        console.log('   Screenshot after org switch saved');
      } else {
        console.log('   ✗ Could not find "Fortune 500 Companies" in dropdown');
        
        // Try navigating to organizations page
        console.log('3. Navigating to Organizations page...');
        await page.goto('http://localhost:3000/dashboard/organizations', { waitUntil: 'networkidle' });
        await page.waitForTimeout(2000);
        
        await page.screenshot({ path: 'screenshots/org-03-organizations-page.png', fullPage: true });
        console.log('   Organizations page screenshot saved');
        
        // Check if Fortune 500 Companies is listed
        const pageContent = await page.content();
        if (pageContent.includes('Fortune 500 Companies')) {
          console.log('   ✓ Found "Fortune 500 Companies" on organizations page');
          
          // Try to click on it
          const orgCard = await page.$('*:has-text("Fortune 500 Companies")');
          if (orgCard) {
            await orgCard.click();
            await page.waitForTimeout(3000);
            console.log('   Clicked on Fortune 500 Companies organization');
          }
        } else {
          console.log('   ✗ "Fortune 500 Companies" not found on organizations page');
        }
      }
    } else {
      console.log('   ✗ Could not find organization dropdown');
      console.log('   Looking for alternative organization selector...');
      
      // Take a screenshot to see the current state
      await page.screenshot({ path: 'screenshots/org-00-current-state.png', fullPage: true });
    }
    
    // Now check vaults again
    console.log('\n4. Navigating to vaults page...');
    await page.goto('http://localhost:3000/dashboard/vaults', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    
    await page.screenshot({ path: 'screenshots/org-04-vaults-after.png', fullPage: true });
    console.log('   Vaults page screenshot saved');
    
    // Check for 2023 Annual Reports vault
    const vaultContent = await page.content();
    if (vaultContent.includes('2023 Annual Reports')) {
      console.log('   ✓ Found "2023 Annual Reports" vault!');
      
      // Click on the vault
      const vaultCard = await page.$('*:has-text("2023 Annual Reports")');
      if (vaultCard) {
        console.log('5. Clicking on "2023 Annual Reports" vault...');
        await vaultCard.click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3000);
        
        await page.screenshot({ path: 'screenshots/org-05-vault-contents.png', fullPage: true });
        console.log('   Vault contents screenshot saved');
        
        // Check for PDFs
        const vaultDetailsContent = await page.content();
        const reports = ['Amazon', 'Apple', 'Berkshire', 'JPMorgan', 'Microsoft', 'Tesla'];
        
        console.log('\n6. Checking for annual report PDFs:');
        for (const report of reports) {
          if (vaultDetailsContent.includes(report)) {
            console.log(`   ✓ ${report} report found`);
          } else {
            console.log(`   ✗ ${report} report not found`);
          }
        }
      }
    } else {
      console.log('   ✗ "2023 Annual Reports" vault not found');
      
      // Check what organization we're in
      const currentOrg = await page.$eval('button:has-text("Solutions"), button:has-text("Companies"), [aria-label*="organization"]', 
        el => el?.textContent?.trim()
      ).catch(() => null);
      
      console.log(`   Current organization shown: ${currentOrg || 'Unknown'}`);
    }
    
  } catch (error) {
    console.error('Error during test:', error);
    await page.screenshot({ path: 'screenshots/org-error.png', fullPage: true });
  } finally {
    await browser.close();
    console.log('\nBrowser closed');
  }
}

// Create screenshots directory
if (!fs.existsSync('screenshots')) {
  fs.mkdirSync('screenshots');
}

testSwitchOrganization().catch(console.error);