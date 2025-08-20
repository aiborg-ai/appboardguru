const { createClient } = require('@supabase/supabase-js')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

async function seedTestData() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  try {
    console.log('🏢 Creating test organizations...')
    
    // Use existing user ID
    const existingUserId = 'e8698725-6e36-4b8a-917a-c0fa852e7034'
    
    // Create 4 test organizations with proper UUIDs
    const organizations = [
      {
        id: '11111111-1111-1111-1111-111111111111',
        name: 'TechCorp Industries',
        slug: 'techcorp-industries',
        description: 'Leading technology company specializing in enterprise software solutions.',
        logo_url: '/logos/techcorp.png',
        website: 'https://www.techcorp.com',
        industry: 'Technology',
        organization_size: 'large',
        created_by: existingUserId
      },
      {
        id: '22222222-2222-2222-2222-222222222222',
        name: 'Global Finance Ltd',
        slug: 'global-finance-ltd',
        description: 'International financial services and investment management company.',
        logo_url: '/logos/globalfinance.png',
        website: 'https://www.globalfinance.com',
        industry: 'Financial Services',
        organization_size: 'large',
        created_by: existingUserId
      },
      {
        id: '33333333-3333-3333-3333-333333333333',
        name: 'Healthcare Partners',
        slug: 'healthcare-partners',
        description: 'Comprehensive healthcare network providing medical services and research.',
        logo_url: '/logos/healthcare.png',
        website: 'https://www.healthcarepartners.org',
        industry: 'Healthcare',
        organization_size: 'medium',
        created_by: existingUserId
      },
      {
        id: '44444444-4444-4444-4444-444444444444',
        name: 'Education Foundation',
        slug: 'education-foundation',
        description: 'Non-profit organization dedicated to advancing educational opportunities.',
        logo_url: '/logos/education.png',
        website: 'https://www.educationfoundation.org',
        industry: 'Education',
        organization_size: 'small',
        created_by: existingUserId
      }
    ]

    const { error: orgError } = await supabase
      .from('organizations')
      .upsert(organizations, { onConflict: 'slug' })

    if (orgError) {
      console.error('Error creating organizations:', orgError)
      return
    }

    console.log('✅ Organizations created successfully!')

    console.log('📋 Skipping vaults creation (schema not available)...')
    console.log('ℹ️  Note: Vault tables need to be created manually in Supabase dashboard')

    console.log('📄 Creating test assets...')

    // Create test assets (with required file_path)
    const assets = [
      {
        id: 'eeeeeeee-ffff-1111-2222-333333333333',
        title: 'Q4 2024 Financial Report',
        file_name: 'techcorp-q4-2024-financial-report.pdf',
        original_file_name: 'TechCorp Q4 2024 Financial Report.pdf',
        file_path: '/uploads/techcorp/techcorp-q4-2024-financial-report.pdf',
        file_size: 2500000,
        file_type: 'pdf',
        mime_type: 'application/pdf',
        category: 'financial',
        owner_id: existingUserId
      },
      {
        id: 'ffffffff-1111-2222-3333-444444444444',
        title: 'Annual Audit Summary 2024',
        file_name: 'global-finance-audit-summary-2024.pdf',
        original_file_name: 'Global Finance Audit Summary 2024.pdf',
        file_path: '/uploads/globalfinance/global-finance-audit-summary-2024.pdf',
        file_size: 1800000,
        file_type: 'pdf',
        mime_type: 'application/pdf',
        category: 'audit',
        owner_id: existingUserId
      },
      {
        id: '11111111-2222-3333-4444-555555555555',
        title: 'Healthcare Expansion Strategic Plan',
        file_name: 'healthcare-expansion-plan-2025.pdf',
        original_file_name: 'Healthcare Partners Expansion Plan 2025.pdf',
        file_path: '/uploads/healthcare/healthcare-expansion-plan-2025.pdf',
        file_size: 3200000,
        file_type: 'pdf',
        mime_type: 'application/pdf',
        category: 'strategic',
        owner_id: existingUserId
      }
    ]

    const { error: assetError } = await supabase
      .from('assets')
      .upsert(assets, { onConflict: 'id' })

    if (assetError) {
      console.error('Error creating assets:', assetError)
      return
    }

    console.log('✅ Assets created successfully!')

    console.log('🔗 Skipping vault-asset relationships (vault tables not available)...')

    console.log('🎉 Basic test data created successfully!')
    console.log('')
    console.log('✅ Test organizations created:')
    console.log('  - TechCorp Industries')
    console.log('  - Global Finance Ltd')
    console.log('  - Healthcare Partners') 
    console.log('  - Education Foundation')
    console.log('')
    console.log('✅ Test assets created:')
    console.log('  - Q4 2024 Financial Report (TechCorp)')
    console.log('  - Annual Audit Summary 2024 (Global Finance)')
    console.log('  - Healthcare Expansion Strategic Plan (Healthcare Partners)')
    console.log('')
    console.log('⚠️  Note: Vault tables need to be created manually in Supabase dashboard')
    console.log('   Once vault schema is created, run the seed script again to create vault relationships')

  } catch (error) {
    console.error('Error seeding test data:', error)
  }
}

seedTestData()