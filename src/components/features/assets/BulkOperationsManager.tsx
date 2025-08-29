'use client'

import React, { useState, useCallback } from 'react'
import {
  CheckSquare,
  Square,
  Move,
  Copy,
  Trash2,
  Archive,
  Share2,
  Download,
  Tags,
  FolderPlus,
  X,
  AlertTriangle,
  CheckCircle,
  Loader
} from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { Card } from '@/components/molecules/cards/card'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Input } from '@/components/atoms/form/input'
import { Badge } from '@/components/ui/badge'

export interface BulkOperationItem {
  id: string
  name: string
  type: 'file' | 'folder'
  size?: number
  path: string
  permissions: {
    canMove: boolean
    canCopy: boolean
    canDelete: boolean
    canShare: boolean
    canArchive: boolean
  }
}

export interface BulkOperationProgress {
  operation: string
  total: number
  completed: number
  current?: string
  errors: Array<{
    itemId: string
    itemName: string
    error: string
  }>
}

interface BulkOperationsManagerProps {
  selectedItems: BulkOperationItem[]
  availableFolders: Array<{
    id: string
    name: string
    path: string
    canWrite: boolean
  }>
  availableCategories: Array<{
    value: string
    label: string
  }>
  onMove: (itemIds: string[], targetFolderId: string) => Promise<void>
  onCopy: (itemIds: string[], targetFolderId: string) => Promise<void>
  onDelete: (itemIds: string[]) => Promise<void>
  onArchive: (itemIds: string[], archive: boolean) => Promise<void>
  onShare: (itemIds: string[], shareData: any) => Promise<void>
  onDownload: (itemIds: string[]) => Promise<void>
  onUpdateTags: (itemIds: string[], tags: string[]) => Promise<void>
  onUpdateCategory: (itemIds: string[], category: string) => Promise<void>
  onClearSelection: () => void
  className?: string
}

type BulkOperationType = 'move' | 'copy' | 'delete' | 'archive' | 'unarchive' | 'share' | 'download' | 'tags' | 'category'

