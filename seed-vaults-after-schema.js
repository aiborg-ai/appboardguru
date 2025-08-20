const { createClient } = require('@supabase/supabase-js')

require('dotenv').config({ path: '.env.local' })

async function seedVaultData() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const existingUserId = 'e8698725-6e36-4b8a-917a-c0fa852e7034'

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  try {
    console.log('🏗️ Creating test vaults...')

    // Create test vaults
    const vaults = [
      {
        id: 'aaaaaaaa-bbbb-cccc-dddd-111111111111',
        organization_id: '11111111-1111-1111-1111-111111111111',
        name: 'TechCorp Board Meeting - January 2025',
        description: 'Quarterly strategic review and budget planning session',
        meeting_date: '2025-01-15T14:00:00Z',
        location: 'San Francisco HQ - Conference Room A',
        status: 'active',
        priority: 'high',
        category: 'board_meeting',
        created_by: existingUserId
      },
      {
        id: 'bbbbbbbb-cccc-dddd-eeee-222222222222',
        organization_id: '22222222-2222-2222-2222-222222222222',
        name: 'Global Finance Annual Audit Review',
        description: 'Year-end financial review and audit committee meeting',
        meeting_date: '2025-02-10T09:00:00Z',
        location: 'London Office - Boardroom',
        status: 'draft',
        priority: 'high',
        category: 'audit_committee',
        created_by: existingUserId
      },
      {
        id: 'cccccccc-dddd-eeee-ffff-333333333333',
        organization_id: '33333333-3333-3333-3333-333333333333',
        name: 'Healthcare Partners Expansion Strategy',
        description: 'Strategic planning for new clinic locations and partnerships',
        meeting_date: '2025-01-25T11:00:00Z',
        location: 'Virtual Meeting',
        status: 'active',
        priority: 'medium',
        category: 'strategic_planning',
        created_by: existingUserId
      }
    ]

    const { error: vaultError } = await supabase
      .from('vaults')
      .upsert(vaults, { onConflict: 'id' })

    if (vaultError) {
      console.error('Error creating vaults:', vaultError)
      return
    }

    console.log('✅ Vaults created successfully!')

    console.log('👥 Creating vault memberships...')

    // Add user as owner to all vaults
    const memberships = vaults.map(vault => ({
      vault_id: vault.id,
      user_id: existingUserId,
      organization_id: vault.organization_id,
      role: 'owner',
      status: 'active'
    }))

    const { error: memberError } = await supabase
      .from('vault_members')
      .upsert(memberships, { onConflict: 'vault_id,user_id' })

    if (memberError) {
      console.error('Error creating memberships:', memberError)
      return
    }

    console.log('✅ Vault memberships created!')

    console.log('🔗 Creating vault-asset relationships...')

    // Link assets to vaults
    const vaultAssets = [
      {
        vault_id: 'aaaaaaaa-bbbb-cccc-dddd-111111111111',
        asset_id: 'eeeeeeee-ffff-1111-2222-333333333333',
        organization_id: '11111111-1111-1111-1111-111111111111',
        added_by_user_id: existingUserId,
        folder_path: '/financial',
        display_order: 1,
        is_featured: true,
        is_required_reading: true
      },
      {
        vault_id: 'bbbbbbbb-cccc-dddd-eeee-222222222222',
        asset_id: 'ffffffff-1111-2222-3333-444444444444',
        organization_id: '22222222-2222-2222-2222-222222222222',
        added_by_user_id: existingUserId,
        folder_path: '/audit',
        display_order: 1,
        is_featured: true,
        is_required_reading: true
      },
      {
        vault_id: 'cccccccc-dddd-eeee-ffff-333333333333',
        asset_id: '11111111-2222-3333-4444-555555555555',
        organization_id: '33333333-3333-3333-3333-333333333333',
        added_by_user_id: existingUserId,
        folder_path: '/strategic',
        display_order: 1,
        is_featured: true,
        is_required_reading: true
      }
    ]

    const { error: vaultAssetError } = await supabase
      .from('vault_assets')
      .upsert(vaultAssets, { onConflict: 'vault_id,asset_id' })

    if (vaultAssetError) {
      console.error('Error linking vault assets:', vaultAssetError)
      return
    }

    console.log('✅ Vault-asset relationships created!')

    console.log('🎉 Complete vault system test data created!')
    console.log('')
    console.log('✅ Test vaults created:')
    console.log('  - TechCorp Board Meeting - January 2025')
    console.log('  - Global Finance Annual Audit Review')
    console.log('  - Healthcare Partners Expansion Strategy')
    console.log('')
    console.log('🚀 Ready to test the complete vault workflow!')

  } catch (error) {
    console.error('Error seeding vault data:', error)
  }
}

seedVaultData()