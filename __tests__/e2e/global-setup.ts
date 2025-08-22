import { chromium, FullConfig } from '@playwright/test'
import { testDb } from '../../tests/utils/test-database'
import { UserFactory, OrganizationFactory, VaultFactory } from '../factories'
import path from 'path'
import fs from 'fs'

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting E2E test environment setup...')
  
  try {
    // Initialize test database
    console.log('📊 Setting up test database...')
    await testDb.setup()
    
    // Create test users with different roles
    console.log('👥 Creating test users...')
    const adminUser = await testDb.createUser(UserFactory.buildAdmin({
      email: 'admin@e2e-test.com',
      full_name: 'E2E Admin User',
    }))
    
    const directorUser = await testDb.createUser(UserFactory.buildDirector({
      email: 'director@e2e-test.com',
      full_name: 'E2E Director User',
    }))
    
    const viewerUser = await testDb.createUser(UserFactory.buildViewer({
      email: 'viewer@e2e-test.com',
      full_name: 'E2E Viewer User',
    }))
    
    // Create test organizations
    console.log('🏢 Creating test organizations...')
    const testOrg = await testDb.createOrganization({
      created_by: adminUser.id,
      name: 'E2E Test Organization',
      slug: 'e2e-test-org',
      description: 'Organization for E2E testing',
    })
    
    // Add users to organization
    await testDb.addOrganizationMember(testOrg.id, directorUser.id, 'member')
    await testDb.addOrganizationMember(testOrg.id, viewerUser.id, 'member')
    
    // Create test vaults
    console.log('🗃️ Creating test vaults...')
    const activeVault = await testDb.createVault({
      organization_id: testOrg.id,
      created_by: adminUser.id,
      name: 'E2E Test Vault - Active',
      status: 'processing',
      priority: 'high',
      meeting_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })
    
    const draftVault = await testDb.createVault({
      organization_id: testOrg.id,
      created_by: adminUser.id,
      name: 'E2E Test Vault - Draft',
      status: 'processing',
      priority: 'medium',
    })
    
    // Create test assets
    console.log('📄 Creating test assets...')
    const testAsset1 = await testDb.createAsset({
      organization_id: testOrg.id,
      uploaded_by: adminUser.id,
      title: 'E2E Financial Report',
      file_name: 'e2e-financial-report.pdf',
      processing_status: 'ready',
    })
    
    const testAsset2 = await testDb.createAsset({
      organization_id: testOrg.id,
      uploaded_by: adminUser.id,
      title: 'E2E Strategic Plan',
      file_name: 'e2e-strategic-plan.docx',
      processing_status: 'ready',
    })
    
    // Associate assets with vaults
    await (testDb as any).supabase
      .from('vault_assets')
      .insert([
        { vault_id: activeVault.id, asset_id: testAsset1.id, added_by_user_id: adminUser.id, organization_id: testOrg.id },
        { vault_id: activeVault.id, asset_id: testAsset2.id, added_by_user_id: adminUser.id, organization_id: testOrg.id },
        { vault_id: draftVault.id, asset_id: testAsset1.id, added_by_user_id: adminUser.id, organization_id: testOrg.id },
      ])
    
    // Set up authentication states for different user types
    console.log('🔐 Setting up authentication states...')
    const browser = await chromium.launch()
    
    // Ensure auth directory exists
    const authDir = path.resolve('test-results/auth')
    if (!fs.existsSync(authDir)) {
      fs.mkdirSync(authDir, { recursive: true })
    }
    
    // Admin user authentication
    const adminContext = await browser.newContext()
    const adminPage = await adminContext.newPage()
    
    await adminPage.goto('/auth/signin')
    await adminPage.fill('[data-testid="email-input"]', 'admin@e2e-test.com')
    await adminPage.fill('[data-testid="password-input"]', 'test-password-123')
    await adminPage.click('[data-testid="signin-button"]')
    await adminPage.waitForURL('/dashboard')
    
    // Save admin auth state
    await adminContext.storageState({ path: 'test-results/auth/admin-user.json' })
    await adminContext.close()
    
    // Director user authentication
    const directorContext = await browser.newContext()
    const directorPage = await directorContext.newPage()
    
    await directorPage.goto('/auth/signin')
    await directorPage.fill('[data-testid="email-input"]', 'director@e2e-test.com')
    await directorPage.fill('[data-testid="password-input"]', 'test-password-123')
    await directorPage.click('[data-testid="signin-button"]')
    await directorPage.waitForURL('/dashboard')
    
    // Save director auth state
    await directorContext.storageState({ path: 'test-results/auth/director-user.json' })
    await directorContext.close()
    
    // Viewer user authentication
    const viewerContext = await browser.newContext()
    const viewerPage = await viewerContext.newPage()
    
    await viewerPage.goto('/auth/signin')
    await viewerPage.fill('[data-testid="email-input"]', 'viewer@e2e-test.com')
    await viewerPage.fill('[data-testid="password-input"]', 'test-password-123')
    await viewerPage.click('[data-testid="signin-button"]')
    await viewerPage.waitForURL('/dashboard')
    
    // Save viewer auth state
    await viewerContext.storageState({ path: 'test-results/auth/viewer-user.json' })
    await viewerContext.close()
    
    await browser.close()
    
    // Store test data IDs for use in tests
    const testData = {
      users: {
        admin: { id: adminUser.id, email: 'admin@e2e-test.com' },
        director: { id: directorUser.id, email: 'director@e2e-test.com' },
        viewer: { id: viewerUser.id, email: 'viewer@e2e-test.com' },
      },
      organization: { id: testOrg.id, name: testOrg.name, slug: testOrg.slug },
      vaults: {
        active: { id: activeVault.id, name: activeVault.name },
        draft: { id: draftVault.id, name: draftVault.name },
      },
      assets: {
        financial: { id: testAsset1.id, title: testAsset1.title },
        strategic: { id: testAsset2.id, title: testAsset2.title },
      },
    }
    
    // Save test data for use in tests
    fs.writeFileSync(
      'test-results/test-data.json',
      JSON.stringify(testData, null, 2)
    )
    
    console.log('✅ E2E test environment setup completed successfully!')
    console.log(`📊 Test data saved to: test-results/test-data.json`)
    
  } catch (error) {
    console.error('❌ E2E setup failed:', error)
    throw error
  }
}

export default globalSetup