export function BulkOperationsManager({
  selectedItems,
  availableFolders,
  availableCategories,
  onMove,
  onCopy,
  onDelete,
  onArchive,
  onShare,
  onDownload,
  onUpdateTags,
  onUpdateCategory,
  onClearSelection,
  className = ''
}: BulkOperationsManagerProps) {
  const [activeOperation, setActiveOperation] = useState<BulkOperationType | null>(null)
  const [operationProgress, setOperationProgress] = useState<BulkOperationProgress | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [confirmAction, setConfirmAction] = useState<() => void>(() => {})

  // Form states for different operations
  const [targetFolderId, setTargetFolderId] = useState('')
  const [newTags, setNewTags] = useState('')
  const [newCategory, setNewCategory] = useState('')

  const fileCount = selectedItems.filter(item => item.type === 'file').length
  const folderCount = selectedItems.filter(item => item.type === 'folder').length
  const totalSize = selectedItems
    .filter(item => item.size)
    .reduce((acc, item) => acc + (item.size || 0), 0)

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const getItemSummary = () => {
    const parts = []
    if (fileCount > 0) parts.push(`${fileCount} file${fileCount > 1 ? 's' : ''}`)
    if (folderCount > 0) parts.push(`${folderCount} folder${folderCount > 1 ? 's' : ''}`)
    return parts.join(' and ')
  }

  const canPerformOperation = (operation: BulkOperationType) => {
    switch (operation) {
      case 'move':
        return selectedItems.every(item => item.permissions.canMove)
      case 'copy':
        return selectedItems.every(item => item.permissions.canCopy)
      case 'delete':
        return selectedItems.every(item => item.permissions.canDelete)
      case 'archive':
      case 'unarchive':
        return selectedItems.every(item => item.permissions.canArchive)
      case 'share':
        return selectedItems.every(item => item.permissions.canShare)
      case 'download':
        return selectedItems.length > 0
      case 'tags':
      case 'category':
        return selectedItems.every(item => item.permissions.canMove) // Using move permission for metadata changes
      default:
        return false
    }
  }

  const startOperation = useCallback((operation: BulkOperationType) => {
    setActiveOperation(operation)
    setOperationProgress(null)
    setTargetFolderId('')
    setNewTags('')
    setNewCategory('')
  }, [])

  const executeOperation = useCallback(async () => {
    if (!activeOperation) return

    const itemIds = selectedItems.map(item => item.id)
    
    setOperationProgress({
      operation: activeOperation,
      total: selectedItems.length,
      completed: 0,
      errors: []
    })

    try {
      switch (activeOperation) {
        case 'move':
          if (targetFolderId) {
            await onMove(itemIds, targetFolderId)
          }
          break
        case 'copy':
          if (targetFolderId) {
            await onCopy(itemIds, targetFolderId)
          }
          break
        case 'delete':
          await onDelete(itemIds)
          break
        case 'archive':
          await onArchive(itemIds, true)
          break
        case 'unarchive':
          await onArchive(itemIds, false)
          break
        case 'share':
          // Implementation depends on share modal integration
          break
        case 'download':
          await onDownload(itemIds)
          break
        case 'tags':
          if (newTags) {
            const tags = newTags.split(',').map(tag => tag.trim()).filter(Boolean)
            await onUpdateTags(itemIds, tags)
          }
          break
        case 'category':
          if (newCategory) {
            await onUpdateCategory(itemIds, newCategory)
          }
          break
      }

      setOperationProgress(prev => prev ? {
        ...prev,
        completed: prev.total
      } : null)

      // Close operation after short delay
      setTimeout(() => {
        setActiveOperation(null)
        setOperationProgress(null)
        onClearSelection()
      }, 1500)

    } catch (error) {
      console.error('Bulk operation failed:', error)
      setOperationProgress(prev => prev ? {
        ...prev,
        errors: [...prev.errors, {
          itemId: 'general',
          itemName: 'Operation',
          error: error instanceof Error ? error.message : 'Unknown error'
        }]
      } : null)
    }
  }, [activeOperation, selectedItems, targetFolderId, newTags, newCategory, onMove, onCopy, onDelete, onArchive, onDownload, onUpdateTags, onUpdateCategory, onClearSelection])

  const handleConfirmOperation = (action: () => void) => {
    setConfirmAction(() => action)
    setShowConfirmDialog(true)
  }

  const handleConfirm = () => {
    confirmAction()
    setShowConfirmDialog(false)
  }

  const renderOperationDialog = () => {
    if (!activeOperation) return null

    const getDialogTitle = () => {
      switch (activeOperation) {
        case 'move': return 'Move Items'
        case 'copy': return 'Copy Items'
        case 'delete': return 'Delete Items'
        case 'archive': return 'Archive Items'
        case 'unarchive': return 'Unarchive Items'
        case 'tags': return 'Update Tags'
        case 'category': return 'Update Category'
        default: return 'Bulk Operation'
      }
    }

    const requiresDestination = activeOperation === 'move' || activeOperation === 'copy'
    const isDestructive = activeOperation === 'delete'

    return (
      <Dialog open={true} onOpenChange={() => setActiveOperation(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{getDialogTitle()}</DialogTitle>
            <DialogDescription>
              This will affect {getItemSummary()}
              {totalSize > 0 && ` (${formatFileSize(totalSize)})`}
            </DialogDescription>
          </DialogHeader>

          {operationProgress ? (
            <div className="py-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">
                  {operationProgress.current || 'Processing...'}
                </span>
                <span className="text-sm text-gray-500">
                  {operationProgress.completed} / {operationProgress.total}
                </span>
              </div>
              <Progress 
                value={(operationProgress.completed / operationProgress.total) * 100}
                className="mb-4"
              />
              
              {operationProgress.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <h4 className="text-sm font-medium text-red-800 mb-2">
                    Errors ({operationProgress.errors.length})
                  </h4>
                  <div className="text-xs text-red-700 space-y-1">
                    {operationProgress.errors.map((error, index) => (
                      <div key={index}>
                        <strong>{error.itemName}:</strong> {error.error}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="py-4 space-y-4">
              {requiresDestination && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Destination Folder
                  </label>
                  <Select value={targetFolderId} onValueChange={setTargetFolderId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose destination..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableFolders
                        .filter(folder => folder.canWrite)
                        .map(folder => (
                          <SelectItem key={folder.id} value={folder.id}>
                            {folder.path}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {activeOperation === 'tags' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tags (comma separated)
                  </label>
                  <Input
                    value={newTags}
                    onChange={(e) => setNewTags(e.target.value)}
                    placeholder="tag1, tag2, tag3"
                  />
                </div>
              )}

              {activeOperation === 'category' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <Select value={newCategory} onValueChange={setNewCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose category..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCategories.map(category => (
                        <SelectItem key={category.value} value={category.value}>
                          {category.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {isDestructive && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="flex">
                    <AlertTriangle className="h-5 w-5 text-yellow-400 mr-2 flex-shrink-0" />
                    <div>
                      <h4 className="text-sm font-medium text-yellow-800">
                        This action cannot be undone
                      </h4>
                      <p className="text-sm text-yellow-700 mt-1">
                        The selected items will be permanently deleted.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {!operationProgress && (
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setActiveOperation(null)}
              >
                Cancel
              </Button>
              <Button
                onClick={executeOperation}
                disabled={
                  (requiresDestination && !targetFolderId) ||
                  (activeOperation === 'tags' && !newTags.trim()) ||
                  (activeOperation === 'category' && !newCategory)
                }
                className={isDestructive ? 'bg-red-600 hover:bg-red-700' : ''}
              >
                {isDestructive ? 'Delete' : 'Apply'}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    )
  }

  if (selectedItems.length === 0) return null

  return (
    <>
      <Card className={`fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 ${className}`}>
        <div className="flex items-center space-x-4 p-4">
          {/* Selection Summary */}
          <div className="flex items-center space-x-3">
            <Badge variant="secondary" className="font-medium">
              {selectedItems.length} selected
            </Badge>
            <span className="text-sm text-gray-600">
              {getItemSummary()}
              {totalSize > 0 && ` • ${formatFileSize(totalSize)}`}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => startOperation('move')}
              disabled={!canPerformOperation('move')}
              title="Move to folder"
            >
              <Move className="h-4 w-4" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => startOperation('copy')}
              disabled={!canPerformOperation('copy')}
              title="Copy to folder"
            >
              <Copy className="h-4 w-4" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => startOperation('archive')}
              disabled={!canPerformOperation('archive')}
              title="Archive items"
            >
              <Archive className="h-4 w-4" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => startOperation('share')}
              disabled={!canPerformOperation('share')}
              title="Share items"
            >
              <Share2 className="h-4 w-4" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => startOperation('download')}
              disabled={!canPerformOperation('download')}
              title="Download items"
            >
              <Download className="h-4 w-4" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => startOperation('tags')}
              disabled={!canPerformOperation('tags')}
              title="Update tags"
            >
              <Tags className="h-4 w-4" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handleConfirmOperation(() => startOperation('delete'))}
              disabled={!canPerformOperation('delete')}
              title="Delete items"
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={onClearSelection}
              title="Clear selection"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Operation Dialog */}
      {renderOperationDialog()}

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Action</DialogTitle>
            <DialogDescription>
              Are you sure you want to perform this action on {getItemSummary()}?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirm} className="bg-red-600 hover:bg-red-700">
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}