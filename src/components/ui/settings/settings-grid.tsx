'use client'

import React, { memo } from 'react'
import { cn } from '@/lib/utils'
import type { SettingsGridProps } from './types'

export const SettingsGrid = memo<SettingsGridProps>(({
  columns = 2,
  gap = 'md',
  responsive = true,
  className,
  children,
  ...props
}) => {
  const columnClasses = {
    1: 'grid-cols-1',
    2: responsive ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-2',
    3: responsive ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-3',
    4: responsive ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-4'
  }

  const gapClasses = {
    sm: 'gap-3',
    md: 'gap-6',
    lg: 'gap-8'
  }

  return (
    <div
      className={cn(
        'grid',
        columnClasses[columns],
        gapClasses[gap],
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
})

SettingsGrid.displayName = 'SettingsGrid'