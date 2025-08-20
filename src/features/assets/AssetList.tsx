'use client'

import React, { useState } from 'react'
import { 
  FileText, 
  Image, 
  Video, 
  Music, 
  Archive,
  Download,
  Share2,
  Eye,
  MoreHorizontal,
  Calendar,
  User,
  Folder as FolderIcon,
  Tag,
  ChevronDown,
  ChevronRight
} from 'lucide-react'
import { Button } from '@/features/shared/ui/button'
import { Card } from '@/features/shared/ui/card'

interface Asset {
  id: string
  title: string
  fileName: string
  fileType: string
  fileSize: number
  category: string
  folder: string
  tags: string[]
  thumbnail?: string
  createdAt: string
  updatedAt: string
  owner: {
    id: string
    name: string
    email: string
  }
  sharedWith: Array<{
    userId: string
    userName: string
    permission: 'view' | 'download' | 'edit' | 'admin'
  }>
  downloadCount: number
  viewCount: number
  isShared: boolean
}

interface AssetListProps {
  assets: Asset[]
  onShare: (asset: Asset) => void
  onDownload: (asset: Asset) => void
  onView?: (asset: Asset) => void
  onEdit?: (asset: Asset) => void
  onDelete?: (asset: Asset) => void
  showDetails?: boolean
}

