/**
 * Design Tokens Configuration
 * Based on DESIGN_SPEC.md - Single source of truth for design values
 */

export const DesignTokens = {
  // Color Palette
  colors: {
    primary: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      900: '#1e3a8a',
    },
    gray: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      500: '#6b7280',
      600: '#4b5563',
      900: '#111827',
    },
    semantic: {
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
    },
  },

  // Typography
  typography: {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontSize: {
      xs: '0.75rem', // 12px
      sm: '0.875rem', // 14px
      base: '1rem', // 16px
      lg: '1.125rem', // 18px
      xl: '1.25rem', // 20px
      '2xl': '1.5rem', // 24px
      '3xl': '1.875rem', // 30px
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
  },

  // Spacing (4px/8px grid)
  spacing: {
    1: '0.25rem', // 4px
    2: '0.5rem', // 8px
    3: '0.75rem', // 12px
    4: '1rem', // 16px
    6: '1.5rem', // 24px
    8: '2rem', // 32px
    12: '3rem', // 48px
  },

  // Border Radius
  borderRadius: {
    sm: '0.125rem', // 2px
    base: '0.25rem', // 4px
    md: '0.375rem', // 6px
    lg: '0.5rem', // 8px
    xl: '0.75rem', // 12px
    full: '9999px',
  },

  // Shadows
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    base: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  },

  // Transitions
  transitions: {
    default: 'all 0.2s ease',
    smooth: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    bounce: 'all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },

  // Breakpoints
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },

  // Z-Index Scale
  zIndex: {
    dropdown: 1000,
    sticky: 1020,
    fixed: 1030,
    modalBackdrop: 1040,
    modal: 1050,
    popover: 1060,
    tooltip: 1070,
  },
} as const

// Type exports for TypeScript
export type ColorPalette = typeof DesignTokens.colors
export type Typography = typeof DesignTokens.typography
export type Spacing = typeof DesignTokens.spacing
export type BorderRadius = typeof DesignTokens.borderRadius
export type Shadows = typeof DesignTokens.shadows
export type Transitions = typeof DesignTokens.transitions
export type Breakpoints = typeof DesignTokens.breakpoints
export type ZIndex = typeof DesignTokens.zIndex

// Utility functions
export const getColor = (path: string): string => {
  const keys = path.split('.')
  let value: any = DesignTokens.colors
  for (const key of keys) {
    value = value[key]
  }
  return value as string
}

export const getSpacing = (size: keyof typeof DesignTokens.spacing): string => {
  return DesignTokens.spacing[size]
}

export const getFontSize = (size: keyof typeof DesignTokens.typography.fontSize): string => {
  return DesignTokens.typography.fontSize[size]
}

export const getBorderRadius = (size: keyof typeof DesignTokens.borderRadius): string => {
  return DesignTokens.borderRadius[size]
}

export const getShadow = (size: keyof typeof DesignTokens.shadows): string => {
  return DesignTokens.shadows[size]
}

export const getTransition = (type: keyof typeof DesignTokens.transitions): string => {
  return DesignTokens.transitions[type]
}

export const getBreakpoint = (size: keyof typeof DesignTokens.breakpoints): string => {
  return DesignTokens.breakpoints[size]
}

export const getZIndex = (layer: keyof typeof DesignTokens.zIndex): number => {
  return DesignTokens.zIndex[layer]
}