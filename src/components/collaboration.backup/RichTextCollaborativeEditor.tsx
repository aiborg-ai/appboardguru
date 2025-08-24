/**
 * Rich Text Collaborative Editor
 * Enterprise-grade collaborative rich text editor with atomic design
 * Real-time editing, comments, suggestions, and version control
 * Following CLAUDE.md patterns with React.memo optimization
 */

'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { memo } from 'react'
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Quote,
  Link2,
  Image,
  Code,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Undo,
  Redo,
  MessageSquare,
  Edit3,
  Eye,
  Users,
  Clock,
  Save,
  History,
  Settings,
  MoreHorizontal,
  ChevronDown
} from 'lucide-react'

import { Button } from '@/components/atoms/Button'
import { Card } from '@/components/molecules/cards/card'
import { Badge } from '@/components/atoms/display/badge'
import { Separator } from '@/components/atoms/display/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/atoms/feedback/tooltip'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem } from '@/features/shared/ui/dropdown-menu'
import { useToast } from '@/features/shared/ui/use-toast'

import { UserPresenceIndicator } from './UserPresenceIndicator'
import { LiveCursorOverlay } from './LiveCursorOverlay'
import { CommentingSystem } from './CommentingSystem'
import { SuggestionsPanel } from './SuggestionsPanel'
import { CollaborationMetricsPanel } from './CollaborationMetricsPanel'

import { useDocumentCollaboration } from '../../hooks/useDocumentCollaboration'
import { useLiveCursors } from '../../hooks/useLiveCursors'
import { useRealtimeComments } from '../../hooks/useRealtimeComments'
import { useUser } from '../../lib/stores'

import type {
  DocumentId,
  UserId,
  OrganizationId,
  CollaborationSessionId,
  DocumentPresence,
  CollaborativeComment,
  DocumentSuggestion,
  CollaborationPermissions
} from '../../types/document-collaboration'

// ================================
// Atomic Design Components
// ================================

// Atoms
interface ToolbarButtonProps {
  icon: React.ComponentType<{ className?: string }>
  label: string
  isActive?: boolean
  disabled?: boolean
  onClick: () => void
  shortcut?: string
}

const ToolbarButton = memo(function ToolbarButton({
  icon: Icon,
  label,
  isActive = false,
  disabled = false,
  onClick,
  shortcut
}: ToolbarButtonProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={isActive ? "default" : "ghost"}
            size="sm"
            onClick={onClick}
            disabled={disabled}
            className={`h-8 w-8 p-0 ${isActive ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'}`}
          >
            <Icon className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs">
            <div>{label}</div>
            {shortcut && <div className="text-gray-400 mt-1">{shortcut}</div>}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
})

interface FormatDropdownProps {
  selectedFormat: string
  onFormatChange: (format: string) => void
  disabled?: boolean
}

