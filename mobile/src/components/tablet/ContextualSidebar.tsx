/**
 * Contextual Sidebar Component
 * Collapsible sidebar with meeting context and navigation
 * Optimized for tablet interfaces with gesture support
 */

import React, { useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface SidebarSection {
  id: string;
  title: string;
  icon: string;
  items: SidebarItem[];
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

interface SidebarItem {
  id: string;
  label: string;
  icon?: string;
  badge?: number;
  onPress: () => void;
  active?: boolean;
  disabled?: boolean;
  color?: string;
  subtitle?: string;
}

interface ContextualSidebarProps {
  isOpen: boolean;
  width: number;
  onClose: () => void;
  content?: React.ReactNode;
  meetingId: string;
  animationValue: Animated.Value;
  sections?: SidebarSection[];
  showQuickActions?: boolean;
  allowGestureClose?: boolean;
}

export const ContextualSidebar: React.FC<ContextualSidebarProps> = ({
  isOpen,
  width,
  onClose,
  content,
  meetingId,
  animationValue,
  sections,
  showQuickActions = true,
  allowGestureClose = true,
}) => {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = Dimensions.get('window');
  
  // Default sidebar sections for board meetings
  const defaultSections: SidebarSection[] = useMemo(() => [
    {
      id: 'meeting-controls',
      title: 'Meeting Controls',
      icon: 'settings',
      items: [
        {
          id: 'start-recording',
          label: 'Start Recording',
          icon: 'fiber-manual-record',
          color: '#ef4444',
          onPress: () => console.log('Start recording'),
        },
        {
          id: 'share-screen',
          label: 'Share Screen',
          icon: 'screen-share',
          onPress: () => console.log('Share screen'),
        },
        {
          id: 'meeting-settings',
          label: 'Meeting Settings',
          icon: 'settings',
          onPress: () => console.log('Meeting settings'),
        },
      ],
    },
    {
      id: 'participants',
      title: 'Participants',
      icon: 'people',
      items: [
        {
          id: 'john-doe',
          label: 'John Doe',
          subtitle: 'Chairman',
          icon: 'person',
          active: true,
          onPress: () => console.log('Select participant'),
        },
        {
          id: 'jane-smith',
          label: 'Jane Smith',
          subtitle: 'Director',
          icon: 'person',
          onPress: () => console.log('Select participant'),
        },
        {
          id: 'bob-wilson',
          label: 'Bob Wilson',
          subtitle: 'CFO',
          icon: 'person',
          onPress: () => console.log('Select participant'),
        },
      ],
    },
    {
      id: 'documents',
      title: 'Meeting Documents',
      icon: 'folder',
      items: [
        {
          id: 'agenda',
          label: 'Meeting Agenda',
          icon: 'description',
          onPress: () => console.log('Open agenda'),
        },
        {
          id: 'board-pack',
          label: 'Board Pack',
          icon: 'folder-open',
          badge: 12,
          onPress: () => console.log('Open board pack'),
        },
        {
          id: 'previous-minutes',
          label: 'Previous Minutes',
          icon: 'history',
          onPress: () => console.log('Open previous minutes'),
        },
      ],
    },
    {
      id: 'voting',
      title: 'Active Votes',
      icon: 'how-to-vote',
      items: [
        {
          id: 'budget-approval',
          label: 'Budget Approval',
          subtitle: 'Ends in 5 min',
          icon: 'ballot',
          badge: 2,
          color: '#ef4444',
          onPress: () => console.log('View vote'),
        },
        {
          id: 'policy-update',
          label: 'Policy Update',
          subtitle: 'Draft',
          icon: 'how-to-vote',
          color: '#f59e0b',
          onPress: () => console.log('View vote'),
        },
      ],
    },
    {
      id: 'quick-actions',
      title: 'Quick Actions',
      icon: 'flash-on',
      items: [
        {
          id: 'take-note',
          label: 'Take Note',
          icon: 'note-add',
          onPress: () => console.log('Take note'),
        },
        {
          id: 'create-action',
          label: 'Create Action Item',
          icon: 'assignment',
          onPress: () => console.log('Create action item'),
        },
        {
          id: 'call-vote',
          label: 'Call for Vote',
          icon: 'how-to-vote',
          onPress: () => console.log('Call for vote'),
        },
      ],
    },
  ], []);

  const allSections = sections || defaultSections;
  const [expandedSections, setExpandedSections] = React.useState<Set<string>>(
    new Set(allSections.filter(s => s.defaultExpanded !== false).map(s => s.id))
  );

  // Handle section expand/collapse
  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  }, []);

  // Render sidebar item
  const renderSidebarItem = useCallback((item: SidebarItem) => (
    <TouchableOpacity
      key={item.id}
      style={[
        styles.sidebarItem,
        item.active && styles.sidebarItemActive,
        item.disabled && styles.sidebarItemDisabled,
      ]}
      onPress={item.onPress}
      disabled={item.disabled}
      accessibilityRole="button"
      accessibilityLabel={item.label}
    >
      <View style={styles.itemContent}>
        {item.icon && (
          <View style={styles.itemIconContainer}>
            <Icon
              name={item.icon}
              size={20}
              color={
                item.disabled ? '#94a3b8' :
                item.active ? '#3b82f6' :
                item.color || '#64748b'
              }
            />
            {item.badge && item.badge > 0 && (
              <View style={[styles.itemBadge, item.color && { backgroundColor: item.color }]}>
                <Text style={styles.itemBadgeText}>
                  {item.badge > 99 ? '99+' : item.badge.toString()}
                </Text>
              </View>
            )}
          </View>
        )}
        
        <View style={styles.itemText}>
          <Text
            style={[
              styles.itemLabel,
              item.active && styles.itemLabelActive,
              item.disabled && styles.itemLabelDisabled,
              item.color && { color: item.color },
            ]}
          >
            {item.label}
          </Text>
          {item.subtitle && (
            <Text style={styles.itemSubtitle}>{item.subtitle}</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  ), []);

  // Render sidebar section
  const renderSidebarSection = useCallback((section: SidebarSection) => {
    const isExpanded = expandedSections.has(section.id);
    
    return (
      <View key={section.id} style={styles.sidebarSection}>
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => section.collapsible !== false && toggleSection(section.id)}
          accessibilityRole="button"
          accessibilityLabel={`${section.title} section`}
        >
          <View style={styles.sectionHeaderContent}>
            <Icon name={section.icon} size={18} color="#475569" />
            <Text style={styles.sectionTitle}>{section.title}</Text>
          </View>
          {section.collapsible !== false && (
            <Icon
              name={isExpanded ? 'expand-less' : 'expand-more'}
              size={20}
              color="#64748b"
            />
          )}
        </TouchableOpacity>
        
        {isExpanded && (
          <View style={styles.sectionContent}>
            {section.items.map(renderSidebarItem)}
          </View>
        )}
      </View>
    );
  }, [expandedSections, toggleSection, renderSidebarItem]);

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <Animated.View
          style={[
            styles.backdrop,
            {
              opacity: animationValue,
            },
          ]}
        >
          <TouchableOpacity
            style={styles.backdropTouchable}
            onPress={allowGestureClose ? onClose : undefined}
            activeOpacity={1}
          />
        </Animated.View>
      )}

      {/* Sidebar */}
      <Animated.View
        style={[
          styles.sidebar,
          {
            width,
            transform: [
              {
                translateX: animationValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-width, 0],
                }),
              },
            ],
          },
        ]}
      >
        <View style={[styles.sidebarContent, { paddingTop: insets.top }]}>
          {/* Header */}
          <View style={styles.sidebarHeader}>
            <View style={styles.headerContent}>
              <Text style={styles.sidebarTitle}>Meeting Context</Text>
              <Text style={styles.sidebarSubtitle}>Board Meeting #{meetingId}</Text>
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close sidebar"
            >
              <Icon name="close" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView 
            style={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {content ? (
              content
            ) : (
              <View style={styles.sectionsContainer}>
                {allSections.map(renderSidebarSection)}
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={styles.sidebarFooter}>
            <TouchableOpacity style={styles.footerButton} onPress={() => console.log('Help')}>
              <Icon name="help-outline" size={20} color="#64748b" />
              <Text style={styles.footerButtonText}>Help</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.footerButton} onPress={() => console.log('Feedback')}>
              <Icon name="feedback" size={20} color="#64748b" />
              <Text style={styles.footerButtonText}>Feedback</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 100,
  },
  backdropTouchable: {
    flex: 1,
  },
  sidebar: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: '#ffffff',
    zIndex: 101,
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 16,
  },
  sidebarContent: {
    flex: 1,
  },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerContent: {
    flex: 1,
  },
  sidebarTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  sidebarSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
  },
  scrollContent: {
    flex: 1,
  },
  sectionsContainer: {
    paddingVertical: 8,
  },
  sidebarSection: {
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f8fafc',
  },
  sectionHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginLeft: 8,
  },
  sectionContent: {
    backgroundColor: '#ffffff',
  },
  sidebarItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sidebarItemActive: {
    backgroundColor: '#eff6ff',
    borderRightWidth: 3,
    borderRightColor: '#3b82f6',
  },
  sidebarItemDisabled: {
    opacity: 0.5,
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemIconContainer: {
    position: 'relative',
    marginRight: 12,
    width: 24,
    alignItems: 'center',
  },
  itemBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#ef4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  itemBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
  },
  itemText: {
    flex: 1,
  },
  itemLabel: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  itemLabelActive: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  itemLabelDisabled: {
    color: '#94a3b8',
  },
  itemSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  sidebarFooter: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  footerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  footerButtonText: {
    fontSize: 12,
    color: '#64748b',
    marginLeft: 4,
  },
});