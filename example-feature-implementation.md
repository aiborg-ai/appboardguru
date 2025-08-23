# Board Meeting Notes Feature - DDD Implementation Example

This document demonstrates how to implement a new feature following the established DDD architecture patterns from CLAUDE.md.

## Feature: Board Meeting Notes System

### Step 1: Define Domain Models (src/types/)

```typescript
// src/types/meeting-notes.ts

// Branded types for type safety (MANDATORY per CLAUDE.md)
export type MeetingNoteId = string & { readonly __brand: unique symbol }
export type MeetingId = string & { readonly __brand: unique symbol }

// Type constructors with validation
export const createMeetingNoteId = (id: string): Result<MeetingNoteId> => {
  if (!id || typeof id !== 'string') {
    return { success: false, error: new ValidationError('Invalid meeting note ID') }
  }
  return { success: true, data: id as MeetingNoteId }
}

// Core domain model
export interface MeetingNote {
  readonly id: MeetingNoteId
  readonly meeting_id: MeetingId
  readonly vault_id: VaultId
  readonly organization_id: OrganizationId
  readonly author_id: UserId
  readonly title: string
  readonly content: string
  readonly note_type: 'action_item' | 'decision' | 'discussion' | 'follow_up'
  readonly priority: 'low' | 'medium' | 'high' | 'urgent'
  readonly due_date?: string
  readonly assignee_id?: UserId
  readonly status: 'draft' | 'published' | 'archived'
  readonly tags: string[]
  readonly created_at: string
  readonly updated_at: string
}

// Request/Response types following API patterns
export interface CreateMeetingNoteRequest {
  meeting_id: MeetingId
  title: string
  content: string
  note_type: MeetingNote['note_type']
  priority?: MeetingNote['priority']
  due_date?: string
  assignee_id?: UserId
  tags?: string[]
}

export interface UpdateMeetingNoteRequest {
  title?: string
  content?: string
  priority?: MeetingNote['priority']
  due_date?: string
  assignee_id?: UserId
  status?: MeetingNote['status']
  tags?: string[]
}

// Search and filter criteria
export interface MeetingNoteFilters {
  meeting_id?: MeetingId
  vault_id?: VaultId
  organization_id?: OrganizationId
  author_id?: UserId
  assignee_id?: UserId
  note_type?: MeetingNote['note_type']
  priority?: MeetingNote['priority']
  status?: MeetingNote['status']
  tags?: string[]
  date_from?: string
  date_to?: string
  search_query?: string
}

// Validation schemas (Zod integration)
export const createMeetingNoteSchema = z.object({
  meeting_id: z.string().uuid(),
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(10000),
  note_type: z.enum(['action_item', 'decision', 'discussion', 'follow_up']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  due_date: z.string().datetime().optional(),
  assignee_id: z.string().uuid().optional(),
  tags: z.array(z.string()).max(10).optional()
})
```

### Step 2: Create Repository Layer (src/lib/repositories/)

