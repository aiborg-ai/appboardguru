import { BaseRepository } from './base.repository'
import { Result, success, failure, RepositoryError } from './result'
import { 
  QueryOptions, 
  PaginatedResult,
  UserId,
  OrganizationId,
  BoardId,
  createBoardId
} from './types'
import { Database } from '../../types/database'

type Board = Database['public']['Tables']['boards']['Row']
type BoardInsert = Database['public']['Tables']['boards']['Insert']
type BoardUpdate = Database['public']['Tables']['boards']['Update']

type BoardMember = Database['public']['Tables']['board_members']['Row']
type BoardMemberInsert = Database['public']['Tables']['board_members']['Insert']

export interface BoardWithMembers extends Board {
  board_members: BoardMember[]
}

export class BoardRepository extends BaseRepository {
  protected getEntityName(): string {
    return 'Board'
  }

  protected getSearchFields(): string[] {
    return ['name', 'description']
  }

  /**
   * Find all boards for an organization
   */
  async findByOrganization(
    organizationId: OrganizationId,
    options: QueryOptions = {}
  ): Promise<Result<PaginatedResult<Board>>> {
    try {
      const userResult = await this.getCurrentUserId()
      if (!userResult.success) return userResult

      // Check organization permission
      const permissionResult = await this.checkOrganizationPermission(
        userResult.data,
        organizationId
      )
      if (!permissionResult.success) return permissionResult

      let query = this.supabase
        .from('boards')
        .select('*', { count: 'exact' })
        .eq('organization_id', organizationId)

      query = this.applyQueryOptions(query, options)

      const { data, error, count } = await query

      if (error) {
        return failure(RepositoryError.fromSupabaseError(error, 'findByOrganization'))
      }

      return this.createPaginatedResult(data || [], count, options)
    } catch (error) {
      return failure(RepositoryError.internal('Failed to find boards by organization', error))
    }
  }

  /**
   * Find a board by ID with members
   */
  async findByIdWithMembers(boardId: BoardId): Promise<Result<BoardWithMembers>> {
    try {
      const userResult = await this.getCurrentUserId()
      if (!userResult.success) return userResult

      const { data, error } = await this.supabase
        .from('boards')
        .select(`
          *,
          board_members (
            *,
            user:users (
              id,
              email,
              full_name
            )
          )
        `)
        .eq('id', boardId)
        .single()

      if (error) {
        return failure(RepositoryError.fromSupabaseError(error, 'findByIdWithMembers'))
      }

      // Check if user has access to this board
      const orgPermissionResult = await this.checkOrganizationPermission(
        userResult.data,
        data.organization_id
      )
      if (!orgPermissionResult.success) return orgPermissionResult

      return success(data)
    } catch (error) {
      return failure(RepositoryError.internal('Failed to find board with members', error))
    }
  }

  /**
   * Create a new board
   */
  async create(
    boardData: Omit<BoardInsert, 'id' | 'created_at' | 'updated_at'>,
    memberUserIds: UserId[] = []
  ): Promise<Result<Board>> {
    try {
      const userResult = await this.getCurrentUserId()
      if (!userResult.success) return userResult

      // Validate required fields
      const validationResult = this.validateRequired(boardData, ['name', 'organization_id'])
      if (!validationResult.success) return validationResult

      // Check organization permission
      const permissionResult = await this.checkOrganizationPermission(
        userResult.data,
        boardData.organization_id,
        ['admin', 'owner']
      )
      if (!permissionResult.success) return permissionResult

      return await this.transaction(async (client) => {
        // Create the board
        const { data: board, error: boardError } = await client
          .from('boards')
          .insert({
            ...boardData,
            created_by: userResult.data
          })
          .select()
          .single()

        if (boardError) {
          throw RepositoryError.fromSupabaseError(boardError, 'create board')
        }

        // Add board members if specified
        if (memberUserIds.length > 0) {
          const boardMembers: BoardMemberInsert[] = memberUserIds.map(userId => ({
            board_id: board.id,
            user_id: userId,
            role: 'member',
            status: 'active',
            added_by: userResult.data
          }))

          const { error: membersError } = await client
            .from('board_members')
            .insert(boardMembers)

          if (membersError) {
            throw RepositoryError.fromSupabaseError(membersError, 'add board members')
          }
        }

        // Log activity
        await this.logActivity({
          user_id: userResult.data,
          organization_id: boardData.organization_id,
          event_type: 'board.created',
          event_category: 'governance',
          action: 'create',
          resource_type: 'board',
          resource_id: board.id,
          event_description: `Created board: ${board.name}`,
          outcome: 'success',
          severity: 'medium'
        })

        return board
      })
    } catch (error) {
      if (error instanceof RepositoryError) {
        return failure(error)
      }
      return failure(RepositoryError.internal('Failed to create board', error))
    }
  }

