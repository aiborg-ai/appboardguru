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
  showText = false,
  variant = 'default' 
}: LogoProps) {
  // Size configurations for the logo image
  const sizeConfigs = {
    sm: { width: 120, height: 120 },
    md: { width: 180, height: 180 },
    lg: { width: 240, height: 240 },
    xl: { width: 320, height: 320 }
  };

  return (
    <div className={cn('flex items-center', className)}>
      {/* Logo Image - Using the actual BoardGuru logo as-is */}
      <Image
        src="/boardguru-logo.png"
        alt="BoardGuru"
        width={sizeConfigs[size].width}
        height={sizeConfigs[size].height}
        className="object-contain"
        priority
      />
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
      <Logo size={size} showText={false} variant={variant} />
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