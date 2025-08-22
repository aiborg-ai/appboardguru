'use client'

import React, { useState, useCallback, useMemo, forwardRef } from 'react'
import { VirtualScrollList, VirtualScrollListRef, VirtualScrollListItem } from './virtual-scroll-list'
import { Button } from '@/features/shared/ui/button'
import { Badge } from '@/features/shared/ui/badge'
import { Card } from '@/features/shared/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  MoreVertical,
  Mail,
  MessageSquare,
  Settings,
  Phone,
  MapPin,
  Building,
  Calendar,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  Users
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

interface BoardMateProfile {
  id: string
  user_id: string
  organization_id: string
  full_name: string | null
  email: string | null
  phone: string | null
  designation: string | null
  company: string | null
  bio: string | null
  profile_image: string | null
  location: string | null
  linkedin_url: string | null
  org_status: string
  created_at: string
  updated_at: string
  board_memberships: Array<{
    id: string
    board_id: string
    member_role: string
    member_status: string
    start_date: string
    end_date?: string
    board?: {
      id: string
      name: string
      type: string
    }
  }>
}

interface BoardMateVirtualListProps {
  boardmates: BoardMateProfile[]
  height?: number | string
  searchTerm?: string
  loading?: boolean
  hasMore?: boolean
  onLoadMore?: () => void
  onEdit?: (boardmate: BoardMateProfile) => void
  onMessage?: (boardmate: BoardMateProfile) => void
  onManageAssociations?: (boardmate: BoardMateProfile) => void
  onCall?: (boardmate: BoardMateProfile) => void
  className?: string
  enableSelection?: boolean
  selectedBoardmates?: Set<string>
  onSelectionChange?: (selectedBoardmates: Set<string>) => void
  viewMode?: 'compact' | 'detailed'
}

// BoardMate item component for virtual list
interface BoardMateItemProps {
  item: VirtualScrollListItem
  index: number
  style: React.CSSProperties
}

const BoardMateItem: React.FC<BoardMateItemProps> = ({ item }) => {
  const boardmate = item.data as BoardMateProfile
  const [showActions, setShowActions] = useState(false)

  const getStatusConfig = (status: string) => {
    const configs = {
      'active': { 
        label: 'Active', 
        color: 'bg-green-100 text-green-700', 
        icon: CheckCircle 
      },
      'pending': { 
        label: 'Pending', 
        color: 'bg-yellow-100 text-yellow-700', 
        icon: Clock 
      },
      'pending_activation': { 
        label: 'Pending', 
        color: 'bg-yellow-100 text-yellow-700', 
        icon: Clock 
      },
      'inactive': { 
        label: 'Inactive', 
        color: 'bg-gray-100 text-gray-700', 
        icon: XCircle 
      },
      'suspended': { 
        label: 'Suspended', 
        color: 'bg-red-100 text-red-700', 
        icon: AlertTriangle 
      }
    }
    return configs[status as keyof typeof configs] || configs.inactive
  }

  const getRoleDisplayName = (role: string) => {
    const roleNames: Record<string, string> = {
      'chairman': 'Chairman',
      'vice_chairman': 'Vice Chairman',
      'ceo': 'CEO',
      'cfo': 'CFO',
      'cto': 'CTO',
      'independent_director': 'Independent Director',
      'executive_director': 'Executive Director',
      'board_member': 'Board Member'
    }
    return roleNames[role] || role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  const getInitials = (name: string | null) => {
    if (!name) return '??'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const primaryRole = boardmate.board_memberships.find(bm => bm.member_status === 'active')
  const statusConfig = getStatusConfig(boardmate.org_status)
  const StatusIcon = statusConfig.icon

  const handleEdit = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    // Would call onEdit from props
  }, [])

  const handleMessage = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    // Would call onMessage from props
  }, [])

  const handleCall = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    // Would call onCall from props
  }, [])

  const handleManageAssociations = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    // Would call onManageAssociations from props
  }, [])

  return (
    <Card 
      className="mb-3 hover:shadow-md transition-all duration-200 cursor-pointer"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="p-4">
        <div className="flex items-center space-x-4">
          {/* Avatar */}
          <Avatar className="h-12 w-12 ring-2 ring-gray-100">
            <AvatarImage src={boardmate.profile_image || undefined} alt={boardmate.full_name || ''} />
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
              {getInitials(boardmate.full_name)}
            </AvatarFallback>
          </Avatar>

          {/* Main Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-gray-900 truncate">
                    {boardmate.full_name || 'Unnamed User'}
                  </h3>
                  <Badge className={cn('text-xs px-2 py-0.5', statusConfig.color)}>
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {statusConfig.label}
                  </Badge>
                </div>

                <div className="space-y-1">
                  {boardmate.designation && (
                    <p className="text-sm font-medium text-gray-700">
                      {boardmate.designation}
                    </p>
                  )}
                  
                  {boardmate.company && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Building className="h-3 w-3 mr-1" />
                      {boardmate.company}
                    </div>
                  )}

                  {boardmate.email && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Mail className="h-3 w-3 mr-1" />
                      {boardmate.email}
                    </div>
                  )}

                  {boardmate.location && (
                    <div className="flex items-center text-sm text-gray-500">
                      <MapPin className="h-3 w-3 mr-1" />
                      {boardmate.location}
                    </div>
                  )}
                </div>

                {/* Board Roles */}
                {boardmate.board_memberships.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {boardmate.board_memberships
                      .filter(bm => bm.member_status === 'active')
                      .slice(0, 3)
                      .map((membership) => (
                        <Badge
                          key={membership.id}
                          variant="outline"
                          className="text-xs bg-blue-50 text-blue-700 border-blue-200"
                        >
                          {getRoleDisplayName(membership.member_role)}
                          {membership.board && ` • ${membership.board.name}`}
                        </Badge>
                      ))}
                    {boardmate.board_memberships.filter(bm => bm.member_status === 'active').length > 3 && (
                      <Badge variant="outline" className="text-xs text-gray-500">
                        +{boardmate.board_memberships.filter(bm => bm.member_status === 'active').length - 3} more
                      </Badge>
                    )}
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className={cn(
                'flex items-center gap-1 transition-opacity',
                showActions ? 'opacity-100' : 'opacity-0'
              )}>
                {boardmate.email && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600"
                    title="Send message"
                    onClick={handleMessage}
                  >
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                )}
                
                {boardmate.phone && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 hover:bg-green-50 hover:text-green-600"
                    title="Call"
                    onClick={handleCall}
                  >
                    <Phone className="h-4 w-4" />
                  </Button>
                )}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 hover:bg-gray-50"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleEdit}>
                      <Settings className="h-4 w-4 mr-2" />
                      Edit Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleManageAssociations}>
                      <Users className="h-4 w-4 mr-2" />
                      Manage Associations
                    </DropdownMenuItem>
                    {boardmate.email && (
                      <DropdownMenuItem onClick={handleMessage}>
                        <Mail className="h-4 w-4 mr-2" />
                        Send Email
                      </DropdownMenuItem>
                    )}
                    {boardmate.phone && (
                      <DropdownMenuItem onClick={handleCall}>
                        <Phone className="h-4 w-4 mr-2" />
                        Call
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>

        {/* Bio (if available) */}
        {boardmate.bio && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-sm text-gray-600 line-clamp-2">
              {boardmate.bio}
            </p>
          </div>
        )}

        {/* Last updated info */}
        <div className="mt-3 pt-2 border-t border-gray-50">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span className="flex items-center">
              <Calendar className="h-3 w-3 mr-1" />
              Joined {new Date(boardmate.created_at).toLocaleDateString()}
            </span>
            <span>
              Updated {new Date(boardmate.updated_at).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>
    </Card>
  )
}

