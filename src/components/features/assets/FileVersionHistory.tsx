'use client'

import React, { useState, useCallback } from 'react'
import {
  History,
  Download,
  Eye,
  RotateCcw,
  GitBranch,
  Calendar,
  User,
  FileText,
  Tag,
  ChevronRight,
  ChevronDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  HardDrive,
  Edit,
  MessageSquare,
  X,
  Plus
} from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { Card } from '@/components/molecules/cards/card'
import { Badge } from '@/features/shared/ui/badge'
import { Input } from '@/components/atoms/form/input'
import { Textarea } from '@/components/atoms/form/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/features/shared/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/features/shared/ui/tooltip'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/features/shared/ui/select'

export interface FileVersion {
  id: string
  versionNumber: string
  fileName: string
  fileSize: number
  mimeType: string
  uploadedAt: string
  uploadedBy: {
    id: string
    name: string
    email: string
    avatar?: string
  }
  changeDescription?: string
  isCurrentVersion: boolean
  isMajorVersion: boolean
  tags: string[]
  changeType: 'create' | 'update' | 'restore' | 'branch'
  parentVersionId?: string
  checksum: string
  metadata: {
    downloadCount: number
    lastDownloadAt?: string
    processingStatus: 'pending' | 'completed' | 'failed'
    extractedText?: string
    thumbnailUrl?: string
  }
  comparisonData?: {
    linesAdded: number
    linesRemoved: number
    linesModified: number
    similarity: number
  }
}

export interface VersionComparison {
  fromVersion: FileVersion
  toVersion: FileVersion
  changes: Array<{
    type: 'added' | 'removed' | 'modified'
    lineNumber: number
    content: string
    context?: string
  }>
  summary: {
    linesAdded: number
    linesRemoved: number
    linesModified: number
    similarity: number
    majorChanges: string[]
  }
}

interface FileVersionHistoryProps {
  assetId: string
  versions: FileVersion[]
  onVersionView: (versionId: string) => void
  onVersionDownload: (versionId: string) => void
  onVersionRestore: (versionId: string) => void
  onVersionCompare: (fromVersionId: string, toVersionId: string) => Promise<VersionComparison>
  onVersionDelete: (versionId: string) => void
  onCreateVersion: (file: File, description: string, isMajor: boolean) => Promise<void>
  currentUser: {
    id: string
    name: string
    email: string
  }
  permissions: {
    canUpload: boolean
    canDelete: boolean
    canRestore: boolean
  }
  className?: string
}

