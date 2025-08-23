/**
 * Email Processing Statistics API Endpoint
 * Provides detailed statistics about user's email-to-asset processing
 */

import { NextRequest, NextResponse } from 'next/server'
import { EmailProcessingRepository } from '../../../../lib/repositories/email-processing.repository'
import { createSupabaseClient } from '../../../../lib/supabase/client'
import { createUserId } from '../../../../lib/utils/branded-type-helpers'

/**
 * GET /api/email/stats
 * Get comprehensive email processing statistics for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseClient()
    
    // Get current authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      )
    }

    // Parse query parameters for time range filtering
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '30d' // 7d, 30d, 90d, all
    
    // Initialize repository
    const emailRepo = new EmailProcessingRepository(supabase)
    
    // Create branded user ID
    const userIdResult = createUserId(user.id)
    if (!userIdResult.success) {
      return NextResponse.json(
        { error: 'Invalid user ID', message: userIdResult.error.message },
        { status: 400 }
      )
    }

    // Get user's basic processing statistics
    const statsResult = await emailRepo.getUserProcessingStats(userIdResult.data)
    if (!statsResult.success) {
      console.error('Failed to fetch email processing stats:', statsResult.error)
      return NextResponse.json(
        { error: 'Failed to fetch statistics', message: statsResult.error.message },
        { status: 500 }
      )
    }

    const basicStats = statsResult.data

    // Get current rate limit status
    const rateLimitResult = await emailRepo.checkRateLimit(userIdResult.data, 1)
    const rateLimit = rateLimitResult.success ? rateLimitResult.data : {
      count: 0,
      withinLimit: true,
      resetAt: new Date()
    }

    // Calculate additional metrics using raw queries for more detailed insights
    const { data: detailedStats, error: detailedError } = await supabase
      .from('email_processing_logs')
      .select('status, processing_time_ms, created_at, assets_created')
      .eq('user_id', user.id)
      .gte('created_at', getDateForPeriod(period))
      .order('created_at', { ascending: false })

    if (detailedError) {
      console.error('Failed to fetch detailed stats:', detailedError)
    }

    const logs = detailedStats || []

    // Calculate detailed metrics
    const periodStats = calculatePeriodStats(logs)

    // Get file type breakdown from assets created via email
    const { data: assetStats, error: assetError } = await supabase
      .from('assets')
      .select('file_type, file_size, created_at')
      .eq('owner_id', user.id)
      .eq('source_type', 'email')
      .gte('created_at', getDateForPeriod(period))

    const fileTypeBreakdown = calculateFileTypeBreakdown(assetStats || [])

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          totalEmails: basicStats.totalEmails,
          successfulEmails: basicStats.successfulEmails,
          failedEmails: basicStats.failedEmails,
          totalAssetsCreated: basicStats.totalAssetsCreated,
          successRate: basicStats.totalEmails > 0 
            ? Math.round((basicStats.successfulEmails / basicStats.totalEmails) * 100) 
            : 0,
          lastProcessedAt: basicStats.lastProcessedAt?.toISOString() || null,
          averageProcessingTime: periodStats.averageProcessingTime
        },
        period: {
          range: period,
          emails: periodStats.totalEmails,
          successful: periodStats.successfulEmails,
          failed: periodStats.failedEmails,
          rejected: periodStats.rejectedEmails,
          assetsCreated: periodStats.assetsCreated,
          successRate: periodStats.successRate,
          averageProcessingTime: periodStats.averageProcessingTime,
          dailyBreakdown: periodStats.dailyBreakdown
        },
        rateLimit: {
          currentHour: {
            count: rateLimit.count,
            limit: 10,
            remaining: Math.max(0, 10 - rateLimit.count),
            resetAt: rateLimit.resetAt.toISOString(),
            withinLimit: rateLimit.withinLimit
          },
          recommendations: getRateLimitRecommendations(rateLimit.count)
        },
        fileTypes: fileTypeBreakdown,
        insights: generateInsights(basicStats, periodStats, rateLimit),
        tips: getOptimizationTips(basicStats, periodStats)
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Email stats API error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Failed to fetch email statistics'
      },
      { status: 500 }
    )
  }
}

/**
 * Get date for period filtering
 */
function getDateForPeriod(period: string): string {
  const now = new Date()
  switch (period) {
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
    case '90d':
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString()
    default:
      return new Date(0).toISOString() // All time
  }
}

/**
 * Calculate detailed statistics for the period
 */
function calculatePeriodStats(logs: any[]) {
  const totalEmails = logs.length
  const successfulEmails = logs.filter(log => log.status === 'completed').length
  const failedEmails = logs.filter(log => log.status === 'failed').length
  const rejectedEmails = logs.filter(log => log.status === 'rejected').length
  const assetsCreated = logs.reduce((sum, log) => sum + (log.assets_created?.length || 0), 0)
  
  const successRate = totalEmails > 0 ? Math.round((successfulEmails / totalEmails) * 100) : 0
  
  const averageProcessingTime = logs.length > 0 
    ? Math.round(logs.reduce((sum, log) => sum + (log.processing_time_ms || 0), 0) / logs.length)
    : 0

  // Create daily breakdown for the last 30 days
  const dailyBreakdown = createDailyBreakdown(logs)

  return {
    totalEmails,
    successfulEmails,
    failedEmails,
    rejectedEmails,
    assetsCreated,
    successRate,
    averageProcessingTime,
    dailyBreakdown
  }
}

