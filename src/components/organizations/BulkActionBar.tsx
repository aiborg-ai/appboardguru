'use client'

import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  X, 
  Download, 
  Archive, 
  Share2, 
  Settings,
  Users,
  MoreHorizontal,
  Loader2,
  CheckCircle,
  AlertCircle,
  Info,
  Trash2,
  Eye,
  Copy
} from 'lucide-react'
import { Button } from '@/features/shared/ui/button'
import { cn } from '@/lib/utils'
import type { BulkOperation, BulkSelectionItem } from '@/hooks/useBulkSelection'

interface BulkActionBarProps {
  selectedItems: BulkSelectionItem[]
  operations: BulkOperation[]
  onExecuteOperation: (operationId: string, options?: { skipConfirmation?: boolean }) => Promise<void>
  onDeselectAll: () => void
  isExecuting: boolean
  executingOperation: string | null
  operationResults: { success: boolean; message: string; errors?: any[] } | null
  onClearResults: () => void
  className?: string
}

interface ConfirmationDialogProps {
  isOpen: boolean
  operation: BulkOperation | null
  selectedItems: BulkSelectionItem[]
  onConfirm: () => void
  onCancel: () => void
  isExecuting: boolean
}

function ConfirmationDialog({ 
  isOpen, 
  operation, 
  selectedItems, 
  onConfirm, 
  onCancel,
  isExecuting
}: ConfirmationDialogProps) {
  if (!isOpen || !operation) return null

  return (
    <motion.div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
      >
        <div className="flex items-start space-x-4">
          <div className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0",
            operation.variant === 'destructive' 
              ? "bg-red-100 text-red-600" 
              : "bg-blue-100 text-blue-600"
          )}>
            {operation.variant === 'destructive' ? (
              <AlertCircle className="w-6 h-6" />
            ) : (
              <Info className="w-6 h-6" />
            )}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {operation.confirmationTitle || operation.label}
            </h3>
            <p className="text-gray-600 mb-4">
              {operation.confirmationMessage || 
               `Are you sure you want to ${operation.label.toLowerCase()} ${selectedItems.length} selected organization(s)?`}
            </p>
            
            {selectedItems.length <= 5 && (
              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <p className="text-sm text-gray-700 mb-2">Selected organizations:</p>
                <ul className="text-sm text-gray-600 space-y-1">
                  {selectedItems.map(item => (
                    <li key={item.id} className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="truncate">{item.name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex items-center space-x-3">
              <Button
                onClick={onCancel}
                variant="outline"
                disabled={isExecuting}
              >
                Cancel
              </Button>
              <Button
                onClick={onConfirm}
                variant={operation.variant === 'destructive' ? 'destructive' : 'default'}
                disabled={isExecuting}
                className="min-w-[120px]"
              >
                {isExecuting ? (
                  <div className="flex items-center space-x-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing...</span>
                  </div>
                ) : (
                  operation.label
                )}
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

function ResultsToast({ 
  results, 
  onClose 
}: { 
  results: { success: boolean; message: string; errors?: any[] }
  onClose: () => void 
}) {
  return (
    <motion.div
      className={cn(
        "fixed top-4 right-4 max-w-md rounded-lg shadow-lg p-4 z-50",
        results.success ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"
      )}
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 100 }}
    >
      <div className="flex items-start space-x-3">
        <div className={cn(
          "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0",
          results.success ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
        )}>
          {results.success ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
        </div>
        <div className="flex-1">
          <p className={cn(
            "text-sm font-medium",
            results.success ? "text-green-900" : "text-red-900"
          )}>
            {results.success ? 'Success!' : 'Error'}
          </p>
          <p className={cn(
            "text-sm mt-1",
            results.success ? "text-green-700" : "text-red-700"
          )}>
            {results.message}
          </p>
          {results.errors && results.errors.length > 0 && (
            <details className="mt-2">
              <summary className="text-xs text-red-600 cursor-pointer">View details</summary>
              <pre className="text-xs text-red-600 mt-1 whitespace-pre-wrap">
                {JSON.stringify(results.errors, null, 2)}
              </pre>
            </details>
          )}
        </div>
        <button
          onClick={onClose}
          className={cn(
            "text-gray-400 hover:text-gray-600 transition-colors",
            results.success ? "hover:text-green-600" : "hover:text-red-600"
          )}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  )
}

export function BulkActionBar({
  selectedItems,
  operations,
  onExecuteOperation,
  onDeselectAll,
  isExecuting,
  executingOperation,
  operationResults,
  onClearResults,
  className
}: BulkActionBarProps) {
  
  const [showMoreActions, setShowMoreActions] = useState(false)
  const [confirmationDialog, setConfirmationDialog] = useState<{
    isOpen: boolean
    operation: BulkOperation | null
  }>({ isOpen: false, operation: null })

  const handleOperationClick = useCallback(async (operation: BulkOperation) => {
    if (operation.requiresConfirmation) {
      setConfirmationDialog({ isOpen: true, operation })
    } else {
      await onExecuteOperation(operation.id)
    }
  }, [onExecuteOperation])

  const handleConfirmOperation = useCallback(async () => {
    if (confirmationDialog.operation) {
      await onExecuteOperation(confirmationDialog.operation.id, { skipConfirmation: true })
      setConfirmationDialog({ isOpen: false, operation: null })
    }
  }, [confirmationDialog.operation, onExecuteOperation])

  const handleCancelConfirmation = useCallback(() => {
    setConfirmationDialog({ isOpen: false, operation: null })
  }, [])

  const getOperationIcon = useCallback((iconName: string) => {
    switch (iconName) {
      case 'Download': return Download
      case 'Archive': return Archive
      case 'Share2': return Share2
      case 'Settings': return Settings
      case 'Users': return Users
      case 'Trash2': return Trash2
      case 'Eye': return Eye
      case 'Copy': return Copy
      default: return Settings
    }
  }, [])

  // Don't show if no items are selected
  if (selectedItems.length === 0) return null

  // Split operations into primary and secondary
  const primaryOperations = operations.slice(0, 3)
  const secondaryOperations = operations.slice(3)

  return (
    <>
      <AnimatePresence>
        <motion.div
          className={cn(
            "fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-white border border-gray-200 rounded-xl shadow-2xl p-4 z-40 min-w-[400px] max-w-2xl",
            className
          )}
          initial={{ opacity: 0, y: 100, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 100, scale: 0.95 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex items-center justify-between">
            {/* Selection Info */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-blue-600">{selectedItems.length}</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {selectedItems.length} selected
                  </p>
                  <p className="text-xs text-gray-500">
                    {selectedItems.map(item => item.name).slice(0, 2).join(', ')}
                    {selectedItems.length > 2 && ` +${selectedItems.length - 2} more`}
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-2">
              {/* Primary Operations */}
              {primaryOperations.map((operation) => {
                const Icon = getOperationIcon(operation.icon)
                const isCurrentlyExecuting = executingOperation === operation.id
                
                return (
                  <Button
                    key={operation.id}
                    onClick={() => handleOperationClick(operation)}
                    variant={operation.variant === 'destructive' ? 'destructive' : 'outline'}
                    size="sm"
                    disabled={isExecuting}
                    className={cn(
                      "min-w-[100px]",
                      isCurrentlyExecuting && "bg-blue-50 border-blue-300"
                    )}
                    title={operation.description}
                  >
                    {isCurrentlyExecuting ? (
                      <div className="flex items-center space-x-1">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="hidden sm:inline">Processing...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-1">
                        <Icon className="w-4 h-4" />
                        <span className="hidden sm:inline">{operation.label}</span>
                      </div>
                    )}
                  </Button>
                )
              })}

              {/* More Actions Dropdown */}
              {secondaryOperations.length > 0 && (
                <div className="relative">
                  <Button
                    onClick={() => setShowMoreActions(!showMoreActions)}
                    variant="outline"
                    size="sm"
                    disabled={isExecuting}
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                  
                  <AnimatePresence>
                    {showMoreActions && (
                      <motion.div
                        className="absolute bottom-full right-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg py-2 min-w-[160px] z-50"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                      >
                        {secondaryOperations.map((operation) => {
                          const Icon = getOperationIcon(operation.icon)
                          const isCurrentlyExecuting = executingOperation === operation.id
                          
                          return (
                            <button
                              key={operation.id}
                              onClick={() => {
                                handleOperationClick(operation)
                                setShowMoreActions(false)
                              }}
                              disabled={isExecuting}
                              className={cn(
                                "w-full flex items-center space-x-3 px-4 py-2 text-sm hover:bg-gray-50 transition-colors text-left",
                                operation.variant === 'destructive' && "text-red-600 hover:bg-red-50",
                                isCurrentlyExecuting && "bg-blue-50 text-blue-600"
                              )}
                            >
                              {isCurrentlyExecuting ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Icon className="w-4 h-4" />
                              )}
                              <span>{operation.label}</span>
                            </button>
                          )
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Close Button */}
              <Button
                onClick={onDeselectAll}
                variant="outline"
                size="sm"
                disabled={isExecuting}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Progress Bar */}
          {isExecuting && (
            <motion.div
              className="mt-3 bg-gray-200 rounded-full h-2 overflow-hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <motion.div
                className="h-full bg-blue-600 rounded-full"
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 2, ease: 'easeInOut', repeat: Infinity }}
              />
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Confirmation Dialog */}
      <AnimatePresence>
        {confirmationDialog.isOpen && (
          <ConfirmationDialog
            isOpen={confirmationDialog.isOpen}
            operation={confirmationDialog.operation}
            selectedItems={selectedItems}
            onConfirm={handleConfirmOperation}
            onCancel={handleCancelConfirmation}
            isExecuting={isExecuting}
          />
        )}
      </AnimatePresence>

      {/* Results Toast */}
      <AnimatePresence>
        {operationResults && (
          <ResultsToast
            results={operationResults}
            onClose={onClearResults}
          />
        )}
      </AnimatePresence>

      {/* Click outside handler for more actions */}
      {showMoreActions && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => setShowMoreActions(false)}
        />
      )}
    </>
  )
}

export default BulkActionBar