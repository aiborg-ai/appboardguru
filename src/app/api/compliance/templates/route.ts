import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { ComplianceEngine } from '@/lib/services/compliance-engine'
import type { ComplianceTemplate, ComplianceTemplateInsert } from '@/types'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const complianceEngine = new ComplianceEngine(supabase as any)
    const { searchParams } = new URL(request.url)
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const { data: orgMember } = await (supabase as any)
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (!orgMember) {
      return NextResponse.json({ error: 'No active organization membership found' }, { status: 403 })
    }

    // Parse query parameters
    const includeInactive = searchParams.get('include_inactive') === 'true'
    const regulationType = searchParams.get('regulation_type') ?? undefined

    // Get templates using compliance engine
    const filterOptions: { includeInactive?: boolean; regulationType?: string } = { includeInactive }
    if (regulationType) {
      filterOptions.regulationType = regulationType
    }
    
    const result = await complianceEngine.getTemplates(orgMember.organization_id, filterOptions)

    return NextResponse.json(result)

  } catch (error) {
    console.error('Compliance templates GET API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const complianceEngine = new ComplianceEngine(supabase as any)
    const body = await request.json()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization and role
    const { data: orgMember } = await (supabase as any)
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (!orgMember) {
      return NextResponse.json({ error: 'No active organization membership found' }, { status: 403 })
    }

    // Check permissions - only admins and owners can create templates
    if (!['owner', 'admin'].includes(orgMember.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Validate required fields
    if (!body.name || !body.regulation_type) {
      return NextResponse.json({ 
        error: 'Template name and regulation type are required' 
      }, { status: 400 })
    }

    // Check for duplicate template names
    const { data: existingTemplate } = await (supabase as any)
      .from('compliance_templates')
      .select('id')
      .eq('organization_id', orgMember.organization_id)
      .eq('name', body.name)
      .eq('is_active', true)
      .single()

    if (existingTemplate) {
      return NextResponse.json({ 
        error: 'A template with this name already exists' 
      }, { status: 400 })
    }

    // Prepare template data
    const priority: 'low' | 'medium' | 'high' | 'critical' = body.priority && ['low', 'medium', 'high', 'critical'].includes(body.priority) 
      ? body.priority as 'low' | 'medium' | 'high' | 'critical' 
      : 'medium'
    
    const templateData = {
      name: body.name,
      description: body.description || null,
      regulation_type: body.regulation_type,
      category: body.category || 'general',
      frequency: body.frequency || 'annual',
      priority,
      workflow_steps: body.workflow_steps || { steps: [] },
      requirements: body.requirements || null,
      required_roles: body.required_roles || null,
      reminder_schedule: body.reminder_schedule || null,
      escalation_rules: body.escalation_rules || null,
      is_active: body.is_active !== false,
      is_mandatory: body.is_mandatory || false,
      is_system_template: false, // User-created templates are not system templates
      version: body.version || 1
    }

    // Create template using compliance engine
    const result = await complianceEngine.createTemplate(orgMember.organization_id, templateData)

    return NextResponse.json(result, { status: 201 })

  } catch (error) {
    console.error('Compliance templates POST API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const { searchParams } = new URL(request.url)
    const templateId = searchParams.get('id')
    const body = await request.json()
    
    if (!templateId) {
      return NextResponse.json({ error: 'Template ID is required' }, { status: 400 })
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user can update this template
    const { data: template } = await (supabase as any)
      .from('compliance_templates')
      .select(`
        *,
        organization:organizations!inner(
          id,
          organization_members!inner(user_id, role)
        )
      `)
      .eq('id', templateId)
      .eq('organization.organization_members.user_id', user.id)
      .single()

    if (!template) {
      return NextResponse.json({ error: 'Template not found or access denied' }, { status: 404 })
    }

    // Check permissions
    const userRole = template.organization.organization_members[0]?.role
    if (!['owner', 'admin'].includes(userRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Don't allow updating system templates
    if (template.is_system_template && userRole !== 'owner') {
      return NextResponse.json({ error: 'Cannot modify system templates' }, { status: 403 })
    }

    // Prepare update data
    const updateData = {
      name: body.name || template.name,
      description: body.description !== undefined ? body.description : template.description,
      regulation_type: body.regulation_type || template.regulation_type,
      category: body.category || template.category,
      frequency: body.frequency || template.frequency,
      priority: body.priority || template.priority,
      workflow_steps: body.workflow_steps ? JSON.stringify(body.workflow_steps) : template.workflow_steps,
      requirements: body.requirements !== undefined ? body.requirements : template.requirements,
      required_roles: body.required_roles !== undefined ? body.required_roles : template.required_roles,
      reminder_schedule: body.reminder_schedule ? JSON.stringify(body.reminder_schedule) : template.reminder_schedule,
      escalation_rules: body.escalation_rules ? JSON.stringify(body.escalation_rules) : template.escalation_rules,
      is_active: body.is_active !== undefined ? body.is_active : template.is_active,
      version: template.version + 1, // Increment version on update
      updated_at: new Date().toISOString()
    }

    // Check for name conflicts if name is being changed
    if (body.name && body.name !== template.name) {
      const { data: existingTemplate } = await (supabase as any)
        .from('compliance_templates')
        .select('id')
        .eq('organization_id', template.organization_id)
        .eq('name', body.name)
        .eq('is_active', true)
        .neq('id', templateId)
        .single()

      if (existingTemplate) {
        return NextResponse.json({ 
          error: 'A template with this name already exists' 
        }, { status: 400 })
      }
    }

    // Update template
    const { data: updatedTemplate, error: updateError } = await (supabase as any)
      .from('compliance_templates')
      .update(updateData)
      .eq('id', templateId)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    return NextResponse.json({
      success: true,
      data: updatedTemplate,
      message: 'Template updated successfully'
    })

  } catch (error) {
    console.error('Compliance templates PUT API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const { searchParams } = new URL(request.url)
    const templateId = searchParams.get('id')
    
    if (!templateId) {
      return NextResponse.json({ error: 'Template ID is required' }, { status: 400 })
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user can delete this template
    const { data: template } = await (supabase as any)
      .from('compliance_templates')
      .select(`
        *,
        organization:organizations!inner(
          id,
          organization_members!inner(user_id, role)
        )
      `)
      .eq('id', templateId)
      .eq('organization.organization_members.user_id', user.id)
      .single()

    if (!template) {
      return NextResponse.json({ error: 'Template not found or access denied' }, { status: 404 })
    }

    // Check permissions
    const userRole = template.organization.organization_members[0]?.role
    if (!['owner', 'admin'].includes(userRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Don't allow deleting system templates
    if (template.is_system_template) {
      return NextResponse.json({ error: 'Cannot delete system templates' }, { status: 403 })
    }

    // Check if template is being used by active workflows
    const { count: activeWorkflows } = await (supabase as any)
      .from('notification_workflows')
      .select('*', { count: 'exact', head: true })
      .eq('template_id', templateId)
      .in('status', ['pending', 'in_progress', 'waiting_approval'])

    if (activeWorkflows && activeWorkflows > 0) {
      return NextResponse.json({ 
        error: `Cannot delete template: ${activeWorkflows} active workflows are using this template` 
      }, { status: 400 })
    }

    // Soft delete by setting is_active to false
    const { error: deleteError } = await (supabase as any)
      .from('compliance_templates')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', templateId)

    if (deleteError) {
      throw deleteError
    }

    return NextResponse.json({
      success: true,
      message: 'Template deactivated successfully'
    })

  } catch (error) {
    console.error('Compliance templates DELETE API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}