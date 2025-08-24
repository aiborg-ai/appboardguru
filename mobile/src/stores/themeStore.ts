/**
 * Theme Store
 * Mobile theme management with system theme detection
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useColorScheme, Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { MobileTheme } from '@/types/mobile';
import { createLogger } from '@/utils/logger';

const logger = createLogger('ThemeStore');

export interface ThemeState {
  // Theme settings
  theme: MobileTheme;
  systemTheme: 'light' | 'dark';
  effectiveTheme: 'light' | 'dark';
  
  // UI preferences
  reducedMotion: boolean;
  highContrast: boolean;
  textSize: 'small' | 'normal' | 'large' | 'extra-large';
  
  // Actions
  setTheme: (theme: MobileTheme) => void;
  setReducedMotion: (enabled: boolean) => void;
  setHighContrast: (enabled: boolean) => void;
  setTextSize: (size: ThemeState['textSize']) => void;
  
  // Internal
  _updateSystemTheme: (systemTheme: 'light' | 'dark') => void;
  _initialize: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      // Initial state
      theme: 'system',
      systemTheme: 'light',
      effectiveTheme: 'light',
      reducedMotion: false,
      highContrast: false,
      textSize: 'normal',

      // Set theme
      setTheme: (theme: MobileTheme) => {
        logger.info('Setting theme', { theme });
        set({ theme });
        get()._updateEffectiveTheme();
      },

      // Set reduced motion
      setReducedMotion: (reducedMotion: boolean) => {
        logger.info('Setting reduced motion', { reducedMotion });
        set({ reducedMotion });
      },

      // Set high contrast
      setHighContrast: (highContrast: boolean) => {
        logger.info('Setting high contrast', { highContrast });
        set({ highContrast });
      },

      // Set text size
      setTextSize: (textSize: ThemeState['textSize']) => {
        logger.info('Setting text size', { textSize });
        set({ textSize });
      },

      // Update system theme
      _updateSystemTheme: (systemTheme: 'light' | 'dark') => {
        set({ systemTheme });
        get()._updateEffectiveTheme();
      },

      // Update effective theme
      _updateEffectiveTheme: () => {
        const { theme, systemTheme } = get();
        const effectiveTheme = theme === 'system' ? systemTheme : theme;
        set({ effectiveTheme });
        logger.debug('Effective theme updated', { theme, systemTheme, effectiveTheme });
      },

      // Initialize theme store
      _initialize: () => {
        logger.info('Initializing theme store');
        
        // Get initial system theme
        const systemTheme = Appearance.getColorScheme() || 'light';
        get()._updateSystemTheme(systemTheme);
        
        // Listen for system theme changes
        const subscription = Appearance.addChangeListener(({ colorScheme }) => {
          const newSystemTheme = colorScheme || 'light';
          get()._updateSystemTheme(newSystemTheme);
        });

        // Cleanup function would be needed in a real app
        // return () => subscription?.remove();
      },
    }),
    {
      name: 'theme-store',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        // Initialize after rehydration
        if (state) {
          state._initialize();
        }
      },
    }
  )
);

// Hook for easy theme access
export const useTheme = () => {
  const { effectiveTheme, theme, highContrast, textSize, reducedMotion } = useThemeStore();
  
  return {
    theme: effectiveTheme,
    isDark: effectiveTheme === 'dark',
    isLight: effectiveTheme === 'light',
    themePreference: theme,
    highContrast,
    textSize,
    reducedMotion,
  };
};