  /**
   * Update a board
   */
  async update(
    boardId: BoardId,
    updates: BoardUpdate
  ): Promise<Result<Board>> {
    try {
      const userResult = await this.getCurrentUserId()
      if (!userResult.success) return userResult

      // First get the current board to check permissions
      const currentBoardResult = await this.findById(boardId)
      if (!currentBoardResult.success) return currentBoardResult

      const currentBoard = currentBoardResult.data
      const permissionResult = await this.checkOrganizationPermission(
        userResult.data,
        currentBoard.organization_id,
        ['admin', 'owner']
      )
      if (!permissionResult.success) return permissionResult

      const { data, error } = await this.supabase
        .from('boards')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', boardId)
        .select()
        .single()

      if (error) {
        return failure(RepositoryError.fromSupabaseError(error, 'update'))
      }

      // Log activity
      await this.logActivity({
        user_id: userResult.data,
        organization_id: currentBoard.organization_id,
        event_type: 'board.updated',
        event_category: 'governance',
        action: 'update',
        resource_type: 'board',
        resource_id: boardId,
        event_description: `Updated board: ${data.name}`,
        outcome: 'success',
        severity: 'low',
        details: updates
      })

      return success(data)
    } catch (error) {
      return failure(RepositoryError.internal('Failed to update board', error))
    }
  }

  /**
   * Delete a board
   */
  async delete(boardId: BoardId): Promise<Result<void>> {
    try {
      const userResult = await this.getCurrentUserId()
      if (!userResult.success) return userResult

      // First get the current board to check permissions
      const currentBoardResult = await this.findById(boardId)
      if (!currentBoardResult.success) return currentBoardResult

      const currentBoard = currentBoardResult.data
      const permissionResult = await this.checkOrganizationPermission(
        userResult.data,
        currentBoard.organization_id,
        ['admin', 'owner']
      )
      if (!permissionResult.success) return permissionResult

      return await this.transaction(async (client) => {
        // Delete board members first
        const { error: membersError } = await client
          .from('board_members')
          .delete()
          .eq('board_id', boardId)

        if (membersError) {
          throw RepositoryError.fromSupabaseError(membersError, 'delete board members')
        }

        // Delete the board
        const { error: boardError } = await client
          .from('boards')
          .delete()
          .eq('id', boardId)

        if (boardError) {
          throw RepositoryError.fromSupabaseError(boardError, 'delete board')
        }

        // Log activity
        await this.logActivity({
          user_id: userResult.data,
          organization_id: currentBoard.organization_id,
          event_type: 'board.deleted',
          event_category: 'governance',
          action: 'delete',
          resource_type: 'board',
          resource_id: boardId,
          event_description: `Deleted board: ${currentBoard.name}`,
          outcome: 'success',
          severity: 'high'
        })
      })
    } catch (error) {
      if (error instanceof RepositoryError) {
        return failure(error)
      }
      return failure(RepositoryError.internal('Failed to delete board', error))
    }
  }

