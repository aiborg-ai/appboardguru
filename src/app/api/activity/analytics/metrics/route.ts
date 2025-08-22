import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { ActivityAnalytics } from '@/lib/activity/analytics'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

    if (authError || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: user } = await (supabase as any)
      .from('users')
      .select('organization_id, role')
      .eq('id', authUser.id)
      .single()

    if (!(user as any)?.organization_id) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const url = new URL(request.url)
    const timeRange = url.searchParams.get('timeRange') || '24h'
    // const includeBreakdown = url.searchParams.get('includeBreakdown') === 'true'

    let startDate: Date
    const endDate = new Date()

    switch (timeRange) {
      case '1h':
        startDate = new Date(endDate.getTime() - 60 * 60 * 1000)
        break
      case '24h':
        startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000)
        break
      case '7d':
        startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '30d':
        startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      default:
        startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000)
    }

    const metrics = await ActivityAnalytics.getOrganizationMetrics(
      (user as any)?.organization_id,
      { start: startDate.toISOString(), end: endDate.toISOString() }
    )

    return NextResponse.json({
      success: true,
      data: metrics as any,
      meta: {
        timeRange,
        organizationId: (user as any)?.organization_id,
        generatedAt: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Error fetching activity metrics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

    if (authError || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: user } = await (supabase as any)
      .from('users')
      .select('organization_id, role')
      .eq('id', authUser.id)
      .single()

    if (!(user as any)?.organization_id || (user as any)?.role !== 'admin') {
      return NextResponse.json({ error: 'Insufficient privileges' }, { status: 403 })
    }

    const body = await request.json()
    const { action, data } = body

    switch (action) {
      case 'recalculate':
        // TODO: Implement ActivityAnalytics.recalculateMetrics method
        return NextResponse.json({ success: true, message: 'Metrics recalculation not implemented yet' })

      case 'export': {
        const { format = 'json', timeRange = '30d' } = data
        let startDate: Date
        const endDate = new Date()

        switch (timeRange) {
          case '7d':
            startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000)
            break
          case '30d':
            startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000)
            break
          case '90d':
            startDate = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000)
            break
          default:
            startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000)
        }

        const exportData = await ActivityAnalytics.getOrganizationMetrics(
          (user as any)?.organization_id,
          { start: startDate.toISOString(), end: endDate.toISOString() }
        )

        if (format === 'csv') {
          const csv = [
            'Activity Type,Count,Trend',
            ...((exportData as any)?.topActivities || []).map((activity: any) =>
              `${(activity as any)?.type},${(activity as any)?.count},${(activity as any)?.trend}`
            )
          ].join('\n')

          return new NextResponse(csv, {
            headers: {
              'Content-Type': 'text/csv',
              'Content-Disposition': `attachment; filename="activity-metrics-${timeRange}.csv"`
            }
          })
        }

        return NextResponse.json({
          success: true,
          data: exportData as any,
          meta: {
            format,
            timeRange,
            exportedAt: new Date().toISOString()
          }
        })
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

  } catch (error) {
    console.error('Error processing metrics request:', error)
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}