'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'

export interface BulkSelectionItem {
  id: string
  name: string
  [key: string]: any
}

export interface BulkOperation {
  id: string
  label: string
  icon: any
  variant?: 'default' | 'destructive' | 'success'
  description?: string
  requiresConfirmation?: boolean
  confirmationTitle?: string
  confirmationMessage?: string
  execute: (selectedItems: BulkSelectionItem[]) => Promise<{ success: boolean; message: string; errors?: any[] }>
}

export interface UseBulkSelectionOptions {
  items: BulkSelectionItem[]
  operations: BulkOperation[]
  onSelectionChange?: (selectedItems: BulkSelectionItem[]) => void
  keyboardShortcuts?: boolean
}

export interface UseBulkSelectionReturn {
  selectedIds: Set<string>
  selectedItems: BulkSelectionItem[]
  isAllSelected: boolean
  isPartialSelected: boolean
  selectionCount: number
  totalCount: number
  
  // Selection actions
  selectItem: (id: string) => void
  deselectItem: (id: string) => void
  toggleItem: (id: string) => void
  selectAll: () => void
  deselectAll: () => void
  selectInverse: () => void
  
  // Bulk operations
  executeOperation: (operationId: string, options?: { skipConfirmation?: boolean }) => Promise<void>
  isExecuting: boolean
  executingOperation: string | null
  operationResults: { success: boolean; message: string; errors?: any[] } | null
  clearResults: () => void
  
  // UI helpers
  getCheckboxProps: (id: string) => {
    checked: boolean
    indeterminate?: boolean
    onChange: () => void
  }
  getSelectAllCheckboxProps: () => {
    checked: boolean
    indeterminate: boolean
    onChange: () => void
  }
}

