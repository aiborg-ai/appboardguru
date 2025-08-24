'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeft, 
  MoreHorizontal,
  Star,
  Share2,
  Bookmark,
  ExternalLink
} from 'lucide-react'
import { Button } from '@/features/shared/ui/button'
import { Badge } from '@/features/shared/ui/badge'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/features/shared/ui/dropdown-menu'
import { useIntegrationActions } from '@/lib/stores/integration-store'

interface PageAction {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  onClick: () => void
  primary?: boolean
  variant?: 'default' | 'outline' | 'ghost' | 'destructive'
}

interface PageBreadcrumb {
  label: string
  href?: string
  icon?: React.ComponentType<{ className?: string }>
}

interface PageHeaderProps {
  // Basic info
  title: string
  subtitle?: string
  description?: string
  
  // Visual elements
  icon?: React.ComponentType<{ className?: string }>
  iconColor?: string
  badges?: Array<{
    label: string
    variant?: 'default' | 'secondary' | 'outline' | 'destructive'
    color?: string
  }>
  
  // Navigation
  breadcrumbs?: PageBreadcrumb[]
  showBackButton?: boolean
  backHref?: string
  
  // Actions
  primaryAction?: PageAction
  secondaryActions?: PageAction[]
  moreActions?: PageAction[]
  
  // Integration features
  enableBookmark?: boolean
  bookmarkData?: {
    type: 'asset' | 'organization' | 'meeting' | 'vault' | 'search'
    title: string
    href: string
    description?: string
  }
  
  // Layout
  variant?: 'default' | 'compact' | 'hero'
  className?: string
}

