'use client'

import React, { memo, useState } from 'react'
import { cn } from '@/lib/utils'
import { RotateCcw, AlertTriangle } from 'lucide-react'
import { SettingsCard } from './settings-card'
import { SettingsButton } from './settings-button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/features/shared/ui/dialog'
import { Checkbox } from '@/features/shared/ui/checkbox'
import type { SettingsResetProps } from './types'

export const SettingsReset = memo<SettingsResetProps>(({
  onReset,
  onResetToDefaults,
  confirmationRequired = true,
  resetScopes = [],
  loading = false,
  className,
  ...props
}) => {
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [selectedScopes, setSelectedScopes] = useState<string[]>(
    resetScopes?.filter(scope => scope.selected).map(scope => scope.id) || []
  )
  const [resetType, setResetType] = useState<'current' | 'defaults'>('current')

  const handleResetClick = (type: 'current' | 'defaults') => {
    setResetType(type)
    if (confirmationRequired) {
      setShowConfirmation(true)
    } else {
      executeReset(type)
    }
  }

  const executeReset = (type: 'current' | 'defaults') => {
    if (type === 'defaults') {
      onResetToDefaults?.()
    } else {
      onReset?.()
    }
    setShowConfirmation(false)
  }

  const handleScopeToggle = (scopeId: string) => {
    setSelectedScopes(prev => 
      prev.includes(scopeId)
        ? prev.filter(id => id !== scopeId)
        : [...prev, scopeId]
    )
  }

  const hasSelectedScopes = selectedScopes.length > 0 || resetScopes.length === 0

  return (
    <>
      <SettingsCard
        title="Reset Settings"
        description="Reset your settings to previous state or default values"
        icon={RotateCcw}
        variant="bordered"
        className={className}
        {...props}
      >
        <div className="space-y-6">
          {/* Warning */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-yellow-900">
                  Warning: This action cannot be undone
                </h4>
                <p className="text-sm text-yellow-800 mt-1">
                  Resetting will permanently change your current settings. 
                  Consider exporting your settings first as a backup.
                </p>
              </div>
            </div>
          </div>

          {/* Reset Scopes */}
          {resetScopes && resetScopes.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Choose what to reset:</h4>
              <div className="space-y-2">
                {resetScopes.map((scope) => (
                  <label
                    key={scope.id}
                    className="flex items-start space-x-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedScopes.includes(scope.id)}
                      onCheckedChange={() => handleScopeToggle(scope.id)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900">
                        {scope.label}
                      </div>
                      <div className="text-sm text-gray-600">
                        {scope.description}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Reset Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">Reset to Last Saved</h4>
              <p className="text-sm text-gray-600">
                Discard current changes and restore to your last saved settings
              </p>
              <SettingsButton
                onClick={() => handleResetClick('current')}
                variant="outline"
                icon={RotateCcw}
                disabled={loading || !hasSelectedScopes}
                fullWidth
              >
                Reset to Saved
              </SettingsButton>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">Reset to Defaults</h4>
              <p className="text-sm text-gray-600">
                Reset to system default settings (this will lose all customizations)
              </p>
              <SettingsButton
                onClick={() => handleResetClick('defaults')}
                variant="destructive"
                icon={RotateCcw}
                disabled={loading || !hasSelectedScopes}
                fullWidth
              >
                Reset to Defaults
              </SettingsButton>
            </div>
          </div>
        </div>
      </SettingsCard>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <span>Confirm Reset</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Are you sure you want to {resetType === 'defaults' ? 'reset to default settings' : 'reset to your last saved settings'}?
            </p>

            {selectedScopes.length > 0 && resetScopes.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-900 mb-2">
                  This will affect:
                </p>
                <ul className="text-sm text-gray-600 space-y-1">
                  {selectedScopes.map(scopeId => {
                    const scope = resetScopes.find(s => s.id === scopeId)
                    return scope ? (
                      <li key={scopeId} className="flex items-center space-x-2">
                        <span>•</span>
                        <span>{scope.label}</span>
                      </li>
                    ) : null
                  })}
                </ul>
              </div>
            )}

            <div className="bg-red-50 border border-red-200 rounded p-3">
              <p className="text-sm text-red-800">
                <strong>This action cannot be undone.</strong> Your current settings will be permanently lost.
              </p>
            </div>
          </div>

          <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
            <SettingsButton
              variant="outline"
              onClick={() => setShowConfirmation(false)}
              disabled={loading}
            >
              Cancel
            </SettingsButton>
            <SettingsButton
              variant={resetType === 'defaults' ? 'destructive' : 'primary'}
              onClick={() => executeReset(resetType)}
              loading={loading}
              icon={RotateCcw}
            >
              {resetType === 'defaults' ? 'Reset to Defaults' : 'Reset to Saved'}
            </SettingsButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
})

SettingsReset.displayName = 'SettingsReset'