import React from 'react';
import { cn } from '@/lib/utils';
import { Logo } from './logo';

interface LoadingScreenProps {
  className?: string;
  message?: string;
  fullScreen?: boolean;
}

export function LoadingScreen({ 
  className, 
  message = 'Loading...', 
  fullScreen = true 
}: LoadingScreenProps) {
  const containerClasses = fullScreen 
    ? 'fixed inset-0 z-50' 
    : 'relative w-full h-full min-h-[400px]';

  return (
    <div className={cn(
      containerClasses,
      'flex flex-col items-center justify-center bg-gradient-to-br from-[#f5ede4] to-white',
      className
    )}>
      {/* Logo with animation */}
      <div className="mb-8 animate-pulse">
        <Logo size="xl" showText={true} variant="default" />
      </div>
      
      {/* Loading indicator */}
      <div className="flex space-x-2 mb-4">
        <div className="w-3 h-3 bg-[#003d5c] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
        <div className="w-3 h-3 bg-[#003d5c] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
        <div className="w-3 h-3 bg-[#003d5c] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
      </div>
      
      {/* Loading message */}
      <p className="text-[#003d5c] text-sm font-medium animate-pulse">
        {message}
      </p>
    </div>
  );
}

export function LoadingSpinner({ 
  className, 
  size = 'md' 
}: { 
  className?: string; 
  size?: 'sm' | 'md' | 'lg' 
}) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  return (
    <div className={cn('relative inline-block', className)}>
      <div className={cn(
        sizeClasses[size],
        'animate-spin rounded-full border-2 border-[#003d5c] border-t-transparent'
      )} />
    </div>
  );
}

export function PageLoading({ title = 'Loading page' }: { title?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[200px] p-8">
      <Logo size="lg" showText={false} variant="default" className="mb-4" />
      <LoadingSpinner size="md" className="mb-4" />
      <p className="text-gray-600 text-sm">{title}</p>
    </div>
  );
}

export function DocumentLoading() {
  return (
    <div className="flex items-center space-x-3 p-4 bg-white rounded-lg border border-gray-200">
      <LoadingSpinner size="sm" />
      <div className="flex-1">
        <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4 mb-2"></div>
        <div className="h-3 bg-gray-100 rounded animate-pulse w-1/2"></div>
      </div>
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="p-6 bg-white rounded-lg border border-gray-200 animate-pulse">
      <div className="flex items-center space-x-4 mb-4">
        <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
        <div className="flex-1">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-gray-100 rounded w-1/2"></div>
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-gray-100 rounded"></div>
        <div className="h-3 bg-gray-100 rounded w-5/6"></div>
        <div className="h-3 bg-gray-100 rounded w-4/6"></div>
      </div>
    </div>
  );
}