// Main BoardMateVirtualList component
export const BoardMateVirtualList = forwardRef<VirtualScrollListRef, BoardMateVirtualListProps>(
  ({
    boardmates,
    height = 600,
    searchTerm,
    loading = false,
    hasMore = false,
    onLoadMore,
    onEdit,
    onMessage,
    onManageAssociations,
    onCall,
    className,
    enableSelection = false,
    selectedBoardmates,
    onSelectionChange,
    viewMode = 'detailed'
  }, ref) => {

    // Convert boardmates to virtual list items
    const virtualItems = useMemo((): VirtualScrollListItem[] => {
      return boardmates.map(boardmate => ({
        id: boardmate.id,
        data: boardmate
      }))
    }, [boardmates])

    // Dynamic height calculation based on content
    const getItemHeight = useCallback((index: number, item: VirtualScrollListItem) => {
      const boardmate = item.data as BoardMateProfile
      
      if (viewMode === 'compact') {
        return 80
      }
      
      // Base height for detailed view
      let height = 160
      
      // Add height for bio
      if (boardmate.bio) {
        height += 40
      }
      
      // Add height for multiple board memberships
      if (boardmate.board_memberships.length > 1) {
        height += Math.min(boardmate.board_memberships.length * 8, 32)
      }
      
      // Add padding
      height += 24
      
      return height
    }, [viewMode])

    const handleItemClick = useCallback((item: VirtualScrollListItem, index: number) => {
      const boardmate = item.data as BoardMateProfile
      onEdit?.(boardmate)
    }, [onEdit])

    return (
      <div className={cn('boardmate-virtual-list', className)}>
        <VirtualScrollList
          ref={ref}
          items={virtualItems}
          itemComponent={BoardMateItem}
          itemHeight={getItemHeight}
          height={height}
          estimatedItemHeight={viewMode === 'compact' ? 80 : 180}
          searchTerm={searchTerm}
          loading={loading}
          hasMore={hasMore}
          onLoadMore={onLoadMore}
          enableSelection={enableSelection}
          selectedItems={selectedBoardmates}
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

BoardMateVirtualList.displayName = 'BoardMateVirtualList'

export default BoardMateVirtualList