import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { z } from 'zod'

const availabilityQuerySchema = z.object({
  user_ids: z.array(z.string().uuid()).min(1),
  start_datetime: z.string(),
  end_datetime: z.string(),
  duration_minutes: z.number().min(15).max(480).default(60) // 15 minutes to 8 hours
})

const setAvailabilitySchema = z.object({
  day_of_week: z.number().min(0).max(6),
  start_time: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  end_time: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  timezone: z.string().default('UTC'),
  availability_type: z.enum(['available', 'busy', 'tentative']).default('available'),
  effective_from: z.string().optional(),
  effective_until: z.string().optional()
})

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    
    // If no query params, return user's own availability patterns
    if (!searchParams.has('user_ids')) {
      const { data: availability, error } = await supabase
        .from('calendar_availability')
        .select('*')
        .eq('user_id', user.id)
        .order('day_of_week')
        .order('start_time')

      if (error) {
        console.error('Availability fetch error:', error)
        return NextResponse.json({ error: 'Failed to fetch availability' }, { status: 500 })
      }

      return NextResponse.json({ availability })
    }

    // Query for availability checking
    try {
      const queryData = availabilityQuerySchema.parse({
        user_ids: JSON.parse(searchParams.get('user_ids') || '[]'),
        start_datetime: searchParams.get('start_datetime'),
        end_datetime: searchParams.get('end_datetime'),
        duration_minutes: parseInt(searchParams.get('duration_minutes') || '60')
      })

      // Check for conflicts for each user
      const availabilityResults = await Promise.all(
        queryData.user_ids.map(async (userId) => {
          const { data: conflicts } = await supabase
            .rpc('check_calendar_conflicts', {
              p_user_id: userId,
              p_start_datetime: queryData.start_datetime,
              p_end_datetime: queryData.end_datetime
            })

          const { data: userInfo } = await supabase
            .from('users')
            .select('id, full_name, email')
            .eq('id', userId)
            .single()

          return {
            user: userInfo,
            is_available: !conflicts || conflicts.length === 0,
            conflicts: conflicts || [],
            suggested_times: [] // Could implement smart scheduling suggestions
          }
        })
      )

      return NextResponse.json({
        availability: availabilityResults,
        query: queryData
      })

    } catch (parseError) {
      return NextResponse.json({
        error: 'Invalid query parameters',
        details: parseError instanceof z.ZodError ? parseError.issues : 'Invalid format'
      }, { status: 400 })
    }

  } catch (error) {
    console.error('Availability API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = setAvailabilitySchema.parse(body)

    // Validate time range
    const startTime = validatedData.start_time.split(':').map(Number)
    const endTime = validatedData.end_time.split(':').map(Number)
    
    const startMinutes = startTime[0] * 60 + startTime[1]
    const endMinutes = endTime[0] * 60 + endTime[1]
    
    if (startMinutes >= endMinutes) {
      return NextResponse.json({ 
        error: 'Start time must be before end time' 
      }, { status: 400 })
    }

    const { data: availability, error: insertError } = await supabase
      .from('calendar_availability')
      .upsert({
        user_id: user.id,
        ...validatedData
      })
      .select()
      .single()

    if (insertError) {
      console.error('Availability creation error:', insertError)
      return NextResponse.json({ error: 'Failed to set availability' }, { status: 500 })
    }

    return NextResponse.json({
      availability,
      message: 'Availability updated successfully'
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation error',
        details: error.issues
      }, { status: 400 })
    }

    console.error('Availability set API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}