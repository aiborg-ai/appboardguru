/**
 * Mobile List Component
 * High-performance list component optimized for governance data
 * Supports virtualization, pull-to-refresh, and enterprise features
 */

import React, { forwardRef, useCallback, useMemo } from 'react';
import {
  FlatList,
  FlatListProps,
  View,
  Text,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolate,
} from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import type { MobileComponentProps } from '../../types/mobile';
import { useThemeStore } from '../../stores/themeStore';
import { hapticFeedback } from '../../utils/haptics';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface MobileListItem {
  id: string;
  [key: string]: any;
}

interface MobileListProps<T extends MobileListItem>
  extends Omit<FlatListProps<T>, 'renderItem'>,
         MobileComponentProps {
  data: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  onItemPress?: (item: T, index: number) => void;
  onItemLongPress?: (item: T, index: number) => void;
  emptyStateTitle?: string;
  emptyStateMessage?: string;
  emptyStateIcon?: string;
  emptyStateAction?: {
    label: string;
    onPress: () => void;
  };
  loading?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  loadingMore?: boolean;
  onLoadMore?: () => void;
  hasMoreData?: boolean;
  itemSeparator?: boolean;
  itemSeparatorHeight?: number;
  animateItems?: boolean;
  hapticFeedback?: boolean;
  searchQuery?: string;
  filterFunction?: (item: T, query: string) => boolean;
  sortFunction?: (a: T, b: T) => number;
  groupByFunction?: (item: T) => string;
  estimatedItemSize?: number;
  maxToRenderPerBatch?: number;
  windowSize?: number;
  removeClippedSubviews?: boolean;
}