const FormatDropdown = memo(function FormatDropdown({
  selectedFormat,
  onFormatChange,
  disabled = false
}: FormatDropdownProps) {
  const formats = [
    { value: 'paragraph', label: 'Paragraph' },
    { value: 'heading1', label: 'Heading 1' },
    { value: 'heading2', label: 'Heading 2' },
    { value: 'heading3', label: 'Heading 3' },
    { value: 'quote', label: 'Quote' },
    { value: 'code', label: 'Code Block' }
  ]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" disabled={disabled} className="h-8">
          {formats.find(f => f.value === selectedFormat)?.label || 'Paragraph'}
          <ChevronDown className="ml-1 h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {formats.map(format => (
          <DropdownMenuItem
            key={format.value}
            onClick={() => onFormatChange(format.value)}
            className={selectedFormat === format.value ? 'bg-blue-50' : ''}
          >
            {format.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
})

// Molecules
interface EditorToolbarProps {
  permissions: CollaborationPermissions
  formatState: {
    bold: boolean
    italic: boolean
    underline: boolean
    format: string
    alignment: string
  }
  onCommand: (command: string, value?: string | number | boolean) => void
  canUndo: boolean
  canRedo: boolean
  disabled?: boolean
}

const EditorToolbar = memo(function EditorToolbar({
  permissions,
  formatState,
  onCommand,
  canUndo,
  canRedo,
  disabled = false
}: EditorToolbarProps) {
  return (
    <div className="flex items-center space-x-1 p-2 border-b bg-gray-50">
      {/* Format Dropdown */}
      <FormatDropdown
        selectedFormat={formatState.format}
        onFormatChange={(format) => onCommand('format', format)}
        disabled={disabled || !permissions.canEdit}
      />

      <Separator orientation="vertical" className="h-6" />

      {/* Text Formatting */}
      <div className="flex items-center space-x-1">
        <ToolbarButton
          icon={Bold}
          label="Bold"
          shortcut="Ctrl+B"
          isActive={formatState.bold}
          onClick={() => onCommand('bold')}
          disabled={disabled || !permissions.canEdit}
        />
        <ToolbarButton
          icon={Italic}
          label="Italic"
          shortcut="Ctrl+I"
          isActive={formatState.italic}
          onClick={() => onCommand('italic')}
          disabled={disabled || !permissions.canEdit}
        />
        <ToolbarButton
          icon={Underline}
          label="Underline"
          shortcut="Ctrl+U"
          isActive={formatState.underline}
          onClick={() => onCommand('underline')}
          disabled={disabled || !permissions.canEdit}
        />
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Lists */}
      <div className="flex items-center space-x-1">
        <ToolbarButton
          icon={List}
          label="Bullet List"
          onClick={() => onCommand('bulletList')}
          disabled={disabled || !permissions.canEdit}
        />
        <ToolbarButton
          icon={ListOrdered}
          label="Numbered List"
          onClick={() => onCommand('numberedList')}
          disabled={disabled || !permissions.canEdit}
        />
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Alignment */}
      <div className="flex items-center space-x-1">
        <ToolbarButton
          icon={AlignLeft}
          label="Align Left"
          isActive={formatState.alignment === 'left'}
          onClick={() => onCommand('align', 'left')}
          disabled={disabled || !permissions.canEdit}
        />
        <ToolbarButton
          icon={AlignCenter}
          label="Align Center"
          isActive={formatState.alignment === 'center'}
          onClick={() => onCommand('align', 'center')}
          disabled={disabled || !permissions.canEdit}
        />
        <ToolbarButton
          icon={AlignRight}
          label="Align Right"
          isActive={formatState.alignment === 'right'}
          onClick={() => onCommand('align', 'right')}
          disabled={disabled || !permissions.canEdit}
        />
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Undo/Redo */}
      <div className="flex items-center space-x-1">
        <ToolbarButton
          icon={Undo}
          label="Undo"
          shortcut="Ctrl+Z"
          onClick={() => onCommand('undo')}
          disabled={disabled || !canUndo || !permissions.canEdit}
        />
        <ToolbarButton
          icon={Redo}
          label="Redo"
          shortcut="Ctrl+Y"
          onClick={() => onCommand('redo')}
          disabled={disabled || !canRedo || !permissions.canEdit}
        />
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Insert */}
      <div className="flex items-center space-x-1">
        <ToolbarButton
          icon={Link2}
          label="Insert Link"
          shortcut="Ctrl+K"
          onClick={() => onCommand('link')}
          disabled={disabled || !permissions.canEdit}
        />
        <ToolbarButton
          icon={Image}
          label="Insert Image"
          onClick={() => onCommand('image')}
          disabled={disabled || !permissions.canEdit}
        />
        <ToolbarButton
          icon={Code}
          label="Inline Code"
          shortcut="Ctrl+`"
          onClick={() => onCommand('inlineCode')}
          disabled={disabled || !permissions.canEdit}
        />
      </div>

      <div className="flex-1" />

      {/* Comments & Suggestions */}
      {permissions.canComment && (
        <>
          <ToolbarButton
            icon={MessageSquare}
            label="Add Comment"
            shortcut="Ctrl+M"
            onClick={() => onCommand('addComment')}
            disabled={disabled}
          />
        </>
      )}

      {permissions.canSuggest && (
        <ToolbarButton
          icon={Edit3}
          label="Suggest Edit"
          onClick={() => onCommand('suggest')}
          disabled={disabled}
        />
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onCommand('findReplace')}>
            Find & Replace
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onCommand('spellCheck')}>
            Spell Check
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onCommand('wordCount')}>
            Word Count
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onCommand('export')}>
            Export Document
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
})

interface CollaborationStatusBarProps {
  participants: DocumentPresence[]
  sessionId: CollaborationSessionId
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error'
  lastSaved?: Date
  hasUnsavedChanges: boolean
  documentStats: {
    wordCount: number
    characterCount: number
    readingTime: number
  }
  onSave?: () => void
}

