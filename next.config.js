/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost'],
  },
  // Disable React strict mode to reduce development warnings
  reactStrictMode: false,
  // Custom webpack configuration to disable overlays
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      // Disable source maps and devtool
      config.devtool = false
      
      // Remove React Refresh plugin to disable overlays
      config.plugins = config.plugins.filter(plugin => {
        return !plugin.constructor || plugin.constructor.name !== 'ReactRefreshWebpackPlugin'
      })
      
      // Disable webpack-hot-middleware overlay
      config.infrastructureLogging = {
        level: 'error'
      }
    }
    return config
  }
}

module.exports = nextConfig