/**
 * Navigation Service
 * Centralized navigation control with deep linking and push notification handling
 */

import { createNavigationContainerRef, StackActions, TabActions } from '@react-navigation/native';
import { Linking } from 'react-native';

import type { RootStackParamList } from '@/types/mobile';
import { createLogger } from '@/utils/logger';

const logger = createLogger('NavigationService');

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

class NavigationService {
  /**
   * Navigate to any screen with parameters
   */
  navigate<T extends keyof RootStackParamList>(
    screen: T,
    params?: RootStackParamList[T]
  ): void {
    if (navigationRef.isReady()) {
      logger.info('Navigating to screen', { screen, params });
      navigationRef.navigate(screen, params);
    } else {
      logger.warn('Navigation not ready', { screen });
    }
  }

  /**
   * Go back to previous screen
   */
  goBack(): void {
    if (navigationRef.isReady() && navigationRef.canGoBack()) {
      navigationRef.goBack();
    }
  }

  /**
   * Reset navigation stack to specific screen
   */
  reset<T extends keyof RootStackParamList>(
    screen: T,
    params?: RootStackParamList[T]
  ): void {
    if (navigationRef.isReady()) {
      logger.info('Resetting navigation to screen', { screen, params });
      navigationRef.reset({
        index: 0,
        routes: [{ name: screen, params }],
      });
    }
  }

  /**
   * Replace current screen with another
   */
  replace<T extends keyof RootStackParamList>(
    screen: T,
    params?: RootStackParamList[T]
  ): void {
    if (navigationRef.isReady()) {
      logger.info('Replacing screen', { screen, params });
      navigationRef.dispatch(StackActions.replace(screen, params));
    }
  }

  /**
   * Push screen onto stack
   */
  push<T extends keyof RootStackParamList>(
    screen: T,
    params?: RootStackParamList[T]
  ): void {
    if (navigationRef.isReady()) {
      logger.info('Pushing screen', { screen, params });
      navigationRef.dispatch(StackActions.push(screen, params));
    }
  }

  /**
   * Pop screens from stack
   */
  pop(count: number = 1): void {
    if (navigationRef.isReady()) {
      navigationRef.dispatch(StackActions.pop(count));
    }
  }

  /**
   * Jump to specific tab
   */
  jumpToTab(tabName: keyof TabParamList): void {
    if (navigationRef.isReady()) {
      logger.info('Jumping to tab', { tabName });
      navigationRef.dispatch(TabActions.jumpTo(tabName));
    }
  }

  /**
   * Get current route name
   */
  getCurrentRouteName(): string | undefined {
    if (navigationRef.isReady()) {
      return navigationRef.getCurrentRoute()?.name;
    }
    return undefined;
  }

  /**
   * Get current route params
   */
  getCurrentRouteParams(): any {
    if (navigationRef.isReady()) {
      return navigationRef.getCurrentRoute()?.params;
    }
    return undefined;
  }

  /**
   * Handle deep link navigation
   */
  handleDeepLink(url: string): boolean {
    try {
      logger.info('Handling deep link', { url });
      
      const parsedUrl = this.parseDeepLink(url);
      if (!parsedUrl) {
        logger.warn('Invalid deep link format', { url });
        return false;
      }

      const { screen, params } = parsedUrl;
      
      // Navigate to the appropriate screen based on deep link
      switch (screen) {
        case 'document':
          if (params.assetId) {
            this.navigate('DocumentViewer', {
              assetId: params.assetId,
              vaultId: params.vaultId,
              readOnly: params.readOnly === 'true',
            });
            return true;
          }
          break;

        case 'meeting':
          if (params.meetingId) {
            this.navigate('MeetingDetail', {
              meetingId: params.meetingId,
            });
            return true;
          }
          break;

        case 'voting':
          if (params.meetingId && params.sessionId) {
            this.navigate('VotingSession', {
              meetingId: params.meetingId,
              sessionId: params.sessionId,
            });
            return true;
          }
          break;

        case 'organization':
          if (params.organizationId) {
            this.navigate('OrganizationDetail', {
              organizationId: params.organizationId,
            });
            return true;
          }
          break;

        case 'dashboard':
          this.jumpToTab('Dashboard');
          return true;

        case 'meetings':
          this.jumpToTab('Meetings');
          return true;

        case 'documents':
          this.jumpToTab('Documents');
          return true;

        case 'notifications':
          this.jumpToTab('Notifications');
          return true;

        default:
          logger.warn('Unknown deep link screen', { screen });
          return false;
      }

      return false;
    } catch (error) {
      logger.error('Deep link handling failed', { error, url });
      return false;
    }
  }

