/**
 * Collaborative Document Editor Component
 * Real-time collaborative editing with CRDT support
 * Following CLAUDE.md patterns with Atomic Design
 */

'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { memo } from 'react'
import * as Y from 'yjs'
import { 
  FileText, 
  Users, 
  Wifi, 
  WifiOff, 
  Save, 
  History,
  AlertCircle,
  CheckCircle2,
  Clock
} from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { Card } from '@/components/molecules/cards/card'
import { Badge } from '@/components/atoms/display/badge'
import { Separator } from '@/components/atoms/display/separator'
import { useToast } from '@/features/shared/ui/use-toast'
import { UserPresenceIndicator } from './UserPresenceIndicator'
import { LiveCursorOverlay } from './LiveCursorOverlay'
import { CRDTService, type DocumentSnapshot } from '../../lib/services/crdt.service'
import { useLiveCursors } from '../../hooks/useLiveCursors'
import { useUser } from '../../lib/stores'
import type { AssetId, UserId, OrganizationId } from '../../types/database'
import type { UserPresence } from '../../types/websocket'
import type { CursorPosition, SelectionRange } from '../../lib/services/cursor-tracking.service'

interface CollaborativeDocumentEditorProps {
  assetId: AssetId
  organizationId: OrganizationId
  initialContent?: string
  readOnly?: boolean
  onContentChange?: (content: string) => void
  onSave?: (content: string) => Promise<void>
  className?: string
  maxHeight?: number
  showCollaborators?: boolean
  enableAutoSave?: boolean
  autoSaveInterval?: number
}

interface EditorStats {
  totalOperations: number
  conflictResolutions: number
  lastActivity: string
  documentVersion: number
}

interface ConnectionStatus {
  isConnected: boolean
  lastSync: Date | null
  syncStatus: 'syncing' | 'synced' | 'offline' | 'error'
}

