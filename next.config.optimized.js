/** @type {import('next').NextConfig} */
const path = require('path')

const nextConfig = {
  // Image optimization
  images: {
    domains: ['localhost', process.env['NEXT_PUBLIC_SUPABASE_URL']?.replace(/^https?:\/\//, '') || ''],
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
    dangerouslyAllowSVG: false,
  },
  
  reactStrictMode: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Production optimizations
  compiler: {
    removeConsole: process.env['NODE_ENV'] === 'production' ? {
      exclude: ['error', 'warn']
    } : false,
    reactRemoveProperties: process.env['NODE_ENV'] === 'production',
  },
  
  // Experimental features for performance
  experimental: {
    optimizeCss: true,
    scrollRestoration: true,
    optimizePackageImports: [
      '@radix-ui/react-dialog', 
      '@radix-ui/react-dropdown-menu', 
      'lucide-react',
      '@supabase/supabase-js'
    ],
    serverActions: true,
    serverComponentsExternalPackages: ['@supabase/supabase-js'],
  },

  // PWA and caching
  ...(process.env['NODE_ENV'] === 'production' && {
    async headers() {
      return [
        {
          source: '/(.*)',
          headers: [
            {
              key: 'X-DNS-Prefetch-Control',
              value: 'on'
            },
            {
              key: 'Strict-Transport-Security',
              value: 'max-age=63072000; includeSubDomains; preload'
            },
            {
              key: 'X-Content-Type-Options',
              value: 'nosniff',
            },
            {
              key: 'X-Frame-Options',
              value: 'SAMEORIGIN',
            },
            {
              key: 'X-XSS-Protection',
              value: '1; mode=block',
            },
            {
              key: 'Referrer-Policy',
              value: 'origin-when-cross-origin',
            },
            {
              key: 'Permissions-Policy',
              value: 'camera=(), microphone=(), geolocation=()'
            }
          ],
        },
        {
          source: '/static/(.*)',
          headers: [
            {
              key: 'Cache-Control',
              value: 'public, max-age=31536000, immutable',
            },
          ],
        },
        {
          source: '/_next/static/(.*)',
          headers: [
            {
              key: 'Cache-Control',
              value: 'public, max-age=31536000, immutable',
            },
          ],
        },
        {
          source: '/api/health',
          headers: [
            {
              key: 'Cache-Control',
              value: 'no-cache, no-store, must-revalidate',
            },
          ],
        },
        {
          source: '/api/metrics',
          headers: [
            {
              key: 'Cache-Control',
              value: 'no-cache, no-store, must-revalidate',
            },
          ],
        },
        {
          source: '/api/(.*)',
          headers: [
            {
              key: 'Cache-Control',
              value: 'private, max-age=0, must-revalidate',
            },
          ],
        },
      ]
    },

    async rewrites() {
      return [
        {
          source: '/health',
          destination: '/api/health',
        },
        {
          source: '/metrics',
          destination: '/api/metrics',
        },
      ]
    },
  }),
  
  webpack: (config, { dev, isServer }) => {
    // Production optimizations
    if (!dev) {
      // Bundle splitting for better caching
      if (!isServer) {
        config.optimization = {
          ...config.optimization,
          splitChunks: {
            chunks: 'all',
            minSize: 20000,
            maxSize: 244000,
            cacheGroups: {
              default: {
                minChunks: 2,
                priority: -20,
                reuseExistingChunk: true,
              },
              vendor: {
                test: /[\\/]node_modules[\\/]/,
                name: 'vendors',
                priority: -10,
                chunks: 'all',
                maxSize: 244000,
              },
              common: {
                name: 'common',
                minChunks: 2,
                chunks: 'all',
                priority: -15,
                enforce: true,
              },
              react: {
                test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
                name: 'react',
                chunks: 'all',
                priority: 20,
              },
              ui: {
                test: /[\\/]node_modules[\\/](@radix-ui|lucide-react)[\\/]/,
                name: 'ui',
                chunks: 'all',
                priority: 15,
              },
              supabase: {
                test: /[\\/]node_modules[\\/]@supabase[\\/]/,
                name: 'supabase',
                chunks: 'all',
                priority: 10,
              },
            },
          },
        }
      }

      // Bundle analyzer for production builds
      if (process.env['ANALYZE'] === 'true') {
        try {
          const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer')
          config.plugins.push(
            new BundleAnalyzerPlugin({
              analyzerMode: 'static',
              openAnalyzer: false,
              reportFilename: `../.next/analyze/${isServer ? 'server' : 'client'}.html`,
            })
          )
        } catch (error) {
          console.warn('Bundle analyzer not available:', error.message)
        }
      }
    }

    // Development optimizations
    if (dev && !isServer) {
      // Completely disable devtool and source maps
      config.devtool = false
      
      // Remove hot reload and error overlay plugins
      config.plugins = config.plugins.filter(plugin => {
        const pluginName = plugin.constructor?.name || ''
        return !pluginName.includes('ReactRefresh') && 
               !pluginName.includes('HotModule') &&
               !pluginName.includes('ErrorOverlay')
      })
      
      // Disable all webpack dev server overlays
      if (config.devServer) {
        config.devServer.client = {
          overlay: false,
          logging: 'none',
          progress: false
        }
      }
      
      // Keep development mode but suppress warnings
      config.mode = 'development'
      
      // Disable infrastructure logging
      config.infrastructureLogging = {
        level: 'none'
      }
      
      // Disable stats logging
      config.stats = 'none'
    }

    // Common optimizations for all builds
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'src'),
    }

    // Module resolution optimizations
    config.resolve.extensions = ['.ts', '.tsx', '.js', '.jsx', '.json']

    // Ignore moment.js locales for smaller bundles
    config.plugins = config.plugins || []
    config.plugins.push(
      new (require('webpack')).IgnorePlugin({
        resourceRegExp: /^\.\/locale$/,
        contextRegExp: /moment$/,
      })
    )

    return config
  }
}

module.exports = nextConfig