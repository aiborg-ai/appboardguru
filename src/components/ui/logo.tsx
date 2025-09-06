import React from 'react';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  variant?: 'default' | 'light' | 'dark';
}

export function Logo({ 
  className, 
  size = 'md', 
  showText = true,
  variant = 'default' 
}: LogoProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24'
  };

  const textSizeClasses = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-3xl',
    xl: 'text-4xl'
  };

  const colorClasses = {
    default: 'text-[#003d5c]',
    light: 'text-white',
    dark: 'text-[#003d5c]'
  };

  const bgColorClasses = {
    default: 'bg-[#f5ede4]',
    light: 'bg-white/10',
    dark: 'bg-[#003d5c]'
  };

  const iconColorClasses = {
    default: 'text-[#003d5c]',
    light: 'text-white',
    dark: 'text-white'
  };

  return (
    <div className={cn('flex items-center gap-3', className)}>
      {/* Icon */}
      <div className={cn(
        'relative rounded-full flex items-center justify-center',
        sizeClasses[size],
        bgColorClasses[variant]
      )}>
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={cn('w-full h-full', iconColorClasses[variant])}
        >
          {/* Circle border */}
          <circle 
            cx="50" 
            cy="50" 
            r="45" 
            stroke="currentColor" 
            strokeWidth="3"
            fill="none"
          />
          
          {/* Head */}
          <circle 
            cx="50" 
            cy="30" 
            r="12" 
            stroke="currentColor" 
            strokeWidth="2.5"
            fill="none"
          />
          
          {/* Glasses */}
          <path 
            d="M 35 28 Q 35 25 38 25 L 42 25 Q 45 25 45 28 L 45 32 Q 45 35 42 35 L 38 35 Q 35 35 35 32 Z
               M 55 28 Q 55 25 58 25 L 62 25 Q 65 25 65 28 L 65 32 Q 65 35 62 35 L 58 35 Q 55 35 55 32 Z
               M 45 30 L 55 30"
            stroke="currentColor" 
            strokeWidth="2.5"
            fill="none"
          />
          
          {/* Body - Suit */}
          <path 
            d="M 30 55 Q 30 50 35 48 L 40 46 Q 45 44 50 44 Q 55 44 60 46 L 65 48 Q 70 50 70 55 L 70 75 Q 70 80 65 80 L 35 80 Q 30 80 30 75 Z"
            stroke="currentColor" 
            strokeWidth="2.5"
            fill="none"
          />
          
          {/* Tie */}
          <path 
            d="M 50 44 L 50 65 M 46 48 L 50 52 L 54 48"
            stroke="currentColor" 
            strokeWidth="2"
            fill="none"
          />
          
          {/* Collar */}
          <path 
            d="M 42 44 L 46 48 L 50 44 L 54 48 L 58 44"
            stroke="currentColor" 
            strokeWidth="2"
            fill="none"
          />
        </svg>
      </div>

      {/* Text */}
      {showText && (
        <div className={cn('font-bold tracking-tight', textSizeClasses[size], colorClasses[variant])}>
          <span>Board</span>
          <span className="font-light">Guru</span>
        </div>
      )}
    </div>
  );
}

export function LogoMark({ 
  className, 
  size = 'md',
  variant = 'default' 
}: Omit<LogoProps, 'showText'>) {
  return <Logo className={className} size={size} showText={false} variant={variant} />;
}

export function LogoWithTagline({ 
  className, 
  size = 'md',
  variant = 'default',
  tagline = 'Enterprise Board Governance Platform'
}: LogoProps & { tagline?: string }) {
  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
    xl: 'text-lg'
  };

  const colorClasses = {
    default: 'text-[#003d5c]',
    light: 'text-white',
    dark: 'text-[#003d5c]'
  };

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <Logo size={size} showText={true} variant={variant} />
      <p className={cn(
        'text-center opacity-75',
        textSizeClasses[size],
        colorClasses[variant]
      )}>
        {tagline}
      </p>
    </div>
  );
}