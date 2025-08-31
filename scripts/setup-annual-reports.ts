import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const annualReports = [
  {
    filename: 'Amazon_2023_Annual_Report.pdf',
    name: 'Amazon 2023 Annual Report',
    company: 'Amazon.com Inc.',
    description: 'Comprehensive annual report for fiscal year 2023 including financial statements, business overview, and strategic initiatives.',
    year: 2023
  },
  {
    filename: 'Apple_Inc_2023_Annual_Report.pdf',
    name: 'Apple 2023 Annual Report', 
    company: 'Apple Inc.',
    description: 'Annual report covering Apple\'s fiscal year 2023 performance, product launches, and environmental initiatives.',
    year: 2023
  },
  {
    filename: 'Berkshire_Hathaway_2023_Annual_Report.pdf',
    name: 'Berkshire Hathaway 2023 Annual Report',
    company: 'Berkshire Hathaway Inc.',
    description: 'Warren Buffett\'s annual letter to shareholders and comprehensive financial report for 2023.',
    year: 2023
  },
  {
    filename: 'JPMorgan_Chase_2023_Annual_Report.pdf',
    name: 'JPMorgan Chase 2023 Annual Report',
    company: 'JPMorgan Chase & Co.',
    description: 'Complete annual report including financial performance, risk management, and strategic priorities for 2023.',
    year: 2023
  },
  {
    filename: 'Microsoft_Corporation_2023_Annual_Report.pdf',
    name: 'Microsoft 2023 Annual Report',
    company: 'Microsoft Corporation',
    description: 'Annual report highlighting Microsoft\'s AI transformation, cloud growth, and financial results for fiscal 2023.',
    year: 2023
  },
  {
    filename: 'Tesla_2023_Annual_Report.pdf',
    name: 'Tesla 2023 Annual Report',
    company: 'Tesla Inc.',
    description: 'Annual report covering Tesla\'s vehicle production, energy business, and financial performance for 2023.',
    year: 2023
  }
];

async function setupAnnualReports() {
  try {
    // First, get the test director user
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', 'test.director@appboardguru.com')
      .single();

    if (userError || !userData) {
      console.error('Error finding test director user:', userError);
      return;
    }

    const userId = userData.id;
    console.log('Found test director user:', userId);

    // Check if organization exists, if not create one
    let { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .select('id')
      .eq('name', 'Fortune 500 Companies')
      .single();

    if (orgError || !orgData) {
      // Create organization with proper slug
      const slug = 'fortune-500-companies';
      const { data: newOrg, error: createOrgError } = await supabase
        .from('organizations')
        .insert({
          name: 'Fortune 500 Companies',
          slug: slug,
          description: 'Collection of annual reports from leading Fortune 500 companies',
          industry: 'Various',
          organization_size: 'enterprise',
          website: 'https://fortune.com/fortune500/',
          created_by: userId,
          is_active: true,
          settings: {
            max_members: 100,
            require_2fa: false,
            approved_domains: [],
            allow_viewer_downloads: true,
            invitation_expires_hours: 72,
            auto_approve_domain_users: false,
            board_pack_auto_archive_days: 365
          }
        })
        .select()
        .single();

      if (createOrgError) {
        console.error('Error creating organization:', createOrgError);
        return;
      }
      
      orgData = newOrg;
      console.log('Created organization:', orgData.id);
    } else {
      console.log('Found existing organization:', orgData.id);
    }

    const organizationId = orgData.id;

    // Add user to organization if not already a member
    const { data: memberData } = await supabase
      .from('organization_members')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .single();

    if (!memberData) {
      await supabase
        .from('organization_members')
        .insert({
          organization_id: organizationId,
          user_id: userId,
          role: 'admin',
          status: 'active'
        });
      console.log('Added user to organization');
    }

    // Create a vault for the annual reports
    let { data: vaultData, error: vaultError } = await supabase
      .from('vaults')
      .select('id')
      .eq('name', '2023 Annual Reports')
      .eq('organization_id', organizationId)
      .single();

    if (vaultError || !vaultData) {
      const { data: newVault, error: createVaultError } = await supabase
        .from('vaults')
        .insert({
          name: '2023 Annual Reports',
          description: 'Collection of 2023 annual reports from major corporations',
          organization_id: organizationId,
          created_by: userId,
          status: 'active',
          priority: 'high',
          category: 'board_meeting',
          meeting_date: new Date('2023-12-31').toISOString(),
          location: 'Virtual - Annual Reports Archive'
        })
        .select()
        .single();

      if (createVaultError) {
        console.error('Error creating vault:', createVaultError);
        return;
      }

      vaultData = newVault;
      console.log('Created vault:', vaultData.id);
    } else {
      console.log('Found existing vault:', vaultData.id);
    }

    const vaultId = vaultData.id;

    // Now create assets for each PDF
    for (const report of annualReports) {
      // Get file size
      const filePath = path.join(__dirname, '..', 'public', 'assets', 'annual-reports', report.filename);
      const stats = fs.statSync(filePath);
      const fileSizeInBytes = stats.size;
      const fileSizeInMB = (fileSizeInBytes / (1024 * 1024)).toFixed(2);

      // Check if asset already exists
      const { data: existingAsset } = await supabase
        .from('assets')
        .select('id')
        .eq('file_name', report.filename)
        .single();

      let assetId: string;

      if (existingAsset) {
        console.log(`Asset already exists: ${report.filename}`);
        assetId = existingAsset.id;
      } else {
        // Create asset
        const { data: assetData, error: assetError } = await supabase
          .from('assets')
          .insert({
            owner_id: userId,
            title: report.name,
            description: report.description,
            file_name: report.filename,
            original_file_name: report.filename,
            file_path: `/assets/annual-reports/${report.filename}`,
            file_size: fileSizeInBytes,
            file_type: 'pdf',
            mime_type: 'application/pdf',
            storage_bucket: 'assets',
            category: 'financial',
            tags: ['annual-report', report.year.toString(), report.company.toLowerCase().replace(/[^a-z0-9]/g, '-')],
            folder_path: '/',
            visibility: 'private',
            is_processed: true,
            processing_status: 'completed'
          })
          .select()
          .single();

        if (assetError) {
          console.error(`Error creating asset for ${report.filename}:`, assetError);
          continue;
        }

        assetId = assetData.id;
        console.log(`Created asset: ${report.name} (${fileSizeInMB} MB)`);
      }

      // Link asset to vault
      const { data: existingLink } = await supabase
        .from('vault_assets')
        .select('id')
        .eq('vault_id', vaultId)
        .eq('asset_id', assetId)
        .single();

      if (!existingLink) {
        const { error: linkError } = await supabase
          .from('vault_assets')
          .insert({
            vault_id: vaultId,
            asset_id: assetId,
            organization_id: organizationId,
            added_by_user_id: userId,
            folder_path: '/',
            display_order: annualReports.indexOf(report),
            is_featured: annualReports.indexOf(report) < 3, // Feature first 3
            is_required_reading: true,
            visibility: 'members',
            download_permissions: 'members'
          });

        if (linkError) {
          console.error(`Error linking asset ${report.filename} to vault:`, linkError);
        } else {
          console.log(`Linked ${report.name} to vault`);
        }
      }
    }

    console.log('\n✅ Setup complete! Annual reports are now available for the test director account.');
    console.log('Login with: test.director@appboardguru.com / TestDirector123!');
    console.log('The reports are in the "Fortune 500 Companies" organization under "2023 Annual Reports" vault.');

  } catch (error) {
    console.error('Setup error:', error);
  }
}

setupAnnualReports();