export const CollaborativeDocumentEditor = memo(function CollaborativeDocumentEditor({
  assetId,
  organizationId,
  initialContent = '',
  readOnly = false,
  onContentChange,
  onSave,
  className = '',
  maxHeight = 600,
  showCollaborators = true,
  enableAutoSave = true,
  autoSaveInterval = 5000
}: CollaborativeDocumentEditorProps) {
  const user = useUser()
  const { toast } = useToast()
  
  // Live cursor tracking
  const {
    cursors: liveCursors,
    updateCursor,
    updateSelection,
    clearSelection,
    isTracking: isCursorTracking
  } = useLiveCursors({
    assetId,
    enabled: !readOnly
  })
  
  // State
  const [content, setContent] = useState(initialContent)
  const [isInitialized, setIsInitialized] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    isConnected: false,
    lastSync: null,
    syncStatus: 'offline'
  })
  const [collaborators, setCollaborators] = useState<UserPresence[]>([])
  const [stats, setStats] = useState<EditorStats>({
    totalOperations: 0,
    conflictResolutions: 0,
    lastActivity: new Date().toISOString(),
    documentVersion: 1
  })
  const [isSaving, setIsSaving] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Refs
  const editorRef = useRef<HTMLTextAreaElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const ydocRef = useRef<Y.Doc | null>(null)
  const crdtServiceRef = useRef<CRDTService | null>(null)
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>()
  const lastSavedContentRef = useRef(initialContent)
  const unsubscribeRef = useRef<(() => void) | null>(null)

  // Memoized CRDT service initialization
  const initializeCRDT = useCallback(async () => {
    if (!user || isInitialized) return

    try {
      setConnectionStatus(prev => ({ ...prev, syncStatus: 'syncing' }))

      // Initialize CRDT service
      crdtServiceRef.current = new CRDTService({})
      
      const result = await crdtServiceRef.current.initializeDocument(
        assetId,
        organizationId,
        initialContent
      )

      if (!result.success) {
        throw new Error(result.error.message)
      }

      ydocRef.current = result.data

      // Set up document text binding
      const ytext = ydocRef.current.getText('content')
      
      // Initialize content
      if (ytext.toString() !== content) {
        setContent(ytext.toString())
      }

      // Subscribe to document changes
      const subscribeResult = crdtServiceRef.current.subscribeToChanges(
        assetId,
        handleCRDTUpdate
      )

      if (subscribeResult.success) {
        unsubscribeRef.current = subscribeResult.data
      }

      // Set up awareness for cursor tracking
      await updateCursorPosition()

      setIsInitialized(true)
      setConnectionStatus({
        isConnected: true,
        lastSync: new Date(),
        syncStatus: 'synced'
      })

      // Load initial stats
      await loadStats()

      toast({
        title: "Connected",
        description: "Real-time collaboration is now active",
        duration: 3000
      })

    } catch (error) {
      console.error('Failed to initialize CRDT:', error)
      setConnectionStatus(prev => ({ ...prev, syncStatus: 'error' }))
      
      toast({
        title: "Connection Error",
        description: "Failed to enable real-time collaboration",
        variant: "destructive"
      })
    }
  }, [user, assetId, organizationId, initialContent, isInitialized])

  // Handle CRDT updates
  const handleCRDTUpdate = useCallback((event: any) => {
    if (!ydocRef.current) return

    try {
      const ytext = ydocRef.current.getText('content')
      const newContent = ytext.toString()
      
      if (newContent !== content) {
        setContent(newContent)
        setHasUnsavedChanges(newContent !== lastSavedContentRef.current)
        onContentChange?.(newContent)
      }

      setConnectionStatus(prev => ({
        ...prev,
        lastSync: new Date(),
        syncStatus: 'synced'
      }))

    } catch (error) {
      console.error('Failed to handle CRDT update:', error)
    }
  }, [content, onContentChange])

  // Handle text changes from user input
  const handleTextChange = useCallback(async (newContent: string) => {
    if (!ydocRef.current || !crdtServiceRef.current || readOnly) return

    try {
      const ytext = ydocRef.current.getText('content')
      const currentContent = ytext.toString()

      // Calculate diff and apply operations
      if (newContent !== currentContent) {
        // Simple diff algorithm - in production, use a more sophisticated approach
        const minLen = Math.min(newContent.length, currentContent.length)
        let diffStart = 0
        
        // Find start of difference
        while (diffStart < minLen && newContent[diffStart] === currentContent[diffStart]) {
          diffStart++
        }

        // Apply changes
        const deleteLen = currentContent.length - diffStart
        const insertText = newContent.slice(diffStart)

        if (deleteLen > 0) {
          await crdtServiceRef.current.applyTextOperation(
            assetId,
            {
              type: 'delete',
              position: diffStart,
              length: deleteLen
            },
            user?.id as UserId
          )
        }

        if (insertText.length > 0) {
          await crdtServiceRef.current.applyTextOperation(
            assetId,
            {
              type: 'insert',
              position: diffStart,
              content: insertText
            },
            user?.id as UserId
          )
        }

        setContent(newContent)
        setHasUnsavedChanges(newContent !== lastSavedContentRef.current)
        onContentChange?.(newContent)

        // Schedule auto-save
        if (enableAutoSave) {
          scheduleAutoSave(newContent)
        }
      }

    } catch (error) {
      console.error('Failed to apply text changes:', error)
      toast({
        title: "Sync Error",
        description: "Failed to sync your changes",
        variant: "destructive"
      })
    }
  }, [assetId, user?.id, readOnly, onContentChange, enableAutoSave])

  // Update cursor position for both CRDT awareness and live cursors
  const updateCursorPosition = useCallback(async () => {
    if (!editorRef.current || !user) return

    try {
      const textarea = editorRef.current
      const cursorPos: CursorPosition = {
        line: content.slice(0, textarea.selectionStart).split('\n').length - 1,
        column: textarea.selectionStart - content.lastIndexOf('\n', textarea.selectionStart - 1) - 1,
        offset: textarea.selectionStart
      }

      // Update live cursor tracking
      if (isCursorTracking) {
        let selection: SelectionRange | undefined
        
        if (textarea.selectionStart !== textarea.selectionEnd) {
          const startPos: CursorPosition = {
            line: content.slice(0, textarea.selectionStart).split('\n').length - 1,
            column: textarea.selectionStart - content.lastIndexOf('\n', textarea.selectionStart - 1) - 1,
            offset: textarea.selectionStart
          }
          
          const endPos: CursorPosition = {
            line: content.slice(0, textarea.selectionEnd).split('\n').length - 1,
            column: textarea.selectionEnd - content.lastIndexOf('\n', textarea.selectionEnd - 1) - 1,
            offset: textarea.selectionEnd
          }

          selection = {
            start: startPos,
            end: endPos,
            direction: textarea.selectionDirection === 'backward' ? 'backward' : 'forward'
          }
        }

        await updateCursor(cursorPos, selection, {
          isTyping: true,
          scrollPosition: {
            top: textarea.scrollTop,
            left: textarea.scrollLeft
          }
        })
      }

      // Update CRDT awareness
      if (crdtServiceRef.current) {
        await crdtServiceRef.current.updateAwareness(assetId, user.id as UserId, {
          cursor: cursorPos,
          selection: {
            start: textarea.selectionStart,
            end: textarea.selectionEnd
          },
          name: user.name || user.email || 'Unknown User',
          color: generateUserColor(user.id)
        })
      }

    } catch (error) {
      console.error('Failed to update cursor position:', error)
    }
  }, [assetId, user, content, isCursorTracking, updateCursor])

  // Schedule auto-save
  const scheduleAutoSave = useCallback((contentToSave: string) => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current)
    }

    autoSaveTimeoutRef.current = setTimeout(() => {
      handleSave(contentToSave)
    }, autoSaveInterval)
  }, [autoSaveInterval])

  // Handle save
  const handleSave = useCallback(async (contentToSave?: string) => {
    const saveContent = contentToSave || content
    
    if (!onSave || isSaving) return

    try {
      setIsSaving(true)
      await onSave(saveContent)
      
      lastSavedContentRef.current = saveContent
      setHasUnsavedChanges(false)
      
      toast({
        title: "Saved",
        description: "Document saved successfully",
        duration: 2000
      })

    } catch (error) {
      console.error('Failed to save document:', error)
      toast({
        title: "Save Error",
        description: "Failed to save document",
        variant: "destructive"
      })
    } finally {
      setIsSaving(false)
    }
  }, [content, onSave, isSaving, toast])

  // Load statistics
  const loadStats = useCallback(async () => {
    if (!crdtServiceRef.current) return

    try {
      const statsResult = await crdtServiceRef.current.getConflictStats(assetId)
      if (statsResult.success) {
        setStats(prev => ({
          ...prev,
          ...statsResult.data
        }))
      }

      const snapshotResult = await crdtServiceRef.current.getDocumentSnapshot(assetId)
      if (snapshotResult.success) {
        setStats(prev => ({
          ...prev,
          documentVersion: snapshotResult.data.version
        }))
      }

    } catch (error) {
      console.error('Failed to load stats:', error)
    }
  }, [assetId])

  // Generate consistent user color
  const generateUserColor = useCallback((userId: string): string => {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
    ]
    
    let hash = 0
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash)
    }
    
    return colors[Math.abs(hash) % colors.length]
  }, [])

  // Initialize CRDT on mount
  useEffect(() => {
    initializeCRDT()

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
      }
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
      if (crdtServiceRef.current) {
        crdtServiceRef.current.cleanupDocument(assetId)
      }
    }
  }, [initializeCRDT, assetId])

  // Connection status indicator
  const ConnectionIndicator = memo(() => (
    <div className="flex items-center space-x-2">
      {connectionStatus.isConnected ? (
        <Wifi className="h-4 w-4 text-green-500" />
      ) : (
        <WifiOff className="h-4 w-4 text-red-500" />
      )}
      <Badge 
        variant={connectionStatus.syncStatus === 'synced' ? 'default' : 'secondary'}
        className="text-xs"
      >
        {connectionStatus.syncStatus}
      </Badge>
    </div>
  ))
  ConnectionIndicator.displayName = 'ConnectionIndicator'

  return (
    <div className={`flex flex-col space-y-4 ${className}`}>
      {/* Header */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-gray-600" />
              <span className="font-medium">Collaborative Editor</span>
            </div>
            
            {showCollaborators && collaborators.length > 0 && (
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-gray-500" />
                <div className="flex -space-x-2">
                  {collaborators.slice(0, 3).map((collaborator) => (
                    <UserPresenceIndicator
                      key={collaborator.userId}
                      presence={collaborator}
                      size="sm"
                      showName={false}
                    />
                  ))}
                </div>
                {collaborators.length > 3 && (
                  <span className="text-xs text-gray-500">
                    +{collaborators.length - 3} more
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center space-x-4">
            <ConnectionIndicator />
            
            {hasUnsavedChanges && (
              <div className="flex items-center space-x-1 text-orange-500">
                <Clock className="h-4 w-4" />
                <span className="text-xs">Unsaved</span>
              </div>
            )}

            {onSave && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSave()}
                disabled={isSaving || !hasUnsavedChanges}
              >
                {isSaving ? (
                  <div className="flex items-center space-x-1">
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                    <span>Saving...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-1">
                    <Save className="h-4 w-4" />
                    <span>Save</span>
                  </div>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Stats */}
        <Separator className="my-3" />
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-4">
            <span>Version {stats.documentVersion}</span>
            <span>{stats.totalOperations} operations</span>
            {stats.conflictResolutions > 0 && (
              <span>{stats.conflictResolutions} conflicts resolved</span>
            )}
          </div>
          <div className="flex items-center space-x-1">
            <History className="h-3 w-3" />
            <span>Last activity: {new Date(stats.lastActivity).toLocaleTimeString()}</span>
          </div>
        </div>
      </Card>

      {/* Editor */}
      <Card className="p-4 flex-1 relative">
        <div ref={containerRef} className="relative h-full">
          {isInitialized ? (
            <>
              <textarea
                ref={editorRef}
                value={content}
                onChange={(e) => handleTextChange(e.target.value)}
                onSelectionChange={updateCursorPosition}
                onFocus={updateCursorPosition}
                onMouseUp={updateCursorPosition}
                onKeyUp={updateCursorPosition}
                readOnly={readOnly}
                className="w-full h-full min-h-[400px] p-4 border-0 outline-none resize-none font-mono text-sm leading-relaxed"
                style={{ maxHeight: `${maxHeight}px` }}
                placeholder={readOnly ? "Document is read-only" : "Start typing to collaborate in real-time..."}
              />
              
              {/* Live cursor overlay */}
              <LiveCursorOverlay
                assetId={assetId}
                cursors={liveCursors}
                containerRef={containerRef}
                textareaRef={editorRef}
                isVisible={!readOnly && isCursorTracking}
                showSelections={true}
                showUserInfo={true}
                className="absolute inset-0 pointer-events-none"
              />
            </>
          ) : (
            <div className="flex items-center justify-center h-64">
              <div className="flex items-center space-x-3">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="text-gray-600">Initializing collaborative editor...</span>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Status footer */}
      {connectionStatus.lastSync && (
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="h-3 w-3 text-green-500" />
            <span>Last sync: {connectionStatus.lastSync.toLocaleTimeString()}</span>
          </div>
          <div className="flex items-center space-x-4">
            <span>{content.length} characters</span>
            <span>{content.split('\n').length} lines</span>
          </div>
        </div>
      )}
    </div>
  )
})

export default CollaborativeDocumentEditor