```typescript
// src/lib/repositories/meeting-note.repository.ts

export class MeetingNoteRepository extends BaseRepository<MeetingNote> {
  protected tableName = 'meeting_notes' as const
  
  constructor(supabase: SupabaseClient) {
    super(supabase)
  }

  // Find by meeting (business-specific query)
  async findByMeeting(meetingId: MeetingId): Promise<Result<MeetingNote[]>> {
    return this.executeQuery(async () => {
      const { data, error } = await this.queryBuilder()
        .from(this.tableName)
        .select('*')
        .eq('meeting_id', meetingId)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data as MeetingNote[]
    })
  }

  // Find by assignee (action items assigned to user)
  async findByAssignee(userId: UserId): Promise<Result<MeetingNote[]>> {
    return this.executeQuery(async () => {
      const { data, error } = await this.queryBuilder()
        .from(this.tableName)
        .select(`
          *,
          meeting:meetings(*),
          author:users!author_id(id, full_name, email),
          assignee:users!assignee_id(id, full_name, email)
        `)
        .eq('assignee_id', userId)
        .eq('status', 'published')
        .order('due_date', { ascending: true, nullsLast: true })
      
      if (error) throw error
      return data as MeetingNote[]
    })
  }

  // Advanced search with filters
  async search(filters: MeetingNoteFilters): Promise<Result<MeetingNote[]>> {
    return this.executeQuery(async () => {
      let query = this.queryBuilder()
        .from(this.tableName)
        .select('*')

      // Apply filters dynamically
      if (filters.meeting_id) query = query.eq('meeting_id', filters.meeting_id)
      if (filters.vault_id) query = query.eq('vault_id', filters.vault_id)
      if (filters.organization_id) query = query.eq('organization_id', filters.organization_id)
      if (filters.note_type) query = query.eq('note_type', filters.note_type)
      if (filters.priority) query = query.eq('priority', filters.priority)
      if (filters.status) query = query.eq('status', filters.status)
      if (filters.author_id) query = query.eq('author_id', filters.author_id)
      if (filters.assignee_id) query = query.eq('assignee_id', filters.assignee_id)
      
      // Date range filtering
      if (filters.date_from) query = query.gte('created_at', filters.date_from)
      if (filters.date_to) query = query.lte('created_at', filters.date_to)
      
      // Tag filtering
      if (filters.tags?.length) {
        query = query.contains('tags', filters.tags)
      }
      
      // Full-text search
      if (filters.search_query) {
        query = query.or(`title.ilike.%${filters.search_query}%,content.ilike.%${filters.search_query}%`)
      }

      const { data, error } = await query.order('updated_at', { ascending: false })
      
      if (error) throw error
      return data as MeetingNote[]
    })
  }

  // Get action items summary for dashboard
  async getActionItemsSummary(userId: UserId): Promise<Result<{
    total: number
    overdue: number
    due_today: number
    upcoming: number
  }>> {
    return this.executeQuery(async () => {
      const today = new Date().toISOString().split('T')[0]
      
      const { data, error } = await this.queryBuilder()
        .from(this.tableName)
        .select('due_date')
        .eq('assignee_id', userId)
        .eq('note_type', 'action_item')
        .eq('status', 'published')
      
      if (error) throw error
      
      const total = data.length
      const overdue = data.filter(item => 
        item.due_date && item.due_date < today
      ).length
      const due_today = data.filter(item => 
        item.due_date === today
      ).length
      const upcoming = data.filter(item => 
        item.due_date && item.due_date > today
      ).length

      return { total, overdue, due_today, upcoming }
    })
  }

  // Override create to add audit logging
  async create(data: Omit<MeetingNote, 'id' | 'created_at' | 'updated_at'>): Promise<Result<MeetingNote>> {
    return this.transaction(async () => {
      const result = await super.create(data)
      
      if (result.success) {
        // Log the creation for audit trail
        await this.auditLogger.log({
          action: 'CREATE_MEETING_NOTE',
          resource_type: 'meeting_note',
          resource_id: result.data.id,
          user_id: data.author_id,
          metadata: {
            meeting_id: data.meeting_id,
            note_type: data.note_type,
            priority: data.priority
          }
        })
      }
      
      return result
    })
  }
}
```

### Step 3: Implement Service Layer (src/lib/services/)

