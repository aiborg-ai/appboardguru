module.exports = {
  presets: ['@react-native/babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['./src'],
        alias: {
          '@': './src',
          '@/components': './src/components',
          '@/screens': './src/screens',
          '@/services': './src/services',
          '@/stores': './src/stores',
          '@/types': './src/types',
          '@/utils': './src/utils',
          '@/hooks': './src/hooks',
          '@/lib': './src/lib',
          '@/config': './src/config',
          '@/navigation': './src/navigation',
          '@/assets': './src/assets',
          '@/shared': '../src/lib',
          '@/shared-types': '../src/types',
          '@/shared-stores': '../src/lib/stores',
          '@/shared-repositories': '../src/lib/repositories',
        },
      },
    ],
    'react-native-reanimated/plugin',
  ],
};