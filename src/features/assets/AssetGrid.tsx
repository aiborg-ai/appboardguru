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
  Tag,
  Folder as FolderIcon
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

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

interface AssetGridProps {
  assets: Asset[]
  onShare: (asset: Asset) => void
  onDownload: (asset: Asset) => void
  onView?: (asset: Asset) => void
  onEdit?: (asset: Asset) => void
  onDelete?: (asset: Asset) => void
}

export function AssetGrid({ 
  assets, 
  onShare, 
  onDownload, 
  onView, 
  onEdit, 
  onDelete 
}: AssetGridProps) {
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null)

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
      year: 'numeric'
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
      'board-documents': 'Board Docs',
      'financial': 'Financial',
      'legal': 'Legal',
      'presentations': 'Presentation',
      'policies': 'Policies',
      'meeting-materials': 'Meeting',
      'general': 'General'
    }
    return labels[category] || category
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {assets.map((asset) => {
        const FileIcon = getFileIcon(asset.fileType)
        
        return (
          <Card 
            key={asset.id} 
            className="group relative overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer"
            onClick={() => onView?.(asset)}
          >
            {/* Thumbnail/Icon Area */}
            <div className="relative h-48 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
              {asset.thumbnail ? (
                <img
                  src={asset.thumbnail}
                  alt={asset.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <FileIcon className="h-16 w-16 text-gray-400 group-hover:text-gray-600 transition-colors" />
              )}
              
              {/* Overlay Actions */}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                <div className="flex items-center space-x-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={(e) => {
                      e.stopPropagation()
                      onView?.(asset)
                    }}
                    className="bg-white bg-opacity-90 hover:bg-opacity-100"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDownload(asset)
                    }}
                    className="bg-white bg-opacity-90 hover:bg-opacity-100"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={(e) => {
                      e.stopPropagation()
                      onShare(asset)
                    }}
                    className="bg-white bg-opacity-90 hover:bg-opacity-100"
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* File Type Badge */}
              <div className="absolute top-2 left-2 bg-white bg-opacity-90 px-2 py-1 rounded text-xs font-medium text-gray-600 uppercase">
                {asset.fileType}
              </div>

              {/* Shared Indicator */}
              {asset.isShared && (
                <div className="absolute top-2 right-2 bg-blue-600 text-white p-1 rounded">
                  <Share2 className="h-3 w-3" />
                </div>
              )}
            </div>

            {/* Content */}
            <div className="p-4">
              {/* Title */}
              <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                {asset.title}
              </h3>

              {/* Metadata */}
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center justify-between">
                  <span className="flex items-center">
                    <User className="h-3 w-3 mr-1" />
                    {asset.owner.name}
                  </span>
                  <span className="text-xs">
                    {formatFileSize(asset.fileSize)}
                  </span>
                </div>
                
                <div className="flex items-center">
                  <Calendar className="h-3 w-3 mr-1" />
                  {formatDate(asset.updatedAt)}
                </div>

                {asset.folder !== '/' && (
                  <div className="flex items-center">
                    <FolderIcon className="h-3 w-3 mr-1" />
                    <span className="truncate">{asset.folder}</span>
                  </div>
                )}
              </div>

              {/* Category Badge */}
              <div className="mt-3">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(asset.category)}`}>
                  {getCategoryLabel(asset.category)}
                </span>
              </div>

              {/* Tags */}
              {asset.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {asset.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-600"
                    >
                      <Tag className="h-2 w-2 mr-1" />
                      {tag}
                    </span>
                  ))}
                  {asset.tags.length > 3 && (
                    <span className="text-xs text-gray-400">
                      +{asset.tags.length - 3} more
                    </span>
                  )}
                </div>
              )}

              {/* Stats */}
              <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center space-x-3">
                  <span className="flex items-center">
                    <Eye className="h-3 w-3 mr-1" />
                    {asset.viewCount}
                  </span>
                  <span className="flex items-center">
                    <Download className="h-3 w-3 mr-1" />
                    {asset.downloadCount}
                  </span>
                </div>
                
                {asset.sharedWith.length > 0 && (
                  <span className="flex items-center">
                    <Share2 className="h-3 w-3 mr-1" />
                    {asset.sharedWith.length}
                  </span>
                )}
              </div>
            </div>

            {/* Action Menu */}
            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedAsset(selectedAsset === asset.id ? null : asset.id)
                }}
                className="bg-white bg-opacity-90 hover:bg-opacity-100 p-1 h-auto"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>

              {/* Dropdown Menu */}
              {selectedAsset === asset.id && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onView?.(asset)
                      setSelectedAsset(null)
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onDownload(asset)
                      setSelectedAsset(null)
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
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
                      onClick={(e) => {
                        e.stopPropagation()
                        onEdit(asset)
                        setSelectedAsset(null)
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center"
                    >
                      Edit
                    </button>
                  )}
                  {onDelete && (
                    <>
                      <hr className="my-1" />
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onDelete(asset)
                          setSelectedAsset(null)
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center text-red-600"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </Card>
        )
      })}
    </div>
  )
}