const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 */
const config = {
  watchFolders: [
    // Include parent directory for shared modules
    path.resolve(__dirname, '../src'),
  ],
  resolver: {
    alias: {
      // Mobile app paths
      '@': path.resolve(__dirname, 'src'),
      '@/components': path.resolve(__dirname, 'src/components'),
      '@/screens': path.resolve(__dirname, 'src/screens'),
      '@/services': path.resolve(__dirname, 'src/services'),
      '@/stores': path.resolve(__dirname, 'src/stores'),
      '@/types': path.resolve(__dirname, 'src/types'),
      '@/utils': path.resolve(__dirname, 'src/utils'),
      '@/hooks': path.resolve(__dirname, 'src/hooks'),
      '@/lib': path.resolve(__dirname, 'src/lib'),
      '@/config': path.resolve(__dirname, 'src/config'),
      '@/navigation': path.resolve(__dirname, 'src/navigation'),
      '@/assets': path.resolve(__dirname, 'src/assets'),
      
      // Shared web app paths
      '@/shared': path.resolve(__dirname, '../src/lib'),
      '@/shared-types': path.resolve(__dirname, '../src/types'),
      '@/shared-stores': path.resolve(__dirname, '../src/lib/stores'),
      '@/shared-repositories': path.resolve(__dirname, '../src/lib/repositories'),
    },
    platforms: ['ios', 'android', 'native', 'web'],
  },
  transformer: {
    unstable_allowRequireContext: true,
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);