function MobileListComponent<T extends MobileListItem>(
  props: MobileListProps<T>,
  ref: React.Ref<FlatList<T>>
) {
  const {
    data,
    renderItem,
    onItemPress,
    onItemLongPress,
    emptyStateTitle = 'No items found',
    emptyStateMessage = 'There are no items to display at this time.',
    emptyStateIcon = 'inbox-outline',
    emptyStateAction,
    loading = false,
    refreshing = false,
    onRefresh,
    loadingMore = false,
    onLoadMore,
    hasMoreData = false,
    itemSeparator = true,
    itemSeparatorHeight = 1,
    animateItems = false,
    hapticFeedback: enableHaptic = true,
    searchQuery = '',
    filterFunction,
    sortFunction,
    groupByFunction,
    estimatedItemSize = 70,
    maxToRenderPerBatch = 10,
    windowSize = 10,
    removeClippedSubviews = true,
    testID,
    accessibilityLabel,
    ...flatListProps
  } = props;

  const { theme } = useThemeStore();
  const isDark = theme === 'dark';

  // Process data with filtering, sorting, and grouping
  const processedData = useMemo(() => {
    let result = [...data];

    // Apply search filter
    if (searchQuery && filterFunction) {
      result = result.filter(item => filterFunction(item, searchQuery));
    }

    // Apply sorting
    if (sortFunction) {
      result.sort(sortFunction);
    }

    // Apply grouping if needed
    if (groupByFunction) {
      const groups = result.reduce((acc, item) => {
        const groupKey = groupByFunction(item);
        if (!acc[groupKey]) {
          acc[groupKey] = [];
        }
        acc[groupKey].push(item);
        return acc;
      }, {} as Record<string, T[]>);

      // Flatten groups with headers
      result = Object.entries(groups).flatMap(([groupKey, items]) => [
        { id: `header-${groupKey}`, isHeader: true, title: groupKey } as any,
        ...items,
      ]);
    }

    return result;
  }, [data, searchQuery, filterFunction, sortFunction, groupByFunction]);

  // Handle item press with haptic feedback
  const handleItemPress = useCallback(async (item: T, index: number) => {
    if (!onItemPress) return;
    
    if (enableHaptic) {
      await hapticFeedback('light');
    }
    
    onItemPress(item, index);
  }, [onItemPress, enableHaptic]);

  // Handle item long press
  const handleItemLongPress = useCallback(async (item: T, index: number) => {
    if (!onItemLongPress) return;
    
    if (enableHaptic) {
      await hapticFeedback('medium');
    }
    
    onItemLongPress(item, index);
  }, [onItemLongPress, enableHaptic]);

  // Render list item with animation support
  const renderListItem = useCallback(({ item, index }: { item: T; index: number }) => {
    // Handle group headers
    if ((item as any).isHeader) {
      return (
        <View style={[styles.groupHeader, isDark && styles.groupHeaderDark]}>
          <Text style={[styles.groupHeaderText, isDark && styles.groupHeaderTextDark]}>
            {(item as any).title}
          </Text>
        </View>
      );
    }

    const itemOpacity = useSharedValue(animateItems ? 0 : 1);
    const itemTranslateY = useSharedValue(animateItems ? 20 : 0);

    // Animate item entry
    React.useEffect(() => {
      if (animateItems) {
        itemOpacity.value = withSpring(1, { damping: 15, stiffness: 300 });
        itemTranslateY.value = withSpring(0, { damping: 15, stiffness: 300 });
      }
    }, []);

    const animatedItemStyle = useAnimatedStyle(() => ({
      opacity: itemOpacity.value,
      transform: [{ translateY: itemTranslateY.value }],
    }));

    const ItemWrapper = onItemPress || onItemLongPress ? TouchableOpacity : View;
    const itemProps = onItemPress || onItemLongPress ? {
      onPress: () => handleItemPress(item, index),
      onLongPress: onItemLongPress ? () => handleItemLongPress(item, index) : undefined,
      activeOpacity: 0.7,
      accessibilityRole: 'button' as const,
    } : {};

    return (
      <Animated.View style={animateItems ? animatedItemStyle : undefined}>
        <ItemWrapper style={styles.itemWrapper} {...itemProps}>
          {renderItem(item, index)}
        </ItemWrapper>
      </Animated.View>
    );
  }, [
    renderItem,
    onItemPress,
    onItemLongPress,
    handleItemPress,
    handleItemLongPress,
    animateItems,
    isDark,
  ]);

  // Render item separator
  const renderItemSeparator = useCallback(() => {
    if (!itemSeparator) return null;
    
    return (
      <View
        style={[
          styles.separator,
          {
            height: itemSeparatorHeight,
            backgroundColor: isDark ? '#374151' : '#F3F4F6',
          },
        ]}
      />
    );
  }, [itemSeparator, itemSeparatorHeight, isDark]);

  // Render empty state
  const renderEmptyComponent = useCallback(() => {
    if (loading) return null;
    
    return (
      <View style={styles.emptyState}>
        <Icon
          name={emptyStateIcon}
          size={64}
          color={isDark ? '#6B7280' : '#9CA3AF'}
          style={styles.emptyIcon}
        />
        <Text style={[styles.emptyTitle, isDark && styles.emptyTitleDark]}>
          {emptyStateTitle}
        </Text>
        <Text style={[styles.emptyMessage, isDark && styles.emptyMessageDark]}>
          {emptyStateMessage}
        </Text>
        {emptyStateAction && (
          <TouchableOpacity
            style={[styles.emptyAction, isDark && styles.emptyActionDark]}
            onPress={emptyStateAction.onPress}
            accessibilityRole="button"
            accessibilityLabel={emptyStateAction.label}
          >
            <Text style={[styles.emptyActionText, isDark && styles.emptyActionTextDark]}>
              {emptyStateAction.label}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }, [
    loading,
    emptyStateIcon,
    emptyStateTitle,
    emptyStateMessage,
    emptyStateAction,
    isDark,
  ]);

  // Render footer with load more indicator
  const renderFooterComponent = useCallback(() => {
    if (!loadingMore && !hasMoreData) return null;
    
    return (
      <View style={styles.footer}>
        {loadingMore ? (
          <ActivityIndicator
            size="small"
            color={isDark ? '#60A5FA' : '#3B82F6'}
            accessibilityLabel="Loading more items"
          />
        ) : hasMoreData ? (
          <TouchableOpacity
            style={[styles.loadMoreButton, isDark && styles.loadMoreButtonDark]}
            onPress={onLoadMore}
            accessibilityRole="button"
            accessibilityLabel="Load more items"
          >
            <Text style={[styles.loadMoreText, isDark && styles.loadMoreTextDark]}>
              Load More
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  }, [loadingMore, hasMoreData, onLoadMore, isDark]);

  // Handle scroll to end
  const handleEndReached = useCallback(() => {
    if (hasMoreData && !loadingMore && onLoadMore) {
      onLoadMore();
    }
  }, [hasMoreData, loadingMore, onLoadMore]);

  // Optimized getItemLayout for performance
  const getItemLayout = useCallback((data: any, index: number) => ({
    length: estimatedItemSize,
    offset: estimatedItemSize * index,
    index,
  }), [estimatedItemSize]);

  // Key extractor
  const keyExtractor = useCallback((item: T) => item.id, []);

  if (loading && processedData.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator
          size="large"
          color={isDark ? '#60A5FA' : '#3B82F6'}
          accessibilityLabel="Loading list data"
        />
        <Text style={[styles.loadingText, isDark && styles.loadingTextDark]}>
          Loading...
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      ref={ref}
      data={processedData}
      renderItem={renderListItem}
      keyExtractor={keyExtractor}
      ItemSeparatorComponent={renderItemSeparator}
      ListEmptyComponent={renderEmptyComponent}
      ListFooterComponent={renderFooterComponent}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={isDark ? '#60A5FA' : '#3B82F6'}
            colors={[isDark ? '#60A5FA' : '#3B82F6']}
            progressBackgroundColor={isDark ? '#374151' : '#FFFFFF'}
          />
        ) : undefined
      }
      onEndReached={handleEndReached}
      onEndReachedThreshold={0.5}
      getItemLayout={getItemLayout}
      maxToRenderPerBatch={maxToRenderPerBatch}
      windowSize={windowSize}
      removeClippedSubviews={removeClippedSubviews}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      bounces={Platform.OS === 'ios'}
      overScrollMode={Platform.OS === 'android' ? 'never' : 'auto'}
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      {...flatListProps}
    />
  );
}

const MobileList = forwardRef(MobileListComponent) as <T extends MobileListItem>(
  props: MobileListProps<T> & { ref?: React.Ref<FlatList<T>> }
) => React.ReactElement;

const styles = StyleSheet.create({
  itemWrapper: {
    overflow: 'hidden',
  },
  separator: {
    height: 1,
    backgroundColor: '#F3F4F6',
  },
  
  // Group header styles
  groupHeader: {
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  groupHeaderDark: {
    backgroundColor: '#374151',
    borderBottomColor: '#4B5563',
  },
  groupHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  groupHeaderTextDark: {
    color: '#9CA3AF',
  },

  // Loading states
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
  },
  loadingTextDark: {
    color: '#9CA3AF',
  },

  // Empty state styles
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    minHeight: SCREEN_HEIGHT * 0.3,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyTitleDark: {
    color: '#F9FAFB',
  },
  emptyMessage: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  emptyMessageDark: {
    color: '#9CA3AF',
  },
  emptyAction: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyActionDark: {
    backgroundColor: '#60A5FA',
  },
  emptyActionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyActionTextDark: {
    color: '#FFFFFF',
  },

  // Footer styles
  footer: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadMoreButton: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  loadMoreButtonDark: {
    backgroundColor: '#374151',
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3B82F6',
  },
  loadMoreTextDark: {
    color: '#60A5FA',
  },
});

export { MobileList };
export type { MobileListProps, MobileListItem };