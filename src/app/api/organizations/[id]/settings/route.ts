import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

interface AssetSettings {
  categories: string[];
  storageLimit: number;
  approvalWorkflow: boolean;
  aiProcessing: boolean;
  defaultPermissions: 'organization' | 'restricted' | 'private';
  watermarking: boolean;
  retentionDays: number;
  autoClassification: boolean;
}

interface ComplianceSettings {
  auditLogging: boolean;
  twoFactorRequired: boolean;
  dataEncryption: boolean;
  accessLogging: boolean;
  complianceStandards: string[];
}

interface NotificationSettings {
  emailUpdates: boolean;
  securityAlerts: boolean;
  weeklyReports: boolean;
  monthlyDigest: boolean;
  activityAlerts: boolean;
}

interface BillingSettings {
  plan: 'free' | 'starter' | 'professional' | 'enterprise';
  billingEmail: string;
  billingAddress?: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  paymentMethod?: {
    type: 'card' | 'invoice';
    last4?: string;
  };
}

// GET /api/organizations/[id]/settings - Get all settings
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check user's membership
    const { data: member, error: memberError } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', params.id)
      .eq('user_id', user.id)
      .single();

    if (memberError || !member) {
      return NextResponse.json(
        { error: 'You are not a member of this organization' },
        { status: 403 }
      );
    }

    // Get organization settings
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('settings, compliance_settings, billing_settings')
      .eq('id', params.id)
      .single();

    if (orgError || !org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Parse and return settings
    const settings = {
      general: org.settings || {},
      compliance: org.compliance_settings || {
        auditLogging: true,
        twoFactorRequired: false,
        dataEncryption: true,
        accessLogging: true,
        complianceStandards: []
      },
      billing: member.role === 'owner' || member.role === 'admin' 
        ? (org.billing_settings || {
            plan: 'free',
            billingEmail: user.email
          })
        : null, // Hide billing from regular members
      userRole: member.role
    };

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error fetching organization settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/organizations/[id]/settings - Update specific settings
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createSupabaseServerClient();
    const body = await request.json();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check user's role
    const { data: member, error: memberError } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', params.id)
      .eq('user_id', user.id)
      .single();

    if (memberError || !member) {
      return NextResponse.json(
        { error: 'You are not a member of this organization' },
        { status: 403 }
      );
    }

    // Only owners and admins can update settings
    if (member.role !== 'owner' && member.role !== 'admin') {
      return NextResponse.json(
        { error: 'You do not have permission to update settings' },
        { status: 403 }
      );
    }

    // Prepare update data
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    // Update specific settings categories
    if (body.assetSettings) {
      const { data: current } = await supabase
        .from('organizations')
        .select('settings')
        .eq('id', params.id)
        .single();
      
      updateData.settings = {
        ...(current?.settings || {}),
        assets: body.assetSettings
      };
    }

    if (body.complianceSettings) {
      updateData.compliance_settings = body.complianceSettings;
    }

    if (body.notificationSettings) {
      const { data: current } = await supabase
        .from('organizations')
        .select('settings')
        .eq('id', params.id)
        .single();
      
      updateData.settings = {
        ...(current?.settings || {}),
        notifications: body.notificationSettings
      };
    }

    // Only owners can update billing settings
    if (body.billingSettings) {
      if (member.role !== 'owner') {
        return NextResponse.json(
          { error: 'Only the owner can update billing settings' },
          { status: 403 }
        );
      }
      updateData.billing_settings = body.billingSettings;
    }

    // Update the organization
    const { data: updatedOrg, error: updateError } = await supabase
      .from('organizations')
      .update(updateData)
      .eq('id', params.id)
      .select('settings, compliance_settings, billing_settings')
      .single();

    if (updateError) {
      console.error('Error updating settings:', updateError);
      return NextResponse.json(
        { error: 'Failed to update settings' },
        { status: 500 }
      );
    }

    // Log the settings update
    await supabase.from('organization_activity_log').insert({
      organization_id: params.id,
      user_id: user.id,
      action: 'settings_updated',
      details: {
        settings_categories: Object.keys(body),
        updated_by: user.email
      }
    });

    return NextResponse.json({
      message: 'Settings updated successfully',
      settings: updatedOrg
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/organizations/[id]/settings/reset - Reset settings to defaults
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createSupabaseServerClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only owners can reset settings
    const { data: member, error: memberError } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', params.id)
      .eq('user_id', user.id)
      .single();

    if (memberError || !member || member.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only the owner can reset organization settings' },
        { status: 403 }
      );
    }

    // Default settings
    const defaultSettings = {
      settings: {
        assets: {
          categories: ['Board Documents', 'Financial Reports', 'Legal Documents', 'Other'],
          storageLimit: 100,
          approvalWorkflow: false,
          aiProcessing: true,
          defaultPermissions: 'organization' as const,
          watermarking: true,
          retentionDays: 2555,
          autoClassification: true
        },
        notifications: {
          emailUpdates: true,
          securityAlerts: true,
          weeklyReports: false,
          monthlyDigest: true,
          activityAlerts: true
        }
      },
      compliance_settings: {
        auditLogging: true,
        twoFactorRequired: false,
        dataEncryption: true,
        accessLogging: true,
        complianceStandards: []
      }
    };

    // Reset settings
    const { data: updatedOrg, error: updateError } = await supabase
      .from('organizations')
      .update({
        ...defaultSettings,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error resetting settings:', updateError);
      return NextResponse.json(
        { error: 'Failed to reset settings' },
        { status: 500 }
      );
    }

    // Log the reset
    await supabase.from('organization_activity_log').insert({
      organization_id: params.id,
      user_id: user.id,
      action: 'settings_reset',
      details: {
        reset_by: user.email,
        reset_to: 'defaults'
      }
    });

    return NextResponse.json({
      message: 'Settings reset to defaults successfully',
      settings: updatedOrg
    });
  } catch (error) {
    console.error('Error resetting settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}