/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost'],
  },
  reactStrictMode: false,
  
  
  // Configure compiler options to disable overlay
  compiler: {
    removeConsole: false,
  },
  
  // Disable all development overlays and warnings
  experimental: {
    // Disable overlay completely
    optimizePackageImports: [],
  },
  
  webpack: (config, { dev, isServer }) => {
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
    return config
  }
}

module.exports = nextConfig