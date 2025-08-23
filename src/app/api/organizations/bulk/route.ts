import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { operation, organizationIds, options = {} } = body

    if (!operation || !organizationIds || !Array.isArray(organizationIds)) {
      return NextResponse.json(
        { error: 'Missing required fields: operation and organizationIds' },
        { status: 400 }
      )
    }

    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    switch (operation) {
      case 'export-csv':
        return await handleExportCsv(supabase, user.id, organizationIds)
      
      case 'archive':
        return await handleArchive(supabase, user.id, organizationIds, options)
      
      case 'share':
        return await handleBulkShare(supabase, user.id, organizationIds, options)
      
      case 'update-settings':
        return await handleUpdateSettings(supabase, user.id, organizationIds, options)
      
      case 'generate-reports':
        return await handleGenerateReports(supabase, user.id, organizationIds, options)
      
      default:
        return NextResponse.json(
          { error: `Unknown operation: ${operation}` },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Bulk operation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function handleExportCsv(supabase: any, userId: string, organizationIds: string[]) {
  try {
    // Fetch organization data with user roles
    const { data: organizations, error } = await supabase
      .from('organizations')
      .select(`
        id,
        name,
        description,
        industry,
        organization_size,
        website,
        created_at,
        status,
        organization_members!inner(role)
      `)
      .in('id', organizationIds)
      .eq('organization_members.user_id', userId)

    if (error) {
      throw error
    }

    // Transform data for CSV export
    const csvData = organizations.map((org: any) => ({
      id: org.id,
      name: org.name,
      description: org.description || '',
      industry: org.industry || '',
      organization_size: org.organization_size || '',
      website: org.website || '',
      user_role: org.organization_members[0]?.role || 'member',
      status: org.status || 'active',
      created_at: org.created_at,
      member_count: 1 // This would need to be calculated from actual members
    }))

    // Generate CSV content
    const headers = [
      'ID', 'Name', 'Description', 'Industry', 'Size', 
      'Website', 'Your Role', 'Status', 'Created', 'Members'
    ]
    
    const csvContent = [
      headers.join(','),
      ...csvData.map(org => [
        org.id,
        `"${org.name.replace(/"/g, '""')}"`,
        `"${org.description.replace(/"/g, '""')}"`,
        org.industry,
        org.organization_size,
        org.website,
        org.user_role,
        org.status,
        new Date(org.created_at).toISOString().split('T')[0],
        org.member_count
      ].join(','))
    ].join('\n')

    return NextResponse.json({
      success: true,
      message: `Successfully exported ${csvData.length} organizations`,
      data: {
        filename: `organizations-export-${new Date().toISOString().split('T')[0]}.csv`,
        content: csvContent,
        count: csvData.length
      }
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: 'Failed to export organizations',
      errors: [error]
    }, { status: 500 })
  }
}

async function handleArchive(supabase: any, userId: string, organizationIds: string[], options: any) {
  try {
    const results = []
    const errors = []

    for (const orgId of organizationIds) {
      try {
        // Check if user has permission to archive (owner/admin only)
        const { data: membership } = await supabase
          .from('organization_members')
          .select('role')
          .eq('organization_id', orgId)
          .eq('user_id', userId)
          .single()

        if (!membership || !['owner', 'admin'].includes(membership.role)) {
          errors.push({ orgId, error: 'Insufficient permissions' })
          continue
        }

        // Archive the organization (soft delete)
        const { error: archiveError } = await supabase
          .from('organizations')
          .update({ 
            status: 'archived',
            archived_at: new Date().toISOString(),
            archived_by: userId
          })
          .eq('id', orgId)

        if (archiveError) {
          errors.push({ orgId, error: archiveError.message })
        } else {
          results.push({ orgId, success: true })
        }
      } catch (error) {
        errors.push({ orgId, error: (error as Error).message })
      }
    }

    const successCount = results.length
    const errorCount = errors.length

    return NextResponse.json({
      success: errorCount === 0,
      message: successCount > 0 
        ? `Successfully archived ${successCount} organization(s)${errorCount > 0 ? ` (${errorCount} failed)` : ''}`
        : 'Failed to archive organizations',
      data: { successCount, errorCount },
      errors: errorCount > 0 ? errors : undefined
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: 'Failed to archive organizations',
      errors: [error]
    }, { status: 500 })
  }
}

async function handleBulkShare(supabase: any, userId: string, organizationIds: string[], options: any) {
  try {
    const { emails = [], role = 'viewer', message = '' } = options

    if (!emails.length) {
      return NextResponse.json({
        success: false,
        message: 'No email addresses provided'
      }, { status: 400 })
    }

    const results = []
    const errors = []

    for (const orgId of organizationIds) {
      try {
        // Check if user has permission to invite (owner/admin only)
        const { data: membership } = await supabase
          .from('organization_members')
          .select('role')
          .eq('organization_id', orgId)
          .eq('user_id', userId)
          .single()

        if (!membership || !['owner', 'admin'].includes(membership.role)) {
          errors.push({ orgId, error: 'Insufficient permissions' })
          continue
        }

        // Create invitations for each email
        for (const email of emails) {
          const { error: inviteError } = await supabase
            .from('organization_invitations')
            .insert({
              organization_id: orgId,
              email,
              role,
              invited_by: userId,
              message,
              status: 'pending',
              created_at: new Date().toISOString()
            })

          if (inviteError && !inviteError.message.includes('duplicate')) {
            errors.push({ orgId, email, error: inviteError.message })
          }
        }

        results.push({ orgId, emails: emails.length })
      } catch (error) {
        errors.push({ orgId, error: (error as Error).message })
      }
    }

    const successCount = results.length
    const totalInvites = results.reduce((sum, r) => sum + r.emails, 0)

    return NextResponse.json({
      success: errors.length === 0,
      message: successCount > 0
        ? `Successfully sent ${totalInvites} invitation(s) across ${successCount} organization(s)`
        : 'Failed to send invitations',
      data: { successCount, totalInvites },
      errors: errors.length > 0 ? errors : undefined
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: 'Failed to send bulk invitations',
      errors: [error]
    }, { status: 500 })
  }
}

async function handleUpdateSettings(supabase: any, userId: string, organizationIds: string[], options: any) {
  try {
    const { settings = {} } = options
    const allowedSettings = ['description', 'website', 'industry', 'organization_size']
    
    // Filter to only allowed settings
    const updateData = Object.keys(settings)
      .filter(key => allowedSettings.includes(key))
      .reduce((obj: any, key) => {
        obj[key] = settings[key]
        return obj
      }, {})

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No valid settings provided'
      }, { status: 400 })
    }

    const results = []
    const errors = []

    for (const orgId of organizationIds) {
      try {
        // Check permissions
        const { data: membership } = await supabase
          .from('organization_members')
          .select('role')
          .eq('organization_id', orgId)
          .eq('user_id', userId)
          .single()

        if (!membership || !['owner', 'admin'].includes(membership.role)) {
          errors.push({ orgId, error: 'Insufficient permissions' })
          continue
        }

        // Update organization settings
        const { error: updateError } = await supabase
          .from('organizations')
          .update({
            ...updateData,
            updated_at: new Date().toISOString(),
            updated_by: userId
          })
          .eq('id', orgId)

        if (updateError) {
          errors.push({ orgId, error: updateError.message })
        } else {
          results.push({ orgId, success: true })
        }
      } catch (error) {
        errors.push({ orgId, error: (error as Error).message })
      }
    }

    return NextResponse.json({
      success: errors.length === 0,
      message: `Successfully updated ${results.length} organization(s)`,
      data: { successCount: results.length },
      errors: errors.length > 0 ? errors : undefined
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: 'Failed to update organization settings',
      errors: [error]
    }, { status: 500 })
  }
}

