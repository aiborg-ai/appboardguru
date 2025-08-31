import { chromium } from 'playwright';
import fs from 'fs';

async function testFreshLogin() {
  console.log('Starting fresh login test...');
  
  const browser = await chromium.launch({ 
    headless: false,
    executablePath: '/home/vik/.cache/ms-playwright/chromium-1187/chrome-linux/chrome'
  });
  
  // Create a fresh context with no cache
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 1280, height: 720 }
  });
  
  const page = await context.newPage();
  
  try {
    // Clear all cookies and storage first
    await context.clearCookies();
    
    // Navigate to the app
    console.log('1. Navigating to app...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    // Sign out if already logged in
    const signOutButton = await page.$('button:has-text("Sign Out")');
    if (signOutButton) {
      console.log('   Found existing session, signing out...');
      await signOutButton.click();
      await page.waitForTimeout(2000);
    }
    
    // Navigate to sign in
    console.log('2. Navigating to sign in...');
    const signInLink = await page.$('a:has-text("Sign In")');
    if (signInLink) {
      await signInLink.click();
    } else {
      await page.goto('http://localhost:3000/auth/signin');
    }
    await page.waitForLoadState('networkidle');
    
    // Login
    console.log('3. Logging in as test.director...');
    await page.fill('input[placeholder*="email" i]', 'test.director@appboardguru.com');
    await page.fill('input[type="password"]', 'TestDirector123!');
    await page.click('button:has-text("Sign In")');
    
    // Wait for dashboard
    try {
      await page.waitForURL('**/dashboard**', { timeout: 10000 });
      console.log('   ✓ Successfully logged in to dashboard');
    } catch (e) {
      console.log('   Waiting for navigation...');
      await page.waitForLoadState('networkidle');
    }
    
    await page.waitForTimeout(5000); // Give it time to load data
    
    // Take screenshot of dashboard
    await page.screenshot({ path: 'screenshots/fresh-01-dashboard.png', fullPage: true });
    console.log('   Dashboard screenshot saved');
    
    // Go to organizations page
    console.log('\n4. Navigating to Organizations page...');
    await page.goto('http://localhost:3000/dashboard/organizations', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    
    await page.screenshot({ path: 'screenshots/fresh-02-organizations.png', fullPage: true });
    console.log('   Organizations page screenshot saved');
    
    // Count organizations
    const orgCards = await page.$$('div[class*="organization"], article[class*="organization"], div:has(> h3)');
    console.log(`   Found ${orgCards.length} organization cards`);
    
    // Get all organization names
    const orgNames = await page.$$eval('h3, h2', elements => 
      elements.map(el => el.textContent?.trim()).filter(Boolean)
    );
    
    console.log('\n5. Organizations found:');
    orgNames.forEach(name => {
      console.log(`   - ${name}`);
    });
    
    // Look specifically for Fortune 500
    const pageContent = await page.content();
    if (pageContent.includes('Fortune 500')) {
      console.log('\n   ✓ "Fortune 500 Companies" found in page content!');
      
      // Try to find and click it
      const fortune500Card = await page.$('*:has-text("Fortune 500")');
      if (fortune500Card) {
        console.log('6. Clicking on Fortune 500 Companies...');
        await fortune500Card.click();
        await page.waitForTimeout(3000);
        
        await page.screenshot({ path: 'screenshots/fresh-03-after-org-click.png', fullPage: true });
        console.log('   Screenshot after clicking org saved');
      }
    } else {
      console.log('\n   ✗ "Fortune 500 Companies" NOT found in page');
      
      // Check localStorage and sessionStorage
      const storage = await page.evaluate(() => {
        return {
          localStorage: Object.keys(localStorage),
          sessionStorage: Object.keys(sessionStorage)
        };
      });
      
      console.log('\n7. Browser storage keys:');
      console.log('   localStorage:', storage.localStorage);
      console.log('   sessionStorage:', storage.sessionStorage);
    }
    
    // Try navigating directly to vaults
    console.log('\n8. Navigating directly to vaults...');
    await page.goto('http://localhost:3000/dashboard/vaults', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    
    await page.screenshot({ path: 'screenshots/fresh-04-vaults.png', fullPage: true });
    console.log('   Vaults page screenshot saved');
    
    // Check what organization context we're in
    const currentOrgElement = await page.$('button[class*="org"], div[class*="org"], span[class*="org"]');
    if (currentOrgElement) {
      const currentOrg = await currentOrgElement.textContent();
      console.log(`   Current organization context: ${currentOrg}`);
    }
    
  } catch (error) {
    console.error('Error during test:', error);
    await page.screenshot({ path: 'screenshots/fresh-error.png', fullPage: true });
  } finally {
    await browser.close();
    console.log('\nBrowser closed');
  }
}

// Create screenshots directory
if (!fs.existsSync('screenshots')) {
  fs.mkdirSync('screenshots');
}

testFreshLogin().catch(console.error);