  /**
   * Handle push notification navigation
   */
  handlePushNotification(data: {
    type: string;
    screen?: string;
    params?: Record<string, any>;
  }): void {
    try {
      logger.info('Handling push notification navigation', { data });

      switch (data.type) {
        case 'meeting_reminder':
        case 'meeting_update':
          if (data.params?.meetingId) {
            this.navigate('MeetingDetail', {
              meetingId: data.params.meetingId,
            });
          } else {
            this.jumpToTab('Meetings');
          }
          break;

        case 'document_shared':
        case 'document_updated':
          if (data.params?.assetId) {
            this.navigate('DocumentViewer', {
              assetId: data.params.assetId,
              vaultId: data.params.vaultId,
            });
          } else {
            this.jumpToTab('Documents');
          }
          break;

        case 'voting_reminder':
        case 'voting_opened':
          if (data.params?.meetingId && data.params?.sessionId) {
            this.navigate('VotingSession', {
              meetingId: data.params.meetingId,
              sessionId: data.params.sessionId,
            });
          } else if (data.params?.meetingId) {
            this.navigate('MeetingDetail', {
              meetingId: data.params.meetingId,
            });
          }
          break;

        case 'compliance_alert':
        case 'urgent_notification':
          this.jumpToTab('Notifications');
          break;

        default:
          if (data.screen && data.params) {
            this.navigate(data.screen as any, data.params);
          } else {
            this.jumpToTab('Dashboard');
          }
      }
    } catch (error) {
      logger.error('Push notification navigation failed', { error, data });
    }
  }

  /**
   * Navigate to document viewer
   */
  openDocument(assetId: string, vaultId?: string, readOnly?: boolean): void {
    this.navigate('DocumentViewer', {
      assetId,
      vaultId,
      readOnly,
    });
  }

  /**
   * Navigate to meeting details
   */
  openMeeting(meetingId: string): void {
    this.navigate('MeetingDetail', {
      meetingId,
    });
  }

  /**
   * Navigate to voting session
   */
  openVotingSession(meetingId: string, sessionId: string): void {
    this.navigate('VotingSession', {
      meetingId,
      sessionId,
    });
  }

  /**
   * Navigate to organization details
   */
  openOrganization(organizationId: string): void {
    this.navigate('OrganizationDetail', {
      organizationId,
    });
  }

  /**
   * Show error screen with retry option
   */
  showError(error: string, retry?: () => void): void {
    this.navigate('ErrorScreen', {
      error,
      retry,
    });
  }

  /**
   * Show offline mode screen
   */
  showOfflineMode(): void {
    this.navigate('OfflineMode');
  }

  /**
   * Navigate to settings
   */
  openSettings(): void {
    this.navigate('Settings');
  }

  /**
   * Navigate to security settings
   */
  openSecuritySettings(): void {
    this.navigate('SecuritySettings');
  }

  /**
   * Navigate to notification settings
   */
  openNotificationSettings(): void {
    this.navigate('NotificationSettings');
  }

  /**
   * Parse deep link URL
   */
  private parseDeepLink(url: string): { screen: string; params: Record<string, string> } | null {
    try {
      // Expected format: appboardguru://screen/param1/value1/param2/value2
      // Or: https://app.boardguru.ai/screen/param1/value1
      
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      
      if (pathParts.length === 0) {
        return null;
      }

      const screen = pathParts[0];
      const params: Record<string, string> = {};

      // Parse path parameters (param/value pairs)
      for (let i = 1; i < pathParts.length; i += 2) {
        if (i + 1 < pathParts.length) {
          params[pathParts[i]] = decodeURIComponent(pathParts[i + 1]);
        }
      }

      // Parse query parameters
      urlObj.searchParams.forEach((value, key) => {
        params[key] = value;
      });

      return { screen, params };
    } catch (error) {
      logger.error('Deep link parsing failed', { error, url });
      return null;
    }
  }

  /**
   * Generate deep link URL
   */
  generateDeepLink(screen: string, params?: Record<string, string>): string {
    let url = `appboardguru://${screen}`;
    
    if (params && Object.keys(params).length > 0) {
      const queryString = Object.entries(params)
        .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
        .join('&');
      url += `?${queryString}`;
    }
    
    return url;
  }

  /**
   * Open external URL
   */
  async openExternalUrl(url: string): Promise<boolean> {
    try {
      const supported = await Linking.canOpenURL(url);
      
      if (supported) {
        await Linking.openURL(url);
        logger.info('Opened external URL', { url });
        return true;
      } else {
        logger.warn('URL not supported', { url });
        return false;
      }
    } catch (error) {
      logger.error('Failed to open external URL', { error, url });
      return false;
    }
  }

  /**
   * Check if navigation is ready
   */
  isReady(): boolean {
    return navigationRef.isReady();
  }

  /**
   * Wait for navigation to be ready
   */
  async waitForReady(): Promise<void> {
    return new Promise((resolve) => {
      if (this.isReady()) {
        resolve();
      } else {
        const checkReady = () => {
          if (this.isReady()) {
            resolve();
          } else {
            setTimeout(checkReady, 10);
          }
        };
        checkReady();
      }
    });
  }
}

export const navigationService = new NavigationService();
export default navigationService;