async function handleGenerateReports(supabase: any, userId: string, organizationIds: string[], options: any) {
  try {
    const { reportType = 'summary', includeMembers = false } = options

    const results = []
    const errors = []

    for (const orgId of organizationIds) {
      try {
        // Check permissions
        const { data: membership } = await supabase
          .from('organization_members')
          .select('role')
          .eq('organization_id', orgId)
          .eq('user_id', userId)
          .single()

        if (!membership) {
          errors.push({ orgId, error: 'No access to organization' })
          continue
        }

        // Fetch organization data
        const { data: org, error: orgError } = await supabase
          .from('organizations')
          .select(`
            *,
            organization_members(
              id,
              role,
              joined_at,
              user:users(name, email)
            )
          `)
          .eq('id', orgId)
          .single()

        if (orgError) {
          errors.push({ orgId, error: orgError.message })
          continue
        }

        // Generate report data
        const reportData = {
          organization: {
            id: org.id,
            name: org.name,
            description: org.description,
            industry: org.industry,
            size: org.organization_size,
            status: org.status,
            created_at: org.created_at
          },
          stats: {
            memberCount: org.organization_members?.length || 0,
            roleDistribution: org.organization_members?.reduce((acc: any, member: any) => {
              acc[member.role] = (acc[member.role] || 0) + 1
              return acc
            }, {}) || {},
            createdDate: org.created_at,
            lastActivity: new Date().toISOString() // This would come from actual activity tracking
          },
          members: includeMembers ? org.organization_members?.map((member: any) => ({
            role: member.role,
            joined_at: member.joined_at,
            name: member.user?.name,
            email: member.user?.email
          })) : undefined
        }

        results.push({ orgId, reportData })
      } catch (error) {
        errors.push({ orgId, error: (error as Error).message })
      }
    }

    return NextResponse.json({
      success: errors.length === 0,
      message: `Successfully generated reports for ${results.length} organization(s)`,
      data: {
        reports: results,
        generated_at: new Date().toISOString(),
        report_type: reportType
      },
      errors: errors.length > 0 ? errors : undefined
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: 'Failed to generate reports',
      errors: [error]
    }, { status: 500 })
  }
}