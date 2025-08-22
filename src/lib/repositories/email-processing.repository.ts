import { BaseRepository } from './base.repository'
import { Result, success, failure, RepositoryError } from './result'
import { 
  EmailProcessingLog, 
  EmailProcessingStatus,
  EmailProcessingResult
} from '../../types/email-processing'
import { UserId, OrganizationId, AssetId } from '../../types/branded'
import { QueryOptions, PaginatedResult, FilterCriteria } from './types'

export class EmailProcessingRepository extends BaseRepository {
  protected readonly tableName = 'email_processing_logs'

  /**
   * Create a new email processing log entry
   */
  async createProcessingLog(data: {
    messageId: string
    fromEmail: string
    toEmail: string
    subject: string
    status: EmailProcessingStatus
    userId?: UserId
    organizationId?: OrganizationId
  }): Promise<Result<EmailProcessingLog>> {
    return this.executeQuery(async () => {
      const { data: result, error } = await this.supabase
        .from(this.tableName)
        .insert({
          message_id: data.messageId,
          from_email: data.fromEmail,
          to_email: data.toEmail,
          subject: data.subject,
          status: data.status,
          user_id: data.userId,
          organization_id: data.organizationId,
          assets_created: [],
          processing_time_ms: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        throw new RepositoryError(
          `Failed to create email processing log: ${error.message}`,
          'CREATE_PROCESSING_LOG_FAILED',
          { messageId: data.messageId, error }
        )
      }

      return this.mapToEmailProcessingLog(result)
    })
  }

  /**
   * Update email processing status and results
   */
  async updateProcessingStatus(
    id: string,
    updates: {
      status: EmailProcessingStatus
      assetsCreated?: AssetId[]
      errorMessage?: string
      processingTimeMs?: number
    }
  ): Promise<Result<EmailProcessingLog>> {
    return this.executeQuery(async () => {
      const { data: result, error } = await this.supabase
        .from(this.tableName)
        .update({
          status: updates.status,
          assets_created: updates.assetsCreated || [],
          error_message: updates.errorMessage,
          processing_time_ms: updates.processingTimeMs || 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        throw new RepositoryError(
          `Failed to update email processing status: ${error.message}`,
          'UPDATE_PROCESSING_STATUS_FAILED',
          { id, error }
        )
      }

      return this.mapToEmailProcessingLog(result)
    })
  }

  /**
   * Find email processing log by message ID
   */
  async findByMessageId(messageId: string): Promise<Result<EmailProcessingLog | null>> {
    return this.executeQuery(async () => {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select()
        .eq('message_id', messageId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null // No record found
        }
        throw new RepositoryError(
          `Failed to find email processing log by message ID: ${error.message}`,
          'FIND_BY_MESSAGE_ID_FAILED',
          { messageId, error }
        )
      }

      return this.mapToEmailProcessingLog(data)
    })
  }

  /**
   * Find email processing logs by user with pagination
   */
  async findByUser(
    userId: UserId,
    options: QueryOptions = {}
  ): Promise<Result<PaginatedResult<EmailProcessingLog>>> {
    return this.executeQuery(async () => {
      let query = this.supabase
        .from(this.tableName)
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (options.limit) {
        query = query.limit(options.limit)
      }
      
      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 50) - 1)
      }

      const { data, error, count } = await query

      if (error) {
        throw new RepositoryError(
          `Failed to find email processing logs by user: ${error.message}`,
          'FIND_BY_USER_FAILED',
          { userId, error }
        )
      }

      const logs = (data || []).map(this.mapToEmailProcessingLog)
      
      return {
        data: logs,
        total: count || 0,
        page: Math.floor((options.offset || 0) / (options.limit || 50)) + 1,
        pageSize: options.limit || 50
      }
    })
  }

  /**
   * Get email processing statistics for a user
   */
  async getUserProcessingStats(userId: UserId): Promise<Result<{
    totalEmails: number
    successfulEmails: number
    failedEmails: number
    totalAssetsCreated: number
    lastProcessedAt?: Date
  }>> {
    return this.executeQuery(async () => {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('status, assets_created, created_at')
        .eq('user_id', userId)

      if (error) {
        throw new RepositoryError(
          `Failed to get user processing stats: ${error.message}`,
          'GET_USER_STATS_FAILED',
          { userId, error }
        )
      }

      const logs = data || []
      const stats = {
        totalEmails: logs.length,
        successfulEmails: logs.filter(log => log.status === 'completed').length,
        failedEmails: logs.filter(log => log.status === 'failed').length,
        totalAssetsCreated: logs.reduce((sum, log) => sum + (log.assets_created?.length || 0), 0),
        lastProcessedAt: logs.length > 0 
          ? new Date(Math.max(...logs.map(log => new Date(log.created_at).getTime())))
          : undefined
      }

      return stats
    })
  }

  /**
   * Check rate limit for user email processing
   */
  async checkRateLimit(userId: UserId, windowHours: number = 1): Promise<Result<{
    count: number
    withinLimit: boolean
    resetAt: Date
  }>> {
    return this.executeQuery(async () => {
      const windowStart = new Date()
      windowStart.setHours(windowStart.getHours() - windowHours)

      const { data, error, count } = await this.supabase
        .from(this.tableName)
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', windowStart.toISOString())

      if (error) {
        throw new RepositoryError(
          `Failed to check rate limit: ${error.message}`,
          'CHECK_RATE_LIMIT_FAILED',
          { userId, error }
        )
      }

      const resetAt = new Date(windowStart)
      resetAt.setHours(resetAt.getHours() + windowHours)

      return {
        count: count || 0,
        withinLimit: (count || 0) < 10, // Default limit of 10 emails per hour
        resetAt
      }
    })
  }

  /**
   * Clean up old processing logs (for maintenance)
   */
  async cleanupOldLogs(daysOld: number = 30): Promise<Result<number>> {
    return this.executeQuery(async () => {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysOld)

      const { data, error } = await this.supabase
        .from(this.tableName)
        .delete()
        .lt('created_at', cutoffDate.toISOString())
        .select('id')

      if (error) {
        throw new RepositoryError(
          `Failed to cleanup old logs: ${error.message}`,
          'CLEANUP_LOGS_FAILED',
          { daysOld, error }
        )
      }

      return (data || []).length
    })
  }

  /**
   * Map database row to EmailProcessingLog type
   */
  private mapToEmailProcessingLog(row: any): EmailProcessingLog {
    return {
      id: row.id,
      messageId: row.message_id,
      fromEmail: row.from_email,
      toEmail: row.to_email,
      subject: row.subject,
      status: row.status as EmailProcessingStatus,
      userId: row.user_id as UserId,
      organizationId: row.organization_id as OrganizationId,
      assetsCreated: row.assets_created as AssetId[],
      errorMessage: row.error_message,
      processingTimeMs: row.processing_time_ms,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    }
  }

  /**
   * Execute query with error handling
   */
  private async executeQuery<T>(query: () => Promise<T>): Promise<Result<T>> {
    try {
      const result = await query()
      return success(result)
    } catch (error) {
      if (error instanceof RepositoryError) {
        return failure(error)
      }
      return failure(new RepositoryError(
        `Unexpected error in email processing repository: ${error}`,
        'UNEXPECTED_ERROR',
        { error }
      ))
    }
  }
}