  /**
   * Add a member to a board
   */
  async addMember(
    boardId: BoardId,
    userId: UserId,
    role: string = 'member'
  ): Promise<Result<BoardMember>> {
    try {
      const currentUserResult = await this.getCurrentUserId()
      if (!currentUserResult.success) return currentUserResult

      // Get board to check permissions
      const boardResult = await this.findById(boardId)
      if (!boardResult.success) return boardResult

      const board = boardResult.data
      const permissionResult = await this.checkOrganizationPermission(
        currentUserResult.data,
        board.organization_id,
        ['admin', 'owner']
      )
      if (!permissionResult.success) return permissionResult

      const { data, error } = await this.supabase
        .from('board_members')
        .insert({
          board_id: boardId,
          user_id: userId,
          role,
          status: 'active',
          added_by: currentUserResult.data
        })
        .select()
        .single()

      if (error) {
        return failure(RepositoryError.fromSupabaseError(error, 'addMember'))
      }

      // Log activity
      await this.logActivity({
        user_id: currentUserResult.data,
        organization_id: board.organization_id,
        event_type: 'board.member_added',
        event_category: 'governance',
        action: 'create',
        resource_type: 'board_member',
        resource_id: data.id,
        event_description: `Added member to board: ${board.name}`,
        outcome: 'success',
        severity: 'medium',
        details: { board_id: boardId, member_user_id: userId, role }
      })

      return success(data)
    } catch (error) {
      return failure(RepositoryError.internal('Failed to add board member', error))
    }
  }

  /**
   * Remove a member from a board
   */
  async removeMember(boardId: BoardId, userId: UserId): Promise<Result<void>> {
    try {
      const currentUserResult = await this.getCurrentUserId()
      if (!currentUserResult.success) return currentUserResult

      // Get board to check permissions
      const boardResult = await this.findById(boardId)
      if (!boardResult.success) return boardResult

      const board = boardResult.data
      const permissionResult = await this.checkOrganizationPermission(
        currentUserResult.data,
        board.organization_id,
        ['admin', 'owner']
      )
      if (!permissionResult.success) return permissionResult

      const { error } = await this.supabase
        .from('board_members')
        .delete()
        .eq('board_id', boardId)
        .eq('user_id', userId)

      if (error) {
        return failure(RepositoryError.fromSupabaseError(error, 'removeMember'))
      }

      // Log activity
      await this.logActivity({
        user_id: currentUserResult.data,
        organization_id: board.organization_id,
        event_type: 'board.member_removed',
        event_category: 'governance',
        action: 'delete',
        resource_type: 'board_member',
        resource_id: `${boardId}-${userId}`,
        event_description: `Removed member from board: ${board.name}`,
        outcome: 'success',
        severity: 'medium',
        details: { board_id: boardId, member_user_id: userId }
      })

      return success(undefined)
    } catch (error) {
      return failure(RepositoryError.internal('Failed to remove board member', error))
    }
  }

  /**
   * Find a board by ID
   */
  private async findById(boardId: BoardId): Promise<Result<Board>> {
    try {
      const { data, error } = await this.supabase
        .from('boards')
        .select('*')
        .eq('id', boardId)
        .single()

      return this.createResult(data, error, 'findById')
    } catch (error) {
      return failure(RepositoryError.internal('Failed to find board by ID', error))
    }
  }

  /**
   * Get board members
   */
  async getMembers(boardId: BoardId): Promise<Result<BoardMember[]>> {
    try {
      const userResult = await this.getCurrentUserId()
      if (!userResult.success) return userResult

      // Get board to check permissions
      const boardResult = await this.findById(boardId)
      if (!boardResult.success) return boardResult

      const board = boardResult.data
      const permissionResult = await this.checkOrganizationPermission(
        userResult.data,
        board.organization_id
      )
      if (!permissionResult.success) return permissionResult

      const { data, error } = await this.supabase
        .from('board_members')
        .select(`
          *,
          user:users (
            id,
            email,
            full_name
          )
        `)
        .eq('board_id', boardId)
        .eq('status', 'active')

      if (error) {
        return failure(RepositoryError.fromSupabaseError(error, 'getMembers'))
      }

      return success(data || [])
    } catch (error) {
      return failure(RepositoryError.internal('Failed to get board members', error))
    }
  }
}