export function AssetList({ 
  assets, 
  onShare, 
  onDownload, 
  onView, 
  onEdit, 
  onDelete,
  showDetails = false
}: AssetListProps) {
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null)
  const [expandedAssets, setExpandedAssets] = useState<Set<string>>(new Set())

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('image') || ['jpg', 'jpeg', 'png', 'gif', 'svg'].includes(fileType)) {
      return Image
    }
    if (fileType.includes('video') || ['mp4', 'mov', 'avi', 'wmv'].includes(fileType)) {
      return Video
    }
    if (fileType.includes('audio') || ['mp3', 'wav', 'm4a'].includes(fileType)) {
      return Music
    }
    if (['zip', 'rar', '7z'].includes(fileType)) {
      return Archive
    }
    return FileText
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'board-documents': 'bg-blue-100 text-blue-800',
      'financial': 'bg-green-100 text-green-800',
      'legal': 'bg-purple-100 text-purple-800',
      'presentations': 'bg-orange-100 text-orange-800',
      'policies': 'bg-indigo-100 text-indigo-800',
      'meeting-materials': 'bg-pink-100 text-pink-800',
      'general': 'bg-gray-100 text-gray-800'
    }
    return colors[category] || 'bg-gray-100 text-gray-800'
  }

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      'board-documents': 'Board Documents',
      'financial': 'Financial Reports',
      'legal': 'Legal Documents',
      'presentations': 'Presentations',
      'policies': 'Policies & Procedures',
      'meeting-materials': 'Meeting Materials',
      'general': 'General Documents'
    }
    return labels[category] || category
  }

  const toggleExpanded = (assetId: string) => {
    const newExpanded = new Set(expandedAssets)
    if (newExpanded.has(assetId)) {
      newExpanded.delete(assetId)
    } else {
      newExpanded.add(assetId)
    }
    setExpandedAssets(newExpanded)
  }

  if (showDetails) {
    // Detailed view with expanded information
    return (
      <div className="space-y-4">
        {assets.map((asset) => {
          const FileIcon = getFileIcon(asset.fileType)
          const isExpanded = expandedAssets.has(asset.id)
          
          return (
            <Card key={asset.id} className="overflow-hidden">
              {/* Main Row */}
              <div className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center space-x-4">
                  {/* Expand/Collapse Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleExpanded(asset.id)}
                    className="p-1 h-auto"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>

                  {/* File Icon */}
                  <div className="flex-shrink-0">
                    {asset.thumbnail ? (
                      <img
                        src={asset.thumbnail}
                        alt={asset.title}
                        className="w-10 h-10 object-cover rounded"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center">
                        <FileIcon className="h-5 w-5 text-gray-600" />
                      </div>
                    )}
                  </div>

                  {/* Asset Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-gray-900 truncate mb-1">
                          {asset.title}
                        </h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span className="flex items-center">
                            <User className="h-3 w-3 mr-1" />
                            {asset.owner.name}
                          </span>
                          <span>{formatFileSize(asset.fileSize)}</span>
                          <span>{formatDate(asset.updatedAt)}</span>
                          <span className="uppercase">{asset.fileType}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center space-x-2 ml-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onView?.(asset)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDownload(asset)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onShare(asset)}
                        >
                          <Share2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedAsset(selectedAsset === asset.id ? null : asset.id)}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Category and quick info */}
                    <div className="flex items-center space-x-3 mt-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(asset.category)}`}>
                        {getCategoryLabel(asset.category)}
                      </span>
                      {asset.isShared && (
                        <span className="flex items-center text-xs text-blue-600">
                          <Share2 className="h-3 w-3 mr-1" />
                          Shared with {asset.sharedWith.length}
                        </span>
                      )}
                      <span className="flex items-center text-xs text-gray-500">
                        <Eye className="h-3 w-3 mr-1" />
                        {asset.viewCount} views
                      </span>
                    </div>
                  </div>
                </div>

                {/* Dropdown Menu */}
                {selectedAsset === asset.id && (
                  <div className="absolute right-4 top-16 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                    <button
                      onClick={() => {
                        onView?.(asset)
                        setSelectedAsset(null)
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </button>
                    <button
                      onClick={() => {
                        onDownload(asset)
                        setSelectedAsset(null)
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </button>
                    <button
                      onClick={() => {
                        onShare(asset)
                        setSelectedAsset(null)
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center"
                    >
                      <Share2 className="h-4 w-4 mr-2" />
                      Share
                    </button>
                    {onEdit && (
                      <button
                        onClick={() => {
                          onEdit(asset)
                          setSelectedAsset(null)
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                      >
                        Edit
                      </button>
                    )}
                    {onDelete && (
                      <>
                        <hr className="my-1" />
                        <button
                          onClick={() => {
                            onDelete(asset)
                            setSelectedAsset(null)
                          }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 text-red-600"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="border-t border-gray-200 bg-gray-50 p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* File Details */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">File Details</h4>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="text-gray-600">File Name:</span>
                          <span className="ml-2 font-medium">{asset.fileName}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Size:</span>
                          <span className="ml-2 font-medium">{formatFileSize(asset.fileSize)}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Type:</span>
                          <span className="ml-2 font-medium uppercase">{asset.fileType}</span>
                        </div>
                        <div className="flex items-center">
                          <span className="text-gray-600">Folder:</span>
                          <span className="ml-2 font-medium flex items-center">
                            <FolderIcon className="h-3 w-3 mr-1" />
                            {asset.folder}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Sharing & Activity */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">Activity</h4>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="text-gray-600">Created:</span>
                          <span className="ml-2 font-medium">{formatDate(asset.createdAt)}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Updated:</span>
                          <span className="ml-2 font-medium">{formatDate(asset.updatedAt)}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Views:</span>
                          <span className="ml-2 font-medium">{asset.viewCount}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Downloads:</span>
                          <span className="ml-2 font-medium">{asset.downloadCount}</span>
                        </div>
                      </div>
                    </div>

                    {/* Tags & Sharing */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">Organization</h4>
                      <div className="space-y-3">
                        {asset.tags.length > 0 && (
                          <div>
                            <span className="text-sm text-gray-600 block mb-1">Tags:</span>
                            <div className="flex flex-wrap gap-1">
                              {asset.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-200 text-gray-700"
                                >
                                  <Tag className="h-2 w-2 mr-1" />
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {asset.sharedWith.length > 0 && (
                          <div>
                            <span className="text-sm text-gray-600 block mb-1">Shared with:</span>
                            <div className="space-y-1">
                              {asset.sharedWith.map((share) => (
                                <div key={share.userId} className="flex items-center justify-between text-xs">
                                  <span>{share.userName}</span>
                                  <span className="text-gray-500">{share.permission}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          )
        })}
      </div>
    )
  }

  // Simple list view
  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Asset
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Owner
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Size
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Modified
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {assets.map((asset) => {
              const FileIcon = getFileIcon(asset.fileType)
              
              return (
                <tr key={asset.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 mr-4">
                        {asset.thumbnail ? (
                          <img
                            src={asset.thumbnail}
                            alt={asset.title}
                            className="w-8 h-8 object-cover rounded"
                          />
                        ) : (
                          <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
                            <FileIcon className="h-4 w-4 text-gray-600" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate max-w-xs">
                          {asset.title}
                        </div>
                        <div className="text-sm text-gray-500 truncate">
                          {asset.fileName}
                        </div>
                      </div>
                      {asset.isShared && (
                        <Share2 className="h-3 w-3 text-blue-500 ml-2 flex-shrink-0" />
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(asset.category)}`}>
                      {getCategoryLabel(asset.category)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {asset.owner.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatFileSize(asset.fileSize)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(asset.updatedAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onView?.(asset)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDownload(asset)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onShare(asset)}
                      >
                        <Share2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}