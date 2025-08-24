/**
 * Haptic Feedback Utilities
 * Enterprise-grade haptic feedback system for mobile interactions
 * Provides consistent tactile feedback across governance workflows
 */

import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { HapticFeedbackTypes } from 'react-native';

// Haptic feedback types
export type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection';

/**
 * Unified haptic feedback function that works across platforms
 */
export const hapticFeedback = async (type: HapticType = 'light'): Promise<void> => {
  try {
    if (Platform.OS === 'ios') {
      // iOS uses Expo Haptics for richer feedback
      switch (type) {
        case 'light':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case 'medium':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case 'heavy':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          break;
        case 'success':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
        case 'warning':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          break;
        case 'error':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          break;
        case 'selection':
          await Haptics.selectionAsync();
          break;
        default:
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } else if (Platform.OS === 'android') {
      // Android uses React Native's built-in haptic feedback
      const { HapticFeedback } = require('react-native');
      
      switch (type) {
        case 'light':
          HapticFeedback.trigger('impactLight');
          break;
        case 'medium':
          HapticFeedback.trigger('impactMedium');
          break;
        case 'heavy':
          HapticFeedback.trigger('impactHeavy');
          break;
        case 'success':
          HapticFeedback.trigger('notificationSuccess');
          break;
        case 'warning':
          HapticFeedback.trigger('notificationWarning');
          break;
        case 'error':
          HapticFeedback.trigger('notificationError');
          break;
        case 'selection':
          HapticFeedback.trigger('selection');
          break;
        default:
          HapticFeedback.trigger('impactLight');
      }
    }
  } catch (error) {
    // Haptic feedback is not critical, so we silently fail
    console.warn('Haptic feedback failed:', error);
  }
};

/**
 * Governance-specific haptic feedback patterns
 */
export const governanceHaptics = {
  // Voting interactions
  voteSubmitted: () => hapticFeedback('success'),
  voteChanged: () => hapticFeedback('medium'),
  votingSessionStarted: () => hapticFeedback('heavy'),
  votingSessionEnded: () => hapticFeedback('success'),

  // Meeting interactions
  meetingJoined: () => hapticFeedback('medium'),
  meetingEnded: () => hapticFeedback('light'),
  agendaItemComplete: () => hapticFeedback('success'),

  // Document interactions
  documentOpened: () => hapticFeedback('light'),
  documentDownloaded: () => hapticFeedback('success'),
  annotationCreated: () => hapticFeedback('medium'),
  annotationDeleted: () => hapticFeedback('warning'),

  // Navigation interactions
  tabChanged: () => hapticFeedback('selection'),
  screenOpened: () => hapticFeedback('light'),
  modalOpened: () => hapticFeedback('light'),
  modalClosed: () => hapticFeedback('light'),

  // Action feedback
  actionCompleted: () => hapticFeedback('success'),
  actionFailed: () => hapticFeedback('error'),
  actionCancelled: () => hapticFeedback('light'),

  // Alert interactions
  notificationReceived: () => hapticFeedback('medium'),
  urgentAlert: () => hapticFeedback('heavy'),
  errorOccurred: () => hapticFeedback('error'),

  // Form interactions
  formSubmitted: () => hapticFeedback('success'),
  formError: () => hapticFeedback('error'),
  fieldFocused: () => hapticFeedback('light'),
  fieldCompleted: () => hapticFeedback('light'),
};

/**
 * Haptic feedback for specific governance workflows
 */
export const workflowHaptics = {
  // Board pack workflow
  boardPackUploaded: async () => {
    await hapticFeedback('medium');
    setTimeout(() => hapticFeedback('success'), 100);
  },

  // Meeting workflow
  meetingStarted: async () => {
    await hapticFeedback('heavy');
    setTimeout(() => hapticFeedback('light'), 150);
  },

  // Voting workflow
  voteSequence: async () => {
    await hapticFeedback('light');
    setTimeout(() => hapticFeedback('medium'), 100);
    setTimeout(() => hapticFeedback('success'), 250);
  },

  // Security actions
  biometricSuccess: async () => {
    await hapticFeedback('success');
  },
  
  biometricFailure: async () => {
    await hapticFeedback('error');
    setTimeout(() => hapticFeedback('error'), 100);
  },

  // Critical alerts
  emergencyAlert: async () => {
    await hapticFeedback('heavy');
    setTimeout(() => hapticFeedback('heavy'), 150);
    setTimeout(() => hapticFeedback('heavy'), 300);
  },
};

/**
 * Check if haptic feedback is available on the current device
 */
export const isHapticFeedbackAvailable = (): boolean => {
  if (Platform.OS === 'ios') {
    // iOS devices generally support haptic feedback from iPhone 6s onwards
    return true;
  }
  
  if (Platform.OS === 'android') {
    // Android support varies by device and API level
    try {
      const { HapticFeedback } = require('react-native');
      return !!HapticFeedback;
    } catch {
      return false;
    }
  }
  
  return false;
};

/**
 * Configure haptic feedback settings for the app
 */
export interface HapticSettings {
  enabled: boolean;
  intensity: 'light' | 'medium' | 'heavy';
  governanceActionsOnly: boolean;
}

let hapticSettings: HapticSettings = {
  enabled: true,
  intensity: 'medium',
  governanceActionsOnly: false,
};

export const configureHaptics = (settings: Partial<HapticSettings>): void => {
  hapticSettings = { ...hapticSettings, ...settings };
};

export const getHapticSettings = (): HapticSettings => hapticSettings;

/**
 * Haptic feedback wrapper that respects user settings
 */
export const conditionalHapticFeedback = async (type: HapticType = 'light'): Promise<void> => {
  if (!hapticSettings.enabled || !isHapticFeedbackAvailable()) {
    return;
  }

  // Adjust intensity based on settings
  let adjustedType = type;
  if (hapticSettings.intensity === 'light' && type === 'heavy') {
    adjustedType = 'medium';
  } else if (hapticSettings.intensity === 'heavy' && type === 'light') {
    adjustedType = 'medium';
  }

  await hapticFeedback(adjustedType);
};