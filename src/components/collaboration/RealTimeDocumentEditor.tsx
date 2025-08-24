'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/features/shared/ui/card'
import { Badge } from '@/features/shared/ui/badge'
import { Button } from '@/features/shared/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { AlertTriangle, Users, Lock, Save, Share2, MessageSquare, Eye, Edit3 } from 'lucide-react'
import { useRealTimeCollaboration } from '@/hooks/useRealTimeCollaboration'
import { useCRDT } from '@/hooks/useCRDT'
import { useWebSocket } from '@/hooks/useWebSocket'
import { useDocumentCollaboration } from '@/hooks/useDocumentCollaboration'
import type { AssetId, UserId, OrganizationId } from '@/types/branded'

interface RealTimeDocumentEditorProps {
  documentId: AssetId
  organizationId: OrganizationId
  userId: UserId
  initialContent?: string
  readOnly?: boolean
  className?: string
}

interface UserCursor {
  userId: UserId
  userName: string
  userAvatar?: string
  position: {
    line: number
    column: number
  }
  selection?: {
    start: { line: number; column: number }
    end: { line: number; column: number }
  }
  color: string
  timestamp: number
}

interface CollaborativeEdit {
  id: string
  userId: UserId
  userName: string
  type: 'insert' | 'delete' | 'format'
  position: number
  content?: string
  length?: number
  timestamp: number
  applied: boolean
  conflicted?: boolean
}

const CURSOR_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', 
  '#F97316', '#06B6D4', '#84CC16', '#EC4899', '#6366F1'
]

