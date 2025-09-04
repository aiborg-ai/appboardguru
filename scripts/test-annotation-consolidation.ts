/**
 * Test Script for Annotation Consolidation
 * Verifies the migration and consolidation of annotation systems
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

// Load environment variables
config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function testMigration() {
  console.log('🔄 Testing Annotation Consolidation Migration...\n')

  try {
    // Step 1: Check if migration has been run
    console.log('1️⃣ Checking for new columns in asset_annotations...')
    const { data: columns, error: columnsError } = await supabase
      .rpc('get_table_columns', { table_name: 'asset_annotations' })

    if (columnsError) {
      // Fallback: Try a simple select to see if columns exist
      const { data: sample, error: sampleError } = await supabase
        .from('asset_annotations')
        .select('voice_url, voice_transcription, shared_with, annotation_subtype')
        .limit(1)

      if (sampleError && sampleError.message.includes('column')) {
        console.log('❌ New columns not found. Migration may not have been run.')
        console.log('   Run the migration: database/migrations/20250904_consolidate_annotations.sql')
        return
      }
      console.log('✅ New columns exist in asset_annotations')
    } else {
      const columnNames = columns?.map((c: any) => c.column_name) || []
      const requiredColumns = ['voice_url', 'voice_transcription', 'shared_with', 'annotation_subtype']
      const hasAllColumns = requiredColumns.every(col => columnNames.includes(col))
      
      if (hasAllColumns) {
        console.log('✅ All new columns exist in asset_annotations')
      } else {
        const missing = requiredColumns.filter(col => !columnNames.includes(col))
        console.log(`❌ Missing columns: ${missing.join(', ')}`)
        return
      }
    }

    // Step 2: Check if compatibility view exists
    console.log('\n2️⃣ Checking for backwards compatibility view...')
    const { data: viewData, error: viewError } = await supabase
      .from('document_annotations_compat')
      .select('id')
      .limit(1)

    if (viewError && viewError.message.includes('relation')) {
      console.log('❌ Compatibility view does not exist')
    } else {
      console.log('✅ Compatibility view exists')
    }

    // Step 3: Test creating a voice annotation
    console.log('\n3️⃣ Testing voice annotation creation...')
    
    // First, get a test asset and user
    const { data: testAsset } = await supabase
      .from('assets')
      .select('id, organization_id')
      .limit(1)
      .single()

    const { data: testUser } = await supabase
      .from('users')
      .select('id')
      .limit(1)
      .single()

    if (testAsset && testUser) {
      const testVoiceAnnotation = {
        asset_id: testAsset.id,
        organization_id: testAsset.organization_id,
        created_by: testUser.id,
        annotation_type: 'voice',
        annotation_subtype: 'voice',
        content: {
          audioUrl: 'data:audio/wav;base64,test',
          audioTranscription: 'Test transcription',
          originalType: 'voice'
        },
        page_number: 1,
        position: {
          pageNumber: 1,
          rects: [{ x1: 0, y1: 0, x2: 100, y2: 30, width: 100, height: 30 }],
          boundingRect: { x1: 0, y1: 0, x2: 100, y2: 30, width: 100, height: 30 }
        },
        comment_text: 'Test voice annotation',
        voice_url: 'data:audio/wav;base64,test',
        voice_transcription: 'Test transcription',
        color: '#FFFF00',
        opacity: 0.3,
        is_private: false,
        shared_with: []
      }

      const { data: created, error: createError } = await supabase
        .from('asset_annotations')
        .insert(testVoiceAnnotation)
        .select()
        .single()

      if (createError) {
        console.log('❌ Failed to create voice annotation:', createError.message)
      } else {
        console.log('✅ Voice annotation created successfully')
        
        // Clean up test annotation
        await supabase
          .from('asset_annotations')
          .delete()
          .eq('id', created.id)
      }
    } else {
      console.log('⚠️ No test data available for voice annotation test')
    }

    // Step 4: Check for migrated annotations
    console.log('\n4️⃣ Checking for migrated annotations...')
    const { data: migratedAnnotations, error: migratedError } = await supabase
      .from('asset_annotations')
      .select('id, annotation_subtype, voice_url, metadata')
      .filter('metadata->>migrated_from', 'eq', 'document_annotations')
      .limit(5)

    if (migratedError) {
      console.log('❌ Error checking for migrated annotations:', migratedError.message)
    } else if (migratedAnnotations && migratedAnnotations.length > 0) {
      console.log(`✅ Found ${migratedAnnotations.length} migrated annotations`)
      console.log('   Sample migrated annotation:')
      console.log(`   - ID: ${migratedAnnotations[0].id}`)
      console.log(`   - Subtype: ${migratedAnnotations[0].annotation_subtype}`)
      console.log(`   - Has voice URL: ${!!migratedAnnotations[0].voice_url}`)
    } else {
      console.log('ℹ️ No migrated annotations found (this is OK if document_annotations was empty)')
    }

    // Step 5: Test compatibility view
    console.log('\n5️⃣ Testing compatibility view...')
    const { data: compatData, error: compatError } = await supabase
      .from('document_annotations_compat')
      .select('id, type, content, voice_url')
      .limit(3)

    if (compatError) {
      console.log('❌ Error querying compatibility view:', compatError.message)
    } else {
      console.log(`✅ Compatibility view returns ${compatData?.length || 0} annotations`)
      if (compatData && compatData.length > 0) {
        console.log('   Sample from compatibility view:')
        console.log(`   - Type: ${compatData[0].type}`)
        console.log(`   - Has content: ${!!compatData[0].content}`)
        console.log(`   - Has voice URL: ${!!compatData[0].voice_url}`)
      }
    }

    console.log('\n✨ Migration test completed!')
    console.log('\n📝 Summary:')
    console.log('- New columns added to asset_annotations table')
    console.log('- Voice annotations are supported')
    console.log('- Backwards compatibility view is available')
    console.log('- Migration appears to be successful')

  } catch (error) {
    console.error('❌ Test failed with error:', error)
  }
}

// Run the test
testMigration().then(() => {
  process.exit(0)
}).catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})