import { BaseRepository } from './base.repository'
import { Result, success, failure, RepositoryError } from './result'
import { 
  QueryOptions, 
  PaginatedResult,
  UserId
} from './types'
import { Database } from '../../types/database'

type FeedbackSubmission = Database['public']['Tables']['feedback_submissions']['Row']
type FeedbackSubmissionInsert = Database['public']['Tables']['feedback_submissions']['Insert']
type FeedbackSubmissionUpdate = Database['public']['Tables']['feedback_submissions']['Update']

export interface FeedbackWithUser extends FeedbackSubmission {
  user?: {
    id: string
    email: string
    full_name: string
  }
}

export class FeedbackRepository extends BaseRepository {
  protected getEntityName(): string {
    return 'Feedback'
  }

  protected getSearchFields(): string[] {
    return ['title', 'description', 'category', 'type']
  }

  /**
   * Create a new feedback submission
   */
  async create(
    feedbackData: Omit<FeedbackSubmissionInsert, 'id' | 'created_at' | 'updated_at'>
  ): Promise<Result<FeedbackSubmission>> {
    try {
      // Validate required fields
      const validationResult = this.validateRequired(feedbackData, ['title', 'description', 'type'])
      if (!validationResult.success) return validationResult

      // Get current user if authenticated (feedback can be anonymous)
      const userResult = await this.getCurrentUserId()
      
      const { data, error } = await this.supabase
        .from('feedback_submissions')
        .insert({
          ...feedbackData,
          user_id: userResult.success ? userResult.data : null,
          status: 'submitted'
        })
        .select()
        .single()

      if (error) {
        return failure(RepositoryError.fromSupabaseError(error, 'create'))
      }

      // Log activity if user is authenticated
      if (userResult.success && feedbackData.organization_id) {
        await this.logActivity({
          user_id: userResult.data,
          organization_id: feedbackData.organization_id,
          event_type: 'feedback.submitted',
          event_category: 'user_engagement',
          action: 'create',
          resource_type: 'feedback',
          resource_id: data.id,
          event_description: `Submitted feedback: ${data.title}`,
          outcome: 'success',
          severity: 'low'
        })
      }

      return success(data)
    } catch (error) {
      return failure(RepositoryError.internal('Failed to create feedback', error))
    }
  }

  /**
   * Find all feedback submissions with optional filters
   */
  async findAll(
    options: QueryOptions & {
      type?: string
      category?: string
      status?: string
      priority?: string
      organization_id?: string
    } = {}
  ): Promise<Result<PaginatedResult<FeedbackWithUser>>> {
    try {
      const userResult = await this.getCurrentUserId()
      if (!userResult.success) return userResult

      // Note: This endpoint should be restricted to admins/moderators
      // For now, we'll allow all authenticated users but this should be enhanced

      let query = this.supabase
        .from('feedback_submissions')
        .select(`
          *,
          user:users (
            id,
            email,
            full_name
          )
        `, { count: 'exact' })

      // Apply specific filters
      if (options.type) {
        query = query.eq('type', options.type)
      }
      if (options.category) {
        query = query.eq('category', options.category)
      }
      if (options.status) {
        query = query.eq('status', options.status)
      }
      if (options.priority) {
        query = query.eq('priority', options.priority)
      }
      if (options.organization_id) {
        query = query.eq('organization_id', options.organization_id)
      }

      // Default ordering by creation date (newest first)
      if (!options.sortBy) {
        query = query.order('created_at', { ascending: false })
      }

      query = this.applyQueryOptions(query, options)

      const { data, error, count } = await query

      if (error) {
        return failure(RepositoryError.fromSupabaseError(error, 'findAll'))
      }

      return this.createPaginatedResult(data || [], count, options)
    } catch (error) {
      return failure(RepositoryError.internal('Failed to find feedback submissions', error))
    }
  }

  /**
   * Find feedback by ID
   */
  async findById(feedbackId: string): Promise<Result<FeedbackWithUser>> {
    try {
      const userResult = await this.getCurrentUserId()
      if (!userResult.success) return userResult

      const { data, error } = await this.supabase
        .from('feedback_submissions')
        .select(`
          *,
          user:users (
            id,
            email,
            full_name
          )
        `)
        .eq('id', feedbackId)
        .single()

      if (error) {
        return failure(RepositoryError.fromSupabaseError(error, 'findById'))
      }

      return success(data)
    } catch (error) {
      return failure(RepositoryError.internal('Failed to find feedback by ID', error))
    }
  }

  /**
   * Update feedback submission status/priority (admin only)
   */
  async update(
    feedbackId: string,
    updates: Pick<FeedbackSubmissionUpdate, 'status' | 'priority' | 'admin_notes' | 'assigned_to' | 'resolution_notes'>
  ): Promise<Result<FeedbackSubmission>> {
    try {
      const userResult = await this.getCurrentUserId()
      if (!userResult.success) return userResult

      // First get the current feedback to check if it exists
      const currentFeedbackResult = await this.findById(feedbackId)
      if (!currentFeedbackResult.success) return currentFeedbackResult

      const currentFeedback = currentFeedbackResult.data

      // TODO: Add proper admin role checking here
      // For now, any authenticated user can update (should be restricted to admins)

      const { data, error } = await this.supabase
        .from('feedback_submissions')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
          updated_by: userResult.data
        })
        .eq('id', feedbackId)
        .select()
        .single()

      if (error) {
        return failure(RepositoryError.fromSupabaseError(error, 'update'))
      }