export function RealTimeDocumentEditor({
  documentId,
  organizationId,
  userId,
  initialContent = '',
  readOnly = false,
  className = ''
}: RealTimeDocumentEditorProps) {
  const queryClient = useQueryClient()
  const editorRef = useRef<HTMLDivElement>(null)
  const [content, setContent] = useState(initialContent)
  const [isEditing, setIsEditing] = useState(!readOnly)
  const [selectedText, setSelectedText] = useState('')
  const [cursorPosition, setCursorPosition] = useState({ line: 0, column: 0 })
  const [activeCursors, setActiveCursors] = useState<Map<UserId, UserCursor>>(new Map())
  const [pendingEdits, setPendingEdits] = useState<CollaborativeEdit[]>([])
  const [conflictedEdits, setConflictedEdits] = useState<CollaborativeEdit[]>([])
  const [lastSaved, setLastSaved] = useState<Date>(new Date())
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Real-time collaboration hooks
  const {
    activeUsers,
    comments,
    isConnected,
    connectionStatus,
    addComment,
    startEditing,
    stopEditing,
    lockDocument,
    unlockDocument,
    shareDocument,
    updateCursorPosition
  } = useRealTimeCollaboration(documentId, {
    enableRealTime: true,
    autoSave: true,
    autoSaveInterval: 3000,
    conflictResolution: 'operational_transform'
  })

  // CRDT for conflict-free collaboration
  const {
    ydoc,
    ytext,
    awareness,
    applyOperation,
    subscribeToChanges,
    updateAwareness,
    getDocumentSnapshot,
    isConnected: crdtConnected
  } = useCRDT(documentId, organizationId, initialContent)

  // WebSocket for real-time updates
  const {
    socket,
    sendMessage,
    onMessage,
    joinRoom,
    leaveRoom
  } = useWebSocket()

  // Document collaboration hook for operational transforms
  const {
    cursors: otherCursors,
    pendingChanges,
    applyChange,
    resolveConflict
  } = useDocumentCollaboration(documentId)

  // Memoized user color assignment
  const userColors = useMemo(() => {
    const colors = new Map<UserId, string>()
    let colorIndex = 0
    activeUsers.forEach(user => {
      if (!colors.has(user.id as UserId)) {
        colors.set(user.id as UserId, CURSOR_COLORS[colorIndex % CURSOR_COLORS.length])
        colorIndex++
      }
    })
    return colors
  }, [activeUsers])

  // Initialize collaboration session
  useEffect(() => {
    if (documentId && isConnected) {
      joinRoom(`document_${documentId}`)
      
      // Set up real-time listeners
      const unsubscribeChanges = subscribeToChanges((event) => {
        handleCRDTUpdate(event)
      })

      const unsubscribeCursor = onMessage('cursor_moved', (data) => {
        handleCursorUpdate(data)
      })

      const unsubscribeEdit = onMessage('document_edit', (data) => {
        handleRemoteEdit(data)
      })

      const unsubscribeConflict = onMessage('edit_conflict', (data) => {
        handleEditConflict(data)
      })

      return () => {
        unsubscribeChanges()
        unsubscribeCursor()
        unsubscribeEdit()
        unsubscribeConflict()
        leaveRoom(`document_${documentId}`)
      }
    }
  }, [documentId, isConnected])

  // Handle CRDT updates
  const handleCRDTUpdate = useCallback((event: any) => {
    if (event.type === 'update' && ytext) {
      const newContent = ytext.toString()
      setContent(newContent)
      setHasUnsavedChanges(true)
    }
  }, [ytext])

  // Handle cursor updates from other users
  const handleCursorUpdate = useCallback((data: any) => {
    if (data.userId !== userId) {
      const cursor: UserCursor = {
        userId: data.userId,
        userName: data.userName || 'Unknown User',
        userAvatar: data.userAvatar,
        position: data.position,
        selection: data.selection,
        color: userColors.get(data.userId) || '#6B7280',
        timestamp: Date.now()
      }
      
      setActiveCursors(prev => new Map(prev.set(data.userId, cursor)))
    }
  }, [userId, userColors])

  // Handle remote edits
  const handleRemoteEdit = useCallback((data: any) => {
    const edit: CollaborativeEdit = {
      id: data.editId,
      userId: data.userId,
      userName: data.userName,
      type: data.type,
      position: data.position,
      content: data.content,
      length: data.length,
      timestamp: Date.now(),
      applied: false
    }

    setPendingEdits(prev => [...prev, edit])
    
    // Apply through CRDT for conflict resolution
    if (ytext) {
      applyOperation({
        type: edit.type,
        position: edit.position,
        content: edit.content,
        length: edit.length,
        attributes: {}
      }, data.userId)
    }
  }, [ytext, applyOperation])

  // Handle edit conflicts
  const handleEditConflict = useCallback((data: any) => {
    const conflictedEdit: CollaborativeEdit = {
      ...data.edit,
      conflicted: true,
      applied: false
    }
    
    setConflictedEdits(prev => [...prev, conflictedEdit])
  }, [])

  // Handle text content changes
  const handleContentChange = useCallback((newContent: string) => {
    if (readOnly || !isEditing) return

    setContent(newContent)
    setHasUnsavedChanges(true)

    // Calculate diff and create operation
    const operation = calculateDiff(content, newContent)
    if (operation && ytext) {
      applyOperation(operation, userId)
      
      // Broadcast edit to other users
      sendMessage('document_edit', {
        editId: `${userId}_${Date.now()}`,
        userId,
        userName: activeUsers.find(u => u.id === userId)?.name || 'You',
        type: operation.type,
        position: operation.position,
        content: operation.content,
        length: operation.length,
        timestamp: Date.now()
      }, `document_${documentId}`)
    }
  }, [content, readOnly, isEditing, ytext, applyOperation, userId, sendMessage, documentId, activeUsers])

  // Handle cursor position changes
  const handleCursorChange = useCallback((position: { line: number; column: number }) => {
    setCursorPosition(position)
    updateCursorPosition(position.line, position.column)
    
    // Update awareness
    if (awareness) {
      updateAwareness(userId, {
        cursor: position,
        name: activeUsers.find(u => u.id === userId)?.name || 'You',
        color: userColors.get(userId) || '#3B82F6'
      })
    }

    // Broadcast cursor position
    sendMessage('cursor_moved', {
      userId,
      userName: activeUsers.find(u => u.id === userId)?.name || 'You',
      position,
      timestamp: Date.now()
    }, `document_${documentId}`)
  }, [userId, awareness, updateAwareness, updateCursorPosition, sendMessage, documentId, activeUsers, userColors])

  // Handle text selection
  const handleSelectionChange = useCallback(() => {
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0)
      const selectedText = range.toString()
      setSelectedText(selectedText)

      if (selectedText && awareness) {
        updateAwareness(userId, {
          selection: {
            start: range.startOffset,
            end: range.endOffset
          }
        })
      }
    }
  }, [awareness, updateAwareness, userId])

  // Auto-save functionality
  useEffect(() => {
    if (hasUnsavedChanges && !readOnly) {
      const timeoutId = setTimeout(async () => {
        try {
          const snapshot = await getDocumentSnapshot()
          if (snapshot) {
            // Save to backend
            await saveDocument(snapshot.content)
            setHasUnsavedChanges(false)
            setLastSaved(new Date())
          }
        } catch (error) {
          console.error('Auto-save failed:', error)
        }
      }, 3000)

      return () => clearTimeout(timeoutId)
    }
  }, [hasUnsavedChanges, readOnly, getDocumentSnapshot])

  // Save document manually
  const saveDocument = async (contentToSave?: string) => {
    try {
      const response = await fetch(`/api/documents/${documentId}/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: contentToSave || content,
          organizationId,
          userId
        })
      })

      if (!response.ok) {
        throw new Error('Failed to save document')
      }

      setHasUnsavedChanges(false)
      setLastSaved(new Date())
      
      // Show success feedback
      queryClient.invalidateQueries({ queryKey: ['document', documentId] })
    } catch (error) {
      console.error('Save error:', error)
      // Show error feedback
    }
  }

  // Resolve conflict manually
  const handleResolveConflict = useCallback((conflictId: string, resolution: 'accept' | 'reject') => {
    resolveConflict(conflictId, resolution)
    setConflictedEdits(prev => prev.filter(edit => edit.id !== conflictId))
  }, [resolveConflict])

  // Calculate diff between old and new content
  const calculateDiff = (oldContent: string, newContent: string) => {
    // Simple diff calculation - in production, use a proper diff algorithm
    if (newContent.length > oldContent.length) {
      // Insertion
      const insertPos = findInsertPosition(oldContent, newContent)
      const insertedText = newContent.slice(insertPos, insertPos + (newContent.length - oldContent.length))
      return {
        type: 'insert' as const,
        position: insertPos,
        content: insertedText
      }
    } else if (newContent.length < oldContent.length) {
      // Deletion
      const deletePos = findDeletePosition(oldContent, newContent)
      const deleteLength = oldContent.length - newContent.length
      return {
        type: 'delete' as const,
        position: deletePos,
        length: deleteLength
      }
    }
    return null
  }

  // Helper functions for diff calculation
  const findInsertPosition = (oldText: string, newText: string): number => {
    for (let i = 0; i < Math.min(oldText.length, newText.length); i++) {
      if (oldText[i] !== newText[i]) {
        return i
      }
    }
    return oldText.length
  }

  const findDeletePosition = (oldText: string, newText: string): number => {
    for (let i = 0; i < Math.min(oldText.length, newText.length); i++) {
      if (oldText[i] !== newText[i]) {
        return i
      }
    }
    return newText.length
  }

  // Render active user cursors
  const renderCursors = () => {
    return Array.from(activeCursors.values()).map(cursor => (
      <div
        key={cursor.userId}
        className="absolute pointer-events-none z-10"
        style={{
          borderLeft: `2px solid ${cursor.color}`,
          top: `${cursor.position.line * 24}px`,
          left: `${cursor.position.column * 8}px`
        }}
      >
        <div
          className="text-xs px-2 py-1 rounded text-white font-medium whitespace-nowrap"
          style={{ backgroundColor: cursor.color }}
        >
          {cursor.userName}
        </div>
      </div>
    ))
  }

  return (
    <div className={`relative ${className}`}>
      {/* Header with collaboration info */}
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Edit3 className="h-5 w-5" />
              Real-Time Document Editor
              {!isConnected && (
                <Badge variant="destructive" className="ml-2">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Disconnected
                </Badge>
              )}
              {hasUnsavedChanges && (
                <Badge variant="outline" className="ml-2">
                  Unsaved changes
                </Badge>
              )}
            </CardTitle>
            
            <div className="flex items-center gap-2">
              {/* Connection status */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <div className={`h-3 w-3 rounded-full ${
                      connectionStatus === 'connected' ? 'bg-green-500' : 
                      connectionStatus === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
                    }`} />
                  </TooltipTrigger>
                  <TooltipContent>
                    Connection: {connectionStatus}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Active users */}
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">{activeUsers.length}</span>
              </div>

              {/* Save button */}
              <Button
                size="sm"
                onClick={() => saveDocument()}
                disabled={!hasUnsavedChanges || readOnly}
                className="gap-1"
              >
                <Save className="h-4 w-4" />
                Save
              </Button>

              {/* Share button */}
              <Button
                size="sm"
                variant="outline"
                onClick={() => shareDocument({ emails: [], permissions: 'view' })}
                className="gap-1"
              >
                <Share2 className="h-4 w-4" />
                Share
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {/* Active users display */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-medium">Active collaborators:</span>
            <div className="flex -space-x-2">
              {activeUsers.map(user => (
                <TooltipProvider key={user.id}>
                  <Tooltip>
                    <TooltipTrigger>
                      <Avatar className="h-8 w-8 border-2 border-white">
                        <AvatarImage src={user.avatar} alt={user.name} />
                        <AvatarFallback style={{ backgroundColor: userColors.get(user.id as UserId) }}>
                          {user.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-xs text-gray-500">
                          {user.status === 'editing' ? (
                            <span className="flex items-center gap-1">
                              <Edit3 className="h-3 w-3" /> Editing
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <Eye className="h-3 w-3" /> Viewing
                            </span>
                          )}
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </div>
          </div>

          {/* Status indicators */}
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>
              Last saved: {lastSaved.toLocaleTimeString()}
            </span>
            <span>
              Comments: {comments.length}
            </span>
            {pendingEdits.length > 0 && (
              <span className="text-orange-600">
                Pending edits: {pendingEdits.length}
              </span>
            )}
            {conflictedEdits.length > 0 && (
              <span className="text-red-600">
                Conflicts: {conflictedEdits.length}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Conflict resolution panel */}
      {conflictedEdits.length > 0 && (
        <Card className="mb-4 border-orange-200 bg-orange-50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <AlertTriangle className="h-4 w-4" />
              Edit Conflicts Detected
            </CardTitle>
          </CardHeader>
          <CardContent>
            {conflictedEdits.map(edit => (
              <div key={edit.id} className="flex items-center justify-between p-3 bg-white rounded border mb-2">
                <div>
                  <div className="font-medium">{edit.userName} - {edit.type}</div>
                  <div className="text-sm text-gray-600">
                    Position: {edit.position}
                    {edit.content && ` - "${edit.content}"`}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleResolveConflict(edit.id, 'accept')}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleResolveConflict(edit.id, 'reject')}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Document editor */}
      <Card>
        <CardContent className="p-0">
          <div className="relative">
            {/* Render cursors */}
            {renderCursors()}
            
            {/* Editor */}
            <div
              ref={editorRef}
              className="min-h-[400px] p-6 font-mono text-sm leading-relaxed resize-none border-none outline-none"
              contentEditable={!readOnly && isEditing}
              suppressContentEditableWarning={true}
              onInput={(e) => {
                const newContent = e.currentTarget.textContent || ''
                handleContentChange(newContent)
              }}
              onSelectionChange={handleSelectionChange}
              onMouseUp={handleSelectionChange}
              onKeyUp={(e) => {
                // Calculate cursor position based on selection
                const selection = window.getSelection()
                if (selection && selection.rangeCount > 0) {
                  const range = selection.getRangeAt(0)
                  const preCaretRange = range.cloneRange()
                  preCaretRange.selectNodeContents(editorRef.current!)
                  preCaretRange.setEnd(range.endContainer, range.endOffset)
                  const caretOffset = preCaretRange.toString().length
                  
                  // Convert offset to line/column (simplified)
                  const lines = content.substring(0, caretOffset).split('\n')
                  const line = lines.length - 1
                  const column = lines[lines.length - 1].length
                  
                  handleCursorChange({ line, column })
                }
              }}
              dangerouslySetInnerHTML={{ __html: content.replace(/\n/g, '<br>') }}
            />

            {/* Editing overlay when locked or read-only */}
            {(readOnly || !isEditing) && (
              <div className="absolute inset-0 bg-gray-100 bg-opacity-50 flex items-center justify-center">
                <div className="bg-white p-4 rounded-lg shadow-lg flex items-center gap-2">
                  {readOnly ? (
                    <>
                      <Eye className="h-5 w-5 text-gray-500" />
                      <span>Read-only mode</span>
                    </>
                  ) : (
                    <>
                      <Lock className="h-5 w-5 text-gray-500" />
                      <span>Document locked</span>
                      <Button size="sm" onClick={() => startEditing()}>
                        Start Editing
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Comments panel */}
      {comments.length > 0 && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Comments ({comments.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {comments.map(comment => (
                <div key={comment.id} className="p-3 bg-gray-50 rounded">
                  <div className="flex items-center gap-2 mb-1">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={comment.userAvatar} alt={comment.userName} />
                      <AvatarFallback>
                        {comment.userName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-sm">{comment.userName}</span>
                    <span className="text-xs text-gray-500">
                      {new Date(comment.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm">{comment.content}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}