/**
 * Create daily breakdown for visualization
 */
function createDailyBreakdown(logs: any[]) {
  const breakdown: { [key: string]: { successful: number; failed: number; rejected: number } } = {}
  
  // Initialize last 30 days
  for (let i = 29; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    const dateKey = date.toISOString().split('T')[0]
    breakdown[dateKey] = { successful: 0, failed: 0, rejected: 0 }
  }

  // Populate with actual data
  logs.forEach(log => {
    const dateKey = new Date(log.created_at).toISOString().split('T')[0]
    if (breakdown[dateKey]) {
      if (log.status === 'completed') breakdown[dateKey].successful++
      else if (log.status === 'failed') breakdown[dateKey].failed++
      else if (log.status === 'rejected') breakdown[dateKey].rejected++
    }
  })

  return Object.entries(breakdown).map(([date, stats]) => ({
    date,
    ...stats,
    total: stats.successful + stats.failed + stats.rejected
  }))
}

/**
 * Calculate file type breakdown from assets
 */
function calculateFileTypeBreakdown(assets: any[]) {
  const breakdown: { [key: string]: { count: number; totalSize: number } } = {}
  
  assets.forEach(asset => {
    const fileType = asset.file_type || 'unknown'
    if (!breakdown[fileType]) {
      breakdown[fileType] = { count: 0, totalSize: 0 }
    }
    breakdown[fileType].count++
    breakdown[fileType].totalSize += asset.file_size || 0
  })

  return Object.entries(breakdown)
    .map(([type, stats]) => ({
      fileType: type,
      count: stats.count,
      totalSizeMB: Math.round(stats.totalSize / (1024 * 1024) * 100) / 100,
      averageSizeMB: stats.count > 0 
        ? Math.round((stats.totalSize / stats.count) / (1024 * 1024) * 100) / 100 
        : 0
    }))
    .sort((a, b) => b.count - a.count)
}

/**
 * Generate insights based on user's email processing patterns
 */
function generateInsights(basicStats: any, periodStats: any, rateLimit: any) {
  const insights = []

  // Success rate insight
  if (periodStats.successRate >= 90) {
    insights.push({
      type: 'success',
      title: 'Excellent Success Rate',
      message: `Your email-to-asset processing has a ${periodStats.successRate}% success rate. Great job following the guidelines!`
    })
  } else if (periodStats.successRate < 70) {
    insights.push({
      type: 'warning',
      title: 'Low Success Rate',
      message: `Your success rate is ${periodStats.successRate}%. Check your email format and file types to improve processing.`
    })
  }

  // Rate limit insight
  if (rateLimit.count > 7) {
    insights.push({
      type: 'info',
      title: 'Approaching Rate Limit',
      message: `You've sent ${rateLimit.count}/10 emails this hour. Consider spacing out your submissions.`
    })
  }

  // Processing time insight
  if (periodStats.averageProcessingTime > 0) {
    if (periodStats.averageProcessingTime > 3000) {
      insights.push({
        type: 'info',
        title: 'Processing Time',
        message: `Average processing time is ${Math.round(periodStats.averageProcessingTime / 1000)}s. Large files may take longer to process.`
      })
    }
  }

  // Assets created insight
  if (periodStats.assetsCreated > 20) {
    insights.push({
      type: 'success',
      title: 'High Productivity',
      message: `You've created ${periodStats.assetsCreated} assets via email this period. Very productive!`
    })
  }

  return insights
}

/**
 * Get optimization tips based on usage patterns
 */
function getOptimizationTips(basicStats: any, periodStats: any) {
  const tips = []

  if (periodStats.failedEmails > 0) {
    tips.push('Check file sizes: Keep attachments under 50MB for reliable processing')
    tips.push('Verify file types: Only PDF, DOC, XLS, PPT, and image files are supported')
  }

  if (periodStats.rejectedEmails > 0) {
    tips.push('Subject format: Always start emails with "Asset::" prefix')
    tips.push('Email verification: Ensure you\'re sending from your registered email address')
  }

  tips.push('Batch processing: Space out multiple email submissions to avoid rate limits')
  tips.push('Organization: Use descriptive subject lines to help categorize your assets')

  return tips
}

/**
 * Get rate limit recommendations
 */
function getRateLimitRecommendations(currentCount: number) {
  if (currentCount >= 10) {
    return ['You have reached the hourly limit. Please wait before sending more emails.']
  } else if (currentCount >= 7) {
    return ['You are approaching the hourly limit (10 emails/hour). Consider spacing out submissions.']
  } else if (currentCount >= 5) {
    return ['You have used half of your hourly email quota. Plan accordingly for urgent submissions.']
  } else {
    return ['You have plenty of email quota remaining for this hour.']
  }
}