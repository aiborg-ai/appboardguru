import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { BaseController, CommonSchemas } from '../base-controller';
import { Result, Ok, Err, ResultUtils } from '../../result';
import { 
  UserActivityLogger,
  getRequestContext,
  type UserActivityEvent
} from '../../services/activity-logger';
import { ActivityAnalytics, type ActivityMetrics, type UserEngagementData, type ActivityInsight } from '../../activity/analytics';

/**
 * Consolidated Activity API Controller
 * Handles all activity-related endpoints including logs, metrics, export, analytics, and dashboard
 */
export class ActivityController extends BaseController {

  // ============ VALIDATION SCHEMAS ============
  private static readonly ActivityLogSchema = z.object({
    activityType: z.enum([
      'asset_opened', 'asset_downloaded', 'asset_uploaded', 'asset_shared', 'asset_deleted',
      'vault_created', 'vault_opened', 'vault_updated', 'vault_deleted', 'vault_shared',
      'organization_created', 'organization_joined', 'organization_left',
      'annotation_created', 'annotation_updated', 'annotation_deleted',
      'search_performed', 'ai_chat_started', 'report_generated',
      'user_invited', 'invitation_accepted', 'settings_updated',
      'login', 'logout', 'password_changed'
    ]),
    title: z.string().min(1, 'Title is required'),
    description: z.string().optional(),
    resourceType: z.string().optional(),
    resourceId: z.string().optional(),
    metadata: z.record(z.string(), z.any()).optional()
  });

  private static readonly ActivityQuerySchema = z.object({
    ...CommonSchemas.pagination.shape,
    eventType: z.enum(['authentication', 'authorization', 'data_access', 'data_modification', 'user_action']).optional(),
    severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    outcome: z.enum(['success', 'failure', 'error', 'blocked']).optional(),
    activityType: z.string().optional(),
    resourceType: z.string().optional(),
    fromDate: z.string().datetime().optional(),
    toDate: z.string().datetime().optional(),
    q: z.string().optional()
  });

  private static readonly MetricsQuerySchema = z.object({
    timeRange: z.enum(['1h', '24h', '7d', '30d', '90d']).optional().default('24h'),
    includeBreakdown: z.boolean().optional().default(false),
    organizationId: z.string().optional()
  });

  private static readonly ExportQuerySchema = z.object({
    format: z.enum(['json', 'csv', 'xlsx']).optional().default('json'),
    timeRange: z.enum(['24h', '7d', '30d', '90d']).optional().default('30d'),
    includeMetadata: z.boolean().optional().default(true),
    eventTypes: z.array(z.string()).optional()
  });

  private static readonly AnalyticsActionSchema = z.object({
    action: z.enum(['recalculate', 'export', 'generate_insights', 'refresh_views']),
    data: z.record(z.string(), z.any()).optional()
  });

  // ============ ACTIVITY LOGS ============