```typescript
// src/lib/services/meeting-note.service.ts

export class MeetingNoteService {
  constructor(
    private meetingNoteRepository: MeetingNoteRepository,
    private meetingRepository: MeetingRepository,
    private vaultRepository: VaultRepository,
    private userRepository: UserRepository,
    private notificationService: NotificationService,
    private eventBus: EventBus,
    private permissionService: PermissionService
  ) {}

  async createMeetingNote(
    authorId: UserId,
    request: CreateMeetingNoteRequest
  ): Promise<Result<MeetingNote>> {
    // 1. Validate permissions
    const hasPermission = await this.permissionService.canCreateMeetingNote(
      authorId, 
      request.meeting_id
    )
    if (!hasPermission.success || !hasPermission.data) {
      return { success: false, error: new PermissionError('Cannot create meeting note') }
    }

    // 2. Validate meeting exists and is accessible
    const meeting = await this.meetingRepository.findById(request.meeting_id)
    if (!meeting.success || !meeting.data) {
      return { success: false, error: new NotFoundError('Meeting not found') }
    }

    // 3. Create the note
    const noteData = {
      ...request,
      author_id: authorId,
      vault_id: meeting.data.vault_id,
      organization_id: meeting.data.organization_id,
      status: 'draft' as const,
      tags: request.tags || [],
      priority: request.priority || 'medium' as const
    }

    const result = await this.meetingNoteRepository.create(noteData)
    
    if (result.success) {
      // 4. Publish domain event
      await this.eventBus.publish(new MeetingNoteCreatedEvent({
        noteId: result.data.id,
        meetingId: request.meeting_id,
        authorId,
        noteType: request.note_type
      }))

      // 5. Send notifications if it's an action item with assignee
      if (request.note_type === 'action_item' && request.assignee_id) {
        await this.notificationService.sendActionItemAssigned({
          assigneeId: request.assignee_id,
          noteId: result.data.id,
          title: request.title,
          dueDate: request.due_date
        })
      }
    }

    return result
  }

  async updateMeetingNote(
    userId: UserId,
    noteId: MeetingNoteId,
    request: UpdateMeetingNoteRequest
  ): Promise<Result<MeetingNote>> {
    // 1. Check note exists and user has permission
    const existing = await this.meetingNoteRepository.findById(noteId)
    if (!existing.success || !existing.data) {
      return { success: false, error: new NotFoundError('Meeting note not found') }
    }

    const canUpdate = await this.permissionService.canUpdateMeetingNote(
      userId, 
      noteId
    )
    if (!canUpdate.success || !canUpdate.data) {
      return { success: false, error: new PermissionError('Cannot update meeting note') }
    }

    // 2. Update with validation
    const result = await this.meetingNoteRepository.update(noteId, request)
    
    if (result.success) {
      // 3. Handle status changes
      if (request.status === 'published' && existing.data.status === 'draft') {
        await this.eventBus.publish(new MeetingNotePublishedEvent({
          noteId,
          authorId: existing.data.author_id,
          meetingId: existing.data.meeting_id
        }))
      }

      // 4. Handle assignee changes for action items
      if (request.assignee_id && request.assignee_id !== existing.data.assignee_id) {
        await this.notificationService.sendActionItemReassigned({
          oldAssigneeId: existing.data.assignee_id,
          newAssigneeId: request.assignee_id,
          noteId,
          title: result.data.title
        })
      }
    }

    return result
  }

  async getMeetingNotes(
    userId: UserId,
    filters: MeetingNoteFilters
  ): Promise<Result<MeetingNote[]>> {
    // Apply user's organization/permission context
    const userOrgs = await this.permissionService.getUserOrganizations(userId)
    if (!userOrgs.success) {
      return { success: false, error: userOrgs.error }
    }

    const enhancedFilters = {
      ...filters,
      organization_id: filters.organization_id || userOrgs.data[0]?.id // Default to first org
    }

    return this.meetingNoteRepository.search(enhancedFilters)
  }

  async getMyActionItems(userId: UserId): Promise<Result<{
    summary: any
    items: MeetingNote[]
  }>> {
    const [summaryResult, itemsResult] = await Promise.all([
      this.meetingNoteRepository.getActionItemsSummary(userId),
      this.meetingNoteRepository.findByAssignee(userId)
    ])

    if (!summaryResult.success) return summaryResult
    if (!itemsResult.success) return itemsResult

    return {
      success: true,
      data: {
        summary: summaryResult.data,
        items: itemsResult.data
      }
    }
  }

  // Business logic for bulk operations
  async bulkUpdateStatus(
    userId: UserId,
    noteIds: MeetingNoteId[],
    status: MeetingNote['status']
  ): Promise<Result<MeetingNote[]>> {
    return this.meetingNoteRepository.transaction(async () => {
      const results: MeetingNote[] = []
      
      for (const noteId of noteIds) {
        const result = await this.updateMeetingNote(userId, noteId, { status })
        if (result.success) {
          results.push(result.data)
        }
      }
      
      return results
    })
  }
}
```

### Step 4: Add API Controller (src/app/api/meeting-notes/)

