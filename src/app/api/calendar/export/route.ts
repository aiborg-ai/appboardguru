import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { z } from 'zod'

const exportQuerySchema = z.object({
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  event_types: z.array(z.enum(['meeting', 'personal', 'reminder', 'deadline', 'holiday'])).optional(),
  organization_id: z.string().uuid().optional(),
  format: z.enum(['ical', 'json', 'csv']).default('ical')
})

// Helper function to generate iCal format
function generateICalEvent(event: any): string {
  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  }

  const escapeText = (text: string) => {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n')
  }

  let icalEvent = [
    'BEGIN:VEVENT',
    `UID:${event.id}@boardguru.ai`,
    `DTSTAMP:${formatDateTime(event.created_at)}`,
    `DTSTART:${formatDateTime(event.start_datetime)}`,
    `DTEND:${formatDateTime(event.end_datetime)}`,
    `SUMMARY:${escapeText(event.title)}`,
    `CREATED:${formatDateTime(event.created_at)}`,
    `LAST-MODIFIED:${formatDateTime(event.updated_at)}`
  ]

  if (event.description) {
    icalEvent.push(`DESCRIPTION:${escapeText(event.description)}`)
  }

  if (event.location) {
    icalEvent.push(`LOCATION:${escapeText(event.location)}`)
  }

  if (event.virtual_meeting_url) {
    icalEvent.push(`URL:${event.virtual_meeting_url}`)
  }

  if (event.category) {
    icalEvent.push(`CATEGORIES:${escapeText(event.category)}`)
  }

  // Add organizer
  if (event.created_by_user) {
    icalEvent.push(`ORGANIZER;CN=${escapeText(event.created_by_user.full_name || event.created_by_user.email)}:mailto:${event.created_by_user.email}`)
  }

  // Add attendees
  if (event.attendees && event.attendees.length > 0) {
    event.attendees.forEach((attendee: any) => {
      const partstatMap = {
        'pending': 'NEEDS-ACTION',
        'accepted': 'ACCEPTED',
        'declined': 'DECLINED',
        'tentative': 'TENTATIVE'
      } as const
      
      const partstat = partstatMap[attendee.rsvp_status as keyof typeof partstatMap] || 'NEEDS-ACTION'

      icalEvent.push(`ATTENDEE;CN=${escapeText(attendee.user?.full_name || attendee.email)};PARTSTAT=${partstat}:mailto:${attendee.email}`)
    })
  }

  // Add recurrence rule if applicable
  if (event.is_recurring && event.recurrence_rule) {
    const rrule = event.recurrence_rule
    if (rrule.freq) {
      let rruleString = `RRULE:FREQ=${rrule.freq.toUpperCase()}`
      if (rrule.interval) rruleString += `;INTERVAL=${rrule.interval}`
      if (rrule.until) rruleString += `;UNTIL=${formatDateTime(rrule.until)}`
      if (rrule.count) rruleString += `;COUNT=${rrule.count}`
      if (rrule.byday) rruleString += `;BYDAY=${rrule.byday}`
      
      icalEvent.push(rruleString)
    }
  }

  // Add status
  const vcalStatusMap = {
    'confirmed': 'CONFIRMED',
    'tentative': 'TENTATIVE',
    'cancelled': 'CANCELLED'
  } as const
  
  const vcalStatus = vcalStatusMap[event.status as keyof typeof vcalStatusMap] || 'CONFIRMED'
  
  icalEvent.push(`STATUS:${vcalStatus}`)

  icalEvent.push('END:VEVENT')

  return icalEvent.join('\r\n')
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const queryData = exportQuerySchema.parse({
      start_date: searchParams.get('start_date'),
      end_date: searchParams.get('end_date'),
      event_types: searchParams.get('event_types')?.split(','),
      organization_id: searchParams.get('organization_id'),
      format: searchParams.get('format') || 'ical'
    })

    let query = supabase
      .from('calendar_events')
      .select(`
        *,
        attendees:calendar_attendees(*,
          user:users(id, full_name, email, avatar_url)
        ),
        created_by_user:users!calendar_events_created_by_fkey(id, full_name, email)
      `)

    // Date range filter
    if (queryData.start_date && queryData.end_date) {
      query = query
        .gte('start_datetime', queryData.start_date)
        .lte('end_datetime', queryData.end_date)
    }

    // Event types filter
    if (queryData.event_types && queryData.event_types.length > 0) {
      query = query.in('event_type', queryData.event_types)
    }

    // Organization filter
    if (queryData.organization_id) {
      query = query.eq('organization_id', queryData.organization_id)
    }

    query = query.order('start_datetime', { ascending: true })

    const { data: events, error } = await query

    if (error) {
      console.error('Calendar export fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch events for export' }, { status: 500 })
    }

    switch (queryData.format) {
      case 'ical': {
        const icalHeader = [
          'BEGIN:VCALENDAR',
          'VERSION:2.0',
          'PRODID:-//BoardGuru//Calendar Export//EN',
          'CALSCALE:GREGORIAN',
          'METHOD:PUBLISH',
          `X-WR-CALNAME:BoardGuru Calendar`,
          `X-WR-CALDESC:Exported calendar from BoardGuru`
        ].join('\r\n')

        const icalEvents = (events || []).map((event: any) => generateICalEvent(event)).join('\r\n')
        
        const icalFooter = 'END:VCALENDAR'
        
        const icalContent = [icalHeader, icalEvents, icalFooter].join('\r\n')

        return new NextResponse(icalContent, {
          headers: {
            'Content-Type': 'text/calendar; charset=utf-8',
            'Content-Disposition': `attachment; filename="boardguru-calendar-${new Date().toISOString().split('T')[0]}.ics"`
          }
        })
      }

      case 'json': {
        return NextResponse.json({
          calendar: {
            name: 'BoardGuru Calendar',
            events: events || [],
            exported_at: new Date().toISOString(),
            total_events: events?.length || 0
          }
        })
      }

      case 'csv': {
        const csvHeaders = [
          'Title', 'Description', 'Start Date', 'End Date', 'Location', 
          'Type', 'Status', 'Category', 'Attendees'
        ].join(',')

        const csvRows = (events || []).map((event: any) => [
          `"${(event.title || '').replace(/"/g, '""')}"`,
          `"${(event.description || '').replace(/"/g, '""')}"`,
          `"${event.start_datetime}"`,
          `"${event.end_datetime}"`,
          `"${(event.location || '').replace(/"/g, '""')}"`,
          `"${event.event_type}"`,
          `"${event.status}"`,
          `"${event.category || ''}"`,
          `"${(event.attendees || []).map((a: any) => a.email).join('; ')}"`
        ].join(','))

        const csvContent = [csvHeaders, ...csvRows].join('\n')

        return new NextResponse(csvContent, {
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="boardguru-calendar-${new Date().toISOString().split('T')[0]}.csv"`
          }
        })
      }

      default:
        return NextResponse.json({ error: 'Unsupported export format' }, { status: 400 })
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation error',
        details: error.issues
      }, { status: 400 })
    }

    console.error('Calendar export API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}