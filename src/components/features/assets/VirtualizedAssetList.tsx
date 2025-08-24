'use client'

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { FixedSizeList as List } from 'react-window'
import {
  FileText,
  Image,
  Video,
  Music,
  Archive,
  Eye,
  Download,
  Share2,
  MoreHorizontal,
  CheckSquare,
  Square,
  Calendar,
  User,
  HardDrive,
  Tag
} from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { Card } from '@/components/molecules/cards/card'
import { Checkbox } from '@/features/shared/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/features/shared/ui/dropdown-menu'

export interface VirtualizedAsset {
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
  isSelected?: boolean
  permissions: {
    canView: boolean
    canEdit: boolean
    canDelete: boolean
    canShare: boolean
    canDownload: boolean
  }
}

interface VirtualizedAssetListProps {
  assets: VirtualizedAsset[]
  height: number
  itemHeight?: number
  onAssetSelect: (assetId: string) => void
  onAssetToggleSelect: (assetId: string, selected: boolean) => void
  onAssetView: (asset: VirtualizedAsset) => void
  onAssetShare: (asset: VirtualizedAsset) => void
  onAssetDownload: (asset: VirtualizedAsset) => void
  onAssetEdit?: (asset: VirtualizedAsset) => void
  onAssetDelete?: (asset: VirtualizedAsset) => void
  selectedAssetIds?: string[]
  viewMode?: 'compact' | 'comfortable' | 'detailed'
  enableSelection?: boolean
  enableVirtualization?: boolean
  className?: string
}

const ITEM_HEIGHTS = {
  compact: 48,
  comfortable: 72,
  detailed: 96
}

