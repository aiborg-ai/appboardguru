'use client'

import React, { memo } from 'react'
import { cn } from '@/lib/utils'
import { RotateCcw, Download, Upload } from 'lucide-react'
import { SettingsButton } from './settings-button'
import { SettingsErrorState } from './settings-error-state'
import { SettingsSuccessState } from './settings-success-state'
import type { SettingsFormProps } from './types'

export const SettingsForm = memo<SettingsFormProps>(({
  title,
  description,
  loading = false,
  error,
  success,
  resetable = false,
  exportable = false,
  onReset,
  onExport,
  onImport,
  className,
  children,
  ...props
}) => {
  return (
    <form className={cn('space-y-6', className)} {...props}>
      {/* Form Header */}
      {(title || description) && (
        <div className="border-b border-gray-200 pb-4">
          {title && (
            <h3 className="text-lg font-medium text-gray-900">
              {title}
            </h3>
          )}
          {description && (
            <p className="text-sm text-gray-600 mt-1">
              {description}
            </p>
          )}
        </div>
      )}

      {/* Success State */}
      {success && !error && (
        <SettingsSuccessState
          message={success}
          autoHide={true}
          duration={5000}
        />
      )}

      {/* Error State */}
      {error && (
        <SettingsErrorState
          message={error}
          recoverable={false}
        />
      )}

      {/* Form Fields */}
      <div className="space-y-6">
        {children}
      </div>

      {/* Form Actions */}
      <div className="border-t border-gray-200 pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {resetable && (
              <SettingsButton
                type="button"
                onClick={onReset}
                variant="ghost"
                icon={RotateCcw}
                disabled={loading}
              >
                Reset
              </SettingsButton>
            )}
            
            {exportable && (
              <SettingsButton
                type="button"
                onClick={onExport}
                variant="outline"
                icon={Download}
                disabled={loading}
              >
                Export
              </SettingsButton>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <SettingsButton
              type="submit"
              loading={loading}
              disabled={!!error}
            >
              Save Changes
            </SettingsButton>
          </div>
        </div>
      </div>
    </form>
  )
})

SettingsForm.displayName = 'SettingsForm'