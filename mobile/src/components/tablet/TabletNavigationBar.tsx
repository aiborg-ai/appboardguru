/**
 * Tablet Navigation Bar Component
 * Horizontal navigation optimized for tablet interfaces
 * Supports both iPad and Android tablet navigation patterns
 */

import React, { useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface NavigationItem {
  id: string;
  label: string;
  icon: string;
  badge?: number;
  onPress: () => void;
  disabled?: boolean;
  color?: string;
}

interface TabletNavigationBarProps {
  onMenuPress: () => void;
  onActionPress: () => void;
  meetingId: string;
  organizationId: string;
  layout: 'split' | 'single';
  navigationItems?: NavigationItem[];
  title?: string;
  subtitle?: string;
  showBreadcrumb?: boolean;
  actions?: Array<{
    id: string;
    icon: string;
    onPress: () => void;
    color?: string;
    disabled?: boolean;
  }>;
}

export const TabletNavigationBar: React.FC<TabletNavigationBarProps> = ({
  onMenuPress,
  onActionPress,
  meetingId,
  organizationId,
  layout,
  navigationItems = [],
  title = "Board Meeting",
  subtitle,
  showBreadcrumb = true,
  actions = [],
}) => {
  const insets = useSafeAreaInsets();
  const { width } = Dimensions.get('window');
  const isTablet = width >= 768;
  const isLargeTablet = width >= 1024;

  // Default navigation items for board meetings
  const defaultNavigationItems: NavigationItem[] = useMemo(() => [
    {
      id: 'agenda',
      label: 'Agenda',
      icon: 'list-alt',
      onPress: () => console.log('Navigate to agenda'),
    },
    {
      id: 'participants',
      label: 'Participants',
      icon: 'people',
      badge: 8,
      onPress: () => console.log('Navigate to participants'),
    },
    {
      id: 'documents',
      label: 'Documents',
      icon: 'folder',
      onPress: () => console.log('Navigate to documents'),
    },
    {
      id: 'voting',
      label: 'Voting',
      icon: 'how-to-vote',
      badge: 2,
      color: '#ef4444',
      onPress: () => console.log('Navigate to voting'),
    },
    {
      id: 'minutes',
      label: 'Minutes',
      icon: 'description',
      onPress: () => console.log('Navigate to minutes'),
    },
    {
      id: 'actions',
      label: 'Actions',
      icon: 'assignment',
      badge: 5,
      color: '#f59e0b',
      onPress: () => console.log('Navigate to actions'),
    },
  ], []);

  // Default action items
  const defaultActions = useMemo(() => [
    {
      id: 'search',
      icon: 'search',
      onPress: () => console.log('Search'),
    },
    {
      id: 'share',
      icon: 'share',
      onPress: () => console.log('Share'),
    },
    {
      id: 'settings',
      icon: 'settings',
      onPress: () => console.log('Settings'),
    },
  ], []);

  const allNavigationItems = navigationItems.length > 0 ? navigationItems : defaultNavigationItems;
  const allActions = [...actions, ...defaultActions];

  // Breadcrumb component
  const renderBreadcrumb = useCallback(() => {
    if (!showBreadcrumb) return null;

    return (
      <View style={styles.breadcrumb}>
        <TouchableOpacity style={styles.breadcrumbItem}>
          <Text style={styles.breadcrumbText}>BoardGuru</Text>
        </TouchableOpacity>
        <Icon name="chevron-right" size={16} color="#64748b" />
        <TouchableOpacity style={styles.breadcrumbItem}>
          <Text style={styles.breadcrumbText}>Meetings</Text>
        </TouchableOpacity>
        <Icon name="chevron-right" size={16} color="#64748b" />
        <Text style={[styles.breadcrumbText, styles.breadcrumbCurrent]}>{title}</Text>
      </View>
    );
  }, [showBreadcrumb, title]);

  // Navigation item component
  const renderNavigationItem = useCallback((item: NavigationItem) => (
    <TouchableOpacity
      key={item.id}
      style={[
        styles.navItem,
        item.disabled && styles.navItemDisabled,
      ]}
      onPress={item.onPress}
      disabled={item.disabled}
      accessibilityLabel={item.label}
      accessibilityRole="button"
    >
      <View style={styles.navItemIcon}>
        <Icon
          name={item.icon}
          size={24}
          color={item.disabled ? '#94a3b8' : (item.color || '#475569')}
        />
        {item.badge && item.badge > 0 && (
          <View style={[styles.badge, item.color && { backgroundColor: item.color }]}>
            <Text style={styles.badgeText}>
              {item.badge > 99 ? '99+' : item.badge.toString()}
            </Text>
          </View>
        )}
      </View>
      <Text
        style={[
          styles.navItemLabel,
          item.disabled && styles.navItemLabelDisabled,
          item.color && { color: item.color },
        ]}
      >
        {item.label}
      </Text>
    </TouchableOpacity>
  ), []);

  // Action button component
  const renderActionButton = useCallback((action: typeof allActions[0]) => (
    <TouchableOpacity
      key={action.id}
      style={[
        styles.actionButton,
        action.disabled && styles.actionButtonDisabled,
      ]}
      onPress={action.onPress}
      disabled={action.disabled}
      accessibilityRole="button"
    >
      <Icon
        name={action.icon}
        size={24}
        color={action.disabled ? '#94a3b8' : (action.color || '#64748b')}
      />
    </TouchableOpacity>
  ), []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Top Row - Title and Actions */}
      <View style={styles.topRow}>
        <View style={styles.titleSection}>
          {/* Menu Button (for sidebar) */}
          <TouchableOpacity
            style={styles.menuButton}
            onPress={onMenuPress}
            accessibilityLabel="Open menu"
            accessibilityRole="button"
          >
            <Icon name="menu" size={24} color="#475569" />
          </TouchableOpacity>

          {/* Title and Subtitle */}
          <View style={styles.titleContainer}>
            {renderBreadcrumb()}
            <View style={styles.titleGroup}>
              <Text style={styles.title}>{title}</Text>
              {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsSection}>
          {allActions.map(renderActionButton)}
          
          {/* Layout Toggle for Split View */}
          {isTablet && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={onActionPress}
              accessibilityLabel={`Switch to ${layout === 'split' ? 'single' : 'split'} view`}
              accessibilityRole="button"
            >
              <Icon
                name={layout === 'split' ? 'view-agenda' : 'view-column'}
                size={24}
                color="#64748b"
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Navigation Items Row */}
      <View style={styles.navigationRow}>
        <View style={styles.navigationContainer}>
          {allNavigationItems.map(renderNavigationItem)}
        </View>
      </View>

      {/* Meeting Status Indicator */}
      <View style={styles.statusIndicator}>
        <View style={[styles.statusDot, { backgroundColor: '#22c55e' }]} />
        <Text style={styles.statusText}>Meeting in Progress</Text>
        <Text style={styles.statusTime}>45 min</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  titleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuButton: {
    padding: 8,
    marginRight: 12,
  },
  titleContainer: {
    flex: 1,
  },
  breadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  breadcrumbItem: {
    marginRight: 4,
  },
  breadcrumbText: {
    fontSize: 12,
    color: '#64748b',
  },
  breadcrumbCurrent: {
    color: '#1e293b',
    fontWeight: '500',
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginRight: 12,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
  },
  actionsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  navigationRow: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingVertical: 8,
  },
  navigationContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 4,
  },
  navItem: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    minWidth: 80,
  },
  navItemDisabled: {
    opacity: 0.5,
  },
  navItemIcon: {
    position: 'relative',
    marginBottom: 4,
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -8,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
  },
  navItemLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#475569',
    textAlign: 'center',
  },
  navItemLabelDisabled: {
    color: '#94a3b8',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f8fafc',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 12,
    color: '#475569',
    flex: 1,
  },
  statusTime: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
});