export function VirtualizedAssetList({
  assets,
  height,
  itemHeight,
  onAssetSelect,
  onAssetToggleSelect,
  onAssetView,
  onAssetShare,
  onAssetDownload,
  onAssetEdit,
  onAssetDelete,
  selectedAssetIds = [],
  viewMode = 'comfortable',
  enableSelection = false,
  enableVirtualization = true,
  className = ''
}: VirtualizedAssetListProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const listRef = useRef<List>(null)
  
  const actualItemHeight = itemHeight || ITEM_HEIGHTS[viewMode]
  
  const getFileIcon = useCallback((fileType: string) => {
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
  }, [])

  const formatFileSize = useCallback((bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }, [])

  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }, [])

  const getCategoryColor = useCallback((category: string) => {
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
  }, [])

  // Memoized item renderer for performance
  const ItemRenderer = React.memo(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const asset = assets[index]
    const isSelected = selectedAssetIds.includes(asset.id)
    const isHovered = hoveredIndex === index
    const FileIcon = getFileIcon(asset.fileType)

    const handleClick = (e: React.MouseEvent) => {
      if (e.ctrlKey || e.metaKey) {
        onAssetToggleSelect(asset.id, !isSelected)
      } else {
        onAssetSelect(asset.id)
      }
    }

    const handleCheckboxChange = (checked: boolean) => {
      onAssetToggleSelect(asset.id, checked)
    }

    return (
      <div
        style={style}
        className={`
          flex items-center px-4 py-2 border-b border-gray-100 cursor-pointer transition-colors
          hover:bg-gray-50 group
          ${isSelected ? 'bg-blue-50 border-blue-200' : ''}
        `}
        onClick={handleClick}
        onMouseEnter={() => setHoveredIndex(index)}
        onMouseLeave={() => setHoveredIndex(null)}
      >
        {/* Selection Checkbox */}
        {enableSelection && (
          <div className="mr-3">
            <Checkbox
              checked={isSelected}
              onCheckedChange={handleCheckboxChange}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}

        {/* File Icon/Thumbnail */}
        <div className="flex-shrink-0 mr-3">
          {asset.thumbnail ? (
            <img
              src={asset.thumbnail}
              alt={asset.title}
              className={`object-cover rounded ${
                viewMode === 'compact' ? 'w-8 h-8' : 
                viewMode === 'comfortable' ? 'w-12 h-12' : 'w-16 h-16'
              }`}
            />
          ) : (
            <div className={`
              bg-gray-100 rounded flex items-center justify-center
              ${viewMode === 'compact' ? 'w-8 h-8' : 
                viewMode === 'comfortable' ? 'w-12 h-12' : 'w-16 h-16'}
            `}>
              <FileIcon className={`
                text-gray-600
                ${viewMode === 'compact' ? 'h-4 w-4' : 
                  viewMode === 'comfortable' ? 'h-6 w-6' : 'h-8 w-8'}
              `} />
            </div>
          )}
        </div>

        {/* File Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              {/* Title and File Name */}
              <h4 className={`
                font-medium text-gray-900 truncate
                ${viewMode === 'compact' ? 'text-sm' : 'text-base'}
              `}>
                {asset.title}
              </h4>
              
              {viewMode !== 'compact' && (
                <p className="text-sm text-gray-600 truncate">
                  {asset.fileName}
                </p>
              )}

              {/* Metadata Row */}
              <div className={`
                flex items-center space-x-4 text-xs text-gray-500 mt-1
                ${viewMode === 'compact' ? 'space-x-2' : ''}
              `}>
                <div className="flex items-center">
                  <User className="h-3 w-3 mr-1" />
                  {asset.owner.name}
                </div>
                
                <div className="flex items-center">
                  <Calendar className="h-3 w-3 mr-1" />
                  {formatDate(asset.updatedAt)}
                </div>
                
                <div className="flex items-center">
                  <HardDrive className="h-3 w-3 mr-1" />
                  {formatFileSize(asset.fileSize)}
                </div>

                {viewMode === 'detailed' && asset.viewCount > 0 && (
                  <div className="flex items-center">
                    <Eye className="h-3 w-3 mr-1" />
                    {asset.viewCount} views
                  </div>
                )}
              </div>

              {/* Tags and Category - Detailed view only */}
              {viewMode === 'detailed' && (
                <div className="flex items-center space-x-2 mt-2">
                  <span className={`
                    inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                    ${getCategoryColor(asset.category)}
                  `}>
                    {asset.category}
                  </span>
                  
                  {asset.tags.length > 0 && (
                    <div className="flex items-center space-x-1">
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
                          +{asset.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className={`
              flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity
              ${isHovered ? 'opacity-100' : ''}
            `}>
              {asset.permissions.canView && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    onAssetView(asset)
                  }}
                  className="h-8 w-8 p-0"
                  title="View asset"
                >
                  <Eye className="h-4 w-4" />
                </Button>
              )}

              {asset.permissions.canDownload && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    onAssetDownload(asset)
                  }}
                  className="h-8 w-8 p-0"
                  title="Download asset"
                >
                  <Download className="h-4 w-4" />
                </Button>
              )}

              {asset.permissions.canShare && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    onAssetShare(asset)
                  }}
                  className="h-8 w-8 p-0"
                  title="Share asset"
                >
                  <Share2 className="h-4 w-4" />
                </Button>
              )}

              {/* More Actions Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem
                    onClick={() => onAssetView(asset)}
                    className="flex items-center"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem
                    onClick={() => onAssetDownload(asset)}
                    className="flex items-center"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem
                    onClick={() => onAssetShare(asset)}
                    className="flex items-center"
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </DropdownMenuItem>

                  {(onAssetEdit || onAssetDelete) && <DropdownMenuSeparator />}
                  
                  {onAssetEdit && asset.permissions.canEdit && (
                    <DropdownMenuItem
                      onClick={() => onAssetEdit(asset)}
                      className="flex items-center"
                    >
                      Edit Properties
                    </DropdownMenuItem>
                  )}
                  
                  {onAssetDelete && asset.permissions.canDelete && (
                    <DropdownMenuItem
                      onClick={() => onAssetDelete(asset)}
                      className="flex items-center text-red-600 focus:text-red-600"
                    >
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Shared Indicator */}
        {asset.isShared && (
          <div className="ml-3 flex-shrink-0">
            <div className="w-2 h-2 bg-blue-500 rounded-full" title="Shared" />
          </div>
        )}
      </div>
    )
  })

  ItemRenderer.displayName = 'AssetItemRenderer'

  // Non-virtualized version for smaller lists
  if (!enableVirtualization || assets.length < 50) {
    return (
      <Card className={className}>
        <div style={{ height }} className="overflow-y-auto">
          {assets.map((asset, index) => (
            <ItemRenderer key={asset.id} index={index} style={{}} />
          ))}
        </div>
      </Card>
    )
  }

  // Virtualized version for large lists
  return (
    <Card className={className}>
      <List
        ref={listRef}
        height={height}
        itemCount={assets.length}
        itemSize={actualItemHeight}
        itemData={assets}
        onItemsRendered={({ overscanStartIndex, overscanStopIndex }) => {
          // Optional: track visible items for analytics
        }}
      >
        {ItemRenderer}
      </List>
    </Card>
  )
}