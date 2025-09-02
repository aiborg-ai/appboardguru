/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  reactStrictMode: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  webpack: (config, { isServer, dev, webpack }) => {
    // Fix fs module resolution
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
    }
    
    // Add chunk loading error handler
    if (!isServer) {
      config.plugins.push(
        new webpack.DefinePlugin({
          '__webpack_retry_chunk__': JSON.stringify(true)
        })
      );
    }
    
    // Note: Next.js manages webpack cache internally in development mode
    // We can only modify cache settings for production builds
    if (!dev) {
      // Production build cache configuration
      config.cache = {
        type: 'filesystem',
        buildDependencies: {
          config: [__filename],
        },
        // Use absolute path for cache directory
        cacheDirectory: path.join(process.cwd(), '.next', 'cache', 'webpack-prod'),
        compression: 'gzip',
        hashAlgorithm: 'xxhash64',
        name: `${isServer ? 'server' : 'client'}-production`,
        version: `production-${process.env.BUILD_ID || 'latest'}`,
      }
    }
    
    // Optimize module resolution
    config.resolve = {
      ...config.resolve,
      // Add common extensions
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.json', ...config.resolve.extensions],
      // Improve module resolution speed
      symlinks: false,
      // Cache module resolution
      cacheWithContext: false,
    }
    
    // Optimize performance in development
    if (dev) {
      // Keep default devtool for better debugging
      // config.devtool is set by Next.js automatically
      
      // Optimize watching
      config.watchOptions = {
        ignored: ['**/node_modules/**', '**/.next/**', '**/.git/**'],
        aggregateTimeout: 300,
        poll: false,
      }
      
      // Optimize performance hints
      config.performance = {
        hints: false,
      }
    }
    
    // Add webpack optimization
    config.optimization = {
      ...config.optimization,
      // Optimize module ids
      moduleIds: 'deterministic',
      // Better chunk splitting
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          // Vendor chunk
          vendor: {
            name: 'vendor',
            chunks: 'all',
            test: /node_modules/,
            priority: 20,
            reuseExistingChunk: true,
          },
          // Common components
          common: {
            minChunks: 2,
            priority: 10,
            reuseExistingChunk: true,
            enforce: true,
          },
          // Separate large libraries
          react: {
            test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
            name: 'react',
            priority: 30,
            reuseExistingChunk: true,
          },
          supabase: {
            test: /[\\/]node_modules[\\/]@supabase[\\/]/,
            name: 'supabase',
            priority: 25,
            reuseExistingChunk: true,
          },
        },
      },
      // Better runtime chunk
      runtimeChunk: {
        name: 'runtime',
      },
    }
    
    // Handle specific module issues
    config.module.rules.push({
      test: /\.m?js$/,
      resolve: {
        fullySpecified: false,
      },
    })
    
    return config
  },
  experimental: {
    // Force server components for dashboard routes
    serverComponentsExternalPackages: ['@supabase/supabase-js'],
    // Optimize for production
    optimizeCss: true,
    // Improve build performance
    scrollRestoration: true,
    // Enable webpack build worker
    webpackBuildWorker: true,
    // Parallel routes
    parallelServerCompiles: true,
    parallelServerBuildTraces: true,
    // Cache handlers
    instrumentationHook: true,
  },
  // Output configuration
  output: 'standalone',
  // Image optimization
  images: {
    domains: ['localhost', 'appboardguru.com'],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  // Optimize production builds
  productionBrowserSourceMaps: false,
  // Compression
  compress: true,
  // Powered by header
  poweredByHeader: false,
  // Generate ETags
  generateEtags: true,
}

module.exports = nextConfig