      // Log activity if organization is associated
      if (currentFeedback.organization_id) {
        await this.logActivity({
          user_id: userResult.data,
          organization_id: currentFeedback.organization_id,
          event_type: 'feedback.updated',
          event_category: 'user_engagement',
          action: 'update',
          resource_type: 'feedback',
          resource_id: feedbackId,
          event_description: `Updated feedback: ${currentFeedback.title}`,
          outcome: 'success',
          severity: 'low',
          details: updates
        })
      }

      return success(data)
    } catch (error) {
      return failure(RepositoryError.internal('Failed to update feedback', error))
    }
  }

  /**
   * Delete feedback submission (admin only)
   */
  async delete(feedbackId: string): Promise<Result<void>> {
    try {
      const userResult = await this.getCurrentUserId()
      if (!userResult.success) return userResult

      // First get the current feedback to check if it exists
      const currentFeedbackResult = await this.findById(feedbackId)
      if (!currentFeedbackResult.success) return currentFeedbackResult

      const currentFeedback = currentFeedbackResult.data

      // TODO: Add proper admin role checking here
      // For now, any authenticated user can delete (should be restricted to admins)

      const { error } = await this.supabase
        .from('feedback_submissions')
        .delete()
        .eq('id', feedbackId)

      if (error) {
        return failure(RepositoryError.fromSupabaseError(error, 'delete'))
      }

      // Log activity if organization is associated
      if (currentFeedback.organization_id) {
        await this.logActivity({
          user_id: userResult.data,
          organization_id: currentFeedback.organization_id,
          event_type: 'feedback.deleted',
          event_category: 'user_engagement',
          action: 'delete',
          resource_type: 'feedback',
          resource_id: feedbackId,
          event_description: `Deleted feedback: ${currentFeedback.title}`,
          outcome: 'success',
          severity: 'medium'
        })
      }

      return success(undefined)
    } catch (error) {
      return failure(RepositoryError.internal('Failed to delete feedback', error))
    }
  }

  /**
   * Find feedback by user (for users to see their own submissions)
   */
  async findByUser(
    userId: UserId,
    options: QueryOptions = {}
  ): Promise<Result<PaginatedResult<FeedbackSubmission>>> {
    try {
      const currentUserResult = await this.getCurrentUserId()
      if (!currentUserResult.success) return currentUserResult

      // Users can only see their own feedback unless they're admins
      // TODO: Add admin role checking to allow admins to see all user feedback

      let query = this.supabase
        .from('feedback_submissions')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)

      // Default ordering by creation date (newest first)
      if (!options.sortBy) {
        query = query.order('created_at', { ascending: false })
      }

      query = this.applyQueryOptions(query, options)

      const { data, error, count } = await query

      if (error) {
        return failure(RepositoryError.fromSupabaseError(error, 'findByUser'))
      }

      return this.createPaginatedResult(data || [], count, options)
    } catch (error) {
      return failure(RepositoryError.internal('Failed to find feedback by user', error))
    }
  }

  /**
   * Get feedback statistics
   */
  async getStatistics(organizationId?: string): Promise<Result<{
    total: number
    by_status: Record<string, number>
    by_type: Record<string, number>
    by_priority: Record<string, number>
    recent_count: number
  }>> {
    try {
      const userResult = await this.getCurrentUserId()
      if (!userResult.success) return userResult

      // TODO: Add proper admin role checking here

      let query = this.supabase
        .from('feedback_submissions')
        .select('status, type, priority, created_at')

      if (organizationId) {
        query = query.eq('organization_id', organizationId)
      }

      const { data, error } = await query

      if (error) {
        return failure(RepositoryError.fromSupabaseError(error, 'getStatistics'))
      }

      const stats = {
        total: data.length,
        by_status: {} as Record<string, number>,
        by_type: {} as Record<string, number>,
        by_priority: {} as Record<string, number>,
        recent_count: 0
      }

      const oneWeekAgo = new Date()
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

      data.forEach(item => {
        // Count by status
        stats.by_status[item.status] = (stats.by_status[item.status] || 0) + 1
        
        // Count by type
        stats.by_type[item.type] = (stats.by_type[item.type] || 0) + 1
        
        // Count by priority
        if (item.priority) {
          stats.by_priority[item.priority] = (stats.by_priority[item.priority] || 0) + 1
        }
        
        // Count recent submissions
        if (new Date(item.created_at) >= oneWeekAgo) {
          stats.recent_count++
        }
      })

      return success(stats)
    } catch (error) {
      return failure(RepositoryError.internal('Failed to get feedback statistics', error))
    }
  }

  /**
   * Mark feedback as resolved
   */
  async resolve(
    feedbackId: string,
    resolutionNotes: string
  ): Promise<Result<FeedbackSubmission>> {
    try {
      const userResult = await this.getCurrentUserId()
      if (!userResult.success) return userResult

      return await this.update(feedbackId, {
        status: 'resolved',
        resolution_notes: resolutionNotes,
        assigned_to: userResult.data
      })
    } catch (error) {
      return failure(RepositoryError.internal('Failed to resolve feedback', error))
    }
  }

  /**
   * Assign feedback to a user
   */
  async assign(
    feedbackId: string,
    assignedTo: UserId
  ): Promise<Result<FeedbackSubmission>> {
    try {
      return await this.update(feedbackId, {
        assigned_to: assignedTo,
        status: 'in_progress'
      })
    } catch (error) {
      return failure(RepositoryError.internal('Failed to assign feedback', error))
    }
  }
}