import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { ComplianceEngine } from '@/lib/services/compliance-engine'
import type { AdvanceWorkflowStepRequest } from '@/types'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const supabase = await createSupabaseServerClient()
    const complianceEngine = new ComplianceEnginesupabase
    const workflowId = resolvedParams.id
    const body = await request.json() as AdvanceWorkflowStepRequest
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user is a participant in this workflow
    const { data: participant } = await supabase
      .from('compliance_participants')
      .select(`
        *,
        workflow:notification_workflows(
          *,
          organization:organizations!inner(
            id,
            organization_members!inner(user_id)
          )
        )
      `)
      .eq('workflow_id', workflowId)
      .eq('user_id', user.id)
      .single()

    if (!participant) {
      return NextResponse.json({ 
        error: 'Not authorized to advance this workflow' 
      }, { status: 403 })
    }

    // Check if participant can advance (is in current step and status allows it)
    if ((participant as any)?.status !== 'in_progress' && (participant as any)?.status !== 'assigned') {
      return NextResponse.json({ 
        error: 'Cannot advance workflow from current participant status' 
      }, { status: 400 })
    }

    // Advance the workflow step
    const result = await complianceEngine.advanceWorkflowStep(
      workflowId,
      user.id,
      body
    )

    return NextResponse.json(result)

  } catch (error) {
    console.error('Advance workflow API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}