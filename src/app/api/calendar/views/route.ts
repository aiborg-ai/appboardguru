import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { z } from 'zod'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

const calendarViewSchema = z.object({
  default_view: z.enum(['day', 'week', 'month', 'year', 'agenda']).default('month'),
  week_start_day: z.number().min(0).max(6).default(0), // 0 = Sunday
  time_format: z.enum(['12h', '24h']).default('12h'),
  timezone: z.string().default('UTC'),
  show_weekends: z.boolean().default(true),
  show_declined_events: z.boolean().default(false),
  compact_view: z.boolean().default(false),
  work_start_time: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).default('09:00'),
  work_end_time: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).default('17:00'),
  work_days: z.array(z.number().min(1).max(7)).default([1, 2, 3, 4, 5]) // 1=Monday, 7=Sunday
})

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let { data: calendarView, error } = await supabase
      .from('calendar_views')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error && error.code === 'PGRST116') {
      // No calendar view exists, create default one
      const defaultView = calendarViewSchema.parse({})
      
      const { data: newView, error: createError } = await supabase
        .from('calendar_views')
        .insert({
          user_id: user.id,
          ...defaultView
        } as any)
        .select()
        .single()

      if (createError) {
        console.error('Calendar view creation error:', createError)
        return NextResponse.json({ error: 'Failed to create calendar view' }, { status: 500 })
      }

      calendarView = newView
    } else if (error) {
      console.error('Calendar view fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch calendar view' }, { status: 500 })
    }

    return NextResponse.json({ view: calendarView })

  } catch (error) {
    console.error('Calendar view API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = calendarViewSchema.partial().parse(body)

    // Validate work hours
    if (validatedData.work_start_time && validatedData.work_end_time) {
      const startTime = validatedData.work_start_time.split(':').map(Number)
      const endTime = validatedData.work_end_time.split(':').map(Number)
      
      const startMinutes = (startTime[0] ?? 0) * 60 + (startTime[1] ?? 0)
      const endMinutes = (endTime[0] ?? 0) * 60 + (endTime[1] ?? 0)
      
      if (startMinutes >= endMinutes) {
        return NextResponse.json({ 
          error: 'Work start time must be before work end time' 
        }, { status: 400 })
      }
    }

    const { data: updatedView, error: updateError } = await supabase
      .from('calendar_views')
      .upsert({
        user_id: user.id,
        ...validatedData
      } as any)
      .select()
      .single()

    if (updateError) {
      console.error('Calendar view update error:', updateError)
      return NextResponse.json({ error: 'Failed to update calendar view' }, { status: 500 })
    }

    return NextResponse.json({
      view: updatedView,
      message: 'Calendar preferences updated successfully'
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation error',
        details: error.issues
      }, { status: 400 })
    }

    console.error('Calendar view update API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}