export function useBulkSelection({
  items,
  operations,
  onSelectionChange,
  keyboardShortcuts = true
}: UseBulkSelectionOptions): UseBulkSelectionReturn {
  
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isExecuting, setIsExecuting] = useState(false)
  const [executingOperation, setExecutingOperation] = useState<string | null>(null)
  const [operationResults, setOperationResults] = useState<{ success: boolean; message: string; errors?: any[] } | null>(null)

  // Derived state
  const selectedItems = useMemo(() => 
    items.filter(item => selectedIds.has(item.id)),
    [items, selectedIds]
  )

  const isAllSelected = useMemo(() => 
    items.length > 0 && items.every(item => selectedIds.has(item.id)),
    [items, selectedIds]
  )

  const isPartialSelected = useMemo(() => 
    selectedIds.size > 0 && !isAllSelected,
    [selectedIds.size, isAllSelected]
  )

  const selectionCount = selectedIds.size
  const totalCount = items.length

  // Notify when selection changes
  useEffect(() => {
    onSelectionChange?.(selectedItems)
  }, [selectedItems, onSelectionChange])

  // Selection actions
  const selectItem = useCallback((id: string) => {
    setSelectedIds(prev => new Set([...prev, id]))
  }, [])

  const deselectItem = useCallback((id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev)
      newSet.delete(id)
      return newSet
    })
  }, [])

  const toggleItem = useCallback((id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }, [])

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(items.map(item => item.id)))
  }, [items])

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  const selectInverse = useCallback(() => {
    setSelectedIds(prev => {
      const newSet = new Set<string>()
      items.forEach(item => {
        if (!prev.has(item.id)) {
          newSet.add(item.id)
        }
      })
      return newSet
    })
  }, [items])

  // Operation execution
  const executeOperation = useCallback(async (operationId: string, options?: { skipConfirmation?: boolean }) => {
    if (selectedItems.length === 0) return

    const operation = operations.find(op => op.id === operationId)
    if (!operation) return

    // Handle confirmation for destructive operations
    if (operation.requiresConfirmation && !options?.skipConfirmation) {
      const confirmed = window.confirm(
        operation.confirmationMessage || 
        `Are you sure you want to ${operation.label.toLowerCase()} ${selectedItems.length} item(s)?`
      )
      if (!confirmed) return
    }

    try {
      setIsExecuting(true)
      setExecutingOperation(operationId)
      setOperationResults(null)

      const result = await operation.execute(selectedItems)
      setOperationResults(result)

      // If operation was successful, clear selection
      if (result.success) {
        deselectAll()
      }
    } catch (error) {
      setOperationResults({
        success: false,
        message: error instanceof Error ? error.message : 'An error occurred during the operation',
        errors: [error]
      })
    } finally {
      setIsExecuting(false)
      setExecutingOperation(null)
    }
  }, [selectedItems, operations, deselectAll])

  const clearResults = useCallback(() => {
    setOperationResults(null)
  }, [])

  // Checkbox helpers
  const getCheckboxProps = useCallback((id: string) => ({
    checked: selectedIds.has(id),
    onChange: () => toggleItem(id)
  }), [selectedIds, toggleItem])

  const getSelectAllCheckboxProps = useCallback(() => ({
    checked: isAllSelected,
    indeterminate: isPartialSelected,
    onChange: isAllSelected ? deselectAll : selectAll
  }), [isAllSelected, isPartialSelected, selectAll, deselectAll])

  // Keyboard shortcuts
  useEffect(() => {
    if (!keyboardShortcuts) return

    const handleKeydown = (event: KeyboardEvent) => {
      // Only handle shortcuts when not in an input field
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement
      ) {
        return
      }

      if (event.ctrlKey || event.metaKey) {
        switch (event.key.toLowerCase()) {
          case 'a':
            event.preventDefault()
            selectAll()
            break
          case 'i':
            event.preventDefault()
            selectInverse()
            break
        }
      } else {
        switch (event.key) {
          case 'Escape':
            event.preventDefault()
            deselectAll()
            break
          case 'Delete':
          case 'Backspace':
            if (selectedItems.length > 0) {
              event.preventDefault()
              // Find delete operation and execute it
              const deleteOp = operations.find(op => 
                op.variant === 'destructive' || 
                op.id === 'delete' || 
                op.id === 'archive'
              )
              if (deleteOp) {
                executeOperation(deleteOp.id)
              }
            }
            break
        }
      }
    }

    document.addEventListener('keydown', handleKeydown)
    return () => document.removeEventListener('keydown', handleKeydown)
  }, [keyboardShortcuts, selectAll, selectInverse, deselectAll, selectedItems.length, operations, executeOperation])

  return {
    selectedIds,
    selectedItems,
    isAllSelected,
    isPartialSelected,
    selectionCount,
    totalCount,
    
    selectItem,
    deselectItem,
    toggleItem,
    selectAll,
    deselectAll,
    selectInverse,
    
    executeOperation,
    isExecuting,
    executingOperation,
    operationResults,
    clearResults,
    
    getCheckboxProps,
    getSelectAllCheckboxProps
  }
}

// Utility function to create common bulk operations
export function createBulkOperations(
  onExportCsv: (items: BulkSelectionItem[]) => Promise<{ success: boolean; message: string; errors?: any[] }>,
  onArchive: (items: BulkSelectionItem[]) => Promise<{ success: boolean; message: string; errors?: any[] }>,
  onShare: (items: BulkSelectionItem[]) => Promise<{ success: boolean; message: string; errors?: any[] }>
): BulkOperation[] {
  return [
    {
      id: 'export-csv',
      label: 'Export CSV',
      icon: 'Download',
      variant: 'default',
      description: 'Export selected organizations to CSV file',
      execute: onExportCsv
    },
    {
      id: 'share',
      label: 'Bulk Share',
      icon: 'Share2',
      variant: 'default',
      description: 'Share access to selected organizations',
      execute: onShare
    },
    {
      id: 'archive',
      label: 'Archive',
      icon: 'Archive',
      variant: 'destructive',
      description: 'Archive selected organizations (30-day recovery)',
      requiresConfirmation: true,
      confirmationTitle: 'Archive Organizations',
      confirmationMessage: 'Are you sure you want to archive the selected organizations? They can be recovered within 30 days.',
      execute: onArchive
    }
  ]
}