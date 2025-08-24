/**
 * Recent Assets Card Component
 * Dashboard component showing recently accessed governance documents
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { MobileCard } from '../ui/MobileCard';
import { MobileButton } from '../ui/MobileButton';
import { useThemeStore } from '../../stores/themeStore';
import { hapticFeedback } from '../../utils/haptics';

interface Asset {
  asset_id: string;
  vault_id?: string;
  file_name: string;
  original_file_name: string;
  file_size: number;
  mime_type: string;
  processing_status?: string;
  updated_at: number;
  last_viewed?: number;
  is_downloaded: boolean;
  is_favorite: boolean;
  tags?: string;
}

interface RecentAssetsCardProps {
  assets: Asset[];
  onAssetPress?: (assetId: string, vaultId?: string) => void;
  onViewAllPress?: () => void;
  testID?: string;
}

export const RecentAssetsCard: React.FC<RecentAssetsCardProps> = ({
  assets,
  onAssetPress,
  onViewAllPress,
  testID,
}) => {
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';

  // Handle asset press
  const handleAssetPress = useCallback(async (assetId: string, vaultId?: string) => {
    if (!onAssetPress) return;
    
    await hapticFeedback('light');
    onAssetPress(assetId, vaultId);
  }, [onAssetPress]);

  // Get file type icon
  const getFileTypeIcon = useCallback((mimeType: string, fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    if (mimeType.includes('pdf') || extension === 'pdf') {
      return 'file-pdf-box';
    }
    if (mimeType.includes('word') || ['doc', 'docx'].includes(extension || '')) {
      return 'file-word-box';
    }
    if (mimeType.includes('excel') || ['xls', 'xlsx'].includes(extension || '')) {
      return 'file-excel-box';
    }
    if (mimeType.includes('powerpoint') || ['ppt', 'pptx'].includes(extension || '')) {
      return 'file-powerpoint-box';
    }
    if (mimeType.includes('image')) {
      return 'file-image';
    }
    if (mimeType.includes('video')) {
      return 'file-video';
    }
    if (mimeType.includes('audio')) {
      return 'file-music';
    }
    return 'file-document';
  }, []);

  // Format file size
  const formatFileSize = useCallback((bytes: number) => {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }, []);

  // Format relative time for last viewed
  const formatLastViewed = useCallback((timestamp?: number) => {
    if (!timestamp) return 'Never viewed';
    
    const now = Date.now();
    const diff = now - timestamp;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (hours < 1) return 'Recently viewed';
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
  }, []);

  // Check if document is newly updated
  const isNewlyUpdated = useCallback((asset: Asset) => {
    if (!asset.last_viewed) return true;
    return asset.updated_at > asset.last_viewed;
  }, []);

  // Render individual asset item
  const renderAssetItem = useCallback((asset: Asset, index: number) => {
    const fileIcon = getFileTypeIcon(asset.mime_type, asset.file_name);
    const isNew = isNewlyUpdated(asset);
    const tags = asset.tags ? JSON.parse(asset.tags) : [];

    return (
      <TouchableOpacity
        key={asset.asset_id}
        style={[
          styles.assetItem,
          isDark && styles.assetItemDark,
          index > 0 && styles.assetItemBorder,
          isNew && styles.assetItemNew,
        ]}
        onPress={() => handleAssetPress(asset.asset_id, asset.vault_id)}
        accessibilityRole="button"
        accessibilityLabel={`Document: ${asset.original_file_name}`}
        accessibilityHint={`${formatFileSize(asset.file_size)}, ${formatLastViewed(asset.last_viewed)}`}
        testID={`${testID}-asset-${asset.asset_id}`}
      >
        {/* New Update Indicator */}
        {isNew && <View style={styles.newIndicator} />}

        {/* File Icon */}
        <View style={styles.fileIconContainer}>
          <Icon
            name={fileIcon}
            size={32}
            color={isDark ? '#60A5FA' : '#3B82F6'}
          />
          
          {/* Download Status */}
          {asset.is_downloaded && (
            <View style={styles.downloadBadge}>
              <Icon
                name="download"
                size={12}
                color="#10B981"
              />
            </View>
          )}
          
          {/* Favorite Status */}
          {asset.is_favorite && (
            <View style={styles.favoriteBadge}>
              <Icon
                name="heart"
                size={12}
                color="#DC2626"
              />
            </View>
          )}
        </View>

        {/* Asset Details */}
        <View style={styles.assetDetails}>
          <Text 
            style={[styles.fileName, isDark && styles.fileNameDark]}
            numberOfLines={1}
          >
            {asset.original_file_name}
          </Text>

          <View style={styles.assetMeta}>
            <Text style={[styles.fileSize, isDark && styles.fileSizeDark]}>
              {formatFileSize(asset.file_size)}
            </Text>
            
            <Text style={[styles.separator, isDark && styles.separatorDark]}>
              •
            </Text>
            
            <Text style={[styles.lastViewed, isDark && styles.lastViewedDark]}>
              {formatLastViewed(asset.last_viewed)}
            </Text>
          </View>

          {/* Tags */}
          {tags.length > 0 && (
            <View style={styles.tags}>
              {tags.slice(0, 2).map((tag: string, tagIndex: number) => (
                <View key={tagIndex} style={styles.tag}>
                  <Text style={[styles.tagText, isDark && styles.tagTextDark]}>
                    {tag}
                  </Text>
                </View>
              ))}
              {tags.length > 2 && (
                <Text style={[styles.moreTagsText, isDark && styles.moreTagsTextDark]}>
                  +{tags.length - 2}
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Action Arrow */}
        <Icon
          name="chevron-right"
          size={20}
          color={isDark ? '#6B7280' : '#9CA3AF'}
          style={styles.actionArrow}
        />
      </TouchableOpacity>
    );
  }, [
    getFileTypeIcon,
    isNewlyUpdated,
    formatFileSize,
    formatLastViewed,
    handleAssetPress,
    isDark,
    testID,
  ]);

  if (assets.length === 0) {
    return null;
  }

  return (
    <MobileCard
      variant="default"
      padding="large"
      testID={testID}
      accessibilityRole="group"
      accessibilityLabel="Recent documents"
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={[styles.cardTitle, isDark && styles.cardTitleDark]}>
            Recent Documents
          </Text>
          <Text style={[styles.cardSubtitle, isDark && styles.cardSubtitleDark]}>
            Recently accessed files
          </Text>
        </View>
        
        <Icon
          name="file-document-multiple-outline"
          size={24}
          color={isDark ? '#60A5FA' : '#3B82F6'}
        />
      </View>

      {/* Assets List */}
      <View style={styles.assetsList}>
        {assets.map((asset, index) => renderAssetItem(asset, index))}
      </View>

      {/* View All Button */}
      {onViewAllPress && (
        <MobileButton
          title="View All Documents"
          variant="ghost"
          size="medium"
          onPress={onViewAllPress}
          icon="folder-open-outline"
          style={styles.viewAllButton}
          testID={`${testID}-view-all`}
        />
      )}
    </MobileCard>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 24,
  },
  cardTitleDark: {
    color: '#F9FAFB',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
    lineHeight: 18,
  },
  cardSubtitleDark: {
    color: '#9CA3AF',
  },

  assetsList: {
    gap: 0,
  },

  assetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 8,
    position: 'relative',
  },
  assetItemDark: {
    // Dark theme specific styles if needed
  },
  assetItemBorder: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    marginTop: 8,
    paddingTop: 16,
  },
  assetItemNew: {
    backgroundColor: '#DBEAFE',
  },

  newIndicator: {
    position: 'absolute',
    top: 8,
    left: 0,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#3B82F6',
  },

  fileIconContainer: {
    position: 'relative',
    marginRight: 12,
  },
  downloadBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  favoriteBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DC2626',
  },

  assetDetails: {
    flex: 1,
  },
  fileName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    lineHeight: 20,
    marginBottom: 4,
  },
  fileNameDark: {
    color: '#F9FAFB',
  },

  assetMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  fileSize: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  fileSizeDark: {
    color: '#9CA3AF',
  },
  separator: {
    fontSize: 12,
    color: '#6B7280',
    marginHorizontal: 6,
  },
  separatorDark: {
    color: '#9CA3AF',
  },
  lastViewed: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  lastViewedDark: {
    color: '#9CA3AF',
  },

  tags: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tag: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagText: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '500',
  },
  tagTextDark: {
    color: '#9CA3AF',
  },
  moreTagsText: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '500',
    fontStyle: 'italic',
  },
  moreTagsTextDark: {
    color: '#9CA3AF',
  },

  actionArrow: {
    marginLeft: 8,
  },

  viewAllButton: {
    marginTop: 16,
  },
});