const CollaborationStatusBar = memo(function CollaborationStatusBar({
  participants,
  sessionId,
  connectionStatus,
  lastSaved,
  hasUnsavedChanges,
  documentStats,
  onSave
}: CollaborationStatusBarProps) {
  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'text-green-600'
      case 'connecting': return 'text-yellow-600'
      case 'disconnected': return 'text-gray-500'
      case 'error': return 'text-red-600'
      default: return 'text-gray-500'
    }
  }

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Connected'
      case 'connecting': return 'Connecting...'
      case 'disconnected': return 'Disconnected'
      case 'error': return 'Connection Error'
      default: return 'Unknown'
    }
  }

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-t text-xs">
      <div className="flex items-center space-x-4">
        {/* Connection Status */}
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${
            connectionStatus === 'connected' ? 'bg-green-500' :
            connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' :
            connectionStatus === 'error' ? 'bg-red-500' : 'bg-gray-400'
          }`} />
          <span className={getStatusColor()}>{getStatusText()}</span>
        </div>

        {/* Participants */}
        {participants.length > 0 && (
          <div className="flex items-center space-x-2">
            <Users className="h-3 w-3 text-gray-500" />
            <div className="flex -space-x-1">
              {participants.slice(0, 3).map((participant) => (
                <UserPresenceIndicator
                  key={participant.userId}
                  presence={participant}
                  size="xs"
                  showName={false}
                />
              ))}
            </div>
            <span className="text-gray-500">
              {participants.length} collaborator{participants.length !== 1 ? 's' : ''}
            </span>
            {participants.length > 3 && (
              <span className="text-gray-500">+{participants.length - 3} more</span>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center space-x-6">
        {/* Document Stats */}
        <div className="flex items-center space-x-4 text-gray-500">
          <span>{documentStats.wordCount.toLocaleString()} words</span>
          <span>{documentStats.characterCount.toLocaleString()} characters</span>
          <span>{documentStats.readingTime} min read</span>
        </div>

        {/* Save Status */}
        <div className="flex items-center space-x-2">
          {hasUnsavedChanges && (
            <>
              <Clock className="h-3 w-3 text-orange-500" />
              <span className="text-orange-600">Unsaved changes</span>
              {onSave && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onSave}
                  className="h-6 text-xs px-2"
                >
                  <Save className="h-3 w-3 mr-1" />
                  Save
                </Button>
              )}
            </>
          )}
          {!hasUnsavedChanges && lastSaved && (
            <div className="flex items-center space-x-1 text-gray-500">
              <History className="h-3 w-3" />
              <span>Saved {lastSaved.toLocaleTimeString()}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
})

// Organism
export interface RichTextCollaborativeEditorProps {
  documentId: DocumentId
  organizationId: OrganizationId
  sessionId?: CollaborationSessionId
  initialContent?: string
  permissions?: Partial<CollaborationPermissions>
  readOnly?: boolean
  onContentChange?: (content: string) => void
  onSave?: (content: string) => Promise<void>
  className?: string
  maxHeight?: number
  showComments?: boolean
  showSuggestions?: boolean
  showMetrics?: boolean
  autoSave?: boolean
  autoSaveInterval?: number
}

export const RichTextCollaborativeEditor = memo(function RichTextCollaborativeEditor({
  documentId,
  organizationId,
  sessionId,
  initialContent = '',
  permissions: customPermissions,
  readOnly = false,
  onContentChange,
  onSave,
  className = '',
  maxHeight = 600,
  showComments = true,
  showSuggestions = true,
  showMetrics = false,
  autoSave = true,
  autoSaveInterval = 5000
}: RichTextCollaborativeEditorProps) {
  const user = useUser()
  const { toast } = useToast()

  // Hooks for collaboration features
  const {
    session,
    participants,
    connectionStatus,
    applyOperation,
    permissions: sessionPermissions,
    isInitialized,
    error: collaborationError
  } = useDocumentCollaboration({
    documentId,
    organizationId,
    sessionId,
    enabled: !readOnly
  })

  const {
    cursors,
    updateCursor,
    isTracking: isCursorTracking
  } = useLiveCursors({
    documentId,
    sessionId: session?.id,
    enabled: !readOnly && isInitialized
  })

  const {
    comments,
    addComment,
    updateComment,
    deleteComment
  } = useRealtimeComments({
    documentId,
    sessionId: session?.id,
    enabled: showComments && !readOnly
  })

  // Combine permissions
  const effectivePermissions = useMemo(() => ({
    canView: true,
    canEdit: !readOnly && (customPermissions?.canEdit ?? sessionPermissions?.canEdit ?? true),
    canComment: !readOnly && (customPermissions?.canComment ?? sessionPermissions?.canComment ?? true),
    canSuggest: !readOnly && (customPermissions?.canSuggest ?? sessionPermissions?.canSuggest ?? false),
    canResolveComments: customPermissions?.canResolveComments ?? sessionPermissions?.canResolveComments ?? false,
    canManageVersions: customPermissions?.canManageVersions ?? sessionPermissions?.canManageVersions ?? false,
    canLockSections: customPermissions?.canLockSections ?? sessionPermissions?.canLockSections ?? false,
    canMerge: customPermissions?.canMerge ?? sessionPermissions?.canMerge ?? false,
    canApprove: customPermissions?.canApprove ?? sessionPermissions?.canApprove ?? false
  }), [customPermissions, sessionPermissions, readOnly])

  // Editor state
  const [content, setContent] = useState(initialContent)
  const [formatState, setFormatState] = useState({
    bold: false,
    italic: false,
    underline: false,
    format: 'paragraph',
    alignment: 'left'
  })
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date>()
  const [isLoading, setIsLoading] = useState(false)
  const [undoStack, setUndoStack] = useState<string[]>([initialContent])
  const [redoStack, setRedoStack] = useState<string[]>([])
  const [showCommentsPanel, setShowCommentsPanel] = useState(false)
  const [showSuggestionsPanel, setShowSuggestionsPanel] = useState(false)
  const [showMetricsPanel, setShowMetricsPanel] = useState(false)

  // Refs
  const editorRef = useRef<HTMLDivElement>(null)
  const selectionRef = useRef<Selection | null>(null)
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>()

  // Document stats
  const documentStats = useMemo(() => {
    const words = content.trim() ? content.trim().split(/\s+/).length : 0
    const characters = content.length
    const readingTime = Math.ceil(words / 200) // Assume 200 WPM
    
    return { wordCount: words, characterCount: characters, readingTime }
  }, [content])

  // Handle editor commands
  const handleCommand = useCallback(async (command: string, value?: string | number | boolean) => {
    if (!editorRef.current || (!effectivePermissions.canEdit && command !== 'addComment')) return

    try {
      switch (command) {
        case 'bold':
        case 'italic':
        case 'underline':
          document.execCommand(command, false)
          setFormatState(prev => ({ ...prev, [command]: !prev[command as keyof typeof prev] }))
          break

        case 'format':
          // Apply text format (heading, paragraph, etc.)
          document.execCommand('formatBlock', false, value)
          setFormatState(prev => ({ ...prev, format: value }))
          break

        case 'align':
          const alignCommand = `justify${value.charAt(0).toUpperCase()}${value.slice(1)}`
          document.execCommand(alignCommand, false)
          setFormatState(prev => ({ ...prev, alignment: value }))
          break

        case 'bulletList':
          document.execCommand('insertUnorderedList', false)
          break

        case 'numberedList':
          document.execCommand('insertOrderedList', false)
          break

        case 'undo':
          if (undoStack.length > 1) {
            const currentContent = undoStack.pop()!
            const previousContent = undoStack[undoStack.length - 1]
            setRedoStack(prev => [...prev, currentContent])
            setContent(previousContent)
            if (editorRef.current) {
              editorRef.current.innerHTML = previousContent
            }
          }
          break

        case 'redo':
          if (redoStack.length > 0) {
            const nextContent = redoStack.pop()!
            setUndoStack(prev => [...prev, nextContent])
            setContent(nextContent)
            if (editorRef.current) {
              editorRef.current.innerHTML = nextContent
            }
          }
          break

        case 'link':
          const url = prompt('Enter URL:')
          if (url) {
            document.execCommand('createLink', false, url)
          }
          break

        case 'image':
          const imageUrl = prompt('Enter image URL:')
          if (imageUrl) {
            document.execCommand('insertImage', false, imageUrl)
          }
          break

        case 'inlineCode':
          const selection = window.getSelection()
          if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0)
            const code = document.createElement('code')
            code.appendChild(range.extractContents())
            range.insertNode(code)
          }
          break

        case 'addComment':
          if (effectivePermissions.canComment) {
            setShowCommentsPanel(true)
            // Add comment at current cursor position
            const selection = window.getSelection()
            if (selection && selection.rangeCount > 0) {
              const range = selection.getRangeAt(0)
              const position = {
                line: 0, // Calculate from range
                column: range.startOffset,
                offset: range.startOffset
              }
              // This would integrate with the commenting system
              console.log('Add comment at position:', position)
            }
          }
          break

        case 'suggest':
          if (effectivePermissions.canSuggest) {
            setShowSuggestionsPanel(true)
          }
          break

        default:
          console.log('Unhandled command:', command, value)
      }

      // Update format state based on current selection
      updateFormatState()

    } catch (error) {
      console.error('Failed to execute command:', error)
      toast({
        title: "Command Failed",
        description: `Failed to execute ${command}`,
        variant: "destructive"
      })
    }
  }, [effectivePermissions, undoStack, redoStack, toast])

  const updateFormatState = useCallback(() => {
    if (!document.getSelection) return

    const selection = document.getSelection()
    if (!selection || selection.rangeCount === 0) return

    setFormatState({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      format: document.queryCommandValue('formatBlock') || 'paragraph',
      alignment: document.queryCommandValue('justifyLeft') ? 'left' :
                 document.queryCommandValue('justifyCenter') ? 'center' :
                 document.queryCommandValue('justifyRight') ? 'right' : 'left'
    })
  }, [])

  // Handle content changes
  const handleContentChange = useCallback(async (newContent: string) => {
    if (newContent === content) return

    setContent(newContent)
    setHasUnsavedChanges(true)
    onContentChange?.(newContent)

    // Update undo stack
    setUndoStack(prev => [...prev.slice(-19), newContent]) // Keep last 20 states
    setRedoStack([]) // Clear redo stack

    // Apply operation through collaboration system
    if (session && effectivePermissions.canEdit) {
      try {
        // Simple diff - in production, use a more sophisticated approach
        const oldContent = content
        const operation = calculateOperation(oldContent, newContent)
        
        if (operation) {
          const result = await applyOperation(operation)
          if (!result.success) {
            console.error('Failed to apply operation:', result.error)
          }
        }
      } catch (error) {
        console.error('Failed to sync content change:', error)
      }
    }

    // Schedule auto-save
    if (autoSave && onSave) {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
      
      autoSaveTimeoutRef.current = setTimeout(() => {
        handleSave(newContent)
      }, autoSaveInterval)
    }
  }, [content, session, effectivePermissions.canEdit, applyOperation, autoSave, onSave, autoSaveInterval, onContentChange])

  const handleSave = useCallback(async (contentToSave?: string) => {
    if (!onSave || isLoading) return

    const saveContent = contentToSave || content
    
    try {
      setIsLoading(true)
      await onSave(saveContent)
      setHasUnsavedChanges(false)
      setLastSaved(new Date())

      toast({
        title: "Document Saved",
        description: "Your changes have been saved successfully",
      })

    } catch (error) {
      console.error('Failed to save document:', error)
      toast({
        title: "Save Failed",
        description: "Failed to save your changes",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }, [content, onSave, isLoading, toast])

  // Simple operation calculation (in production, use proper diff algorithm)
  const calculateOperation = (oldContent: string, newContent: string) => {
    if (oldContent === newContent) return null

    // Find first difference
    let start = 0
    while (start < Math.min(oldContent.length, newContent.length) && 
           oldContent[start] === newContent[start]) {
      start++
    }

    if (start === oldContent.length && start === newContent.length) return null

    if (newContent.length > oldContent.length) {
      // Insertion
      return {
        type: 'insert' as const,
        position: start,
        content: newContent.slice(start, start + (newContent.length - oldContent.length))
      }
    } else if (newContent.length < oldContent.length) {
      // Deletion
      return {
        type: 'delete' as const,
        position: start,
        length: oldContent.length - newContent.length
      }
    } else {
      // Replacement (delete + insert)
      return {
        type: 'insert' as const,
        position: start,
        content: newContent.slice(start)
      }
    }
  }

  // Handle selection changes for cursor tracking
  const handleSelectionChange = useCallback(async () => {
    if (!isCursorTracking || !user || !editorRef.current) return

    const selection = document.getSelection()
    if (!selection || selection.rangeCount === 0) return

    const range = selection.getRangeAt(0)
    const rect = range.getBoundingClientRect()
    const editorRect = editorRef.current.getBoundingClientRect()

    const cursorPosition = {
      line: 0, // Calculate line from range
      column: range.startOffset,
      offset: range.startOffset
    }

    await updateCursor(cursorPosition, {
      start: cursorPosition,
      end: {
        line: 0,
        column: range.endOffset,
        offset: range.endOffset
      },
      direction: 'forward'
    }, {
      isTyping: false,
      scrollPosition: {
        top: editorRef.current.scrollTop,
        left: editorRef.current.scrollLeft
      }
    })

    updateFormatState()
  }, [isCursorTracking, user, updateCursor, updateFormatState])

  // Set up event listeners
  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return

    const handleInput = (e: Event) => {
      const newContent = editor.innerHTML
      handleContentChange(newContent)
    }

    const handleSelectionChangeEvent = () => {
      handleSelectionChange()
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      // Handle keyboard shortcuts
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'b':
            e.preventDefault()
            handleCommand('bold')
            break
          case 'i':
            e.preventDefault()
            handleCommand('italic')
            break
          case 'u':
            e.preventDefault()
            handleCommand('underline')
            break
          case 's':
            e.preventDefault()
            handleSave()
            break
          case 'k':
            e.preventDefault()
            handleCommand('link')
            break
          case 'm':
            e.preventDefault()
            handleCommand('addComment')
            break
          case 'z':
            if (e.shiftKey) {
              e.preventDefault()
              handleCommand('redo')
            } else {
              e.preventDefault()
              handleCommand('undo')
            }
            break
          case 'y':
            e.preventDefault()
            handleCommand('redo')
            break
        }
      }
    }

    editor.addEventListener('input', handleInput)
    editor.addEventListener('keydown', handleKeyDown)
    document.addEventListener('selectionchange', handleSelectionChangeEvent)

    return () => {
      editor.removeEventListener('input', handleInput)
      editor.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('selectionchange', handleSelectionChangeEvent)
    }
  }, [handleContentChange, handleSelectionChange, handleCommand, handleSave])

  // Cleanup
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
    }
  }, [])

  if (collaborationError) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="text-center text-red-600">
          <h3 className="font-semibold mb-2">Collaboration Error</h3>
          <p className="text-sm">{collaborationError.message}</p>
        </div>
      </Card>
    )
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      <div className="flex-1 flex">
        {/* Main Editor */}
        <div className="flex-1 flex flex-col">
          <Card className="flex-1 flex flex-col">
            {/* Toolbar */}
            <EditorToolbar
              permissions={effectivePermissions}
              formatState={formatState}
              onCommand={handleCommand}
              canUndo={undoStack.length > 1}
              canRedo={redoStack.length > 0}
              disabled={isLoading || !isInitialized}
            />

            {/* Editor Content */}
            <div className="flex-1 relative">
              {isInitialized ? (
                <>
                  <div
                    ref={editorRef}
                    contentEditable={effectivePermissions.canEdit && !readOnly}
                    suppressContentEditableWarning
                    className="w-full h-full p-6 outline-none overflow-auto prose max-w-none"
                    style={{ 
                      minHeight: '400px', 
                      maxHeight: `${maxHeight}px` 
                    }}
                    dangerouslySetInnerHTML={{ __html: content }}
                    placeholder={readOnly ? "Document is read-only" : "Start writing..."}
                  />

                  {/* Live Cursors */}
                  <LiveCursorOverlay
                    documentId={documentId}
                    cursors={cursors}
                    containerRef={{ current: editorRef.current }}
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

            {/* Status Bar */}
            <CollaborationStatusBar
              participants={participants}
              sessionId={session?.id || ('' as CollaborationSessionId)}
              connectionStatus={connectionStatus}
              lastSaved={lastSaved}
              hasUnsavedChanges={hasUnsavedChanges}
              documentStats={documentStats}
              onSave={onSave ? () => handleSave() : undefined}
            />
          </Card>
        </div>

        {/* Side Panels */}
        {(showCommentsPanel || showSuggestionsPanel || showMetricsPanel) && (
          <div className="w-80 ml-4 space-y-4">
            {showCommentsPanel && showComments && (
              <CommentingSystem
                documentId={documentId}
                sessionId={session?.id}
                comments={comments}
                permissions={effectivePermissions}
                onAddComment={addComment}
                onUpdateComment={updateComment}
                onDeleteComment={deleteComment}
                onClose={() => setShowCommentsPanel(false)}
              />
            )}

            {showSuggestionsPanel && showSuggestions && (
              <SuggestionsPanel
                documentId={documentId}
                sessionId={session?.id}
                permissions={effectivePermissions}
                onClose={() => setShowSuggestionsPanel(false)}
              />
            )}

            {showMetricsPanel && showMetrics && (
              <CollaborationMetricsPanel
                sessionId={session?.id}
                onClose={() => setShowMetricsPanel(false)}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
})

export default RichTextCollaborativeEditor