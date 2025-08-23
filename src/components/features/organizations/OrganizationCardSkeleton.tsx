'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Skeleton } from '@/components/atoms/display/skeleton'
import { cn } from '@/lib/utils'

interface OrganizationCardSkeletonProps {
  className?: string
  withShimmer?: boolean
  compact?: boolean
}

/**
 * Skeleton loading component that matches the organization card design exactly
 */
export function OrganizationCardSkeleton({ 
  className,
  withShimmer = true,
  compact = false 
}: OrganizationCardSkeletonProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className={cn(
        "bg-white border border-gray-200 rounded-xl p-6 relative overflow-hidden",
        className
      )}
    >
      {/* Shimmer overlay */}
      {withShimmer && (
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-gray-100/50 to-transparent" />
      )}

      {/* Organization Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          {/* Logo skeleton */}
          <Skeleton className={cn(
            "rounded-lg bg-gray-100",
            compact ? "w-8 h-8" : "w-12 h-12"
          )} />
          
          <div className="flex-1 min-w-0">
            {/* Organization name */}
            <Skeleton className={cn(
              "bg-gray-200 rounded-md",
              compact ? "h-4 w-24" : "h-5 w-32"
            )} />
            
            {/* Industry and size badges */}
            <div className="flex items-center space-x-2 mt-1">
              <Skeleton className="h-3 w-16 bg-gray-100 rounded" />
              <Skeleton className="h-3 w-12 bg-gray-100 rounded" />
            </div>
          </div>
        </div>
        
        {/* Role badge */}
        <Skeleton className={cn(
          "bg-gray-100 rounded-full",
          compact ? "h-4 w-12" : "h-5 w-16"
        )} />
      </div>

      {/* Description */}
      <div className={cn("mb-4", compact ? "space-y-1" : "space-y-2")}>
        <Skeleton className={cn(
          "bg-gray-100 rounded",
          compact ? "h-3 w-full" : "h-4 w-full"
        )} />
        <Skeleton className={cn(
          "bg-gray-100 rounded",
          compact ? "h-3 w-3/4" : "h-4 w-4/5"
        )} />
      </div>

      {/* Metrics */}
      <div className={cn("grid grid-cols-2 gap-4 mb-4", compact && "gap-2")}>
        <div className="text-center">
          <Skeleton className={cn(
            "bg-gray-200 rounded mx-auto mb-1",
            compact ? "h-4 w-6" : "h-5 w-8"
          )} />
          <Skeleton className="h-3 w-12 bg-gray-100 rounded mx-auto" />
        </div>
        <div className="text-center">
          <Skeleton className={cn(
            "bg-gray-200 rounded mx-auto mb-1",
            compact ? "h-4 w-10" : "h-5 w-12"
          )} />
          <Skeleton className="h-3 w-12 bg-gray-100 rounded mx-auto" />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div className="flex space-x-2">
          <Skeleton className={cn(
            "bg-gray-100 rounded",
            compact ? "h-3 w-8" : "h-4 w-10"
          )} />
          <Skeleton className={cn(
            "bg-gray-100 rounded",
            compact ? "h-3 w-12" : "h-4 w-14"
          )} />
        </div>
        <Skeleton className={cn(
          "bg-gray-100 rounded",
          compact ? "h-3 w-12" : "h-4 w-16"
        )} />
      </div>
    </motion.div>
  )
}

/**
 * Create Organization Card Skeleton - matches the "Create Organization" card design
 */
export function CreateOrganizationCardSkeleton({ 
  className,
  compact = false 
}: Omit<OrganizationCardSkeletonProps, 'withShimmer'>) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className={cn(
        "bg-gradient-to-br from-blue-50 to-indigo-100 border-2 border-dashed border-blue-200 rounded-xl p-6 relative overflow-hidden",
        className
      )}
    >
      <div className={cn("flex flex-col items-center justify-center text-center", compact ? "h-32" : "h-40")}>
        {/* Plus icon skeleton */}
        <div className={cn(
          "bg-blue-100/50 rounded-full flex items-center justify-center mb-4 animate-pulse",
          compact ? "w-12 h-12" : "w-16 h-16"
        )}>
          <Skeleton className={cn(
            "bg-blue-200 rounded",
            compact ? "h-6 w-6" : "h-8 w-8"
          )} />
        </div>
        
        {/* Title skeleton */}
        <Skeleton className={cn(
          "bg-blue-200/50 rounded mb-2",
          compact ? "h-4 w-28" : "h-5 w-36"
        )} />
        
        {/* Description skeleton */}
        <Skeleton className={cn(
          "bg-blue-100/50 rounded",
          compact ? "h-3 w-40" : "h-4 w-48"
        )} />
      </div>
    </motion.div>
  )
}

/**
 * Grid of organization card skeletons with staggered animation
 */
export function OrganizationCardSkeletonGrid({ 
  count = 6,
  withCreateCard = true,
  className 
}: {
  count?: number
  withCreateCard?: boolean
  className?: string
}) {
  const skeletonItems = Array.from({ length: count }, (_, i) => i)
  
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] }
    }
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6", className)}
    >
      {/* Create Organization Card Skeleton */}
      {withCreateCard && (
        <motion.div variants={itemVariants}>
          <CreateOrganizationCardSkeleton />
        </motion.div>
      )}

      {/* Organization Card Skeletons */}
      {skeletonItems.map((index) => (
        <motion.div key={index} variants={itemVariants}>
          <OrganizationCardSkeleton />
        </motion.div>
      ))}
    </motion.div>
  )
}

export default OrganizationCardSkeleton