export default function PageHeader({
  title,
  subtitle,
  description,
  icon: Icon,
  iconColor = 'text-blue-600',
  badges = [],
  breadcrumbs = [],
  showBackButton = false,
  backHref,
  primaryAction,
  secondaryActions = [],
  moreActions = [],
  enableBookmark = false,
  bookmarkData,
  variant = 'default',
  className = ''
}: PageHeaderProps) {
  const router = useRouter()
  const { toggleBookmark, isBookmarked, trackActivity } = useIntegrationActions()

  const handleBack = () => {
    if (backHref) {
      router.push(backHref)
    } else {
      router.back()
    }
  }

  const handleBookmark = () => {
    if (bookmarkData) {
      toggleBookmark(bookmarkData)
      
      trackActivity({
        type: 'create',
        entityType: bookmarkData.type,
        entityId: bookmarkData.href,
        entityTitle: bookmarkData.title,
        description: `${isBookmarked(bookmarkData.href) ? 'Removed' : 'Added'} bookmark`
      })
    }
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: description || subtitle,
          url: window.location.href
        })
        
        trackActivity({
          type: 'share',
          entityType: bookmarkData?.type || 'asset',
          entityId: bookmarkData?.href || window.location.pathname,
          entityTitle: title,
          description: 'Shared via native sharing'
        })
      } catch (error) {
        // Fallback to clipboard
        handleCopyLink()
      }
    } else {
      handleCopyLink()
    }
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      
      trackActivity({
        type: 'share',
        entityType: bookmarkData?.type || 'asset',
        entityId: bookmarkData?.href || window.location.pathname,
        entityTitle: title,
        description: 'Copied link to clipboard'
      })
      
      // You could show a toast notification here
    } catch (error) {
      console.error('Failed to copy link:', error)
    }
  }

  const isBookmarkedItem = bookmarkData ? isBookmarked(bookmarkData.href) : false

  // Determine layout styles based on variant
  const getVariantStyles = () => {
    switch (variant) {
      case 'compact':
        return {
          container: 'py-4',
          title: 'text-xl',
          subtitle: 'text-sm'
        }
      case 'hero':
        return {
          container: 'py-12 bg-gradient-to-r from-blue-600 to-purple-700 text-white',
          title: 'text-4xl',
          subtitle: 'text-xl text-blue-100'
        }
      default:
        return {
          container: 'py-6',
          title: 'text-3xl',
          subtitle: 'text-lg'
        }
    }
  }

  const styles = getVariantStyles()

  return (
    <div className={`border-b bg-white ${styles.container} ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumbs */}
        {breadcrumbs.length > 0 && (
          <nav className="flex mb-4" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-2 text-sm">
              {breadcrumbs.map((crumb, index) => (
                <React.Fragment key={index}>
                  {index > 0 && <span className="text-gray-400">/</span>}
                  <li className="flex items-center">
                    {crumb.icon && <crumb.icon className="h-4 w-4 mr-1 text-gray-400" />}
                    {crumb.href ? (
                      <button
                        onClick={() => router.push(crumb.href!)}
                        className="text-gray-500 hover:text-gray-700 transition-colors"
                      >
                        {crumb.label}
                      </button>
                    ) : (
                      <span className="text-gray-900 font-medium">{crumb.label}</span>
                    )}
                  </li>
                </React.Fragment>
              ))}
            </ol>
          </nav>
        )}

        <div className="flex items-start justify-between">
          {/* Left section */}
          <div className="flex items-start space-x-4 flex-1 min-w-0">
            {/* Back button */}
            {showBackButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="flex-shrink-0"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}

            {/* Icon */}
            {Icon && (
              <div className={`flex-shrink-0 p-3 rounded-lg ${
                variant === 'hero' ? 'bg-white/20' : 'bg-gray-50'
              }`}>
                <Icon className={`h-8 w-8 ${variant === 'hero' ? 'text-white' : iconColor}`} />
              </div>
            )}

            {/* Title and description */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-3 mb-2">
                <h1 className={`font-bold truncate ${styles.title} ${
                  variant === 'hero' ? 'text-white' : 'text-gray-900'
                }`}>
                  {title}
                </h1>
                {badges.map((badge, index) => (
                  <Badge
                    key={index}
                    variant={badge.variant || 'secondary'}
                    className={badge.color}
                  >
                    {badge.label}
                  </Badge>
                ))}
              </div>
              
              {subtitle && (
                <p className={`${styles.subtitle} ${
                  variant === 'hero' ? 'text-blue-100' : 'text-gray-600'
                } mb-1`}>
                  {subtitle}
                </p>
              )}
              
              {description && (
                <p className={`text-sm ${
                  variant === 'hero' ? 'text-blue-200' : 'text-gray-500'
                } max-w-3xl`}>
                  {description}
                </p>
              )}
            </div>
          </div>

          {/* Right section - Actions */}
          <div className="flex items-center space-x-3 flex-shrink-0 ml-4">
            {/* Secondary actions */}
            {secondaryActions.map((action) => (
              <Button
                key={action.id}
                variant={action.variant || 'outline'}
                size="sm"
                onClick={action.onClick}
                className="flex items-center gap-2"
              >
                <action.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{action.label}</span>
              </Button>
            ))}

            {/* Bookmark button */}
            {enableBookmark && bookmarkData && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBookmark}
                className={`flex items-center gap-2 ${isBookmarkedItem ? 'text-yellow-600' : ''}`}
              >
                <Bookmark className={`h-4 w-4 ${isBookmarkedItem ? 'fill-current' : ''}`} />
                <span className="hidden sm:inline">
                  {isBookmarkedItem ? 'Bookmarked' : 'Bookmark'}
                </span>
              </Button>
            )}

            {/* Share button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleShare}
              className="flex items-center gap-2"
            >
              <Share2 className="h-4 w-4" />
              <span className="hidden sm:inline">Share</span>
            </Button>

            {/* Primary action */}
            {primaryAction && (
              <Button
                variant={primaryAction.variant || 'default'}
                onClick={primaryAction.onClick}
                className="flex items-center gap-2"
              >
                <primaryAction.icon className="h-4 w-4" />
                {primaryAction.label}
              </Button>
            )}

            {/* More actions dropdown */}
            {moreActions.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {moreActions.map((action, index) => (
                    <React.Fragment key={action.id}>
                      {index > 0 && action.id.startsWith('separator') && <DropdownMenuSeparator />}
                      <DropdownMenuItem 
                        onClick={action.onClick}
                        className={action.variant === 'destructive' ? 'text-red-600' : ''}
                      >
                        <action.icon className="h-4 w-4 mr-2" />
                        {action.label}
                      </DropdownMenuItem>
                    </React.Fragment>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}