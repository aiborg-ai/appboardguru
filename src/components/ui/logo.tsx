import React from 'react';
import Image from 'next/image';
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
    sm: 'w-10 h-10',
    md: 'w-14 h-14',
    lg: 'w-20 h-20',
    xl: 'w-28 h-28'
  };

  const imageSizes = {
    sm: 40,
    md: 56,
    lg: 80,
    xl: 112
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

  // Create base64 encoded logo based on the BoardGuru design
  const logoSvg = `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <style>
        .bg-circle { fill: #f5ede4; }
        .main-color { fill: #003d5c; stroke: #003d5c; }
        .no-fill { fill: none; stroke: #003d5c; stroke-width: 3; }
      </style>
    </defs>
    <!-- Background Circle -->
    <circle cx="100" cy="100" r="95" class="bg-circle"/>
    <!-- Outer Ring -->
    <circle cx="100" cy="100" r="90" class="no-fill"/>
    
    <!-- Head Circle -->
    <circle cx="100" cy="65" r="22" class="no-fill" stroke-width="4"/>
    
    <!-- Glasses - Two rectangles with bridge -->
    <rect x="75" y="58" width="18" height="14" rx="3" class="no-fill" stroke-width="3"/>
    <rect x="107" y="58" width="18" height="14" rx="3" class="no-fill" stroke-width="3"/>
    <line x1="93" y1="65" x2="107" y2="65" stroke="#003d5c" stroke-width="3"/>
    
    <!-- Body - Simplified suit shape -->
    <path d="M 60 100 C 60 95 65 92 70 90 L 80 88 C 90 86 100 86 100 86 C 100 86 110 86 120 88 L 130 90 C 135 92 140 95 140 100 L 140 150 C 140 155 135 160 130 160 L 70 160 C 65 160 60 155 60 150 Z" class="no-fill" stroke-width="4"/>
    
    <!-- Tie -->
    <polygon points="100,86 95,95 95,130 100,135 105,130 105,95" class="main-color"/>
    
    <!-- Collar lines -->
    <line x1="85" y1="86" x2="95" y2="95" stroke="#003d5c" stroke-width="3"/>
    <line x1="115" y1="86" x2="105" y2="95" stroke="#003d5c" stroke-width="3"/>
  </svg>`;

  const encodedLogo = `data:image/svg+xml;base64,${Buffer.from(logoSvg).toString('base64')}`;

  return (
    <div className={cn('flex items-center gap-3', className)}>
      {/* Logo Image */}
      <div className={cn(
        'relative flex items-center justify-center',
        sizeClasses[size]
      )}>
        <Image
          src={encodedLogo}
          alt="BoardGuru"
          width={imageSizes[size]}
          height={imageSizes[size]}
          className="w-full h-full object-contain"
          priority
        />
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