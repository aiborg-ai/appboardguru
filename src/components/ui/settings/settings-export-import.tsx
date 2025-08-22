'use client'

import React, { memo, useState, useCallback, useRef } from 'react'
import { cn } from '@/lib/utils'
import { Download, Upload, FileText, Database, Code } from 'lucide-react'
import { SettingsButton } from './settings-button'
import { SettingsCard } from './settings-card'
import { SettingsSelect } from './settings-select'
import type { SettingsExportImportProps } from './types'

export const SettingsExportImport = memo<SettingsExportImportProps>(({
  onExport,
  onImport,
  supportedFormats = ['json', 'csv', 'xml'],
  loading = false,
  exportLoading = false,
  importLoading = false,
  className,
  ...props
}) => {
  const [exportFormat, setExportFormat] = useState<'json' | 'csv' | 'xml'>('json')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const formatOptions = [
    {
      value: 'json',
      label: 'JSON',
      description: 'JavaScript Object Notation - structured data format',
      disabled: !supportedFormats.includes('json')
    },
    {
      value: 'csv',
      label: 'CSV',
      description: 'Comma Separated Values - spreadsheet compatible',
      disabled: !supportedFormats.includes('csv')
    },
    {
      value: 'xml',
      label: 'XML',
      description: 'Extensible Markup Language - structured document format',
      disabled: !supportedFormats.includes('xml')
    }
  ]

  const formatIcons = {
    json: Code,
    csv: FileText,
    xml: Database
  }

  const handleExport = useCallback(() => {
    onExport?.(exportFormat)
  }, [onExport, exportFormat])

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string
        const fileExtension = file.name.split('.').pop()?.toLowerCase()
        
        let parsedData
        if (fileExtension === 'json') {
          parsedData = JSON.parse(content)
        } else if (fileExtension === 'csv') {
          // Simple CSV parsing - in production use a proper CSV parser
          const lines = content.split('\n')
          const headers = lines[0].split(',')
          parsedData = lines.slice(1).map(line => {
            const values = line.split(',')
            return headers.reduce((obj, header, index) => {
              obj[header.trim()] = values[index]?.trim()
              return obj
            }, {} as any)
          })
        } else {
          parsedData = content // For XML or other formats
        }

        onImport?.(parsedData, fileExtension || 'unknown')
      } catch (error) {
        console.error('Error parsing file:', error)
        // In production, show error to user
      }
    }

    reader.readAsText(file)
    
    // Reset input value to allow selecting the same file again
    e.target.value = ''
  }, [onImport])

  const FormatIcon = formatIcons[exportFormat]

  return (
    <SettingsCard
      title="Import & Export Settings"
      description="Backup your settings or import configuration from another source"
      icon={Download}
      className={className}
      {...props}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Export Section */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900 flex items-center space-x-2">
            <Download className="h-4 w-4 text-blue-600" />
            <span>Export Settings</span>
          </h4>
          
          <SettingsSelect
            label="Export Format"
            value={exportFormat}
            onValueChange={(value) => setExportFormat(value as 'json' | 'csv' | 'xml')}
            options={formatOptions}
            description="Choose the format for your exported settings"
          />

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <div className="flex items-center space-x-2 text-sm text-gray-700">
              <FormatIcon className="h-4 w-4" />
              <span>
                Export will include all your current settings in {exportFormat.toUpperCase()} format
              </span>
            </div>
          </div>

          <SettingsButton
            onClick={handleExport}
            loading={exportLoading}
            icon={Download}
            disabled={loading || importLoading}
            fullWidth
          >
            {exportLoading ? 'Exporting...' : `Export as ${exportFormat.toUpperCase()}`}
          </SettingsButton>
        </div>

        {/* Import Section */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900 flex items-center space-x-2">
            <Upload className="h-4 w-4 text-green-600" />
            <span>Import Settings</span>
          </h4>

          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Upload a settings file to restore or apply configuration. Supported formats:
            </p>
            
            <div className="flex flex-wrap gap-2">
              {supportedFormats.map((format) => {
                const Icon = formatIcons[format]
                return (
                  <div
                    key={format}
                    className="flex items-center space-x-1 px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full"
                  >
                    <Icon className="h-3 w-3" />
                    <span>{format.toUpperCase()}</span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> Importing will override your current settings. 
              Consider exporting first as a backup.
            </p>
          </div>

          <SettingsButton
            onClick={handleImportClick}
            loading={importLoading}
            icon={Upload}
            variant="secondary"
            disabled={loading || exportLoading}
            fullWidth
          >
            {importLoading ? 'Importing...' : 'Import Settings'}
          </SettingsButton>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept={supportedFormats.map(f => `.${f}`).join(',')}
            onChange={handleFileSelect}
            className="hidden"
            aria-hidden="true"
          />
        </div>
      </div>
    </SettingsCard>
  )
})

SettingsExportImport.displayName = 'SettingsExportImport'