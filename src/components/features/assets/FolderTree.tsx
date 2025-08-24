'use client'

import React, { useState, useRef, useCallback } from 'react'
import {
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Copy,
  Move,
  Archive,
  Lock,
  Unlock,
  Users,
  Calendar,
  FileText
} from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/form/input'
import { Card } from '@/components/molecules/cards/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/features/shared/ui/dropdown-menu'

export interface FolderNode {
  id: string
  name: string
  path: string
  parentId?: string
  children?: FolderNode[]
  isExpanded?: boolean
  fileCount: number
  totalSize: number
  createdAt: string
  updatedAt: string
  permissions: {
    canRead: boolean
    canWrite: boolean
    canDelete: boolean
    canShare: boolean
  }
  metadata: {
    description?: string
    tags: string[]
    isProtected: boolean
    isArchived: boolean
    owner: {
      id: string
      name: string
      email: string
    }
  }
}

interface FolderTreeProps {
  folders: FolderNode[]
  selectedFolderId?: string
  onFolderSelect: (folderId: string) => void
  onFolderCreate: (parentId?: string, name?: string) => void
  onFolderUpdate: (folderId: string, updates: Partial<FolderNode>) => void
  onFolderDelete: (folderId: string) => void
  onFolderMove: (sourceFolderId: string, targetFolderId: string) => void
  onFolderToggle: (folderId: string) => void
  isDragEnabled?: boolean
  className?: string
}

interface DragState {
  isDragging: boolean
  draggedFolderId?: string
  dragOverFolderId?: string
  dropPosition?: 'before' | 'after' | 'inside'
}

