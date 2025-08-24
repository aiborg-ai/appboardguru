import { NextRequest, NextResponse } from 'next/server'
import { IntelligentActionItemsService } from '@/lib/services/intelligent-action-items.service'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

// GET /api/action-items - Retrieve action items for user/organization
export async function GET(request: NextRequest) {
  try {
    const actionItemsService = new IntelligentActionItemsService()
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')
    const assignedTo = searchParams.get('assignedTo')
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const transcriptionId = searchParams.get('transcriptionId')
    
    // Build filters
    const filters: any = {}
    if (organizationId) filters.organization_id = organizationId
    if (assignedTo) filters.assigned_to = assignedTo
    if (status) filters.status = status
    if (priority) filters.priority = priority
    if (transcriptionId) filters.transcription_id = transcriptionId

    // Default to user's assigned items if no specific filters
    if (!organizationId && !assignedTo && !transcriptionId) {
      filters.assigned_to = user.id
    }

    const actionItems = await actionItemsService.getActionItems(filters)

    return NextResponse.json({
      success: true,
      data: actionItems
    })

  } catch (error) {
    console.error('Error retrieving action items:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve action items' },
      { status: 500 }
    )
  }
}

// POST /api/action-items - Create a new action item or extract from transcription
export async function POST(request: NextRequest) {
  try {
    const actionItemsService = new IntelligentActionItemsService()
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Handle extraction from transcription
    if (body.action === 'extract' && body.transcriptionId) {
      const { transcriptionId, participants } = body

      const actionItems = await actionItemsService.extractActionItemsFromTranscript(
        transcriptionId,
        [], // Will be fetched from transcription service
        participants || []
      )

      return NextResponse.json({
        success: true,
        data: actionItems,
        message: `Extracted ${actionItems.length} action items from transcription`
      })
    }

    // Handle manual creation
    const {
      title,
      description,
      assignedTo,
      assignedToName,
      dueDate,
      priority = 'medium',
      category = 'operational',
      estimatedHours,
      organizationId,
      transcriptionId
    } = body

    if (!title || !organizationId) {
      return NextResponse.json(
        { error: 'Title and organization ID are required' },
        { status: 400 }
      )
    }

    const actionItem = await actionItemsService.createActionItem({
      title,
      description,
      assignedTo,
      assignedToName,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      priority,
      category,
      estimatedHours,
      organizationId,
      transcriptionId,
      createdBy: user.id,
      extractionConfidence: 1.0, // Manual creation has full confidence
      assignmentConfidence: assignedTo ? 1.0 : 0.0,
      dueDateConfidence: dueDate ? 1.0 : 0.0,
      urgencyScore: priority === 'high' ? 80 : priority === 'low' ? 30 : 50,
      complexityScore: 50 // Default complexity
    })

    return NextResponse.json({
      success: true,
      data: actionItem,
      message: 'Action item created successfully'
    })

  } catch (error) {
    console.error('Error creating action item:', error)
    return NextResponse.json(
      { error: 'Failed to create action item' },
      { status: 500 }
    )
  }
}