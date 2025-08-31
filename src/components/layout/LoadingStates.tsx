/**
 * Loading States Components
 * DESIGN_SPEC compliant loading indicators and skeleton loaders
 */

import React from 'react'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

// Page Loading Component
export interface PageLoadingProps {
  message?: string
  className?: string
}

export const PageLoading: React.FC<PageLoadingProps> = ({
  message = 'Loading...',
  className
}) => {
  return (
    <div className={cn(
      "flex items-center justify-center min-h-[400px]",
      className
    )}>
      <div className="flex flex-col items-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        <p className="text-gray-600">{message}</p>
      </div>
    </div>
  )
}

// Inline Loading Component
export interface InlineLoadingProps {
  message?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export const InlineLoading: React.FC<InlineLoadingProps> = ({
  message = 'Processing...',
  size = 'md',
  className
}) => {
  const sizeClasses = {
    sm: 'h-3 w-3 text-xs',
    md: 'h-4 w-4 text-sm',
    lg: 'h-5 w-5 text-base'
  }

  return (
    <span className={cn(
      "inline-flex items-center text-gray-600",
      className
    )}>
      <Loader2 className={cn("animate-spin mr-2", sizeClasses[size])} />
      {message}
    </span>
  )
}

// Skeleton Loader Component
export interface SkeletonProps {
  className?: string
  variant?: 'text' | 'rectangular' | 'circular'
  width?: string | number
  height?: string | number
  animation?: boolean
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  variant = 'rectangular',
  width,
  height,
  animation = true
}) => {
  const variantClasses = {
    text: 'rounded',
    rectangular: 'rounded-md',
    circular: 'rounded-full'
  }

  return (
    <div
      className={cn(
        "bg-gray-200",
        animation && "animate-pulse",
        variantClasses[variant],
        className
      )}
      style={{
        width: width,
        height: height || (variant === 'text' ? '1em' : undefined)
      }}
    />
  )
}

// Card Skeleton Component
export const CardSkeleton: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={cn("bg-white rounded-lg border shadow-sm p-6", className)}>
      <div className="space-y-4">
        <Skeleton height={24} width="60%" />
        <Skeleton height={16} width="100%" />
        <Skeleton height={16} width="80%" />
        <div className="flex gap-2 mt-4">
          <Skeleton height={32} width={80} />
          <Skeleton height={32} width={80} />
        </div>
      </div>
    </div>
  )
}

// List Skeleton Component
export interface ListSkeletonProps {
  rows?: number
  className?: string
}

export const ListSkeleton: React.FC<ListSkeletonProps> = ({
  rows = 5,
  className
}) => {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center space-x-4 p-4 bg-white rounded-lg border">
          <Skeleton variant="circular" width={40} height={40} />
          <div className="flex-1 space-y-2">
            <Skeleton height={16} width="30%" />
            <Skeleton height={14} width="50%" />
          </div>
          <Skeleton height={32} width={80} />
        </div>
      ))}
    </div>
  )
}

// Table Skeleton Component
export interface TableSkeletonProps {
  rows?: number
  columns?: number
  className?: string
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({
  rows = 5,
  columns = 4,
  className
}) => {
  return (
    <div className={cn("w-full", className)}>
      <div className="bg-gray-50 border-b">
        <div className="grid" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }).map((_, index) => (
            <div key={index} className="p-4">
              <Skeleton height={16} width="80%" />
            </div>
          ))}
        </div>
      </div>
      <div className="bg-white">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div
            key={rowIndex}
            className="grid border-b"
            style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
          >
            {Array.from({ length: columns }).map((_, colIndex) => (
              <div key={colIndex} className="p-4">
                <Skeleton height={14} width="60%" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

// Overlay Loading Component
export interface OverlayLoadingProps {
  isLoading: boolean
  message?: string
  children: React.ReactNode
  className?: string
}

export const OverlayLoading: React.FC<OverlayLoadingProps> = ({
  isLoading,
  message = 'Loading...',
  children,
  className
}) => {
  return (
    <div className={cn("relative", className)}>
      {children}
      {isLoading && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
          <div className="flex flex-col items-center space-y-2">
            <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
            <p className="text-sm text-gray-600">{message}</p>
          </div>
        </div>
      )}
    </div>
  )
}