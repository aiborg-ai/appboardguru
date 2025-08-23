'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/features/shared/ui/button';
import { Linkedin, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LinkedInButtonProps {
  linkedinUrl: string;
  variant?: 'default' | 'outline' | 'ghost' | 'link';
  size?: 'sm' | 'default' | 'lg';
  showText?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export default function LinkedInButton({
  linkedinUrl,
  variant = 'outline',
  size = 'sm',
  showText = true,
  className,
  children
}: LinkedInButtonProps) {
  // Validate LinkedIn URL
  const isValidLinkedInUrl = linkedinUrl && (
    linkedinUrl.includes('linkedin.com/in/') || 
    linkedinUrl.includes('linkedin.com/company/') ||
    linkedinUrl.includes('linkedin.com/pub/')
  );

  if (!isValidLinkedInUrl) {
    return null;
  }

  const handleClick = (e: React.MouseEvent) => {
    // Track LinkedIn profile click analytics
    if (typeof window !== 'undefined' && 'gtag' in window) {
      (window as any).gtag('event', 'linkedin_profile_click', {
        event_category: 'boardmate_interaction',
        event_label: linkedinUrl
      });
    }
  };

  return (
    <Link 
      href={linkedinUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
    >
      <Button
        variant={variant}
        size={size}
        className={cn(
          "inline-flex items-center space-x-2 transition-colors duration-200",
          "hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300",
          "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
          className
        )}
      >
        <Linkedin className={cn(
          "text-blue-600",
          size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-6 w-6' : 'h-5 w-5'
        )} />
        {showText && (
          <span className="font-medium">
            {children || 'LinkedIn'}
          </span>
        )}
        <ExternalLink className={cn(
          "text-gray-400",
          size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'
        )} />
      </Button>
    </Link>
  );
}

// Utility function to validate and format LinkedIn URLs
export function validateLinkedInUrl(url: string): string | null {
  if (!url) return null;
  
  try {
    const urlObj = new URL(url);
    
    // Check if it's a LinkedIn domain
    if (!urlObj.hostname.includes('linkedin.com')) {
      return null;
    }
    
    // Ensure it starts with https
    urlObj.protocol = 'https:';
    
    // Common LinkedIn URL patterns
    const validPatterns = [
      '/in/',        // Personal profiles
      '/company/',   // Company pages
      '/pub/',       // Public profiles
      '/school/',    // School pages
    ];
    
    const hasValidPattern = validPatterns.some(pattern => 
      urlObj.pathname.includes(pattern)
    );
    
    if (!hasValidPattern) {
      return null;
    }
    
    return urlObj.toString();
  } catch (error) {
    return null;
  }
}

// Utility function to extract LinkedIn profile info
export function extractLinkedInInfo(url: string): {
  type: 'personal' | 'company' | 'school' | 'unknown';
  username?: string;
  companyName?: string;
} | null {
  if (!url) return null;
  
  try {
    const urlObj = new URL(url);
    
    if (urlObj.pathname.includes('/in/')) {
      const username = urlObj.pathname.split('/in/')[1]?.split('/')[0];
      return {
        type: 'personal',
        ...(username && { username })
      };
    }
    
    if (urlObj.pathname.includes('/company/')) {
      const companyName = urlObj.pathname.split('/company/')[1]?.split('/')[0];
      return {
        type: 'company',
        ...(companyName && { companyName: companyName.replace(/-/g, ' ') })
      };
    }
    
    if (urlObj.pathname.includes('/school/')) {
      return {
        type: 'school'
      };
    }
    
    return {
      type: 'unknown'
    };
  } catch (error) {
    return null;
  }
}