export function FileVersionHistory({
  assetId,
  versions,
  onVersionView,
  onVersionDownload,
  onVersionRestore,
  onVersionCompare,
  onVersionDelete,
  onCreateVersion,
  currentUser,
  permissions,
  className = ''
}: FileVersionHistoryProps) {
  const [expandedVersions, setExpandedVersions] = useState<Set<string>>(new Set())
  const [selectedVersions, setSelectedVersions] = useState<string[]>([])
  const [showComparison, setShowComparison] = useState(false)
  const [comparisonData, setComparisonData] = useState<VersionComparison | null>(null)
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadDescription, setUploadDescription] = useState('')
  const [isMajorVersion, setIsMajorVersion] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [showRestoreDialog, setShowRestoreDialog] = useState(false)
  const [restoreVersionId, setRestoreVersionId] = useState<string | null>(null)

  const formatFileSize = useCallback((bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }, [])

  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) {
      return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    } else if (diffDays === 1) {
      return `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    } else if (diffDays < 7) {
      return `${diffDays} days ago`
    } else {
      return date.toLocaleDateString()
    }
  }, [])

  const getChangeTypeIcon = useCallback((changeType: FileVersion['changeType']) => {
    switch (changeType) {
      case 'create': return Plus
      case 'update': return Edit
      case 'restore': return RotateCcw
      case 'branch': return GitBranch
      default: return FileText
    }
  }, [])

  const getChangeTypeColor = useCallback((changeType: FileVersion['changeType']) => {
    switch (changeType) {
      case 'create': return 'text-green-600'
      case 'update': return 'text-blue-600'
      case 'restore': return 'text-orange-600'
      case 'branch': return 'text-purple-600'
      default: return 'text-gray-600'
    }
  }, [])

  const toggleVersionExpansion = useCallback((versionId: string) => {
    setExpandedVersions(prev => {
      const newSet = new Set(prev)
      if (newSet.has(versionId)) {
        newSet.delete(versionId)
      } else {
        newSet.add(versionId)
      }
      return newSet
    })
  }, [])

  const handleVersionSelect = useCallback((versionId: string, selected: boolean) => {
    setSelectedVersions(prev => {
      if (selected) {
        return prev.length >= 2 ? [prev[1], versionId] : [...prev, versionId]
      } else {
        return prev.filter(id => id !== versionId)
      }
    })
  }, [])

  const handleCompareVersions = useCallback(async () => {
    if (selectedVersions.length !== 2) return
    
    try {
      const comparison = await onVersionCompare(selectedVersions[0], selectedVersions[1])
      setComparisonData(comparison)
      setShowComparison(true)
    } catch (error) {
      console.error('Failed to compare versions:', error)
    }
  }, [selectedVersions, onVersionCompare])

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setUploadFile(file)
      setShowUploadDialog(true)
    }
  }, [])

  const handleCreateVersion = useCallback(async () => {
    if (!uploadFile) return
    
    setIsUploading(true)
    try {
      await onCreateVersion(uploadFile, uploadDescription, isMajorVersion)
      setShowUploadDialog(false)
      setUploadFile(null)
      setUploadDescription('')
      setIsMajorVersion(false)
    } catch (error) {
      console.error('Failed to create version:', error)
    } finally {
      setIsUploading(false)
    }
  }, [uploadFile, uploadDescription, isMajorVersion, onCreateVersion])

  const handleRestoreVersion = useCallback(async () => {
    if (!restoreVersionId) return
    
    try {
      await onVersionRestore(restoreVersionId)
      setShowRestoreDialog(false)
      setRestoreVersionId(null)
    } catch (error) {
      console.error('Failed to restore version:', error)
    }
  }, [restoreVersionId, onVersionRestore])

  const sortedVersions = [...versions].sort((a, b) => 
    new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
  )

  return (
    <TooltipProvider>
      <Card className={`p-6 ${className}`}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <History className="h-6 w-6 text-blue-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Version History</h3>
              <p className="text-sm text-gray-600">
                {versions.length} version{versions.length > 1 ? 's' : ''} available
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {selectedVersions.length === 2 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCompareVersions}
              >
                <GitBranch className="h-4 w-4 mr-1" />
                Compare
              </Button>
            )}

            {permissions.canUpload && (
              <div>
                <input
                  type="file"
                  id="version-upload"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('version-upload')?.click()}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  New Version
                </Button>
              </div>
            )}
          </div>
        </div>

        {selectedVersions.length > 0 && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <span className="text-sm text-blue-800">
                {selectedVersions.length} version{selectedVersions.length > 1 ? 's' : ''} selected
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedVersions([])}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {sortedVersions.map((version, index) => {
            const isExpanded = expandedVersions.has(version.id)
            const isSelected = selectedVersions.includes(version.id)
            const ChangeIcon = getChangeTypeIcon(version.changeType)
            const changeColor = getChangeTypeColor(version.changeType)

            return (
              <Card key={version.id} className={`p-4 ${isSelected ? 'ring-2 ring-blue-500' : ''}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    {/* Selection Checkbox */}
                    <div className="flex items-center pt-1">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => handleVersionSelect(version.id, e.target.checked)}
                        className="rounded border-gray-300"
                      />
                    </div>

                    {/* Version Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="flex items-center space-x-2">
                          <ChangeIcon className={`h-4 w-4 ${changeColor}`} />
                          <span className="font-medium text-gray-900">
                            Version {version.versionNumber}
                          </span>
                          {version.isMajorVersion && (
                            <Badge className="bg-orange-100 text-orange-800">
                              Major
                            </Badge>
                          )}
                          {version.isCurrentVersion && (
                            <Badge className="bg-green-100 text-green-800">
                              Current
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <div className="flex items-center">
                            <User className="h-3 w-3 mr-1" />
                            {version.uploadedBy.name}
                          </div>
                          <div className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            {formatDate(version.uploadedAt)}
                          </div>
                          <div className="flex items-center">
                            <HardDrive className="h-3 w-3 mr-1" />
                            {formatFileSize(version.fileSize)}
                          </div>
                        </div>
                      </div>

                      {version.changeDescription && (
                        <p className="text-sm text-gray-700 mb-2">
                          {version.changeDescription}
                        </p>
                      )}

                      {version.comparisonData && (
                        <div className="flex items-center space-x-4 text-xs text-gray-500 mb-2">
                          <span className="text-green-600">
                            +{version.comparisonData.linesAdded}
                          </span>
                          <span className="text-red-600">
                            -{version.comparisonData.linesRemoved}
                          </span>
                          <span className="text-blue-600">
                            ~{version.comparisonData.linesModified}
                          </span>
                          <span>
                            {Math.round(version.comparisonData.similarity * 100)}% similar
                          </span>
                        </div>
                      )}

                      {version.tags.length > 0 && (
                        <div className="flex items-center space-x-1 mb-2">
                          {version.tags.map(tag => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              <Tag className="h-2 w-2 mr-1" />
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t space-y-3">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500">File Name:</span>
                              <span className="ml-2 font-mono text-xs">{version.fileName}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">MIME Type:</span>
                              <span className="ml-2 font-mono text-xs">{version.mimeType}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Checksum:</span>
                              <span className="ml-2 font-mono text-xs">{version.checksum.substring(0, 16)}...</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Downloads:</span>
                              <span className="ml-2">{version.metadata.downloadCount}</span>
                            </div>
                          </div>

                          {version.metadata.lastDownloadAt && (
                            <div className="text-sm text-gray-600">
                              Last downloaded: {formatDate(version.metadata.lastDownloadAt)}
                            </div>
                          )}

                          <div className="flex items-center space-x-2">
                            <div className={`
                              px-2 py-1 rounded text-xs flex items-center
                              ${version.metadata.processingStatus === 'completed'
                                ? 'bg-green-100 text-green-800'
                                : version.metadata.processingStatus === 'failed'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                              }
                            `}>
                              {version.metadata.processingStatus === 'completed' && <CheckCircle className="h-3 w-3 mr-1" />}
                              {version.metadata.processingStatus === 'failed' && <AlertTriangle className="h-3 w-3 mr-1" />}
                              {version.metadata.processingStatus === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                              {version.metadata.processingStatus}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center space-x-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleVersionExpansion(version.id)}
                        >
                          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {isExpanded ? 'Hide details' : 'Show details'}
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onVersionView(version.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>View version</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onVersionDownload(version.id)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Download version</TooltipContent>
                    </Tooltip>

                    {!version.isCurrentVersion && permissions.canRestore && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setRestoreVersionId(version.id)
                              setShowRestoreDialog(true)
                            }}
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Restore this version</TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>

        {versions.length === 0 && (
          <div className="text-center py-12">
            <History className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">No version history</h4>
            <p className="text-gray-600">
              This file doesn't have any previous versions yet.
            </p>
          </div>
        )}

        {/* Upload Dialog */}
        <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload New Version</DialogTitle>
              <DialogDescription>
                Create a new version of this file with your changes.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {uploadFile && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-4 w-4 text-gray-600" />
                    <span className="font-medium">{uploadFile.name}</span>
                    <span className="text-sm text-gray-500">
                      ({formatFileSize(uploadFile.size)})
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Change Description
                </label>
                <Textarea
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  placeholder="Describe what changed in this version..."
                  rows={3}
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="major-version"
                  checked={isMajorVersion}
                  onChange={(e) => setIsMajorVersion(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <label htmlFor="major-version" className="text-sm">
                  Mark as major version
                </label>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowUploadDialog(false)}
                disabled={isUploading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateVersion}
                disabled={!uploadFile || isUploading}
              >
                {isUploading ? 'Uploading...' : 'Create Version'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Restore Dialog */}
        <Dialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Restore Version</DialogTitle>
              <DialogDescription>
                This will create a new version based on the selected historical version.
                The current version will be preserved in history.
              </DialogDescription>
            </DialogHeader>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex">
                <AlertTriangle className="h-5 w-5 text-yellow-400 mr-2 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-medium text-yellow-800">
                    This will create a new version
                  </h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    The restored content will become the new current version.
                    Your current version will be preserved in the history.
                  </p>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowRestoreDialog(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleRestoreVersion}>
                Restore Version
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Comparison Dialog */}
        <Dialog open={showComparison} onOpenChange={setShowComparison}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Version Comparison</DialogTitle>
              {comparisonData && (
                <DialogDescription>
                  Comparing {comparisonData.fromVersion.versionNumber} with {comparisonData.toVersion.versionNumber}
                </DialogDescription>
              )}
            </DialogHeader>

            {comparisonData && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      +{comparisonData.summary.linesAdded}
                    </div>
                    <div className="text-sm text-green-700">Added</div>
                  </div>
                  <div className="p-3 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">
                      -{comparisonData.summary.linesRemoved}
                    </div>
                    <div className="text-sm text-red-700">Removed</div>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      ~{comparisonData.summary.linesModified}
                    </div>
                    <div className="text-sm text-blue-700">Modified</div>
                  </div>
                </div>

                <div className="text-center text-sm text-gray-600">
                  {Math.round(comparisonData.summary.similarity * 100)}% similarity
                </div>

                {comparisonData.summary.majorChanges.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Major Changes</h4>
                    <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                      {comparisonData.summary.majorChanges.map((change, index) => (
                        <li key={index}>{change}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="max-h-64 overflow-y-auto bg-gray-50 p-4 rounded-lg font-mono text-sm">
                  {comparisonData.changes.map((change, index) => (
                    <div
                      key={index}
                      className={`
                        py-1 px-2 rounded mb-1
                        ${change.type === 'added' ? 'bg-green-100 text-green-800' :
                          change.type === 'removed' ? 'bg-red-100 text-red-800' :
                          'bg-blue-100 text-blue-800'}
                      `}
                    >
                      <span className="text-gray-500 mr-2">
                        {change.lineNumber}:
                      </span>
                      <span className="mr-2">
                        {change.type === 'added' ? '+' :
                         change.type === 'removed' ? '-' : '~'}
                      </span>
                      {change.content}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </Card>
    </TooltipProvider>
  )
}