'use client'

import React, { memo } from 'react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import type { SettingsSkeletonProps } from './types'

export const SettingsSkeleton = memo<SettingsSkeletonProps>(({
  variant = 'card',
  count = 1,
  showAvatar = false,
  showActions = false,
  className,
  ...props
}) => {
  const renderCardSkeleton = () => (
    <div className="border border-gray-200 rounded-lg p-6 space-y-4">
      {/* Header */}
      <div className="flex items-start space-x-3">
        {showAvatar && (
          <Skeleton className="h-10 w-10 rounded-lg flex-shrink-0" />
        )}
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        {showActions && (
          <Skeleton className="h-8 w-20 flex-shrink-0" />
        )}
      </div>
      
      {/* Content */}
      <div className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  )

  const renderFormSkeleton = () => (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-64" />
      </div>
      
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      
      <div className="flex space-x-2">
        <Skeleton className="h-10 w-20" />
        <Skeleton className="h-10 w-16" />
      </div>
    </div>
  )

  const renderListSkeleton = () => (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg">
          {showAvatar && (
            <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
          )}
          <div className="flex-1 space-y-1">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          {showActions && (
            <Skeleton className="h-6 w-16 flex-shrink-0" />
          )}
        </div>
      ))}
    </div>
  )

  const renderToggleSkeleton = () => (
    <div className="flex items-start space-x-3">
      <Skeleton className="h-6 w-11 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-1">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-48" />
      </div>
    </div>
  )

  const renderInputSkeleton = () => (
    <div className="space-y-2">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-3 w-40" />
    </div>
  )

  const renderSkeleton = () => {
    switch (variant) {
      case 'form':
        return renderFormSkeleton()
      case 'list':
        return renderListSkeleton()
      case 'toggle':
        return renderToggleSkeleton()
      case 'input':
        return renderInputSkeleton()
      case 'card':
      default:
        return renderCardSkeleton()
    }
  }

  if (count === 1) {
    return (
      <div className={cn('animate-pulse', className)} {...props}>
        {renderSkeleton()}
      </div>
    )
  }

  return (
    <div className={cn('space-y-4 animate-pulse', className)} {...props}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index}>
          {renderSkeleton()}
        </div>
      ))}
    </div>
  )
})

SettingsSkeleton.displayName = 'SettingsSkeleton'