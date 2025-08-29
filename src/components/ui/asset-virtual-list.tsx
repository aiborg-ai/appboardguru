'use client'

import React, { useState, useCallback, useMemo, forwardRef } from 'react'
import { VirtualScrollList, VirtualScrollListRef, VirtualScrollListItem } from './virtual-scroll-list'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
  User,
  Folder as FolderIcon,
  Tag,
  ChevronDown,
  ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils'

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

interface AssetVirtualListProps {
  assets: Asset[]
  onShare: (asset: Asset) => void
  onDownload: (asset: Asset) => void
  onView?: (asset: Asset) => void
  onEdit?: (asset: Asset) => void
  onDelete?: (asset: Asset) => void
  showDetails?: boolean
  height?: number | string
  searchTerm?: string
  loading?: boolean
  hasMore?: boolean
  onLoadMore?: () => void
  className?: string
  enableSelection?: boolean
  selectedAssets?: Set<string>
  onSelectionChange?: (selectedAssets: Set<string>) => void
}

// Asset item component for virtual list
interface AssetItemProps {
  item: VirtualScrollListItem
  index: number
  style: React.CSSProperties
}

const AssetItem: React.FC<AssetItemProps> = ({ item }) => {
  const asset = item.data as Asset
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<boolean>(false)

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

  const FileIcon = getFileIcon(asset.fileType)

  return (
    <Card className="mb-2 overflow-hidden">
      <div className="p-4 hover:bg-gray-50 transition-colors">
        <div className="flex items-center space-x-4">
          {/* Expand/Collapse Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="p-1 h-auto"
          >
            {expanded ? (
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
                  className="hover:bg-blue-50 hover:text-blue-600"
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="hover:bg-green-50 hover:text-green-600"
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="hover:bg-purple-50 hover:text-purple-600"
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
              <span className={cn(
                'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                getCategoryColor(asset.category)
              )}>
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

        {/* Expanded Details */}
        {expanded && (
          <div className="border-t border-gray-200 bg-gray-50 p-4 mt-4 -mx-4 -mb-4">
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

              {/* Activity */}
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
      </div>
    </Card>
  )
}

// Main AssetVirtualList component
export const AssetVirtualList = forwardRef<VirtualScrollListRef, AssetVirtualListProps>(
  ({
    assets,
    onShare,
    onDownload,
    onView,
    onEdit,
    onDelete,
    showDetails = false,
    height = 600,
    searchTerm,
    loading = false,
    hasMore = false,
    onLoadMore,
    className,
    enableSelection = false,
    selectedAssets,
    onSelectionChange
  }, ref) => {

    // Convert assets to virtual list items
    const virtualItems = useMemo((): VirtualScrollListItem[] => {
      return assets.map(asset => ({
        id: asset.id,
        data: asset
      }))
    }, [assets])

    // Dynamic height calculation based on expanded state
    const getItemHeight = useCallback((index: number, item: VirtualScrollListItem) => {
      // Base height for collapsed state
      const baseHeight = 120
      
      // Additional height for expanded details
      const expandedHeight = 200
      
      // For now, just return base height - in a real implementation,
      // you'd track which items are expanded
      return baseHeight
    }, [])

    const handleItemClick = useCallback((item: VirtualScrollListItem, index: number) => {
      const asset = item.data as Asset
      onView?.(asset)
    }, [onView])

    return (
      <div className={cn('asset-virtual-list', className)}>
        <VirtualScrollList
          ref={ref}
          items={virtualItems}
          itemComponent={AssetItem}
          itemHeight={getItemHeight}
          height={height}
          estimatedItemHeight={120}
          searchTerm={searchTerm}
          loading={loading}
          hasMore={hasMore}
          onLoadMore={onLoadMore}
          enableSelection={enableSelection}
          selectedItems={selectedAssets}
          onSelectionChange={onSelectionChange}
          onItemClick={handleItemClick}
          enableKeyboardNavigation={true}
          overscan={3}
          loadMoreThreshold={5}
        />
      </div>
    )
  }
)

AssetVirtualList.displayName = 'AssetVirtualList'

export default AssetVirtualList