```typescript
// src/app/api/meeting-notes/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { MeetingNoteService } from '@/lib/services/meeting-note.service'
import { ServiceFactory } from '@/lib/services'
import { createMeetingNoteSchema } from '@/types/meeting-notes'
import { getCurrentUser } from '@/lib/auth/session'
import { ApiResponse } from '@/lib/api/response'

const meetingNoteService = ServiceFactory.getMeetingNoteService()

/**
 * @openapi
 * /api/meeting-notes:
 *   post:
 *     summary: Create a new meeting note
 *     tags: [Meeting Notes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateMeetingNoteRequest'
 *     responses:
 *       201:
 *         description: Meeting note created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MeetingNote'
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return ApiResponse.unauthorized()
    }

    const body = await request.json()
    
    // Validate request body
    const validation = createMeetingNoteSchema.safeParse(body)
    if (!validation.success) {
      return ApiResponse.badRequest('Invalid request', validation.error.errors)
    }

    const result = await meetingNoteService.createMeetingNote(
      user.id,
      validation.data
    )

    if (!result.success) {
      return ApiResponse.error(result.error.message)
    }

    return ApiResponse.created(result.data)
    
  } catch (error) {
    console.error('Failed to create meeting note:', error)
    return ApiResponse.internalError()
  }
}

/**
 * @openapi
 * /api/meeting-notes:
 *   get:
 *     summary: Get meeting notes with filtering
 *     tags: [Meeting Notes]
 *     parameters:
 *       - name: meeting_id
 *         in: query
 *         schema:
 *           type: string
 *           format: uuid
 *       - name: note_type
 *         in: query
 *         schema:
 *           type: string
 *           enum: [action_item, decision, discussion, follow_up]
 *     responses:
 *       200:
 *         description: Meeting notes retrieved successfully
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return ApiResponse.unauthorized()
    }

    const { searchParams } = new URL(request.url)
    const filters = {
      meeting_id: searchParams.get('meeting_id') || undefined,
      note_type: searchParams.get('note_type') || undefined,
      priority: searchParams.get('priority') || undefined,
      status: searchParams.get('status') || undefined,
      search_query: searchParams.get('q') || undefined,
    }

    const result = await meetingNoteService.getMeetingNotes(user.id, filters)

    if (!result.success) {
      return ApiResponse.error(result.error.message)
    }

    return ApiResponse.success(result.data)
    
  } catch (error) {
    console.error('Failed to get meeting notes:', error)
    return ApiResponse.internalError()
  }
}
```

### Step 5: Create React Components (Atomic Design + Performance)

```typescript
// src/components/molecules/MeetingNoteCard.tsx

interface MeetingNoteCardProps {
  note: MeetingNote
  onEdit?: (note: MeetingNote) => void
  onDelete?: (noteId: MeetingNoteId) => void
  onStatusChange?: (noteId: MeetingNoteId, status: MeetingNote['status']) => void
}

export const MeetingNoteCard = React.memo(function MeetingNoteCard({
  note,
  onEdit,
  onDelete,
  onStatusChange
}: MeetingNoteCardProps) {
  // Memoized calculations
  const isOverdue = useMemo(() => {
    if (!note.due_date) return false
    return new Date(note.due_date) < new Date()
  }, [note.due_date])

  const priorityColor = useMemo(() => {
    const colors = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800'
    }
    return colors[note.priority]
  }, [note.priority])

  // Event handlers with useCallback
  const handleEdit = useCallback(() => {
    onEdit?.(note)
  }, [note, onEdit])

  const handleDelete = useCallback(() => {
    onDelete?.(note.id)
  }, [note.id, onDelete])

  const handleStatusToggle = useCallback(() => {
    const newStatus = note.status === 'published' ? 'draft' : 'published'
    onStatusChange?.(note.id, newStatus)
  }, [note.id, note.status, onStatusChange])

  return (
    <Card className={cn(
      'p-4 transition-all duration-200',
      'hover:shadow-md hover:border-blue-200',
      isOverdue && 'border-red-200 bg-red-50'
    )}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={priorityColor}>
            {note.priority}
          </Badge>
          <Badge variant="secondary">
            {note.note_type.replace('_', ' ')}
          </Badge>
          {isOverdue && (
            <Badge variant="destructive" className="text-xs">
              Overdue
            </Badge>
          )}
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleEdit}>
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleStatusToggle}>
              {note.status === 'published' ? 'Mark as Draft' : 'Publish'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={handleDelete}
              className="text-red-600"
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <h3 className="font-semibold text-lg mb-2 text-gray-900">
        {note.title}
      </h3>
      
      <p className="text-gray-600 text-sm mb-3 line-clamp-3">
        {note.content}
      </p>

      {note.due_date && (
        <div className="flex items-center gap-1 text-sm text-gray-500 mb-2">
          <Calendar className="h-4 w-4" />
          <span>Due: {format(new Date(note.due_date), 'PPP')}</span>
        </div>
      )}

      {note.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {note.tags.map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      )}
    </Card>
  )
})
```

