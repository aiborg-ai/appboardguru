#!/usr/bin/env node

/**
 * Test script to verify organization seeding for test director account
 * Run with: npx tsx src/scripts/test-organization-seeding.ts
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkOrganizations() {
  console.log('🔍 Checking organizations for test director...\n');

  // First, check if the test director user exists
  const { data: users, error: userError } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', 'test.director@appboardguru.com');

  if (userError) {
    console.error('Error fetching user:', userError);
    return;
  }

  if (!users || users.length === 0) {
    console.log('⚠️  Test director user not found in profiles table');
    console.log('   Please ensure the user is properly created\n');
    return;
  }

  const userId = users[0].id;
  console.log('✓ Found test director user:', userId);
  console.log('  Email:', users[0].email);
  console.log('  Name:', users[0].full_name || 'Not set');
  console.log('');

  // Check organization memberships
  const { data: memberships, error: memberError } = await supabase
    .from('organization_members')
    .select(`
      role,
      status,
      is_primary,
      organization:organizations(
        id,
        name,
        slug,
        description,
        industry,
        organization_size,
        is_active
      )
    `)
    .eq('user_id', userId);

  if (memberError) {
    console.error('Error fetching memberships:', memberError);
    return;
  }

  if (!memberships || memberships.length === 0) {
    console.log('❌ No organizations found for test director');
    console.log('   Run the seeding script or use the UI button to create test organizations\n');
    return;
  }

  console.log(`✓ Found ${memberships.length} organization(s):\n`);

  memberships.forEach((membership: any, index: number) => {
    const org = membership.organization;
    console.log(`${index + 1}. ${org.name}`);
    console.log(`   - Slug: ${org.slug}`);
    console.log(`   - Industry: ${org.industry || 'Not set'}`);
    console.log(`   - Size: ${org.organization_size || 'Not set'}`);
    console.log(`   - Role: ${membership.role}`);
    console.log(`   - Status: ${membership.status}`);
    console.log(`   - Primary: ${membership.is_primary ? 'Yes' : 'No'}`);
    console.log(`   - Active: ${org.is_active ? 'Yes' : 'No'}`);
    if (org.description) {
      console.log(`   - Description: ${org.description.substring(0, 60)}...`);
    }
    console.log('');
  });

  // Check if any organizations exist without memberships (orphaned)
  const { data: allOrgs, error: orgError } = await supabase
    .from('organizations')
    .select('id, name, created_by')
    .eq('created_by', userId);

  if (!orgError && allOrgs && allOrgs.length > memberships.length) {
    console.log('⚠️  Found orphaned organizations (created but no membership):');
    const membershipOrgIds = memberships.map((m: any) => m.organization.id);
    const orphaned = allOrgs.filter(org => !membershipOrgIds.includes(org.id));
    orphaned.forEach(org => {
      console.log(`   - ${org.name} (ID: ${org.id})`);
    });
    console.log('');
  }
}

async function seedOrganizations() {
  console.log('🌱 Seeding organizations for test director...\n');

  // Sign in as test director
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'test.director@appboardguru.com',
    password: 'TestDirector123!'
  });

  if (authError || !authData.user) {
    console.error('Failed to authenticate as test director:', authError);
    console.log('Please ensure the test director account exists with the correct password');
    return;
  }

  const userId = authData.user.id;
  console.log('✓ Authenticated as test director:', userId);

  // Check existing organizations
  const { data: existingMemberships } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', userId);

  if (existingMemberships && existingMemberships.length > 0) {
    console.log(`\n⚠️  User already has ${existingMemberships.length} organization(s)`);
    console.log('   Skipping seed to avoid duplicates\n');
    return;
  }

  const organizations = [
    {
      name: 'GlobalTech Solutions',
      slug: 'globaltech-solutions',
      description: 'Leading technology solutions provider for enterprise board management.',
      industry: 'Technology',
      organization_size: 'enterprise',
      website: 'https://globaltech-solutions.com'
    },
    {
      name: 'Executive Analytics Corp',
      slug: 'executive-analytics-corp',
      description: 'Data-driven insights and analytics platform for executive decision making.',
      industry: 'Healthcare',
      organization_size: 'large',
      website: 'https://executive-analytics-corp.com'
    },
    {
      name: 'Strategic Governance Inc',
      slug: 'strategic-governance-inc',
      description: 'Strategic consulting firm specializing in corporate governance best practices.',
      industry: 'Finance',
      organization_size: 'medium',
      website: 'https://strategic-governance-inc.com'
    }
  ];

  let created = 0;
  for (const org of organizations) {
    const { data: newOrg, error: orgError } = await supabase
      .from('organizations')
      .insert({
        ...org,
        created_by: userId,
        is_active: true
      })
      .select()
      .single();

    if (orgError) {
      console.error(`❌ Error creating ${org.name}:`, orgError.message);
      continue;
    }

    const { error: memberError } = await supabase
      .from('organization_members')
      .insert({
        organization_id: newOrg.id,
        user_id: userId,
        role: 'owner',
        status: 'active',
        invited_by: userId,
        is_primary: created === 0
      });

    if (memberError) {
      console.error(`❌ Error adding membership for ${org.name}:`, memberError.message);
    } else {
      console.log(`✓ Created: ${org.name}`);
      created++;
    }
  }

  console.log(`\n✅ Seeding complete: ${created} organizations created\n`);
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'check';

  console.log('='.repeat(60));
  console.log('Organization Seeding Test Script');
  console.log('='.repeat(60));
  console.log('');

  switch (command) {
    case 'seed':
      await seedOrganizations();
      break;
    case 'check':
    default:
      await checkOrganizations();
      console.log('💡 Tip: Run with "seed" argument to create organizations');
      console.log('   npx tsx src/scripts/test-organization-seeding.ts seed');
      break;
  }

  console.log('\n' + '='.repeat(60));
}

main().catch(console.error);