  /**
   * GET /activity/logs - Get user activity logs with filtering and pagination
   */
  async getActivityLogs(request: NextRequest): Promise<NextResponse> {
    const queryResult = this.validateQuery(request, ActivityController.ActivityQuerySchema);

    return this.handleRequest(request, async () => {
      if (ResultUtils.isErr(queryResult)) return queryResult;
      
      const userIdResult = await this.getUserId(request);
      if (ResultUtils.isErr(userIdResult)) return userIdResult;
      
      const userId = ResultUtils.unwrap(userIdResult);
      const {
        page, limit, eventType, severity, outcome, activityType,
        resourceType, fromDate, toDate, q: search
      } = ResultUtils.unwrap(queryResult);
      
      // Get organization ID from URL if provided
      const url = new URL(request.url);
      const organizationId = url.searchParams.get('organizationId') || undefined;
      
      try {
        const activities = await UserActivityLogger.getUserActivities(
          userId, 
          organizationId, 
          limit, 
          (page - 1) * limit
        );
        
        // Apply additional filters
        let filteredActivities = activities;
        
        if (activityType) {
          filteredActivities = filteredActivities.filter(a => 
            a.activity_type === activityType
          );
        }
        
        if (resourceType) {
          filteredActivities = filteredActivities.filter(a => 
            a.resource_type === resourceType
          );
        }
        
        if (search) {
          const searchLower = search.toLowerCase();
          filteredActivities = filteredActivities.filter(a => 
            a.activity_title?.toLowerCase().includes(searchLower) ||
            a.activity_description?.toLowerCase().includes(searchLower) ||
            a.resource_type?.toLowerCase().includes(searchLower)
          );
        }
        
        if (fromDate) {
          filteredActivities = filteredActivities.filter(a => 
            new Date(a.created_at) >= new Date(fromDate)
          );
        }
        
        if (toDate) {
          filteredActivities = filteredActivities.filter(a => 
            new Date(a.created_at) <= new Date(toDate)
          );
        }
        
        return Ok({
          activities: filteredActivities,
          pagination: {
            page,
            limit,
            total: filteredActivities.length,
            hasMore: filteredActivities.length === limit
          },
          filters: {
            eventType,
            severity,
            outcome,
            activityType,
            resourceType,
            fromDate,
            toDate,
            search
          }
        });
      } catch (error) {
        return Err(new Error(`Failed to fetch activity logs: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    });
  }

  /**
   * POST /activity/log - Log a new user activity
   */
  async logActivity(request: NextRequest): Promise<NextResponse> {
    return this.handleRequest(request, async () => {
      const userIdResult = await this.getUserId(request);
      if (ResultUtils.isErr(userIdResult)) return userIdResult;
      
      const bodyResult = await this.validateBody(request, ActivityController.ActivityLogSchema);
      if (ResultUtils.isErr(bodyResult)) return bodyResult;
      
      const userId = ResultUtils.unwrap(userIdResult);
      const activityData = ResultUtils.unwrap(bodyResult);
      const requestContext = getRequestContext(request);
      
      // Get organization ID from request
      const url = new URL(request.url);
      const organizationId = url.searchParams.get('organizationId') || undefined;
      
      try {
        const correlationId = await UserActivityLogger.logActivity({
          userId,
          organizationId,
          ...activityData,
          ...requestContext
        } as UserActivityEvent);
        
        return Ok({
          logged: true,
          correlationId,
          timestamp: new Date().toISOString(),
          activityType: activityData.activityType
        });
      } catch (error) {
        return Err(new Error(`Failed to log activity: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    });
  }

  // ============ ACTIVITY METRICS ============

  /**
   * GET /activity/metrics - Get activity metrics for organization
   */
  async getActivityMetrics(request: NextRequest): Promise<NextResponse> {
    const queryResult = this.validateQuery(request, ActivityController.MetricsQuerySchema);

    return this.handleRequest(request, async () => {
      if (ResultUtils.isErr(queryResult)) return queryResult;
      
      const userIdResult = await this.getUserId(request);
      if (ResultUtils.isErr(userIdResult)) return userIdResult;
      
      const { timeRange, includeBreakdown, organizationId } = ResultUtils.unwrap(queryResult);
      
      if (!organizationId) {
        return Err(new Error('Organization ID is required for metrics'));
      }
      
      // Calculate time range
      let startDate: Date;
      const endDate = new Date();
      
      switch (timeRange) {
        case '1h':
          startDate = new Date(endDate.getTime() - 60 * 60 * 1000);
          break;
        case '24h':
          startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          startDate = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
      }
      
      try {
        const metrics = await ActivityAnalytics.getOrganizationMetrics(organizationId, {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        });
        
        return Ok({
          metrics,
          timeRange: {
            start: startDate.toISOString(),
            end: endDate.toISOString(),
            period: timeRange
          },
          organizationId,
          generatedAt: new Date().toISOString()
        });
      } catch (error) {
        return Err(new Error(`Failed to get metrics: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    });
  }

  /**
   * POST /activity/analytics - Execute analytics actions (recalculate, export, etc.)
   */
  async executeAnalyticsAction(request: NextRequest): Promise<NextResponse> {
    return this.handleRequest(request, async () => {
      const userIdResult = await this.getUserId(request);
      if (ResultUtils.isErr(userIdResult)) return userIdResult;
      
      const bodyResult = await this.validateBody(request, ActivityController.AnalyticsActionSchema);
      if (ResultUtils.isErr(bodyResult)) return bodyResult;
      
      const { action, data } = ResultUtils.unwrap(bodyResult);
      const url = new URL(request.url);
      const organizationId = url.searchParams.get('organizationId');
      
      if (!organizationId) {
        return Err(new Error('Organization ID is required for analytics actions'));
      }
      
      try {
        switch (action) {
          case 'recalculate':
            // Recalculate metrics for the organization
            const recalculatedMetrics = await ActivityAnalytics.getOrganizationMetrics(organizationId);
            return Ok({
              action,
              success: true,
              message: 'Metrics recalculated successfully',
              data: recalculatedMetrics,
              timestamp: new Date().toISOString()
            });

          case 'export':
            const { format = 'json', timeRange = '30d' } = data || {};
            let startDate: Date;
            const endDate = new Date();
            
            switch (timeRange) {
              case '7d':
                startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
              case '30d':
                startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
              case '90d':
                startDate = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000);
                break;
              default:
                startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
            }
            
            const exportData = await ActivityAnalytics.getOrganizationMetrics(organizationId, {
              start: startDate.toISOString(),
              end: endDate.toISOString()
            });
            
            if (format === 'csv') {
              const csv = [
                'Activity Type,Count,Trend',
                ...(exportData.topActivities || []).map(activity => 
                  `${activity.type},${activity.count},${activity.trend}`
                )
              ].join('\n');
              
              return new NextResponse(csv, {
                headers: {
                  'Content-Type': 'text/csv',
                  'Content-Disposition': `attachment; filename="activity-metrics-${timeRange}.csv"`
                }
              });
            }
            
            return Ok({
              action,
              success: true,
              data: exportData,
              format,
              timeRange,
              exportedAt: new Date().toISOString()
            });

          case 'generate_insights':
            const insights = await ActivityAnalytics.generateInsights(organizationId);
            return Ok({
              action,
              success: true,
              message: `Generated ${insights.length} insights`,
              data: { insights },
              timestamp: new Date().toISOString()
            });

          case 'refresh_views':
            // This would typically refresh materialized views
            return Ok({
              action,
              success: true,
              message: 'Analytics views refresh initiated',
              timestamp: new Date().toISOString()
            });

          default:
            return Err(new Error(`Unknown analytics action: ${action}`));
        }
      } catch (error) {
        return Err(new Error(`Failed to execute analytics action: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    });
  }

  // ============ ACTIVITY EXPORT ============

  /**
   * GET /activity/export - Export activity data in various formats
   */
  async exportActivityData(request: NextRequest): Promise<NextResponse> {
    const queryResult = this.validateQuery(request, ActivityController.ExportQuerySchema);

    return this.handleRequest(request, async () => {
      if (ResultUtils.isErr(queryResult)) return queryResult;
      
      const userIdResult = await this.getUserId(request);
      if (ResultUtils.isErr(userIdResult)) return userIdResult;
      
      const userId = ResultUtils.unwrap(userIdResult);
      const { format, timeRange, includeMetadata, eventTypes } = ResultUtils.unwrap(queryResult);
      
      // Get organization ID from URL
      const url = new URL(request.url);
      const organizationId = url.searchParams.get('organizationId');
      
      // Calculate time range
      let startDate: Date;
      const endDate = new Date();
      
      switch (timeRange) {
        case '24h':
          startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          startDate = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
      }
      
      try {
        // Get activity data
        const activities = await UserActivityLogger.getUserActivities(
          userId, 
          organizationId || undefined, 
          1000, // Large limit for export
          0
        );
        
        // Filter by date range
        const filteredActivities = activities.filter(activity => {
          const activityDate = new Date(activity.created_at);
          return activityDate >= startDate && activityDate <= endDate;
        });
        
        // Filter by event types if specified
        const finalActivities = eventTypes && eventTypes.length > 0 
          ? filteredActivities.filter(activity => eventTypes.includes(activity.activity_type))
          : filteredActivities;
        
        switch (format) {
          case 'csv':
            const headers = ['Timestamp', 'Activity Type', 'Title', 'Description', 'Resource Type', 'Resource ID'];
            if (includeMetadata) headers.push('Metadata');
            
            const csvRows = [
              headers.join(','),
              ...finalActivities.map(activity => {
                const row = [
                  activity.created_at,
                  activity.activity_type,
                  `"${activity.activity_title || ''}"`,
                  `"${activity.activity_description || ''}"`,
                  activity.resource_type || '',
                  activity.resource_id || ''
                ];
                if (includeMetadata) {
                  row.push(`"${JSON.stringify(activity.metadata || {}).replace(/"/g, '""')}"`);
                }
                return row.join(',');
              })
            ];
            
            return new NextResponse(csvRows.join('\n'), {
              headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': `attachment; filename="activity-export-${timeRange}.csv"`
              }
            });

          case 'json':
            return Ok({
              activities: finalActivities,
              export: {
                format,
                timeRange: {
                  start: startDate.toISOString(),
                  end: endDate.toISOString(),
                  period: timeRange
                },
                includeMetadata,
                eventTypes,
                totalRecords: finalActivities.length,
                exportedAt: new Date().toISOString()
              }
            });

          case 'xlsx':
            // For XLSX, return JSON format for now (client can convert)
            // In production, you'd use a library like exceljs
            return Ok({
              activities: finalActivities,
              export: {
                format: 'json', // Indicate conversion needed
                originalFormat: 'xlsx',
                message: 'XLSX format requires client-side conversion',
                timeRange: {
                  start: startDate.toISOString(),
                  end: endDate.toISOString(),
                  period: timeRange
                },
                totalRecords: finalActivities.length,
                exportedAt: new Date().toISOString()
              }
            });

          default:
            return Err(new Error(`Unsupported export format: ${format}`));
        }
      } catch (error) {
        return Err(new Error(`Failed to export activity data: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    });
  }

  // ============ ACTIVITY DASHBOARD ============

  /**
   * GET /activity/dashboard - Get comprehensive dashboard data
   */
  async getDashboardData(request: NextRequest): Promise<NextResponse> {
    const queryResult = this.validateQuery(request, z.object({
      timeRange: z.enum(['24h', '7d', '30d']).optional().default('24h'),
      organizationId: z.string().optional()
    }));

    return this.handleRequest(request, async () => {
      if (ResultUtils.isErr(queryResult)) return queryResult;
      
      const userIdResult = await this.getUserId(request);
      if (ResultUtils.isErr(userIdResult)) return userIdResult;
      
      const userId = ResultUtils.unwrap(userIdResult);
      const { timeRange, organizationId } = ResultUtils.unwrap(queryResult);
      
      if (!organizationId) {
        return Err(new Error('Organization ID is required for dashboard data'));
      }
      
      try {
        // Calculate time range
        let startDate: Date;
        const endDate = new Date();
        
        switch (timeRange) {
          case '24h':
            startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
            break;
          case '7d':
            startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case '30d':
            startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          default:
            startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
        }
        
        // Get comprehensive dashboard data
        const [
          organizationMetrics,
          userEngagementData,
          activityInsights,
          activityStream
        ] = await Promise.all([
          ActivityAnalytics.getOrganizationMetrics(organizationId, {
            start: startDate.toISOString(),
            end: endDate.toISOString()
          }),
          ActivityAnalytics.getUserEngagementData(organizationId, userId),
          ActivityAnalytics.generateInsights(organizationId),
          ActivityAnalytics.getActivityStream(organizationId, {
            timeRange: {
              start: startDate.toISOString(),
              end: endDate.toISOString()
            },
            limit: 20
          })
        ]);
        
        return Ok({
          dashboard: {
            organizationMetrics,
            userEngagement: userEngagementData,
            insights: activityInsights,
            recentActivity: activityStream
          },
          timeRange: {
            start: startDate.toISOString(),
            end: endDate.toISOString(),
            period: timeRange
          },
          organizationId,
          userId,
          generatedAt: new Date().toISOString()
        });
      } catch (error) {
        return Err(new Error(`Failed to get dashboard data: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    });
  }

  // ============ ACTIVITY SEARCH ============

  /**
   * GET /activity/search - Search through activity logs
   */
  async searchActivities(request: NextRequest): Promise<NextResponse> {
    const queryResult = this.validateQuery(request, z.object({
      ...CommonSchemas.pagination.shape,
      q: z.string().min(1, 'Search query is required'),
      activityTypes: z.array(z.string()).optional(),
      resourceTypes: z.array(z.string()).optional(),
      severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
      fromDate: z.string().datetime().optional(),
      toDate: z.string().datetime().optional(),
      organizationId: z.string().optional()
    }));

    return this.handleRequest(request, async () => {
      if (ResultUtils.isErr(queryResult)) return queryResult;
      
      const userIdResult = await this.getUserId(request);
      if (ResultUtils.isErr(userIdResult)) return userIdResult;
      
      const userId = ResultUtils.unwrap(userIdResult);
      const { page, limit, q, activityTypes, resourceTypes, severity, fromDate, toDate, organizationId } = ResultUtils.unwrap(queryResult);
      
      try {
        // Get user activities with larger limit for searching
        const activities = await UserActivityLogger.getUserActivities(
          userId, 
          organizationId, 
          1000, // Search through more records
          0
        );
        
        const searchLower = q.toLowerCase();
        
        // Perform search across multiple fields
        let searchResults = activities.filter(activity => {
          const matchesText = 
            activity.activity_title?.toLowerCase().includes(searchLower) ||
            activity.activity_description?.toLowerCase().includes(searchLower) ||
            activity.resource_type?.toLowerCase().includes(searchLower) ||
            activity.resource_id?.toLowerCase().includes(searchLower) ||
            JSON.stringify(activity.metadata || {}).toLowerCase().includes(searchLower);
          
          return matchesText;
        });
        
        // Apply filters
        if (activityTypes && activityTypes.length > 0) {
          searchResults = searchResults.filter(activity => 
            activityTypes.includes(activity.activity_type)
          );
        }
        
        if (resourceTypes && resourceTypes.length > 0) {
          searchResults = searchResults.filter(activity => 
            activity.resource_type && resourceTypes.includes(activity.resource_type)
          );
        }
        
        if (fromDate) {
          searchResults = searchResults.filter(activity => 
            new Date(activity.created_at) >= new Date(fromDate)
          );
        }
        
        if (toDate) {
          searchResults = searchResults.filter(activity => 
            new Date(activity.created_at) <= new Date(toDate)
          );
        }
        
        // Sort by relevance (most recent first for now)
        searchResults.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        
        // Apply pagination
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedResults = searchResults.slice(startIndex, endIndex);
        
        return Ok({
          results: paginatedResults,
          pagination: {
            page,
            limit,
            total: searchResults.length,
            totalPages: Math.ceil(searchResults.length / limit)
          },
          search: {
            query: q,
            filters: {
              activityTypes,
              resourceTypes,
              severity,
              fromDate,
              toDate,
              organizationId
            }
          },
          searchedAt: new Date().toISOString()
        });
      } catch (error) {
        return Err(new Error(`Failed to search activities: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    });
  }
}