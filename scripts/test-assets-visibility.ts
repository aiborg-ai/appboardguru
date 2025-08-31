import { chromium } from 'playwright';

async function testAssetsVisibility() {
  console.log('Starting Playwright test...');
  
  const browser = await chromium.launch({ 
    headless: false,
    executablePath: '/home/vik/.cache/ms-playwright/chromium-1187/chrome-linux/chrome'
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Navigate to the application
    console.log('Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    
    // Take screenshot of initial page
    await page.screenshot({ path: 'screenshots/01-initial-page.png' });
    console.log('Screenshot saved: 01-initial-page.png');
    
    // Check if we're on login page or dashboard
    const url = page.url();
    console.log('Current URL:', url);
    
    // Look for Sign In button/link on landing page
    const signInLink = await page.$('a:has-text("Sign In"), button:has-text("Sign In")');
    if (signInLink) {
      console.log('Found Sign In link, clicking...');
      await signInLink.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
    } else if (!url.includes('signin') && !url.includes('login')) {
      // If we can't find sign in button, navigate directly
      console.log('Navigating directly to /signin...');
      await page.goto('http://localhost:3000/signin', { waitUntil: 'networkidle' });
    }
    
    // Take screenshot of login page
    await page.screenshot({ path: 'screenshots/02-login-page.png' });
    console.log('Screenshot saved: 02-login-page.png');
    
    // Fill login form
    console.log('Filling login form...');
    
    // Try different possible selectors for email/password fields
    const emailSelectors = [
      'input[type="email"]',
      'input[name="email"]',
      'input[placeholder*="email" i]',
      '#email',
      'input[id*="email" i]'
    ];
    
    const passwordSelectors = [
      'input[type="password"]',
      'input[name="password"]',
      'input[placeholder*="password" i]',
      '#password',
      'input[id*="password" i]'
    ];
    
    let emailField = null;
    let passwordField = null;
    
    for (const selector of emailSelectors) {
      emailField = await page.$(selector);
      if (emailField) break;
    }
    
    for (const selector of passwordSelectors) {
      passwordField = await page.$(selector);
      if (passwordField) break;
    }
    
    if (emailField && passwordField) {
      await emailField.fill('test.director@appboardguru.com');
      await passwordField.fill('TestDirector123!');
      
      // Take screenshot before login
      await page.screenshot({ path: 'screenshots/03-login-filled.png' });
      console.log('Screenshot saved: 03-login-filled.png');
      
      // Find and click login button
      const loginButtonSelectors = [
        'button[type="submit"]',
        'button:has-text("Sign In")',
        'button:has-text("Login")',
        'button:has-text("Log In")',
        'input[type="submit"]'
      ];
      
      let loginButton = null;
      for (const selector of loginButtonSelectors) {
        try {
          loginButton = await page.$(selector);
          if (loginButton) break;
        } catch (e) {
          // Continue trying
        }
      }
      
      if (loginButton) {
        await loginButton.click();
        console.log('Clicked login button, waiting for navigation...');
        
        // Wait for navigation or URL change  
        try {
          await page.waitForURL('**/dashboard**', { timeout: 10000 });
          console.log('Successfully navigated to dashboard');
        } catch (e) {
          console.log('Waiting for any navigation...');
          await page.waitForLoadState('networkidle');
          await page.waitForTimeout(5000); // Give it more time to load
        }
        
        // Take screenshot after login
        await page.screenshot({ path: 'screenshots/04-after-login.png' });
        console.log('Screenshot saved: 04-after-login.png');
        console.log('Current URL after login:', page.url());
        
        // Try to find assets link/button
        const assetsSelectors = [
          'a:has-text("Assets")',
          'button:has-text("Assets")',
          'a[href*="assets"]',
          'nav a:has-text("Assets")',
          '[data-testid*="assets"]',
          'span:has-text("Assets")',
          'div:has-text("Assets")'
        ];
        
        let assetsLink = null;
        for (const selector of assetsSelectors) {
          try {
            assetsLink = await page.$(selector);
            if (assetsLink) {
              console.log(`Found assets link with selector: ${selector}`);
              break;
            }
          } catch (e) {
            // Continue trying
          }
        }
        
        if (assetsLink) {
          await assetsLink.click();
          await page.waitForLoadState('networkidle');
          await page.waitForTimeout(2000);
          
          // Take screenshot of assets page
          await page.screenshot({ path: 'screenshots/05-assets-page.png', fullPage: true });
          console.log('Screenshot saved: 05-assets-page.png');
          console.log('Current URL on assets page:', page.url());
          
          // Look for annual reports
          const pageContent = await page.content();
          const hasAnnualReports = pageContent.includes('Annual Report') || 
                                   pageContent.includes('annual-report') ||
                                   pageContent.includes('Amazon') ||
                                   pageContent.includes('Tesla') ||
                                   pageContent.includes('JPMorgan');
          
          if (hasAnnualReports) {
            console.log('✅ Annual reports found on the page!');
            
            // Get all text containing "Annual Report"
            const reportElements = await page.$$('*:has-text("Annual Report")');
            console.log(`Found ${reportElements.length} elements with "Annual Report" text`);
          } else {
            console.log('❌ Annual reports NOT found on the page');
            console.log('Page title:', await page.title());
            
            // Check if there's a vault or organization selector
            const vaultSelectors = [
              'select',
              'button:has-text("Vault")',
              'button:has-text("Organization")',
              '*:has-text("2023 Annual Reports")',
              '*:has-text("Fortune 500")'
            ];
            
            for (const selector of vaultSelectors) {
              const element = await page.$(selector);
              if (element) {
                console.log(`Found potential vault/org selector: ${selector}`);
              }
            }
          }
        } else {
          console.log('Could not find assets link on the page');
          
          // Take a full page screenshot to see what's available
          await page.screenshot({ path: 'screenshots/dashboard-full.png', fullPage: true });
          console.log('Full dashboard screenshot saved: dashboard-full.png');
        }
      } else {
        console.log('Could not find login button');
      }
    } else {
      console.log('Could not find email or password fields');
      console.log('Email field found:', !!emailField);
      console.log('Password field found:', !!passwordField);
    }
    
  } catch (error) {
    console.error('Error during test:', error);
    await page.screenshot({ path: 'screenshots/error-state.png', fullPage: true });
  } finally {
    await browser.close();
    console.log('Browser closed');
  }
}

// Create screenshots directory
import fs from 'fs';
if (!fs.existsSync('screenshots')) {
  fs.mkdirSync('screenshots');
}

testAssetsVisibility().catch(console.error);