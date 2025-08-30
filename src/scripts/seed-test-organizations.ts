import { createClient } from '@/lib/supabase-client';

export async function seedTestOrganizations() {
  const supabase = createClient();
  
  // Get the test director user
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user || user.email !== 'test.director@appboardguru.com') {
    console.error('Must be logged in as test.director@appboardguru.com');
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
    },
    {
      name: 'Digital Transformation Partners',
      slug: 'digital-transformation-partners',
      description: 'Accelerating digital innovation for modern board operations.',
      industry: 'Consulting',
      organization_size: 'large',
      website: 'https://digital-transformation-partners.com'
    },
    {
      name: 'Future Board Solutions',
      slug: 'future-board-solutions',
      description: 'Next-generation board management platform for agile organizations.',
      industry: 'Technology',
      organization_size: 'medium',
      website: 'https://future-board-solutions.com'
    },
    {
      name: 'Regulatory Compliance Systems',
      slug: 'regulatory-compliance-systems',
      description: 'Comprehensive compliance management for board governance.',
      industry: 'Legal',
      organization_size: 'enterprise',
      website: 'https://regulatory-compliance-systems.com'
    },
    {
      name: 'Board Excellence Institute',
      slug: 'board-excellence-institute',
      description: 'Training and certification programs for board directors.',
      industry: 'Education',
      organization_size: 'small',
      website: 'https://board-excellence-institute.org'
    },
    {
      name: 'Secure Governance Cloud',
      slug: 'secure-governance-cloud',
      description: 'Cloud-based secure document management for boards.',
      industry: 'Technology',
      organization_size: 'large',
      website: 'https://secure-governance-cloud.com'
    },
    {
      name: 'International Directors Network',
      slug: 'international-directors-network',
      description: 'Global network connecting board directors worldwide.',
      industry: 'Professional Services',
      organization_size: 'enterprise',
      website: 'https://international-directors-network.org'
    },
    {
      name: 'Governance Analytics Pro',
      slug: 'governance-analytics-pro',
      description: 'Advanced analytics and reporting for board performance.',
      industry: 'Analytics',
      organization_size: 'medium',
      website: 'https://governance-analytics-pro.com'
    }
  ];

  let successCount = 0;
  let errorCount = 0;

  for (const org of organizations) {
    // Create organization
    const { data: newOrg, error: orgError } = await supabase
      .from('organizations')
      .insert({
        ...org,
        created_by: user.id,
        is_active: true
      })
      .select()
      .single();

    if (orgError) {
      console.error('Error creating organization:', org.name, orgError);
      errorCount++;
      continue;
    }

    // Add user as owner
    const { error: memberError } = await supabase
      .from('organization_members')
      .insert({
        organization_id: newOrg.id,
        user_id: user.id,
        role: 'owner',
        status: 'active',
        invited_by: user.id,
        is_primary: organizations.indexOf(org) === 0
      });

    if (memberError) {
      console.error('Error adding member for:', org.name, memberError);
      errorCount++;
    } else {
      console.log('✓ Created organization:', org.name);
      successCount++;
    }
  }

  console.log(`\nSeeding complete: ${successCount} successful, ${errorCount} errors`);
  return { success: successCount, errors: errorCount };
}