### Step 6: Add State Management (Zustand)

```typescript
// src/lib/stores/meeting-notes-store.ts

interface MeetingNotesState {
  // State
  notes: MeetingNote[]
  currentNote: MeetingNote | null
  loading: boolean
  error: string | null
  filters: MeetingNoteFilters
  
  // Actions
  setNotes: (notes: MeetingNote[]) => void
  setCurrentNote: (note: MeetingNote | null) => void
  setFilters: (filters: MeetingNoteFilters) => void
  addNote: (note: MeetingNote) => void
  updateNote: (noteId: MeetingNoteId, updates: Partial<MeetingNote>) => void
  removeNote: (noteId: MeetingNoteId) => void
  
  // Async actions
  loadNotes: (filters?: MeetingNoteFilters) => Promise<void>
  createNote: (request: CreateMeetingNoteRequest) => Promise<Result<MeetingNote>>
  updateNoteAsync: (noteId: MeetingNoteId, updates: UpdateMeetingNoteRequest) => Promise<Result<MeetingNote>>
  deleteNote: (noteId: MeetingNoteId) => Promise<Result<void>>
}

export const useMeetingNotesStore = create<MeetingNotesState>()((set, get) => ({
  // Initial state
  notes: [],
  currentNote: null,
  loading: false,
  error: null,
  filters: {},
  
  // Sync actions
  setNotes: (notes) => set({ notes, error: null }),
  setCurrentNote: (currentNote) => set({ currentNote }),
  setFilters: (filters) => set({ filters }),
  addNote: (note) => set((state) => ({ 
    notes: [note, ...state.notes] 
  })),
  updateNote: (noteId, updates) => set((state) => ({
    notes: state.notes.map(note => 
      note.id === noteId ? { ...note, ...updates } : note
    )
  })),
  removeNote: (noteId) => set((state) => ({
    notes: state.notes.filter(note => note.id !== noteId)
  })),
  
  // Async actions with Result pattern
  loadNotes: async (filters = {}) => {
    set({ loading: true, error: null })
    
    try {
      const response = await fetch('/api/meeting-notes?' + new URLSearchParams({
        ...filters,
        ...(filters.meeting_id && { meeting_id: filters.meeting_id }),
        ...(filters.note_type && { note_type: filters.note_type })
      }))
      
      if (!response.ok) {
        throw new Error('Failed to load notes')
      }
      
      const result = await response.json()
      set({ 
        notes: result.data || [], 
        filters,
        loading: false 
      })
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        loading: false 
      })
    }
  },
  
  createNote: async (request) => {
    try {
      const response = await fetch('/api/meeting-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      })
      
      if (!response.ok) {
        const error = await response.json()
        return { success: false, error: new Error(error.message) }
      }
      
      const result = await response.json()
      const note = result.data
      
      // Update store
      get().addNote(note)
      
      return { success: true, data: note }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error : new Error('Unknown error') 
      }
    }
  },
  
  updateNoteAsync: async (noteId, updates) => {
    try {
      const response = await fetch(`/api/meeting-notes/${noteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
      
      if (!response.ok) {
        const error = await response.json()
        return { success: false, error: new Error(error.message) }
      }
      
      const result = await response.json()
      const note = result.data
      
      // Update store
      get().updateNote(noteId, note)
      
      return { success: true, data: note }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error : new Error('Unknown error') 
      }
    }
  },
  
  deleteNote: async (noteId) => {
    try {
      const response = await fetch(`/api/meeting-notes/${noteId}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        const error = await response.json()
        return { success: false, error: new Error(error.message) }
      }
      
      // Update store
      get().removeNote(noteId)
      
      return { success: true, data: undefined }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error : new Error('Unknown error') 
      }
    }
  }
}))

// Persistent storage
export const useMeetingNotesStore = create<MeetingNotesState>()(
  persist(
    (set, get) => ({
      // ... store implementation
    }),
    {
      name: 'meeting-notes-store',
      partialize: (state) => ({ 
        filters: state.filters // Only persist filters
      })
    }
  )
)
```

### Step 7: Comprehensive Testing

```typescript
// __tests__/services/meeting-note.service.test.ts

describe('MeetingNoteService', () => {
  let service: MeetingNoteService
  let mockRepository: jest.Mocked<MeetingNoteRepository>
  let mockNotificationService: jest.Mocked<NotificationService>
  let mockEventBus: jest.Mocked<EventBus>

  beforeEach(() => {
    mockRepository = createMockRepository()
    mockNotificationService = createMockNotificationService()
    mockEventBus = createMockEventBus()
    
    service = new MeetingNoteService(
      mockRepository,
      mockMeetingRepository,
      mockVaultRepository,
      mockUserRepository,
      mockNotificationService,
      mockEventBus,
      mockPermissionService
    )
  })

  describe('createMeetingNote', () => {
    it('should create meeting note successfully', async () => {
      // Arrange
      const authorId = createUserId('user-1')
      const request = MeetingNoteFactory.createRequest()
      const expectedNote = MeetingNoteFactory.build()
      
      mockPermissionService.canCreateMeetingNote.mockResolvedValue({ 
        success: true, 
        data: true 
      })
      mockRepository.create.mockResolvedValue({ 
        success: true, 
        data: expectedNote 
      })

      // Act
      const result = await service.createMeetingNote(authorId, request)

      // Assert
      expect(result.success).toBe(true)
      expect(result.data).toEqual(expectedNote)
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          noteId: expectedNote.id,
          authorId
        })
      )
    })

    it('should handle permission denied', async () => {
      // Arrange
      const authorId = createUserId('user-1')
      const request = MeetingNoteFactory.createRequest()
      
      mockPermissionService.canCreateMeetingNote.mockResolvedValue({ 
        success: true, 
        data: false 
      })

      // Act
      const result = await service.createMeetingNote(authorId, request)

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toBeInstanceOf(PermissionError)
      expect(mockRepository.create).not.toHaveBeenCalled()
    })
  })

  // More comprehensive tests...
})

// E2E test
// __tests__/e2e/meeting-notes.spec.ts

test.describe('Meeting Notes Feature', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/meetings/123')
    await page.waitForLoadState('networkidle')
  })

  test('should create action item with assignee', async ({ page }) => {
    // Create new note
    await page.click('[data-testid="create-note-button"]')
    await page.fill('[data-testid="note-title"]', 'Review Q4 Budget')
    await page.fill('[data-testid="note-content"]', 'Review and approve Q4 budget allocation')
    await page.selectOption('[data-testid="note-type"]', 'action_item')
    await page.selectOption('[data-testid="assignee"]', 'user-2')
    await page.fill('[data-testid="due-date"]', '2024-02-15')
    
    await page.click('[data-testid="save-note"]')
    
    // Verify note appears
    await expect(page.locator('[data-testid="note-card"]')).toContainText('Review Q4 Budget')
    await expect(page.locator('[data-testid="note-type-badge"]')).toContainText('action item')
    await expect(page.locator('[data-testid="due-date"]')).toContainText('Feb 15, 2024')
  })

  test('should filter notes by type', async ({ page }) => {
    await page.selectOption('[data-testid="note-filter-type"]', 'action_item')
    
    // Verify only action items are shown
    const noteCards = page.locator('[data-testid="note-card"]')
    await expect(noteCards).toHaveCount(3)
    
    const typeBadges = page.locator('[data-testid="note-type-badge"]')
    for (let i = 0; i < await typeBadges.count(); i++) {
      await expect(typeBadges.nth(i)).toContainText('action item')
    }
  })

  test('should handle overdue action items', async ({ page }) => {
    // Navigate to My Tasks
    await page.goto('/dashboard/my-tasks')
    
    // Verify overdue section exists
    await expect(page.locator('[data-testid="overdue-section"]')).toBeVisible()
    await expect(page.locator('[data-testid="overdue-count"]')).toContainText('2')
    
    // Verify overdue styling
    const overdueCards = page.locator('[data-testid="overdue-card"]')
    await expect(overdueCards.first()).toHaveClass(/border-red-200/)
  })
})
```

This example demonstrates the complete DDD architecture pattern following CLAUDE.md guidelines:

✅ **Branded types** for type safety  
✅ **Repository pattern** with Result handling  
✅ **Service layer** with dependency injection  
✅ **API controllers** with validation  
✅ **React.memo optimization** for performance  
✅ **Zustand state management** with persistence  
✅ **Comprehensive testing** at all layers  
✅ **Event-driven architecture** with domain events  
✅ **OpenAPI documentation** for API endpoints  

This pattern can be replicated for any new feature in the AppBoardGuru application.