export function FolderTree({
  folders,
  selectedFolderId,
  onFolderSelect,
  onFolderCreate,
  onFolderUpdate,
  onFolderDelete,
  onFolderMove,
  onFolderToggle,
  isDragEnabled = true,
  className = ''
}: FolderTreeProps) {
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false
  })
  const dragTimeout = useRef<NodeJS.Timeout>()

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const formatFileCount = (count: number) => {
    return count === 1 ? '1 file' : `${count} files`
  }

  const getFolderIcon = (folder: FolderNode, isExpanded: boolean) => {
    if (folder.metadata.isProtected) return Lock
    if (folder.metadata.isArchived) return Archive
    return isExpanded ? FolderOpen : Folder
  }

  const handleEditStart = (folder: FolderNode) => {
    setEditingFolderId(folder.id)
    setEditingName(folder.name)
  }

  const handleEditSave = () => {
    if (editingFolderId && editingName.trim()) {
      onFolderUpdate(editingFolderId, { name: editingName.trim() })
    }
    setEditingFolderId(null)
    setEditingName('')
  }

  const handleEditCancel = () => {
    setEditingFolderId(null)
    setEditingName('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleEditSave()
    } else if (e.key === 'Escape') {
      handleEditCancel()
    }
  }

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, folderId: string) => {
    if (!isDragEnabled) return
    
    e.dataTransfer.setData('text/plain', folderId)
    e.dataTransfer.effectAllowed = 'move'
    
    setDragState({
      isDragging: true,
      draggedFolderId: folderId
    })
  }

  const handleDragOver = useCallback((e: React.DragEvent, folderId: string) => {
    if (!isDragEnabled || dragState.draggedFolderId === folderId) return
    
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    
    // Clear existing timeout
    if (dragTimeout.current) {
      clearTimeout(dragTimeout.current)
    }
    
    // Determine drop position based on mouse position
    const rect = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - rect.top
    const height = rect.height
    
    let dropPosition: 'before' | 'after' | 'inside' = 'inside'
    if (y < height * 0.25) {
      dropPosition = 'before'
    } else if (y > height * 0.75) {
      dropPosition = 'after'
    }
    
    setDragState(prev => ({
      ...prev,
      dragOverFolderId: folderId,
      dropPosition
    }))
    
    // Auto-expand folder after hovering for 1 second
    dragTimeout.current = setTimeout(() => {
      if (dropPosition === 'inside') {
        const folder = findFolderById(folders, folderId)
        if (folder && !folder.isExpanded) {
          onFolderToggle(folderId)
        }
      }
    }, 1000)
  }, [dragState.draggedFolderId, folders, isDragEnabled, onFolderToggle])

  const handleDragLeave = useCallback(() => {
    if (dragTimeout.current) {
      clearTimeout(dragTimeout.current)
    }
    
    setDragState(prev => ({
      ...prev,
      dragOverFolderId: undefined,
      dropPosition: undefined
    }))
  }, [])

  const handleDrop = useCallback((e: React.DragEvent, targetFolderId: string) => {
    if (!isDragEnabled) return
    
    e.preventDefault()
    const sourceFolderId = e.dataTransfer.getData('text/plain')
    
    if (sourceFolderId && sourceFolderId !== targetFolderId) {
      // Validate the move operation
      if (!isValidMove(folders, sourceFolderId, targetFolderId)) {
        console.warn('Invalid folder move operation')
        return
      }
      
      onFolderMove(sourceFolderId, targetFolderId)
    }
    
    setDragState({
      isDragging: false
    })
  }, [folders, isDragEnabled, onFolderMove])

  const handleDragEnd = useCallback(() => {
    if (dragTimeout.current) {
      clearTimeout(dragTimeout.current)
    }
    
    setDragState({
      isDragging: false
    })
  }, [])

  // Helper function to find folder by ID
  const findFolderById = (folders: FolderNode[], id: string): FolderNode | null => {
    for (const folder of folders) {
      if (folder.id === id) return folder
      if (folder.children) {
        const found = findFolderById(folder.children, id)
        if (found) return found
      }
    }
    return null
  }

  // Helper function to validate move operations
  const isValidMove = (folders: FolderNode[], sourceId: string, targetId: string): boolean => {
    // Can't move folder into itself
    if (sourceId === targetId) return false
    
    // Can't move folder into its own child
    const isDescendant = (parentId: string, childId: string): boolean => {
      const parent = findFolderById(folders, parentId)
      if (!parent || !parent.children) return false
      
      return parent.children.some(child => 
        child.id === childId || isDescendant(child.id, childId)
      )
    }
    
    return !isDescendant(sourceId, targetId)
  }

  // Render individual folder node
  const renderFolderNode = (folder: FolderNode, level = 0) => {
    const isSelected = selectedFolderId === folder.id
    const isExpanded = folder.isExpanded
    const hasChildren = folder.children && folder.children.length > 0
    const isEditing = editingFolderId === folder.id
    const isDraggedOver = dragState.dragOverFolderId === folder.id
    const FolderIcon = getFolderIcon(folder, isExpanded)

    const getFolderStatusColor = () => {
      if (folder.metadata.isProtected) return 'text-red-600'
      if (folder.metadata.isArchived) return 'text-gray-500'
      return 'text-blue-600'
    }

    const getDragOverStyles = () => {
      if (!isDraggedOver) return ''
      
      switch (dragState.dropPosition) {
        case 'before':
          return 'border-t-2 border-t-blue-500'
        case 'after':
          return 'border-b-2 border-b-blue-500'
        case 'inside':
          return 'bg-blue-50 border-blue-200'
        default:
          return ''
      }
    }

    return (
      <div key={folder.id} className="select-none">
        <div
          className={`
            flex items-center px-2 py-2 rounded-lg cursor-pointer transition-all
            hover:bg-gray-50 group
            ${isSelected ? 'bg-blue-50 border border-blue-200' : ''}
            ${getDragOverStyles()}
          `}
          style={{ paddingLeft: `${level * 20 + 8}px` }}
          onClick={() => onFolderSelect(folder.id)}
          draggable={isDragEnabled && folder.permissions.canWrite}
          onDragStart={(e) => handleDragStart(e, folder.id)}
          onDragOver={(e) => handleDragOver(e, folder.id)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, folder.id)}
          onDragEnd={handleDragEnd}
        >
          {/* Expand/Collapse Icon */}
          {hasChildren ? (
            <Button
              variant="ghost"
              size="sm"
              className="p-0 h-4 w-4 mr-1"
              onClick={(e) => {
                e.stopPropagation()
                onFolderToggle(folder.id)
              }}
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </Button>
          ) : (
            <div className="w-5 mr-1" />
          )}

          {/* Folder Icon */}
          <FolderIcon className={`h-4 w-4 mr-2 ${getFolderStatusColor()}`} />

          {/* Folder Name */}
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <Input
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleEditSave}
                className="h-6 py-0 px-1 text-sm"
                autoFocus
              />
            ) : (
              <div className="flex items-center justify-between">
                <span className={`text-sm font-medium truncate ${
                  folder.metadata.isArchived ? 'text-gray-500' : 'text-gray-900'
                }`}>
                  {folder.name}
                </span>
                
                <div className="flex items-center space-x-2 text-xs text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>{formatFileCount(folder.fileCount)}</span>
                  {folder.totalSize > 0 && (
                    <span>• {formatFileSize(folder.totalSize)}</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Actions Menu */}
          {!isEditing && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={() => onFolderCreate(folder.id)}
                  className="flex items-center"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Subfolder
                </DropdownMenuItem>
                
                {folder.permissions.canWrite && (
                  <>
                    <DropdownMenuItem
                      onClick={() => handleEditStart(folder)}
                      className="flex items-center"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Rename
                    </DropdownMenuItem>
                    
                    <DropdownMenuItem className="flex items-center">
                      <Copy className="h-4 w-4 mr-2" />
                      Duplicate
                    </DropdownMenuItem>
                    
                    <DropdownMenuItem className="flex items-center">
                      <Move className="h-4 w-4 mr-2" />
                      Move
                    </DropdownMenuItem>
                  </>
                )}

                {folder.permissions.canShare && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="flex items-center">
                      <Users className="h-4 w-4 mr-2" />
                      Share Folder
                    </DropdownMenuItem>
                    
                    <DropdownMenuItem className="flex items-center">
                      {folder.metadata.isProtected ? (
                        <>
                          <Unlock className="h-4 w-4 mr-2" />
                          Remove Protection
                        </>
                      ) : (
                        <>
                          <Lock className="h-4 w-4 mr-2" />
                          Protect Folder
                        </>
                      )}
                    </DropdownMenuItem>
                  </>
                )}

                {folder.permissions.canDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="flex items-center">
                      <Archive className="h-4 w-4 mr-2" />
                      {folder.metadata.isArchived ? 'Unarchive' : 'Archive'}
                    </DropdownMenuItem>
                    
                    <DropdownMenuItem
                      onClick={() => onFolderDelete(folder.id)}
                      className="flex items-center text-red-600 focus:text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Render Children */}
        {isExpanded && hasChildren && (
          <div className="ml-0">
            {folder.children!.map(child => renderFolderNode(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <Card className={`p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 flex items-center">
          <Folder className="h-5 w-5 mr-2 text-blue-600" />
          Folders
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onFolderCreate()}
          className="text-xs"
        >
          <Plus className="h-3 w-3 mr-1" />
          New Folder
        </Button>
      </div>

      <div className="space-y-1 max-h-96 overflow-y-auto">
        {folders.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Folder className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">No folders yet</p>
            <p className="text-xs text-gray-400 mt-1">
              Create your first folder to organize files
            </p>
          </div>
        ) : (
          folders.map(folder => renderFolderNode(folder))
        )}
      </div>
    </Card>
  )
}