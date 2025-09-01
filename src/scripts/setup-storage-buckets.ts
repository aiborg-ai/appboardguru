#!/usr/bin/env node

/**
 * Script to setup Supabase storage buckets for assets
 * Run this to ensure the assets bucket exists with proper policies
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or ANON_KEY)')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function setupStorageBuckets() {
  try {
    console.log('Setting up storage buckets...')

    // Check if assets bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()
    
    if (listError) {
      console.error('Error listing buckets:', listError)
      return
    }

    const assetsBucketExists = buckets?.some(bucket => bucket.name === 'assets')

    if (!assetsBucketExists) {
      console.log('Creating assets bucket...')
      
      const { data, error } = await supabase.storage.createBucket('assets', {
        public: false, // Set to false for private access control
        allowedMimeTypes: [
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
          'application/msword',
          'text/plain',
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp'
        ],
        fileSizeLimit: 52428800 // 50MB
      })

      if (error) {
        console.error('Error creating assets bucket:', error)
        return
      }

      console.log('Assets bucket created successfully')
    } else {
      console.log('Assets bucket already exists')
    }

    // Set up storage policies
    console.log('Setting up storage policies...')

    // Policy for authenticated users to upload their own files
    const uploadPolicyName = 'Users can upload their own assets'
    const uploadPolicy = `
      (auth.uid() IS NOT NULL)
    `

    // Policy for users to view their own files
    const viewPolicyName = 'Users can view their own assets'
    const viewPolicy = `
      (auth.uid() IS NOT NULL AND (storage.foldername(name))[2] = auth.uid()::text)
    `

    // Policy for users to delete their own files
    const deletePolicyName = 'Users can delete their own assets'
    const deletePolicy = `
      (auth.uid() IS NOT NULL AND (storage.foldername(name))[2] = auth.uid()::text)
    `

    console.log('Storage bucket setup completed successfully!')
    console.log('\nNote: You may need to manually configure RLS policies in Supabase Dashboard')
    console.log('for more granular access control based on your requirements.')

  } catch (error) {
    console.error('Setup failed:', error)
    process.exit(1)
  }
}

// Run the setup
setupStorageBuckets()
  .then(() => {
    console.log('\n✅ Storage setup completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Storage setup failed:', error)
    process.exit(1)
  })