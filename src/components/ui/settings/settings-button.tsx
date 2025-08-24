'use client'

import React, { memo } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/features/shared/ui/button'
import { Loader2 } from 'lucide-react'
import type { SettingsButtonProps } from './types'

export const SettingsButton = memo<SettingsButtonProps>(({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon: Icon,
  iconPosition = 'left',
  fullWidth = false,
  className,
  children,
  disabled,
  ...props
}) => {
  const buttonVariants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500',
    outline: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-blue-500',
    ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-blue-500',
    destructive: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
  }

  const sizeVariants = {
    sm: 'h-8 px-3 text-sm',
    md: 'h-10 px-4',
    lg: 'h-12 px-6 text-lg'
  }

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  }

  const iconSize = iconSizes[size]

  return (
    <Button
      className={cn(
        'relative inline-flex items-center justify-center',
        'font-medium rounded-md transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        buttonVariants[variant],
        sizeVariants[size],
        fullWidth && 'w-full',
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <Loader2 className={cn(iconSize, 'animate-spin', children && 'mr-2')} />
      )}
      
      {!loading && Icon && iconPosition === 'left' && (
        <Icon className={cn(iconSize, children && 'mr-2')} />
      )}
      
      {children}
      
      {!loading && Icon && iconPosition === 'right' && (
        <Icon className={cn(iconSize, children && 'ml-2')} />
      )}
    </Button>
  )
})

SettingsButton.displayName = 'SettingsButton'